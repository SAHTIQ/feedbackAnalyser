import {
  Branch,
  UserProfile,
  FeedbackSubmission,
  CorrectiveActionTask,
  NotificationItem,
  AuditLogEntry,
  FeedbackFilterOptions,
  SeverityLevel,
  UserRole,
} from '../types';
import {
  MOCK_BRANCHES,
  MOCK_USERS,
  INITIAL_FEEDBACK,
  INITIAL_TASKS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
} from '../data/mockData';

const STORAGE_KEYS = {
  BRANCHES: 'feedbackiq_branches_v2',
  USERS: 'feedbackiq_users_v2',
  FEEDBACK: 'feedbackiq_feedback_v2',
  TASKS: 'feedbackiq_tasks_v2',
  NOTIFICATIONS: 'feedbackiq_notifications_v2',
  AUDIT_LOGS: 'feedbackiq_audit_logs_v2',
};

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(item);
  } catch {
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
}

// Simulated async delay
const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

class MockApiService {
  // Branches
  async getBranches(): Promise<Branch[]> {
    await delay();
    return getStorage<Branch[]>(STORAGE_KEYS.BRANCHES, MOCK_BRANCHES);
  }

  // Users
  async getUsers(): Promise<UserProfile[]> {
    await delay();
    return getStorage<UserProfile[]>(STORAGE_KEYS.USERS, MOCK_USERS);
  }

  async updateStaffStatus(userId: string, active: boolean, actorName = 'Admin'): Promise<UserProfile> {
    await delay();
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, MOCK_USERS);
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');

    users[userIndex] = { ...users[userIndex], active };
    setStorage(STORAGE_KEYS.USERS, users);

    await this.addAuditLog({
      actorName,
      actorRole: 'ADMIN',
      action: active ? 'STAFF_ACCOUNT_ACTIVATED' : 'STAFF_ACCOUNT_DEACTIVATED',
      entityType: 'STAFF',
      entityId: userId,
      details: `User ${users[userIndex].name} account marked as ${active ? 'Active' : 'Inactive'}. Open duties require reassignment.`,
    });

