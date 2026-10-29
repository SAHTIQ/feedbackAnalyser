import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { mockApiService } from '../../services/mockApiService';
import {
  FeedbackSubmission,
  SeverityLevel,
  UserProfile,
  CorrectiveActionTask,
} from '../../types';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import {
  SeverityBadge,
  SentimentBadge,
  WorkflowStatusBadge,
} from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle,
  HelpCircle,
  User,
  History,
  Repeat,
  PlusCircle,
  Edit3,
  Calendar,
  MessageSquare,
  ShieldCheck,
  Star,
} from 'lucide-react';

export const FeedbackDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser, currentRole } = useAuth();
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState<FeedbackSubmission | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [kitchenStaffList, setKitchenStaffList] = useState<UserProfile[]>([]);

  // Severity Override Modal State
  const [overrideModalOpen, setOverrideModalOpen] = useState<boolean>(false);
  const [newSeverity, setNewSeverity] = useState<SeverityLevel>('HIGH');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [isSubmittingOverride, setIsSubmittingOverride] = useState<boolean>(false);

  // Assign Task Modal State
  const [assignModalOpen, setAssignModalOpen] = useState<boolean>(false);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDesc, setTaskDesc] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [deadlineHours, setDeadlineHours] = useState<number>(24);
  const [autoApproveSchedule, setAutoApproveSchedule] = useState<boolean>(true);
  const [isSubmittingTask, setIsSubmittingTask] = useState<boolean>(false);

  // Notification / Alert message
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadDetails = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await mockApiService.getFeedbackById(id);
      if (data) {
        setFeedback(data);
        setNewSeverity(data.severity);
      }

      // Load kitchen staff for assigning tasks
      const users = await mockApiService.getUsers();
      const kitchenStaff = users.filter((u) => u.role === 'KITCHEN_STAFF');
      setKitchenStaffList(kitchenStaff);
      if (kitchenStaff.length > 0) {
        setSelectedStaffId(kitchenStaff[0].id);
      }
    } catch (err) {
      console.error('Failed to load feedback details', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  // Handle Severity Override
  const handleConfirmOverride = async () => {
    if (!overrideReason.trim()) {
      setOverrideError('A supervisor justification is mandatory for severity override.');
      return;
    }
    if (!feedback) return;

    try {
      setIsSubmittingOverride(true);
      setOverrideError(null);
      const updated = await mockApiService.overrideSeverity(
        feedback.id,
        newSeverity,
        overrideReason.trim(),
        currentUser.name
      );
      setFeedback({ ...updated });
      setOverrideModalOpen(false);
      setOverrideReason('');
      setActionSuccessMessage(
        `Severity successfully updated to ${newSeverity}. Reason documented in audit log.`
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setOverrideError('Failed to override severity. Please try again.');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // Pre-fill task creation modal from AI recommendation
  const handleOpenAssignModal = (recTitle?: string, recDesc?: string, hours?: number) => {
    if (!feedback) return;
    setTaskTitle(recTitle || `Corrective Action for ${feedback.referenceId}`);
    setTaskDesc(
      recDesc ||
        `Investigate and remediate feedback: "${feedback.comments || feedback.selectedTags.join(', ')}"`
    );
    setDeadlineHours(hours || (feedback.severity === 'CRITICAL' ? 4 : 24));
    setAssignModalOpen(true);
  };

  // Handle Task Creation & Assignment
  const handleConfirmCreateTask = async () => {
    if (!feedback || !selectedStaffId) return;
    const staff = kitchenStaffList.find((s) => s.id === selectedStaffId);
    if (!staff) return;

    const deadlineDate = new Date(Date.now() + deadlineHours * 60 * 60 * 1000).toISOString();

    try {
      setIsSubmittingTask(true);
      await mockApiService.createTaskFromFeedback({
        feedbackId: feedback.id,
        title: taskTitle,
        description: taskDesc,
        assignedStaffId: staff.id,
        assignedStaffName: staff.name,
        severity: feedback.severity,
        proposedDeadline: deadlineDate,
        supervisorName: currentUser.name,
        autoApproveSchedule,
      });

      setAssignModalOpen(false);
      setActionSuccessMessage(
        `Corrective action created and assigned to ${staff.name}. Schedule ${
          autoApproveSchedule ? 'approved' : 'awaiting approval'
        }.`
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);
      loadDetails();
    } catch (err) {
      console.error('Failed to create task', err);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  if (isLoading || !feedback) {
    return <LoadingSpinner label="Loading feedback details & AI analysis..." fullPage />;
  }

  const ai = feedback.aiAnalysis;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/supervisor/inbox')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Inbox
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-slate-900">
                {feedback.referenceId}
              </span>
              <SeverityBadge severity={feedback.severity} />
              <WorkflowStatusBadge status={feedback.workflowStatus} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {feedback.branchName} • Ingested {new Date(feedback.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Supervisor Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOverrideModalOpen(true)}
            icon={<Edit3 className="w-3.5 h-3.5" />}
          >
            Override Severity
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleOpenAssignModal()}
            icon={<PlusCircle className="w-3.5 h-3.5" />}
          >
            Assign Corrective Duty
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{actionSuccessMessage}</span>
        </div>
      )}

      {/* Override Notice if changed by supervisor */}
      {feedback.severityOverrideReason && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Supervisor Severity Override Applied
            </span>
            <span>
              Original: {feedback.originalSeverity} ➔ Current: {feedback.severity}
            </span>
          </div>
          <p className="text-amber-800">
            <strong>Reason:</strong> "{feedback.severityOverrideReason}"
          </p>
          <p className="text-[11px] text-amber-700/80">
            Overridden by {feedback.severityOverriddenBy} at{' '}
            {feedback.severityOverriddenAt &&
              new Date(feedback.severityOverriddenAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* MAIN TWO-COLUMN LAYOUT: ORIGINAL SUBMISSION vs AI ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: ORIGINAL CUSTOMER SUBMISSION */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader
              title="Original Customer Submission"
              subtitle="Verbatim intake record as submitted by diner"
            />
            <CardBody className="p-6 space-y-6">
              {/* Rating & Submission Meta */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-5 h-5 ${
                          feedback.rating >= s ? 'fill-current' : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-slate-800 ml-1">
                    {feedback.rating} / 5 Stars
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-semibold uppercase text-slate-400 block">
                    Customer
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {feedback.isAnonymous ? 'Anonymous Diner' : feedback.customerName || 'Guest'}
                  </span>
                </div>
              </div>

              {/* Selected Categories & Tags */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Selected Categories
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {feedback.categories.map((c) => (
                      <span
                        key={c}
                        className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Selected Incident Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {feedback.selectedTags.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 border border-brand-200 text-xs font-medium"
                      >
                        {t}
                      </span>
                    ))}
                    {feedback.otherTagText && (
                      <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium">
                        Other: {feedback.otherTagText}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Written Comments */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Guest Comments
                </h4>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed italic">
                  {feedback.comments ? `"${feedback.comments}"` : 'No written commentary provided.'}
                </div>
              </div>

              {/* Contact Information if provided */}
              {!feedback.isAnonymous && feedback.customerContact && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Guest Follow-Up Contact:</span>
                  <span className="font-semibold text-slate-800">{feedback.customerContact}</span>
                </div>
              )}

              {/* Recurrence Indicator */}
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-brand-600" />
                  <div>
                    <p className="font-bold text-slate-900">
                      {feedback.isRecurring
                        ? `Recurring Incident (Occurred ${feedback.recurrenceCount}x in 30 days)`
                        : 'Single Isolated Incident'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Evaluated against historical complaints at {feedback.branchName}.
                    </p>
                  </div>
                </div>
                {feedback.isRecurring && (
                  <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[10px]">
                    Multi-Incident Pattern
                  </span>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* RIGHT COLUMN: AI ANALYSIS & RECOMMENDATIONS */}
        <div className="space-y-6">
          <Card className="shadow-sm border-brand-200 bg-white">
            <CardHeader
              title={
                <div className="flex items-center gap-2 text-slate-900">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  <span>AI Quality Intelligence Analysis</span>
                </div>
              }
              subtitle="NLP extraction, hypothesis generation, and action recommendations"
              action={
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                  Status: {ai?.status || 'COMPLETED'}
                </span>
              }
            />
            <CardBody className="p-6 space-y-6">
              {/* Disclaimer Notice */}
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Supervisor Advisory:</strong> AI root-cause assessments are machine-generated
                  hypotheses for operational guidance. Supervisors must verify physical station
                  conditions before final closure.
                </span>
              </div>

              {/* Key Diagnostic Scores Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Sentiment
                  </span>
                  <div className="mt-1">
                    <SentimentBadge sentiment={feedback.sentiment} size="sm" />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Priority Score
                  </span>
                  <span className="text-base font-bold text-slate-900 block mt-0.5">
                    {feedback.priorityScore} / 100
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Model Confidence
                  </span>
                  <span className="text-base font-bold text-brand-600 block mt-0.5">
                    {Math.round((ai?.confidenceScore || 0.9) * 100)}%
                  </span>
                </div>
              </div>

              {/* Detected Topics */}
              {ai?.detectedTopics && ai.detectedTopics.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Extracted Semantic Topics
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {ai.detectedTopics.map((topic) => (
                      <span
                        key={topic}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium"
                      >
                        #{topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Root Causes (Hypotheses) */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Suggested Root Causes (Hypotheses)
                </h4>
                <div className="space-y-2.5">
                  {ai?.suggestedRootCauses && ai.suggestedRootCauses.length > 0 ? (
                    ai.suggestedRootCauses.map((rc, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            Hypothesis {idx + 1}: {rc.cause}
                          </span>
                          <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                            {Math.round(rc.confidence * 100)}% match
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          <strong>Evidence:</strong> {rc.evidence}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No root-cause anomalies detected for this rating level.
                    </p>
                  )}
                </div>
              </div>

              {/* Recommended Corrective Actions */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  AI Action Plan Recommendations
                </h4>
                <div className="space-y-2.5">
                  {ai?.recommendedActions && ai.recommendedActions.length > 0 ? (
                    ai.recommendedActions.map((act) => (
                      <div
                        key={act.id}
                        className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{act.title}</span>
                            <SeverityBadge severity={act.priority} size="sm" />
                          </div>
                          <p className="text-[11px] text-slate-600">{act.description}</p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Role: <strong>{act.targetRole}</strong> • Suggested SLA:{' '}
                            <strong>{act.suggestedDeadlineHours} hours</strong>
                          </p>
                        </div>

                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() =>
                            handleOpenAssignModal(
                              act.title,
                              act.description,
                              act.suggestedDeadlineHours
                            )
                          }
                          className="shrink-0 text-xs"
                        >
                          Adopt & Assign
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No corrective actions required for positive review.
                    </p>
                  )}
                </div>
              </div>

              {/* Analysis Timeline */}
              {ai?.analysisTimeline && (
                <div className="pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Multi-Agent Execution Pipeline
                  </h4>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    {ai.analysisTimeline.map((step, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{step.step}</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {step.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* OVERRIDE SEVERITY MODAL */}
      <Modal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title="Override Incident Severity"
        subtitle={`Reference: ${feedback.referenceId} at ${feedback.branchName}`}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOverrideModalOpen(false)}
              disabled={isSubmittingOverride}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmOverride}
              loading={isSubmittingOverride}
            >
              Confirm Severity Override
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {overrideError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {overrideError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select New Severity Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as SeverityLevel[]).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setNewSeverity(sev)}
                  className={`p-2.5 rounded-lg border text-xs font-bold text-center transition-all ${
                    newSeverity === sev
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mandatory Supervisor Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="State the operational reason for this severity modification (e.g. guest confirmed miscommunication, equipment test passed, repeated guest complaint, etc.)"
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              This reason will be permanently recorded in the immutable audit log under your
              credentials ({currentUser.name}).
            </p>
          </div>
        </div>
      </Modal>

      {/* CREATE & ASSIGN TASK MODAL */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Dispatch Corrective Action Task"
        subtitle={`Assign task for feedback ${feedback.referenceId}`}
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignModalOpen(false)}
              disabled={isSubmittingTask}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmCreateTask}
              loading={isSubmittingTask}
            >
              Dispatch Task
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Instructions & Standard Operating Procedure
            </label>
            <textarea
              rows={3}
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assign to Kitchen Staff
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
              >
                {kitchenStaffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.department || 'Kitchen Staff'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Resolution SLA (Hours)
              </label>
              <select
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
              >
                <option value={2}>2 Hours (Emergency)</option>
                <option value={4}>4 Hours (Critical)</option>
                <option value={12}>12 Hours (Same Day)</option>
                <option value={24}>24 Hours (Standard SLA)</option>
                <option value={48}>48 Hours (Maintenance)</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
              <input
                type="checkbox"
                checked={autoApproveSchedule}
                onChange={(e) => setAutoApproveSchedule(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
              />
              <span>
                Immediately approve proposed execution schedule as supervisor ({currentUser.name})
              </span>
            </label>
            <p className="text-[11px] text-slate-500 mt-1 pl-6">
              If unchecked, the task enters "Awaiting Schedule Approval" state before staff can
              begin execution.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
