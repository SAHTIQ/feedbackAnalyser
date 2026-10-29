import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mockApiService } from '../../services/mockApiService';
import { CorrectiveActionTask, TaskStatus, SeverityLevel } from '../../types';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SeverityBadge, TaskStatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Image as ImageIcon,
  User,
  ShieldCheck,
  XCircle,
  Eye,
  History,
  Send,
  Flag,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const ActionManagementPage: React.FC = () => {
  const { currentUser, currentRole, activeBranchId, branches } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<CorrectiveActionTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get('status') || 'ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>(activeBranchId);

  // Selected Task for Detailed View Modal
  const [selectedTask, setSelectedTask] = useState<CorrectiveActionTask | null>(null);

  // Schedule Approval / Deadline Adjustment Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false);
  const [adjustedDeadline, setAdjustedDeadline] = useState<string>('');

  // Supervisor Verification Modal
  const [verifyModalOpen, setVerifyModalOpen] = useState<boolean>(false);
  const [verificationNote, setVerificationNote] = useState<string>('');

  // Supervisor Rejection Modal
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Status message
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const data = await mockApiService.getTasks({
        branchId: selectedBranch !== 'ALL' ? selectedBranch : undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
      });

      // Filter to supervisor's branches if supervisor
      let scoped = data;
      if (currentRole === 'SUPERVISOR' && selectedBranch === 'ALL') {
        scoped = data.filter((t) => currentUser.branchIds.includes(t.branchId));
      }

      setTasks(scoped);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [filterStatus, selectedBranch, activeBranchId, currentUser]);

  // Schedule Approval Handler
  const handleApproveSchedule = async (task: CorrectiveActionTask) => {
    const deadline = adjustedDeadline || task.proposedDeadline;
    try {
      const updated = await mockApiService.approveTaskSchedule(
        task.id,
        deadline,
        currentUser.id,
        currentUser.name
      );
      setScheduleModalOpen(false);
      setFeedbackNotice(`Schedule approved for task ${task.id}. Execution SLA active.`);
      setTimeout(() => setFeedbackNotice(null), 4000);
      loadTasks();
      if (selectedTask?.id === task.id) setSelectedTask(updated);
    } catch (err) {
      console.error(err);
    }
  };

  // Verification Handler
  const handleVerifyTask = async () => {
    if (!selectedTask) return;
    try {
      const note = verificationNote.trim() || 'Verified by supervisor on duty.';
      const updated = await mockApiService.verifyTaskCompletion(
        selectedTask.id,
        note,
        currentUser.id,
        currentUser.name
      );
      setVerifyModalOpen(false);
      setVerificationNote('');
      setFeedbackNotice(`Task verified and closed. Linked customer feedback resolved.`);
      setTimeout(() => setFeedbackNotice(null), 4000);
      loadTasks();
      setSelectedTask(updated);
    } catch (err) {
      console.error(err);
    }
  };

  // Rejection Handler (Requires Mandatory Reason!)
  const handleRejectTask = async () => {
    if (!selectedTask) return;
    if (!rejectionReason.trim()) {
      setRejectError('A supervisor rejection justification is mandatory.');
      return;
    }
    try {
      const updated = await mockApiService.rejectTaskCompletion(
        selectedTask.id,
        rejectionReason.trim(),
        currentUser.name
      );
      setRejectModalOpen(false);
      setRejectionReason('');
      setFeedbackNotice(`Task returned to ${selectedTask.assignedToStaffName} for rectification.`);
      setTimeout(() => setFeedbackNotice(null), 4000);
      loadTasks();
      setSelectedTask(updated);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Corrective Action Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervise task execution, verify kitchen physical evidence, and close operational cycles.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-500 shadow-xs"
          >
            <option value="ALL">All Task States</option>
            <option value="AWAITING_SCHEDULE_APPROVAL">Awaiting Schedule Approval</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED_AWAITING_VERIFICATION">Completed (Awaiting Verification)</option>
            <option value="REJECTED_REOPENED">Rejected & Reopened</option>
            <option value="VERIFIED_CLOSED">Verified & Closed</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      {/* Success Notification */}
      {feedbackNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{feedbackNotice}</span>
        </div>
      )}

      {/* Tasks Grid / Cards */}
      {isLoading ? (
        <LoadingSpinner label="Loading operational task roster..." />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-6 h-6" />}
          title="No Corrective Actions Match Filter"
          description="Try selecting a different status filter or viewing all assigned branches."
          actionLabel="Show All Tasks"
          onAction={() => setFilterStatus('ALL')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks.map((task) => {
            const isAwaitingApproval = task.status === 'AWAITING_SCHEDULE_APPROVAL';
            const isAwaitingVerification = task.status === 'COMPLETED_AWAITING_VERIFICATION';
            const isReopened = task.status === 'REJECTED_REOPENED';
            const isOverdue = task.status === 'OVERDUE';

            return (
              <Card
                key={task.id}
                className={`relative border-2 flex flex-col justify-between transition-all hover:shadow-md ${
                  isAwaitingVerification
                    ? 'border-purple-300 ring-2 ring-purple-100'
                    : isOverdue
                    ? 'border-rose-400 bg-rose-50/20'
                    : isReopened
                    ? 'border-amber-300'
                    : 'border-slate-200'
                }`}
              >
                <CardBody className="p-5 space-y-4">
                  {/* Card Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <TaskStatusBadge status={task.status} size="sm" />
                        <SeverityBadge severity={task.severity} size="sm" />
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-slate-500 block">
                        Linked: {task.feedbackRef}
                      </span>
                    </div>

                    {task.isEscalated && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider animate-pulse">
                        Escalated
                      </span>
                    )}
                  </div>

                  {/* Task Title & Description */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                      {task.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">
                      {task.description}
                    </p>
                  </div>

                  {/* Assignee & Branch */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium text-slate-800">
                      <User className="w-3.5 h-3.5 text-brand-600" />
                      {task.assignedToStaffName}
                    </span>
                    <span className="truncate max-w-[120px]">{task.branchName}</span>
                  </div>

                  {/* Deadline & Approval Notice */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Deadline:
                      </span>
                      <span
                        className={`font-semibold ${
                          isOverdue ? 'text-rose-600 font-bold' : 'text-slate-800'
                        }`}
                      >
                        {new Date(task.approvedDeadline).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {isAwaitingApproval && (
                      <p className="text-amber-700 font-medium">
                        ⚠ Schedule pending supervisor confirmation.
                      </p>
                    )}
                  </div>

                  {/* Rejection / Escalation remark preview */}
                  {task.rejectionReason && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800">
                      <strong>Rejection Note:</strong> "{task.rejectionReason}"
                    </div>
                  )}
                </CardBody>

                {/* Card Actions Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 rounded-b-xl flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedTask(task)}
                    icon={<Eye className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Details
                  </Button>

                  <div className="flex items-center gap-1.5">
                    {/* Schedule Approval Action */}
                    {isAwaitingApproval && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setSelectedTask(task);
                          setAdjustedDeadline(task.proposedDeadline);
                          setScheduleModalOpen(true);
                        }}
                        className="text-xs"
                      >
                        Approve Schedule
                      </Button>
                    )}

                    {/* Verification Action */}
                    {isAwaitingVerification && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => {
                          setSelectedTask(task);
                          setVerifyModalOpen(true);
                        }}
                        className="text-xs"
                      >
                        Verify & Close
                      </Button>
                    )}

                    {/* Rejection Action */}
                    {isAwaitingVerification && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setSelectedTask(task);
                          setRejectModalOpen(true);
                        }}
                        className="text-xs"
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* TASK DETAIL MODAL */}
      {selectedTask && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTask(null)}
          title={
            <div className="flex items-center gap-2">
              <span>{selectedTask.title}</span>
              <TaskStatusBadge status={selectedTask.status} size="sm" />
            </div>
          }
          subtitle={`Task ID: ${selectedTask.id} • Linked to Feedback ${selectedTask.feedbackRef}`}
          maxWidth="xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/supervisor/feedback/${selectedTask.feedbackId}`)}
              >
                Inspect Linked Feedback
              </Button>

              <div className="flex items-center gap-2">
                {selectedTask.status === 'AWAITING_SCHEDULE_APPROVAL' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setAdjustedDeadline(selectedTask.proposedDeadline);
                      setScheduleModalOpen(true);
                    }}
                  >
                    Approve Schedule
                  </Button>
                )}
                {selectedTask.status === 'COMPLETED_AWAITING_VERIFICATION' && (
                  <>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setRejectModalOpen(true)}
                    >
                      Reject Completion
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => setVerifyModalOpen(true)}
                    >
                      Verify & Close Workflow
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={() => setSelectedTask(null)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-5 text-xs">
            {/* Task Meta Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                  Branch
                </span>
                <span className="font-bold text-slate-800">{selectedTask.branchName}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                  Assignee
                </span>
                <span className="font-bold text-slate-800">
                  {selectedTask.assignedToStaffName}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                  Approved Deadline
                </span>
                <span className="font-bold text-slate-800">
                  {new Date(selectedTask.approvedDeadline).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                  Rejection Count
                </span>
                <span
                  className={`font-bold ${
                    selectedTask.rejectionCount > 0 ? 'text-rose-600' : 'text-slate-800'
                  }`}
                >
                  {selectedTask.rejectionCount} failure(s)
                </span>
              </div>
            </div>

            {/* Task Description */}
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                Standard Operating Instructions
              </h4>
              <p className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed">
                {selectedTask.description}
              </p>
            </div>

            {/* Completion Note & Photo Evidence if submitted */}
            {selectedTask.completionNote && (
              <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-purple-900">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Kitchen Staff Completion Evidence</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Logged Note:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    "{selectedTask.completionNote}"
                  </p>
                </div>
                {selectedTask.completionPhotoUrl && (
                  <div>
                    <span className="text-slate-500 font-medium block mb-1.5">
                      Attached Physical Verification Photo:
                    </span>
                    <img
                      src={selectedTask.completionPhotoUrl}
                      alt="Station evidence"
                      className="w-full max-h-56 object-cover rounded-lg border border-slate-300 shadow-xs"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Verification Result if closed */}
            {selectedTask.verificationStatus === 'VERIFIED' && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Supervisor Verification Note:</span>
                </div>
                <p>"{selectedTask.verificationNote}"</p>
                <p className="text-[10px] text-emerald-700">
                  Verified by {selectedTask.verifiedByName} at{' '}
                  {selectedTask.verifiedAt && new Date(selectedTask.verifiedAt).toLocaleString()}
                </p>
              </div>
            )}

            {/* Rejection Details if reopened */}
            {selectedTask.rejectionReason && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Supervisor Rejection Details:</span>
                </div>
                <p>"{selectedTask.rejectionReason}"</p>
              </div>
            )}

            {/* Workflow Audit Trail History */}
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                Action State History
              </h4>
              <div className="space-y-2 border-l-2 border-slate-200 pl-4">
                {selectedTask.workflowHistory.map((h) => (
                  <div key={h.id} className="relative space-y-0.5">
                    <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-brand-600 ring-2 ring-white" />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {h.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(h.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600">{h.details}</p>
                    <p className="text-[10px] text-slate-400">
                      By: {h.actor} ({h.actorRole})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* SCHEDULE APPROVAL MODAL */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Approve Execution Schedule"
        subtitle={selectedTask ? `Task: ${selectedTask.title}` : ''}
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => selectedTask && handleApproveSchedule(selectedTask)}
            >
              Approve Deadline & Assign
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Per quality policy, kitchen staff cannot execute corrective actions until a supervisor
            approves the proposed deadline.
          </p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Adjust Execution Deadline:
            </label>
            <input
              type="datetime-local"
              value={adjustedDeadline ? adjustedDeadline.slice(0, 16) : ''}
              onChange={(e) => setAdjustedDeadline(new Date(e.target.value).toISOString())}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </Modal>

      {/* VERIFY COMPLETION MODAL */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title="Verify Task Resolution & Close Workflow"
        subtitle={selectedTask ? `Task: ${selectedTask.title}` : ''}
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setVerifyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="success" size="sm" onClick={handleVerifyTask}>
              Confirm Verification & Close
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Verify that the kitchen remedy meets hygiene and quality standards. Closing the task
            will resolve the linked customer feedback record.
          </p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Supervisor Verification Remarks:
            </label>
            <textarea
              rows={3}
              value={verificationNote}
              onChange={(e) => setVerificationNote(e.target.value)}
              placeholder="e.g. Inspected core meat probe calibration certificate. Passed 100°C boil test."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </Modal>

      {/* REJECT COMPLETION MODAL */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Task Evidence & Return to Kitchen"
        subtitle={selectedTask ? `Task: ${selectedTask.title}` : ''}
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleRejectTask}>
              Reject & Reopen Task
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {rejectError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
              {rejectError}
            </div>
          )}

          <p className="text-slate-600">
            A rejection reason is mandatory and will be displayed on the kitchen staff dashboard.
            The task will return to the original assignee.
          </p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Mandatory Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="State why the evidence is unacceptable (e.g. photo lacks date tag, test strip expired, table still greasy)."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
              required
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
