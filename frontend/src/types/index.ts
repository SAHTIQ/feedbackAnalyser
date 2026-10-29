export type UserRole = 'CUSTOMER' | 'SUPERVISOR' | 'KITCHEN_STAFF' | 'ADMIN';

export type SentimentType = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'MIXED';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type WorkflowStatus =
  | 'NEW'
  | 'ANALYSIS_COMPLETED'
  | 'ACTION_REQUIRED'
  | 'ACTION_IN_PROGRESS'
  | 'AWAITING_VERIFICATION'
  | 'VERIFIED_RESOLVED'
  | 'CLOSED';

export type TaskStatus =
  | 'AWAITING_SCHEDULE_APPROVAL'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED_AWAITING_VERIFICATION'
  | 'REJECTED_REOPENED'
  | 'VERIFIED_CLOSED'
  | 'OVERDUE';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  managerName: string;
  phone: string;
  active: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchIds: string[]; // empty means all or customer
  avatar: string;
  active: boolean;
  department?: string;
  openTaskCount?: number;
}

export interface TagCategory {
  id: string;
  name: string;
  tags: string[];
}

export interface AIAnalysisTimelineStep {
  step: string;
  timestamp: string;
  status: 'DONE' | 'RUNNING' | 'PENDING' | 'ERROR';
  description?: string;
}

export interface SuggestedRootCause {
  cause: string;
  confidence: number; // 0.0 to 1.0
  isHypothesis: boolean;
  evidence: string;
}

export interface RecommendedAction {
  id: string;
  title: string;
  description: string;
  targetRole: 'KITCHEN_STAFF' | 'SUPERVISOR' | 'MAINTENANCE';
  suggestedDeadlineHours: number;
  priority: SeverityLevel;
}

export interface AIAnalysisResult {
  id: string;
  feedbackId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'NEEDS_REVIEW' | 'FAILED';
  sentiment: SentimentType;
  sentimentScore: number; // -1.0 to 1.0
  detectedTopics: string[];
  suggestedRootCauses: SuggestedRootCause[];
  recommendedActions: RecommendedAction[];
  suggestedSeverity: SeverityLevel;
  calculatedPriorityScore: number; // 0 - 100
  confidenceScore: number; // 0.0 to 1.0
  recurrenceProbability: number; // 0.0 to 1.0
  linkedHistoricalComplaintIds: string[];
  severeAlertTriggered: boolean;
  severeAlertReason?: string;
  analyzedAt: string;
  analysisTimeline: AIAnalysisTimelineStep[];
  processingNotes?: string;
  errorNotice?: string;
}

export interface FeedbackSubmission {
  id: string;
  referenceId: string; // e.g. "FB-2026-8910"
  accessToken: string; // e.g. "TK-4819"
  branchId: string;
  branchName: string;
  rating: number; // 1 - 5
  categories: string[];
  selectedTags: string[];
  otherTagText?: string;
  comments?: string;
  customerName?: string;
  customerContact?: string;
  isAnonymous: boolean;
  createdAt: string;
  sentiment: SentimentType;
  severity: SeverityLevel;
  originalSeverity?: SeverityLevel;
  severityOverrideReason?: string;
  severityOverriddenBy?: string;
  severityOverriddenAt?: string;
  workflowStatus: WorkflowStatus;
  priorityScore: number; // 0 - 100
  recurrenceCount: number;
  isRecurring: boolean;
  recurringIssueId?: string;
  aiAnalysis?: AIAnalysisResult;
  assignedTaskId?: string;
}

export interface WorkflowHistoryEntry {
  id: string;
  action: string;
  actor: string;
  actorRole: string;
  timestamp: string;
  details?: string;
}

export interface CorrectiveActionTask {
  id: string;
  feedbackId: string;
  feedbackRef: string;
  branchId: string;
  branchName: string;
  title: string;
  description: string;
  assignedToStaffId: string;
  assignedToStaffName: string;
  severity: SeverityLevel;
  priority: SeverityLevel;
  proposedDeadline: string;
  approvedDeadline: string;
  isScheduleApproved: boolean;
  approvedBySupervisorId?: string;
  approvedByName?: string;
  approvedAt?: string;
  status: TaskStatus;
  completionNote?: string;
  completionPhotoUrl?: string;
  completedAt?: string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationNote?: string;
  verifiedBySupervisorId?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  rejectionCount: number;
  isEscalated: boolean;
  closedAt?: string;
  workflowHistory: WorkflowHistoryEntry[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type:
    | 'SEVERE_ALERT'
    | 'NEW_FEEDBACK'
    | 'TASK_ASSIGNED'
    | 'AWAITING_VERIFICATION'
    | 'TASK_REJECTED'
    | 'OVERDUE_TASK'
    | 'RECURRING_ESCALATION';
  targetRoles: UserRole[];
  branchId?: string;
  staffId?: string;
  relatedRecordType: 'FEEDBACK' | 'TASK' | 'BRANCH';
  relatedRecordId: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: 'FEEDBACK' | 'TASK' | 'STAFF' | 'BRANCH' | 'SCHEDULE' | 'SYSTEM';
  entityId: string;
  details: string;
  branchId?: string;
}

export interface FeedbackFilterOptions {
  searchQuery: string;
  branchId: string;
  dateRange: 'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM';
  customStartDate?: string;
  customEndDate?: string;
  rating: number | 'ALL';
  category: string | 'ALL';
  severity: SeverityLevel | 'ALL';
  workflowStatus: WorkflowStatus | 'ALL';
  sortBy: 'PRIORITY_DESC' | 'DATE_DESC' | 'DATE_ASC' | 'RATING_ASC' | 'RATING_DESC';
}
