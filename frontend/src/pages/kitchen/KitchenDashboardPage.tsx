import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mockApiService } from '../../services/mockApiService';
import { CorrectiveActionTask } from '../../types';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SeverityBadge, TaskStatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  ChefHat,
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  Upload,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react';

export const KitchenDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<CorrectiveActionTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Complete Task Modal State
  const [completeModalOpen, setCompleteModalOpen] = useState<boolean>(false);
  const [activeTask, setActiveTask] = useState<CorrectiveActionTask | null>(null);
  const [completionNote, setCompletionNote] = useState<string>('');
  const [simulatedPhotoUrl, setSimulatedPhotoUrl] = useState<string>('');
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Status message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const samplePhotoEvidence = [
    { label: 'Calibrated Digital Thermometer (74°C)', url: 'https://images.unsplash.com/photo-1584905066893-7d5c142ba4e1?w=500&h=300&fit=crop' },
    { label: 'Sanitizer ppm Test Strip', url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&h=300&fit=crop' },
    { label: 'Replacement Pass Heat Lamps', url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500&h=300&fit=crop' },
  ];

  const loadStaffTasks = async () => {
    try {
      setIsLoading(true);
      // Strictly query only tasks assigned to THIS staff member!
      const data = await mockApiService.getTasks({
        staffId: currentUser.id,
      });
      setTasks(data);
    } catch (err) {
      console.error('Failed to load kitchen tasks', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaffTasks();
  }, [currentUser]);

  // Handle Start Task
  const handleStartTask = async (task: CorrectiveActionTask) => {
    try {
      const updated = await mockApiService.startTask(task.id, currentUser.name);
      setToastMessage(`Task "${task.title}" is now In Progress.`);
      setTimeout(() => setToastMessage(null), 3000);
      loadStaffTasks();
    } catch (err) {
      console.error(err);
    }
  };

  // Open Complete Modal
  const handleOpenCompleteModal = (task: CorrectiveActionTask) => {
    setActiveTask(task);
    setCompletionNote('');
    setSimulatedPhotoUrl(samplePhotoEvidence[0].url);
    setCompletionError(null);
    setCompleteModalOpen(true);
  };

  // Submit Task Completion
  const handleSubmitCompletion = async () => {
    if (!activeTask) return;
    if (!completionNote.trim()) {
      setCompletionError('A completion note explaining your corrective remedy is mandatory.');
      return;
    }

    try {
      setIsSubmitting(true);
      setCompletionError(null);
      await mockApiService.submitTaskCompletion(
        activeTask.id,
        completionNote.trim(),
        simulatedPhotoUrl || undefined,
        currentUser.name
      );
      setCompleteModalOpen(false);
      setToastMessage('Evidence submitted! Task moved to "Pending Supervisor Verification".');
      setTimeout(() => setToastMessage(null), 4000);
      loadStaffTasks();
    } catch (err) {
      console.error(err);
      setCompletionError('Failed to submit completion note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner label="Loading assigned kitchen duties..." fullPage />;
  }

  const openTasks = tasks.filter(
    (t) => t.status !== 'VERIFIED_CLOSED'
  );
  const completedTasks = tasks.filter((t) => t.status === 'VERIFIED_CLOSED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Kitchen Operations Checklist
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Assigned to: <strong className="text-slate-800">{currentUser.name}</strong> •{' '}
              {currentUser.department || 'Culinary Line'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            {openTasks.length} Active Duties
          </span>
        </div>
      </div>

      {/* Success Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ACTIVE TASKS SECTION */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Current Action Duties ({openTasks.length})
        </h3>

        {openTasks.length === 0 ? (
          <EmptyState
            icon={<CheckCircle className="w-6 h-6 text-emerald-500" />}
            title="All Kitchen Tasks Cleared"
            description="You currently have no pending corrective actions assigned for your station."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {openTasks.map((task) => {
              const isAssigned = task.status === 'ASSIGNED';
              const isInProgress = task.status === 'IN_PROGRESS';
              const isAwaitingVerification =
                task.status === 'COMPLETED_AWAITING_VERIFICATION';
              const isReopened = task.status === 'REJECTED_REOPENED';
              const isOverdue = task.status === 'OVERDUE';
              const isAwaitingApproval =
                task.status === 'AWAITING_SCHEDULE_APPROVAL';

              return (
                <Card
                  key={task.id}
                  className={`border-2 flex flex-col justify-between ${
                    isReopened
                      ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-100'
                      : isOverdue
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <CardBody className="p-5 space-y-4">
                    {/* Header: Status & Severity */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <TaskStatusBadge status={task.status} size="sm" />
                        <SeverityBadge severity={task.severity} size="sm" />
                      </div>
                      <span className="font-mono text-xs text-slate-400">
                        Ref: {task.feedbackRef}
                      </span>
                    </div>

                    {/* REOPENED ALERT BANNER */}
                    {isReopened && (
                      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>Supervisor Returned Task:</span>
                        </div>
                        <p className="italic">"{task.rejectionReason}"</p>
                        <p className="text-[10px] text-rose-600">
                          Please rectify the issue and resubmit completion evidence.
                        </p>
                      </div>
                    )}

                    {/* Task Title & SOP Instructions */}
                    <div>
                      <h4 className="text-base font-bold text-slate-900 leading-snug">
                        {task.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {task.description}
                      </p>
                    </div>

                    {/* Minimum Necessary Feedback Context */}
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Guest Incident Context (Redacted)
                      </span>
                      <p className="text-slate-700 italic">
                        Incident reported at {task.branchName}. Immediate station verification requested.
                      </p>
                    </div>

                    {/* Deadline SLA */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Due Date:
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
                      <p className="text-xs text-amber-700 font-medium">
                        ⏳ Proposed schedule pending supervisor approval before execution starts.
                      </p>
                    )}
                  </CardBody>

                  {/* Actions Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-xl flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {isAwaitingVerification
                        ? 'Evidence submitted for supervisor audit'
                        : isInProgress
                        ? 'Work currently active'
                        : 'Action required'}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Start Work */}
                      {(isAssigned || isReopened) && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleStartTask(task)}
                          icon={<Play className="w-3.5 h-3.5" />}
                        >
                          Start Work
                        </Button>
                      )}

                      {/* Mark Completed */}
                      {(isInProgress || isAssigned || isReopened) && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleOpenCompleteModal(task)}
                          icon={<CheckCircle className="w-3.5 h-3.5" />}
                        >
                          Submit Completion
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPLETED / VERIFIED TASKS ARCHIVE */}
      {completedTasks.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Verified & Closed Duties ({completedTasks.length})
          </h3>
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            {completedTasks.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{t.title}</span>
                    <TaskStatusBadge status={t.status} size="sm" />
                  </div>
                  <p className="text-slate-500">
                    Verified by {t.verifiedByName} on {new Date(t.verifiedAt || '').toLocaleDateString()}.
                    Note: "{t.verificationNote}"
                  </p>
                </div>
                <span className="font-mono text-slate-400">{t.feedbackRef}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBMIT COMPLETION EVIDENCE MODAL */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Log Corrective Action Completion"
        subtitle={activeTask ? `Task: ${activeTask.title}` : ''}
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompleteModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={handleSubmitCompletion}
              loading={isSubmitting}
            >
              Submit Evidence to Supervisor
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {completionError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
              {completionError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Corrective Action Completion Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="Detail the remedial steps performed (e.g. core probe calibrated at 0°C ice point and 100°C boil point, heat lamp bulbs swapped to 250W ceramic emitters, etc.)"
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Attach Physical Photo Evidence (Simulated)
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Select sample verification imagery captured from the line station:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {samplePhotoEvidence.map((photo, idx) => (
                <div
                  key={idx}
                  onClick={() => setSimulatedPhotoUrl(photo.url)}
                  className={`p-2 rounded-xl border cursor-pointer transition-all ${
                    simulatedPhotoUrl === photo.url
                      ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={photo.label}
                    className="w-full h-20 object-cover rounded-lg mb-1.5"
                  />
                  <p className="text-[10px] font-medium text-slate-700 text-center truncate">
                    {photo.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
