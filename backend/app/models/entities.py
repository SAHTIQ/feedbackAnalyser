import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Date,
    ForeignKey, Text, JSON, Table, Index
)
from sqlalchemy.orm import relationship
from app.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# Many-to-many junction table for staff to authorized locations/branches
branch_staff_assignments = Table(
    "branch_staff_assignments",
    Base.metadata,
    Column("user_id", String(36), ForeignKey("user_profiles.id", ondelete="CASCADE"), primary_key=True),
    Column("location_id", String(36), ForeignKey("locations.id", ondelete="CASCADE"), primary_key=True),
)


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    locations = relationship("Location", back_populates="organization", cascade="all, delete-orphan")
    users = relationship("UserProfile", back_populates="organization", cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="organization")
    issues = relationship("Issue", back_populates="organization")
    alerts = relationship("Alert", back_populates="organization")
    weekly_reports = relationship("WeeklyReport", back_populates="organization")
    audit_logs = relationship("AuditLog", back_populates="organization")
    notifications = relationship("Notification", back_populates="organization", cascade="all, delete-orphan")


class Location(Base):
    __tablename__ = "locations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(50), nullable=True, index=True)  # BR-01, BR-02
    name = Column(String(255), nullable=False)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    manager_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="locations")
    feedback = relationship("Feedback", back_populates="location")
    issues = relationship("Issue", back_populates="location")
    assigned_staff = relationship("UserProfile", secondary=branch_staff_assignments, back_populates="assigned_locations")
    action_tasks = relationship("ActionTask", back_populates="location")
    notifications = relationship("Notification", back_populates="location")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    supabase_user_id = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="KITCHEN_STAFF")  # ADMIN, SUPERVISOR, KITCHEN_STAFF, CUSTOMER
    department = Column(String(100), nullable=True)
    avatar = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="users")
    assigned_tasks = relationship("ActionTask", back_populates="assigned_user", foreign_keys="ActionTask.assigned_user_id")
    assigned_locations = relationship("Location", secondary=branch_staff_assignments, back_populates="assigned_staff")
    notifications = relationship("Notification", back_populates="staff")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    location_id = Column(String(36), ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_id = Column(String(36), ForeignKey("issues.id", ondelete="SET NULL"), nullable=True, index=True)
    
    reference_id = Column(String(50), unique=True, nullable=True, index=True)  # e.g. FB-2026-901
    access_token = Column(String(50), nullable=True, index=True)  # e.g. TK-8412
    
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=False)  # guest comments
    categories = Column(JSON, nullable=True)  # e.g. ["Food Quality", "Service"]
    tags = Column(JSON, nullable=True)  # e.g. ["Undercooked", "Cold food"]
    other_tag_text = Column(Text, nullable=True)
    customer_name = Column(String(100), nullable=True)
    customer_contact = Column(String(100), nullable=True)
    is_anonymous = Column(Boolean, default=False, nullable=False)
    
    sentiment = Column(String(50), default="NEUTRAL", nullable=False)  # POSITIVE, NEUTRAL, NEGATIVE, MIXED
    severity = Column(String(50), default="LOW", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    original_severity = Column(String(50), nullable=True)
    severity_override_reason = Column(Text, nullable=True)
    severity_overridden_by = Column(String(100), nullable=True)
    severity_overridden_at = Column(DateTime, nullable=True)
    
    workflow_status = Column(String(50), default="NEW", nullable=False, index=True)  # NEW, ANALYSIS_COMPLETED, ACTION_REQUIRED, ACTION_IN_PROGRESS, AWAITING_VERIFICATION, VERIFIED_RESOLVED, CLOSED
    priority_score = Column(Float, default=20.0, nullable=False)
    
    is_recurring = Column(Boolean, default=False, nullable=False)
    recurrence_count = Column(Integer, default=0, nullable=False)
    recurring_issue_id = Column(String(36), nullable=True)
    assigned_task_id = Column(String(36), nullable=True)
    
    food_item = Column(String(150), nullable=True, index=True)
    meal_period = Column(String(50), nullable=True)
    source = Column(String(50), default="public_form", nullable=False)
    is_historical = Column(Boolean, default=False, nullable=False, index=True)
    
    visited_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    # Relationships
    organization = relationship("Organization", back_populates="feedback")
    location = relationship("Location", back_populates="feedback")
    issue = relationship("Issue", back_populates="feedback_items")
    analysis_result = relationship("AnalysisResult", back_populates="feedback", uselist=False, cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="feedback")
    action_tasks = relationship("ActionTask", back_populates="feedback")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    feedback_id = Column(String(36), ForeignKey("feedback.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    status = Column(String(50), default="COMPLETED", nullable=False)  # QUEUED, PROCESSING, COMPLETED, NEEDS_REVIEW, FAILED
    sentiment = Column(String(50), nullable=False)  # positive, neutral, negative, mixed
    sentiment_score = Column(Float, nullable=True)
    detected_topics = Column(JSON, nullable=True)
    suggested_root_causes = Column(JSON, nullable=True)  # list of {cause, confidence, isHypothesis, evidence}
    recommended_actions = Column(JSON, nullable=True)  # list of {id, title, description, targetRole, suggestedDeadlineHours, priority}
    
    food_item = Column(String(150), nullable=True)
    issue_category = Column(String(100), nullable=True, index=True)
    reported_symptom = Column(Text, nullable=True)
    severity = Column(String(50), nullable=False)
    uncertainty_flag = Column(Boolean, default=False, nullable=False)
    confidence_score = Column(Float, nullable=True)
    recurrence_probability = Column(Float, nullable=True)
    severe_alert_triggered = Column(Boolean, default=False, nullable=False)
    severe_alert_reason = Column(Text, nullable=True)
    analysis_timeline = Column(JSON, nullable=True)
    structured_entities = Column(JSON, nullable=True)
    analyzed_at = Column(DateTime, default=utc_now, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    feedback = relationship("Feedback", back_populates="analysis_result")


class Issue(Base):
    __tablename__ = "issues"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    location_id = Column(String(36), ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    title = Column(String(255), nullable=False)
    food_item = Column(String(150), nullable=False, index=True)
    issue_category = Column(String(100), nullable=False, index=True)
    status = Column(String(50), default="PENDING_APPROVAL", nullable=False, index=True)
    
    priority_score = Column(Float, default=0.0, nullable=False)
    priority_level = Column(String(50), default="MEDIUM", nullable=False)
    priority_explanation = Column(Text, nullable=True)
    priority_breakdown = Column(JSON, nullable=True)
    
    prior_resolved_issue_id = Column(String(36), nullable=True, index=True)
    is_recurrence = Column(Boolean, default=False, nullable=False)
    complaint_count = Column(Integer, default=1, nullable=False)
    
    first_reported_at = Column(DateTime, default=utc_now, nullable=False)
    last_reported_at = Column(DateTime, default=utc_now, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="issues")
    location = relationship("Location", back_populates="issues")
    feedback_items = relationship("Feedback", back_populates="issue")
    recommendations = relationship("Recommendation", back_populates="issue", cascade="all, delete-orphan")
    action_tasks = relationship("ActionTask", back_populates="issue", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="issue")
    verification_runs = relationship("VerificationRun", back_populates="issue", cascade="all, delete-orphan")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    issue_id = Column(String(36), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False, index=True)
    
    proposed_actions = Column(JSON, nullable=False)
    rationale = Column(Text, nullable=True)
    status = Column(String(50), default="PENDING", nullable=False, index=True)
    rejection_reason = Column(Text, nullable=True)
    
    reviewed_by = Column(String(36), ForeignKey("user_profiles.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    issue = relationship("Issue", back_populates="recommendations")
    action_tasks = relationship("ActionTask", back_populates="recommendation", cascade="all, delete-orphan")


class ActionTask(Base):
    __tablename__ = "action_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    issue_id = Column(String(36), ForeignKey("issues.id", ondelete="CASCADE"), nullable=True, index=True)
    feedback_id = Column(String(36), ForeignKey("feedback.id", ondelete="CASCADE"), nullable=True, index=True)
    location_id = Column(String(36), ForeignKey("locations.id", ondelete="CASCADE"), nullable=True, index=True)
    recommendation_id = Column(String(36), ForeignKey("recommendations.id", ondelete="CASCADE"), nullable=True, index=True)
    assigned_user_id = Column(String(36), ForeignKey("user_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    assigned_role = Column(String(50), nullable=False, default="KITCHEN_STAFF")
    severity = Column(String(50), default="MEDIUM", nullable=False)
    priority = Column(String(50), default="MEDIUM", nullable=False)
    
    proposed_deadline = Column(DateTime, nullable=True)
    approved_deadline = Column(DateTime, nullable=True)
    is_schedule_approved = Column(Boolean, default=False, nullable=False)
    approved_by_user_id = Column(String(36), ForeignKey("user_profiles.id", ondelete="SET NULL"), nullable=True)
    approved_by_name = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    # Task Status: AWAITING_SCHEDULE_APPROVAL, ASSIGNED, IN_PROGRESS, COMPLETED_AWAITING_VERIFICATION, REJECTED_REOPENED, VERIFIED_CLOSED, OVERDUE
    status = Column(String(50), default="AWAITING_SCHEDULE_APPROVAL", nullable=False, index=True)
    
    completion_notes = Column(Text, nullable=True)
    completion_photo_url = Column(String(255), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    verification_status = Column(String(50), nullable=True)  # PENDING, VERIFIED, REJECTED
    verification_note = Column(Text, nullable=True)
    verified_by_user_id = Column(String(36), ForeignKey("user_profiles.id", ondelete="SET NULL"), nullable=True)
    verified_by_name = Column(String(100), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    rejection_reason = Column(Text, nullable=True)
    rejection_count = Column(Integer, default=0, nullable=False)
    is_escalated = Column(Boolean, default=False, nullable=False)
    closed_at = Column(DateTime, nullable=True)
    workflow_history = Column(JSON, nullable=True)
    
    deadline = Column(Date, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    issue = relationship("Issue", back_populates="action_tasks")
    feedback = relationship("Feedback", back_populates="action_tasks")
    location = relationship("Location", back_populates="action_tasks")
    recommendation = relationship("Recommendation", back_populates="action_tasks")
    assigned_user = relationship("UserProfile", back_populates="assigned_tasks", foreign_keys=[assigned_user_id])


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_id = Column(String(36), ForeignKey("issues.id", ondelete="CASCADE"), nullable=True, index=True)
    feedback_id = Column(String(36), ForeignKey("feedback.id", ondelete="CASCADE"), nullable=True, index=True)
    
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(50), default="CRITICAL", nullable=False)
    message = Column(Text, nullable=False)
    is_acknowledged = Column(Boolean, default=False, nullable=False, index=True)
    acknowledged_by = Column(String(36), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="alerts")
    issue = relationship("Issue", back_populates="alerts")
    feedback = relationship("Feedback", back_populates="alerts")


class VerificationRun(Base):
    __tablename__ = "verification_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    issue_id = Column(String(36), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False, index=True)
    
    measurement_period_days = Column(Integer, default=7, nullable=False)
    baseline_start = Column(DateTime, nullable=False)
    baseline_end = Column(DateTime, nullable=False)
    baseline_complaint_count = Column(Integer, nullable=False)
    baseline_feedback_volume = Column(Integer, default=0, nullable=False)
    baseline_complaint_rate = Column(Float, default=0.0, nullable=False)
    
    evaluation_start = Column(DateTime, nullable=False)
    evaluation_end = Column(DateTime, nullable=False)
    evaluation_complaint_count = Column(Integer, nullable=False)
    evaluation_feedback_volume = Column(Integer, default=0, nullable=False)
    evaluation_complaint_rate = Column(Float, default=0.0, nullable=False)
    
    rate_change_percentage = Column(Float, nullable=True)
    result = Column(String(50), nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    issue = relationship("Issue", back_populates="verification_runs")


class WeeklyReport(Base):
    __tablename__ = "weekly_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)
    title = Column(String(255), nullable=False)
    executive_summary = Column(Text, nullable=False)
    common_complaints = Column(JSON, nullable=False)
    high_priority_issues = Column(JSON, nullable=False)
    overdue_actions = Column(JSON, nullable=False)
    measured_outcomes = Column(JSON, nullable=False)
    full_report_markdown = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="weekly_reports")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False, index=True)  # SEVERE_ALERT, TASK_ASSIGNED, etc.
    target_roles = Column(JSON, nullable=False)  # list of strings: ["SUPERVISOR", "ADMIN", etc.]
    location_id = Column(String(36), ForeignKey("locations.id", ondelete="CASCADE"), nullable=True, index=True)
    staff_id = Column(String(36), ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=True, index=True)
    related_record_type = Column(String(50), nullable=False)  # FEEDBACK, TASK, BRANCH
    related_record_id = Column(String(50), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    # Relationships
    organization = relationship("Organization", back_populates="notifications")
    location = relationship("Location", back_populates="notifications")
    staff = relationship("UserProfile", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), nullable=True)
    user_email = Column(String(255), nullable=True)
    actor_name = Column(String(100), nullable=True)
    actor_role = Column(String(50), nullable=True)
    location_id = Column(String(36), ForeignKey("locations.id", ondelete="SET NULL"), nullable=True)
    
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=False)
    details = Column(Text, nullable=True)
    changes = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    # Relationships
    organization = relationship("Organization", back_populates="audit_logs")