    return users[userIndex];
  }

  async updateStaffAssignment(userId: string, branchIds: string[], actorName = 'Admin'): Promise<UserProfile> {
    await delay();
    const users = getStorage<UserProfile[]>(STORAGE_KEYS.USERS, MOCK_USERS);
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');

    users[userIndex] = { ...users[userIndex], branchIds };
    setStorage(STORAGE_KEYS.USERS, users);

    await this.addAuditLog({
      actorName,
      actorRole: 'ADMIN',
      action: 'STAFF_BRANCH_REASSIGNED',
      entityType: 'STAFF',
      entityId: userId,
      details: `Updated branch assignments to: ${branchIds.join(', ')}`,
    });

    return users[userIndex];
  }

  // Feedback
  async getFeedbackList(filters?: Partial<FeedbackFilterOptions>): Promise<FeedbackSubmission[]> {
    await delay();
    let list = getStorage<FeedbackSubmission[]>(STORAGE_KEYS.FEEDBACK, INITIAL_FEEDBACK);

    if (!filters) return list;

    if (filters.branchId && filters.branchId !== 'ALL') {
      list = list.filter((fb) => fb.branchId === filters.branchId);
    }

    if (filters.severity && filters.severity !== 'ALL') {
      list = list.filter((fb) => fb.severity === filters.severity);
    }

    if (filters.workflowStatus && filters.workflowStatus !== 'ALL') {
      list = list.filter((fb) => fb.workflowStatus === filters.workflowStatus);
    }

    if (filters.rating && filters.rating !== 'ALL') {
      list = list.filter((fb) => fb.rating === filters.rating);
    }

    if (filters.category && filters.category !== 'ALL') {
      list = list.filter((fb) => fb.categories.includes(filters.category as string));
    }

    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase().trim();
      list = list.filter((fb) =>
        fb.referenceId.toLowerCase().includes(q) ||
        fb.branchName.toLowerCase().includes(q) ||
        (fb.comments && fb.comments.toLowerCase().includes(q)) ||
        fb.categories.some((c) => c.toLowerCase().includes(q)) ||
        fb.selectedTags.some((t) => t.toLowerCase().includes(q)) ||
        (fb.otherTagText && fb.otherTagText.toLowerCase().includes(q))
      );
    }

    // Sorting
    const sort = filters.sortBy || 'PRIORITY_DESC';
    list = [...list].sort((a, b) => {
      if (sort === 'PRIORITY_DESC') {
        return b.priorityScore - a.priorityScore;
      }
      if (sort === 'DATE_DESC') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sort === 'DATE_ASC') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sort === 'RATING_ASC') {
        return a.rating - b.rating;
      }
      if (sort === 'RATING_DESC') {
        return b.rating - a.rating;
      }
      return 0;
    });

    return list;
  }

  async getFeedbackById(id: string): Promise<FeedbackSubmission | undefined> {
    await delay();
    const list = getStorage<FeedbackSubmission[]>(STORAGE_KEYS.FEEDBACK, INITIAL_FEEDBACK);
    return list.find((fb) => fb.id === id || fb.referenceId === id);
  }

  async getFeedbackByTracking(referenceId: string, accessToken: string): Promise<FeedbackSubmission | undefined> {
    await delay(300);
    const list = getStorage<FeedbackSubmission[]>(STORAGE_KEYS.FEEDBACK, INITIAL_FEEDBACK);
    return list.find(
      (fb) =>
        fb.referenceId.trim().toUpperCase() === referenceId.trim().toUpperCase() &&
        fb.accessToken.trim().toUpperCase() === accessToken.trim().toUpperCase()
    );
  }

  async submitFeedback(data: {
    branchId: string;
    branchName: string;
    rating: number;
    categories: string[];
    selectedTags: string[];
    otherTagText?: string;
    comments?: string;
    customerName?: string;
    customerContact?: string;
    isAnonymous: boolean;
  }): Promise<FeedbackSubmission> {
    await delay(400);

    const randomNum = Math.floor(100 + Math.random() * 900);
    const randomToken = Math.floor(1000 + Math.random() * 9000);
    const referenceId = `FB-2026-${randomNum}`;
    const accessToken = `TK-${randomToken}`;
    const now = new Date().toISOString();

    // Determine initial severity based on rating and critical tags
    let severity: SeverityLevel = 'LOW';
    let sentiment: FeedbackSubmission['sentiment'] = 'POSITIVE';
    let priorityScore = 20;

    const criticalTags = ['Undercooked', 'Dirty tables', 'Unclean utensils', 'Cleanliness concern'];
    const hasCriticalTag = data.selectedTags.some((t) => criticalTags.includes(t)) ||
      (data.otherTagText && data.otherTagText.toLowerCase().includes('poison'));

    if (data.rating <= 2 || hasCriticalTag) {
      sentiment = 'NEGATIVE';
      if (data.rating === 1 && hasCriticalTag) {
        severity = 'CRITICAL';
        priorityScore = 95;
      } else if (data.rating <= 2) {
        severity = 'HIGH';
        priorityScore = 78;
      } else {
        severity = 'MEDIUM';
        priorityScore = 55;
      }
    } else if (data.rating === 3) {
      sentiment = 'MIXED';
      severity = 'MEDIUM';
      priorityScore = 48;
    } else {
      sentiment = 'POSITIVE';
      severity = 'LOW';
      priorityScore = Math.max(10, 30 - data.rating * 4);
    }

    const newFeedback: FeedbackSubmission = {
      id: `fb-${Date.now()}`,
      referenceId,
      accessToken,
      branchId: data.branchId,
      branchName: data.branchName,
      rating: data.rating,
      categories: data.categories,
      selectedTags: data.selectedTags,
      otherTagText: data.otherTagText,
      comments: data.comments,
      customerName: data.customerName,
      customerContact: data.customerContact,
      isAnonymous: data.isAnonymous,
      createdAt: now,
      sentiment,
      severity,
      workflowStatus: severity === 'LOW' ? 'CLOSED' : 'NEW',
      priorityScore,
      recurrenceCount: 1,
      isRecurring: false,
      aiAnalysis: {
        id: `ai-${Date.now()}`,
        feedbackId: `fb-${Date.now()}`,
        status: 'COMPLETED',
        sentiment,
        sentimentScore: sentiment === 'NEGATIVE' ? -0.85 : sentiment === 'MIXED' ? 0.1 : 0.9,
        detectedTopics: data.categories,
        suggestedSeverity: severity,
        calculatedPriorityScore: priorityScore,
        confidenceScore: 0.92,
        recurrenceProbability: 0.35,
        linkedHistoricalComplaintIds: [],
        severeAlertTriggered: severity === 'CRITICAL' || severity === 'HIGH',
        severeAlertReason:
          severity === 'CRITICAL'
            ? 'Urgent food safety or hygiene keyword flagged by intake filter'
            : undefined,
        analyzedAt: now,
        suggestedRootCauses:
          sentiment === 'NEGATIVE'
            ? [
                {
                  cause: `Potential standard operating procedure failure in ${data.categories.join(' / ')}`,
                  confidence: 0.81,
                  isHypothesis: true,
                  evidence: `Guest reported: "${data.selectedTags.join(', ')}" with rating ${data.rating}/5.`,
                },
              ]
            : [],
        recommendedActions:
          sentiment === 'NEGATIVE'
            ? [
                {
                  id: `act-${Date.now()}`,
                  title: `Audit and review ${data.categories[0] || 'service'} guidelines`,
                  description: `Conduct immediate verification and log corrective measure at ${data.branchName}.`,
                  targetRole: 'KITCHEN_STAFF',
                  suggestedDeadlineHours: severity === 'CRITICAL' ? 4 : 24,
                  priority: severity,
                },
              ]
            : [],
        analysisTimeline: [
          { step: 'Customer Submission Ingested', timestamp: now, status: 'DONE' },
          { step: 'NLP Category & Sentiment Parsed', timestamp: now, status: 'DONE' },
          { step: 'AI Suggestions Generated', timestamp: now, status: 'DONE' },
        ],
      },
    };

    const list = getStorage<FeedbackSubmission[]>(STORAGE_KEYS.FEEDBACK, INITIAL_FEEDBACK);
    list.unshift(newFeedback);
    setStorage(STORAGE_KEYS.FEEDBACK, list);

    // Notifications
    if (newFeedback.aiAnalysis?.severeAlertTriggered) {
      await this.addNotification({
        title: `HIGH SEVERITY ALERT: ${newFeedback.branchName}`,
        message: `New feedback ${referenceId} scored priority ${priorityScore} (${newFeedback.selectedTags.join(', ')})`,
        type: 'SEVERE_ALERT',
        targetRoles: ['SUPERVISOR', 'ADMIN'],
        branchId: newFeedback.branchId,
        relatedRecordType: 'FEEDBACK',
        relatedRecordId: newFeedback.id,
      });
    }

    await this.addAuditLog({
      actorName: data.isAnonymous ? 'Anonymous Diner' : (data.customerName || 'Customer'),
      actorRole: 'CUSTOMER',
      action: 'FEEDBACK_SUBMITTED',
      entityType: 'FEEDBACK',
      entityId: newFeedback.id,
      details: `New feedback submitted for ${data.branchName} with ${data.rating} stars. Ref: ${referenceId}`,
      branchId: data.branchId,
    });

    return newFeedback;
  }

  async overrideSeverity(
    feedbackId: string,
    newSeverity: SeverityLevel,
    reason: string,
    supervisorName: string
  ): Promise<FeedbackSubmission> {
    await delay();
    const list = getStorage<FeedbackSubmission[]>(STORAGE_KEYS.FEEDBACK, INITIAL_FEEDBACK);
    const fb = list.find((item) => item.id === feedbackId);
    if (!fb) throw new Error('Feedback not found');

    const originalSeverity = fb.originalSeverity || fb.severity;
    fb.originalSeverity = originalSeverity;
    fb.severity = newSeverity;
    fb.severityOverrideReason = reason;
    fb.severityOverriddenBy = supervisorName;
    fb.severityOverriddenAt = new Date().toISOString();

    // Adjust priority score
    const weightMap: Record<SeverityLevel, number> = {
      CRITICAL: 95,
      HIGH: 75,
      MEDIUM: 50,
      LOW: 20,
    };
    fb.priorityScore = weightMap[newSeverity];

    setStorage(STORAGE_KEYS.FEEDBACK, list);

    await this.addAuditLog({
      actorName: supervisorName,
      actorRole: 'SUPERVISOR',
      action: 'SEVERITY_OVERRIDDEN',
      entityType: 'FEEDBACK',
      entityId: feedbackId,
      details: `Severity changed from ${originalSeverity} to ${newSeverity}. Reason: "${reason}"`,
      branchId: fb.branchId,
    });

    return fb;
  }

  // Tasks
  async getTasks(filter?: { branchId?: string; staffId?: string; status?: string }): Promise<CorrectiveActionTask[]> {
    await delay();
    let list = getStorage<CorrectiveActionTask[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);

    if (!filter) return list;

    if (filter.branchId && filter.branchId !== 'ALL') {
      list = list.filter((t) => t.branchId === filter.branchId);
    }
    if (filter.staffId && filter.staffId !== 'ALL') {
      list = list.filter((t) => t.assignedToStaffId === filter.staffId);
    }
    if (filter.status && filter.status !== 'ALL') {
      list = list.filter((t) => t.status === filter.status);
    }

    return list;
  }

  async getTaskById(id: string): Promise<CorrectiveActionTask | undefined> {
    await delay();
    const list = getStorage<CorrectiveActionTask[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
    return list.find((t) => t.id === id);
  }

  async createTaskFromFeedback(params: {
    feedbackId: string;
    title: string;
    description: string;
    assignedStaffId: string;
    assignedStaffName: string;
    severity: SeverityLevel;
    proposedDeadline: string;
    supervisorName: string;
    autoApproveSchedule?: boolean;
  }): Promise<CorrectiveActionTask> {
    await delay();
    const feedbackList = getStorage<FeedbackSubmission[]>(STORAGE_KEYS.FEEDBACK, INITIAL_FEEDBACK);
    const fb = feedbackList.find((f) => f.id === params.feedbackId);
    if (!fb) throw new Error('Feedback not found');

    const now = new Date().toISOString();
    const taskId = `task-${Date.now()}`;

    const newTask: CorrectiveActionTask = {
      id: taskId,
      feedbackId: fb.id,
      feedbackRef: fb.referenceId,
      branchId: fb.branchId,
      branchName: fb.branchName,
      title: params.title,
      description: params.description,
      assignedToStaffId: params.assignedStaffId,
      assignedToStaffName: params.assignedStaffName,
      severity: params.severity,
      priority: params.severity,
      proposedDeadline: params.proposedDeadline,
      approvedDeadline: params.proposedDeadline,
      isScheduleApproved: !!params.autoApproveSchedule,
      approvedByName: params.autoApproveSchedule ? params.supervisorName : undefined,
      approvedAt: params.autoApproveSchedule ? now : undefined,
      status: params.autoApproveSchedule ? 'ASSIGNED' : 'AWAITING_SCHEDULE_APPROVAL',
      rejectionCount: 0,
      isEscalated: false,
      workflowHistory: [
        {
          id: `wh-${Date.now()}`,
          action: params.autoApproveSchedule ? 'TASK_CREATED_AND_ASSIGNED' : 'TASK_PROPOSED_AWAITING_SCHEDULE',
          actor: params.supervisorName,
          actorRole: 'SUPERVISOR',
          timestamp: now,
          details: `Corrective action task created from feedback ${fb.referenceId}`,
        },
      ],
    };

    const taskList = getStorage<CorrectiveActionTask[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
    taskList.unshift(newTask);
    setStorage(STORAGE_KEYS.TASKS, taskList);

    // Update linked feedback status
    fb.assignedTaskId = taskId;
    fb.workflowStatus = 'ACTION_IN_PROGRESS';
    setStorage(STORAGE_KEYS.FEEDBACK, feedbackList);

    // Notify staff
    await this.addNotification({
      title: 'New Corrective Task Assigned',
      message: `You were assigned: "${params.title}" at ${fb.branchName}.`,
      type: 'TASK_ASSIGNED',
      targetRoles: ['KITCHEN_STAFF'],
      branchId: fb.branchId,
      staffId: params.assignedStaffId,
      relatedRecordType: 'TASK',
      relatedRecordId: taskId,
    });

    await this.addAuditLog({
      actorName: params.supervisorName,
      actorRole: 'SUPERVISOR',
      action: 'CORRECTIVE_ACTION_CREATED',
      entityType: 'TASK',
      entityId: taskId,
      details: `Created task "${params.title}" assigned to ${params.assignedStaffName}.`,
      branchId: fb.branchId,
    });

    return newTask;
  }

  async approveTaskSchedule(
    taskId: string,
    approvedDeadline: string,
    supervisorId: string,
    supervisorName: string
  ): Promise<CorrectiveActionTask> {
    await delay();
    const taskList = getStorage<CorrectiveActionTask[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
    const task = taskList.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');

    const now = new Date().toISOString();
    task.approvedDeadline = approvedDeadline;
    task.isScheduleApproved = true;
    task.approvedBySupervisorId = supervisorId;
    task.approvedByName = supervisorName;
    task.approvedAt = now;
    task.status = 'ASSIGNED';

    task.workflowHistory.push({
      id: `wh-${Date.now()}`,
      action: 'SCHEDULE_APPROVED',
      actor: supervisorName,
      actorRole: 'SUPERVISOR',
      timestamp: now,
      details: `Deadline approved: ${new Date(approvedDeadline).toLocaleString()}`,
    });

    setStorage(STORAGE_KEYS.TASKS, taskList);

    await this.addNotification({
      title: 'Task Schedule Approved',
      message: `Schedule approved for "${task.title}". Execution deadline: ${new Date(approvedDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      type: 'TASK_ASSIGNED',
      targetRoles: ['KITCHEN_STAFF'],
      branchId: task.branchId,
      staffId: task.assignedToStaffId,
      relatedRecordType: 'TASK',
      relatedRecordId: task.id,
    });

    await this.addAuditLog({
      actorName: supervisorName,
      actorRole: 'SUPERVISOR',
      action: 'TASK_SCHEDULE_APPROVED',
      entityType: 'TASK',
      entityId: taskId,
      details: `Supervisor approved deadline of ${approvedDeadline}`,
      branchId: task.branchId,
    });

    return task;
  }

  async startTask(taskId: string, staffName: string): Promise<CorrectiveActionTask> {
    await delay();
    const taskList = getStorage<CorrectiveActionTask[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
    const task = taskList.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');

    const now = new Date().toISOString();
    task.status = 'IN_PROGRESS';
    task.workflowHistory.push({
      id: `wh-${Date.now()}`,
      action: 'TASK_STARTED',
      actor: staffName,
      actorRole: 'KITCHEN_STAFF',
      timestamp: now,
      details: 'Kitchen staff began corrective procedure.',
    });

    setStorage(STORAGE_KEYS.TASKS, taskList);
    return task;
  }

  async submitTaskCompletion(
    taskId: string,
    completionNote: string,
    photoUrl: string | undefined,
    staffName: string
  ): Promise<CorrectiveActionTask> {
    await delay();
    const taskList = getStorage<CorrectiveActionTask[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
    const task = taskList.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');

    const now = new Date().toISOString();
    task.status = 'COMPLETED_AWAITING_VERIFICATION';
    task.completionNote = completionNote;
    task.completionPhotoUrl = photoUrl;
    task.completedAt = now;
    task.verificationStatus = 'PENDING';

    task.workflowHistory.push({
      id: `wh-${Date.now()}`,
      action: 'TASK_COMPLETED_AWAITING_VERIFICATION',
      actor: staffName,
      actorRole: 'KITCHEN_STAFF',
      timestamp: now,
      details: `Completion note logged: "${completionNote}". Photo attached: ${photoUrl ? 'Yes' : 'No'}.`,
    });

    setStorage(STORAGE_KEYS.TASKS, taskList);

    // Notify Supervisor
    await this.addNotification({
      title: 'Action Evidence Awaiting Verification',
      message: `${staffName} submitted completion evidence for "${task.title}".`,
      type: 'AWAITING_VERIFICATION',
      targetRoles: ['SUPERVISOR'],
      branchId: task.branchId,
      relatedRecordType: 'TASK',
      relatedRecordId: task.id,
    });

    await this.addAuditLog({
      actorName: staffName,
      actorRole: 'KITCHEN_STAFF',
      action: 'TASK_EVIDENCE_SUBMITTED',
      entityType: 'TASK',
      entityId: taskId,
      details: `Completion note submitted for task "${task.title}".`,
      branchId: task.branchId,
    });

    return task;
  }

  async verifyTaskCompletion(
    taskId: string,
    verificationNote: string,
    supervisorId: string,
    supervisorName: string
  ): Promise<CorrectiveActionTask> {
    await delay();
    const taskList = getStorage<CorrectiveActionTask[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
    const task = taskList.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');

    const now = new Date().toISOString();
    task.status = 'VERIFIED_CLOSED';
    task.verificationStatus = 'VERIFIED';
    task.verificationNote = verificationNote;
    task.verifiedBySupervisorId = supervisorId;
    task.verifiedByName = supervisorName;
    task.verifiedAt = now;
    task.closedAt = now;

    task.workflowHistory.push({
      id: `wh-${Date.now()}`,
      action: 'TASK_VERIFIED_AND_CLOSED',
      actor: supervisorName,
      actorRole: 'SUPERVISOR',
      timestamp: now,
      details: `Supervisor verified resolution: "${verificationNote}"`,
    });

    setStorage(STORAGE_KEYS.TASKS, taskList);

    // Also update linked feedback
    const feedbackList = getStorage<FeedbackSubmission[]>(STORAGE_KEYS.FEEDBACK, INITIAL_FEEDBACK);
    const fb = feedbackList.find((f) => f.id === task.feedbackId);
    if (fb) {
      fb.workflowStatus = 'VERIFIED_RESOLVED';
      setStorage(STORAGE_KEYS.FEEDBACK, feedbackList);
    }

    await this.addAuditLog({
      actorName: supervisorName,
      actorRole: 'SUPERVISOR',
      action: 'WORKFLOW_VERIFIED_AND_CLOSED',
      entityType: 'TASK',
      entityId: taskId,
      details: `Verified completion note: "${verificationNote}". Workflow closed.`,
      branchId: task.branchId,
    });

    return task;
  }

  async rejectTaskCompletion(
    taskId: string,
    rejectionReason: string,
    supervisorName: string
  ): Promise<CorrectiveActionTask> {
    await delay();
    const taskList = getStorage<CorrectiveActionTask[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);
    const task = taskList.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');

    const now = new Date().toISOString();
    task.status = 'REJECTED_REOPENED';
    task.verificationStatus = 'REJECTED';
    task.rejectionReason = rejectionReason;
    task.rejectionCount = (task.rejectionCount || 0) + 1;
    if (task.rejectionCount >= 2) {
      task.isEscalated = true;
      task.priority = 'CRITICAL';
    }

    task.workflowHistory.push({
      id: `wh-${Date.now()}`,
      action: 'COMPLETION_REJECTED',
      actor: supervisorName,
      actorRole: 'SUPERVISOR',
      timestamp: now,
      details: `Rejected. Mandatory reason: "${rejectionReason}". Returned to ${task.assignedToStaffName}.`,
    });

    setStorage(STORAGE_KEYS.TASKS, taskList);

    // Notify kitchen staff
    await this.addNotification({
      title: 'Action Evidence Rejected',
      message: `Your task "${task.title}" was returned. Reason: "${rejectionReason}"`,
      type: 'TASK_REJECTED',
      targetRoles: ['KITCHEN_STAFF'],
      branchId: task.branchId,
      staffId: task.assignedToStaffId,
      relatedRecordType: 'TASK',
      relatedRecordId: task.id,
    });

    await this.addAuditLog({
      actorName: supervisorName,
      actorRole: 'SUPERVISOR',
      action: 'TASK_EVIDENCE_REJECTED',
      entityType: 'TASK',
      entityId: taskId,
      details: `Rejected evidence. Reason: "${rejectionReason}". Escalation: ${task.isEscalated}`,
      branchId: task.branchId,
    });

    return task;
  }

  // Notifications
  async getNotifications(role: UserRole, staffId?: string, branchIds?: string[]): Promise<NotificationItem[]> {
    await delay();
    const list = getStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);

    return list.filter((notif) => {
      // Role match
      if (!notif.targetRoles.includes(role)) return false;

      // Staff match for kitchen staff
      if (role === 'KITCHEN_STAFF' && notif.staffId && notif.staffId !== staffId) {
        return false;
      }

      // Branch match for supervisor
      if (role === 'SUPERVISOR' && notif.branchId && branchIds && branchIds.length > 0) {
        if (!branchIds.includes(notif.branchId)) return false;
      }

      return true;
    });
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await delay(50);
    const list = getStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const item = list.find((n) => n.id === id);
    if (item) {
      item.isRead = true;
      setStorage(STORAGE_KEYS.NOTIFICATIONS, list);
    }
  }

  async markAllNotificationsAsRead(ids: string[]): Promise<void> {
    await delay(50);
    const list = getStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    list.forEach((n) => {
      if (ids.includes(n.id)) n.isRead = true;
    });
    setStorage(STORAGE_KEYS.NOTIFICATIONS, list);
  }

  private async addNotification(notif: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>): Promise<void> {
    const list = getStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const newItem: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    list.unshift(newItem);
    setStorage(STORAGE_KEYS.NOTIFICATIONS, list);
  }

  // Audit Logs
  async getAuditLogs(filter?: { branchId?: string; entityType?: string }): Promise<AuditLogEntry[]> {
    await delay();
    let list = getStorage<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);

    if (filter?.branchId && filter.branchId !== 'ALL') {
      list = list.filter((a) => !a.branchId || a.branchId === filter.branchId);
    }
    if (filter?.entityType && filter.entityType !== 'ALL') {
      list = list.filter((a) => a.entityType === filter.entityType);
    }

    return list;
  }

  private async addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const list = getStorage<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    list.unshift(newEntry);
    setStorage(STORAGE_KEYS.AUDIT_LOGS, list);
  }

  // Derived Dashboard Metrics & Report Calculation
  async getDashboardMetrics(branchIds?: string[]) {
    await delay();
    let feedbacks = getStorage<FeedbackSubmission[]>(STORAGE_KEYS.FEEDBACK, INITIAL_FEEDBACK);
    let tasks = getStorage<CorrectiveActionTask[]>(STORAGE_KEYS.TASKS, INITIAL_TASKS);

    if (branchIds && branchIds.length > 0) {
      feedbacks = feedbacks.filter((f) => branchIds.includes(f.branchId));
      tasks = tasks.filter((t) => branchIds.includes(t.branchId));
    }

    const totalFeedback = feedbacks.length;
    const avgRating = totalFeedback > 0 ? Number((feedbacks.reduce((acc, f) => acc + f.rating, 0) / totalFeedback).toFixed(1)) : 0;
    const severeIssues = feedbacks.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH').length;
    const pendingActions = tasks.filter(
      (t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS' || t.status === 'AWAITING_SCHEDULE_APPROVAL' || t.status === 'REJECTED_REOPENED'
    ).length;
    const verifiedResolved = feedbacks.filter((f) => f.workflowStatus === 'VERIFIED_RESOLVED' || f.workflowStatus === 'CLOSED').length;

    // Severe issues requiring immediate attention list
    const severeAlerts = feedbacks
      .filter((f) => (f.severity === 'CRITICAL' || f.severity === 'HIGH') && f.workflowStatus !== 'VERIFIED_RESOLVED' && f.workflowStatus !== 'CLOSED')
      .slice(0, 5);

    // High priority feedback list
    const highPriorityFeedbacks = [...feedbacks]
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 6);

    // Category distribution derived from actual records
    const categoryCounts: Record<string, number> = {};
    feedbacks.forEach((f) => {
      f.categories.forEach((cat) => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    });
    const categoryDistribution = Object.entries(categoryCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // Rating distribution
    const ratingDist = [1, 2, 3, 4, 5].map((stars) => {
      const count = feedbacks.filter((f) => f.rating === stars).length;
      return {
        stars: `${stars} Stars`,
        count,
        percentage: totalFeedback > 0 ? Math.round((count / totalFeedback) * 100) : 0,
      };
    });

    return {
      totalFeedback,
      avgRating,
      severeIssues,
      pendingActions,
      verifiedResolved,
      severeAlerts,
      highPriorityFeedbacks,
      categoryDistribution,
      ratingDist,
    };
  }

  // Reset to factory defaults
  resetAllData() {
    localStorage.removeItem(STORAGE_KEYS.BRANCHES);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.FEEDBACK);
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
  }
}

export const mockApiService = new MockApiService();
