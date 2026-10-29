import React from 'react';
import { SeverityLevel, SentimentType, TaskStatus, WorkflowStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-brand-50 text-brand-700 border-brand-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-750 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: SeverityLevel; size?: 'sm' | 'md' }> = ({
  severity,
  size = 'md',
}) => {
  switch (severity) {
    case 'CRITICAL':
      return (
        <Badge variant="danger" size={size}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          Critical
        </Badge>
      );
    case 'HIGH':
      return (
        <Badge variant="warning" size={size} className="bg-orange-50 text-orange-800 border-orange-200">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          High
        </Badge>
      );
    case 'MEDIUM':
      return (
        <Badge variant="warning" size={size}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Medium
        </Badge>
      );
    case 'LOW':
      return (
        <Badge variant="success" size={size}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Low
        </Badge>
      );
  }
};

export const SentimentBadge: React.FC<{ sentiment: SentimentType; size?: 'sm' | 'md' }> = ({
  sentiment,
  size = 'md',
}) => {
  switch (sentiment) {
    case 'POSITIVE':
      return <Badge variant="success" size={size}>Positive</Badge>;
    case 'NEGATIVE':
      return <Badge variant="danger" size={size}>Negative</Badge>;
    case 'MIXED':
      return <Badge variant="warning" size={size}>Mixed</Badge>;
    case 'NEUTRAL':
      return <Badge variant="neutral" size={size}>Neutral</Badge>;
  }
};

export const TaskStatusBadge: React.FC<{ status: TaskStatus; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  switch (status) {
    case 'AWAITING_SCHEDULE_APPROVAL':
      return (
        <Badge variant="warning" size={size} className="bg-amber-50 text-amber-900 border-amber-300">
          Awaiting Approval
        </Badge>
      );
    case 'ASSIGNED':
      return <Badge variant="info" size={size}>Assigned</Badge>;
    case 'IN_PROGRESS':
      return (
        <Badge variant="primary" size={size}>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
          In Progress
        </Badge>
      );
    case 'COMPLETED_AWAITING_VERIFICATION':
      return (
        <Badge variant="warning" size={size} className="bg-purple-50 text-purple-700 border-purple-200">
          Pending Verification
        </Badge>
      );
    case 'REJECTED_REOPENED':
      return <Badge variant="danger" size={size}>Rejected & Reopened</Badge>;
    case 'VERIFIED_CLOSED':
      return <Badge variant="success" size={size}>Verified & Closed</Badge>;
    case 'OVERDUE':
      return (
        <Badge variant="danger" size={size} className="bg-red-100 text-red-800 border-red-300 font-bold">
          Overdue
        </Badge>
      );
  }
};

export const WorkflowStatusBadge: React.FC<{ status: WorkflowStatus; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  switch (status) {
    case 'NEW':
      return <Badge variant="info" size={size}>New</Badge>;
    case 'ANALYSIS_COMPLETED':
      return <Badge variant="primary" size={size}>Analysis Done</Badge>;
    case 'ACTION_REQUIRED':
      return <Badge variant="warning" size={size}>Action Required</Badge>;
    case 'ACTION_IN_PROGRESS':
      return <Badge variant="primary" size={size}>In Progress</Badge>;
    case 'AWAITING_VERIFICATION':
      return <Badge variant="warning" size={size} className="bg-purple-50 text-purple-700 border-purple-200">Awaiting Verification</Badge>;
    case 'VERIFIED_RESOLVED':
      return <Badge variant="success" size={size}>Verified Resolved</Badge>;
    case 'CLOSED':
      return <Badge variant="neutral" size={size}>Closed</Badge>;
  }
};
