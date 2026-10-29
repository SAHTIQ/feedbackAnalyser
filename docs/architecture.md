# FeedbackIQ Architecture Documentation

## System Overview
FeedbackIQ is an enterprise-grade AI Feedback and Quality Intelligence Platform designed for hospitality operations. It combines:
- **FastAPI Backend**: High-performance REST API with role-based access control (RBAC), multi-tenancy scoping, and Pydantic validation.
- **SQLAlchemy 2.0 & Alembic**: Relational persistence supporting SQLite for local testing and PostgreSQL/Supabase for production deployments.
- **LangGraph Multi-Agent Architecture**: Stateful, checkpointed workflow coordinating:
  1. **Analysis Agent**: Extracts sentiment, severity, symptoms, food item, and issue categories.
  2. **Historical Insights Engine**: Computes deterministic statistics over historical complaint datasets using Pandas and SQL.
  3. **Prediction Agent**: Evaluates recurrence risks grounded strictly on historical evidence.
  4. **Priority Engine**: Deterministic weighted scoring with mandatory safety escalation overrides.
  5. **Action Planning Agent**: Generates actionable corrective steps with roles and deadlines.
  6. **Manager Approval Interrupt**: Human-in-the-loop checkpoint preserving graph state.
  7. **Task Generation**: Dispatches approved tasks to kitchen staff dashboards.
  8. **Verification Node**: Compares pre/post complaint rates over controlled measurement windows.
  9. **Reporting Agent**: Generates weekly executive summaries.
- **React + Vite Frontend**: High-productivity UI featuring role-specific dashboards, Recharts analytics, and approval workflows.

## Authentication & Authorization
- **Roles**:
  - `CUSTOMER`: Public feedback submission.
  - `SUPERVISOR`: Reviews issues, inspects historical evidence, approves/rejects/edits recommendations, inspects verification runs.
  - `KITCHEN_STAFF`: Views assigned tasks, marks progress, and logs completion notes.
  - `ADMIN`: Manages hotel settings, locations, user profiles, and imports historical CSV datasets.
- **Tenant Isolation**: Every feedback item, issue, alert, task, and report is scoped to an `organization_id`.
