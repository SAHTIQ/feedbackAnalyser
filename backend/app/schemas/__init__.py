from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr


# Auth Schemas
class LoginRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    persona: Optional[str] = None  # Quick login: 'admin', 'supervisor', 'kitchen', 'kitchen-2'


class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    avatar: Optional[str] = None
    is_active: bool
    branch_ids: List[str] = []

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileResponse


# User Management Schemas
class UserStatusUpdate(BaseModel):
    is_active: bool


class UserBranchAssignmentUpdate(BaseModel):
    branch_ids: List[str]


# Branch Schemas
class BranchBase(BaseModel):
    code: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    manager_name: Optional[str] = None


class BranchCreate(BranchBase):
    pass


class BranchResponse(BranchBase):
    id: str
    is_active: bool

    model_config = {"from_attributes": True}


# Analysis Result Schema
class RootCauseItem(BaseModel):
    cause: str
    confidence: float
    isHypothesis: bool = True
    evidence: str


class RecommendedActionItem(BaseModel):
    id: str
    title: str
    description: str
    targetRole: str
    suggestedDeadlineHours: int
    priority: str


class AnalysisResultResponse(BaseModel):
    id: str
    status: str
    sentiment: str
    sentiment_score: Optional[float] = None
    detected_topics: List[str] = []
    suggested_root_causes: List[RootCauseItem] = []
    recommended_actions: List[RecommendedActionItem] = []
    severity: str
    confidence_score: Optional[float] = None
    recurrence_probability: Optional[float] = None
    severe_alert_triggered: bool = False
    severe_alert_reason: Optional[str] = None
    analysis_timeline: Optional[List[Dict[str, Any]]] = None
    analyzed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# Feedback Schemas
class FeedbackCreate(BaseModel):
    location_id: str
    rating: int = Field(..., ge=1, le=5)
    categories: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    other_tag_text: Optional[str] = None
    comment: Optional[str] = None
    customer_name: Optional[str] = None
    customer_contact: Optional[str] = None
    is_anonymous: bool = False


class FeedbackResponse(BaseModel):
    id: str
    reference_id: str
    access_token: str
    location_id: str
    branch_name: Optional[str] = None
    rating: int
    categories: List[str] = []
    tags: List[str] = []
    other_tag_text: Optional[str] = None
    comment: Optional[str] = None
    customer_name: Optional[str] = None
    customer_contact: Optional[str] = None
    is_anonymous: bool
    sentiment: str
    severity: str
    original_severity: Optional[str] = None
    severity_override_reason: Optional[str] = None
    severity_overridden_by: Optional[str] = None
    severity_overridden_at: Optional[datetime] = None
    workflow_status: str
    priority_score: float
    is_recurring: bool
    recurrence_count: int
    created_at: datetime
    ai_analysis: Optional[AnalysisResultResponse] = None
    assigned_task_id: Optional[str] = None

    model_config = {"from_attributes": True}


class MilestoneItem(BaseModel):
    title: str
    description: str
    completed: bool
    current: bool
    date: Optional[str] = None


class FeedbackTrackResponse(BaseModel):
    reference_id: str
    branch_name: str
    rating: int
    categories: List[str] = []
    tags: List[str] = []
    workflow_status: str
    created_at: datetime
    milestones: List[MilestoneItem]
    resolution_summary: str


class SeverityOverrideRequest(BaseModel):
    new_severity: str = Field(..., pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    reason: str = Field(..., min_length=3)


# Action Task Schemas
class ActionTaskCreate(BaseModel):
    feedback_id: str
    title: str
    description: str
    assigned_user_id: str
    severity: str = "MEDIUM"
    proposed_deadline: datetime
    auto_approve_schedule: bool = False


class WorkflowHistoryItem(BaseModel):
    id: str
    action: str
    actor: str
    actorRole: str
    timestamp: str
    details: Optional[str] = None


class ActionTaskResponse(BaseModel):
    id: str
    feedback_id: Optional[str] = None
    feedback_ref: Optional[str] = None
    location_id: Optional[str] = None
    branch_name: Optional[str] = None
    title: str
    description: str
    assigned_user_id: Optional[str] = None
    assigned_user_name: Optional[str] = None
    severity: str
    priority: str
    proposed_deadline: Optional[datetime] = None
    approved_deadline: Optional[datetime] = None
    is_schedule_approved: bool
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    status: str
    completion_notes: Optional[str] = None
    completion_photo_url: Optional[str] = None
    completed_at: Optional[datetime] = None
    verification_status: Optional[str] = None
    verification_note: Optional[str] = None
    verified_by_name: Optional[str] = None
    verified_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    rejection_count: int
    is_escalated: bool
    closed_at: Optional[datetime] = None
    workflow_history: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskScheduleApproveRequest(BaseModel):
    approved_deadline: datetime


class TaskCompleteRequest(BaseModel):
    completion_notes: str = Field(..., min_length=3)
    completion_photo_url: Optional[str] = None


class TaskVerifyRequest(BaseModel):
    verification_note: str = Field(default="Verified by supervisor.")


class TaskRejectRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=3)


# Notification Schemas
class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    notification_type: str
    target_roles: List[str]
    branch_id: Optional[str] = None
    staff_id: Optional[str] = None
    related_record_type: str
    related_record_id: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: str
    timestamp: datetime
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    entity_type: str
    entity_id: str
    details: Optional[str] = None
    branch_id: Optional[str] = None

    model_config = {"from_attributes": True}


# Metrics Schemas
class DashboardMetricsResponse(BaseModel):
    total_feedback: int
    avg_rating: float
    severe_issues: int
    pending_actions: int
    verified_resolved: int
    severe_alerts: List[FeedbackResponse]
    high_priority_feedbacks: List[FeedbackResponse]
    category_distribution: List[Dict[str, Any]]
    rating_dist: List[Dict[str, Any]]
