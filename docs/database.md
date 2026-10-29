# FeedbackIQ Database Schema Reference

The platform utilizes 12 relational entities managed via SQLAlchemy and Alembic migrations:

1. `organizations`: Tenant root (name, slug, created_at).
2. `locations`: Hotel outlets/restaurants belonging to an organization.
3. `user_profiles`: Authenticated users with assigned roles (`ADMIN`, `SUPERVISOR`, `KITCHEN_STAFF`, `CUSTOMER`).
4. `feedback`: Raw customer reviews and imported historical complaints (`is_historical` flag).
5. `analysis_results`: Structured extraction from the Analysis Agent (sentiment, category, severity, symptoms, uncertainty).
6. `issues`: Aggregated problem incidents. Active issues link new matching feedback. Resolved issues are never reopened automatically; subsequent occurrences receive a new `issue_id` with `prior_resolved_issue_id` linkage.
7. `recommendations`: Action plans proposed by the Action Planning Agent awaiting supervisor approval.
8. `action_tasks`: Discrete corrective duties assigned to kitchen staff with deadlines and completion notes.
9. `alerts`: Food safety and critical severity alerts for human investigation.
10. `verification_runs`: Pre- vs. post-action statistical measurements of complaint rates.
11. `weekly_reports`: Structured quality intelligence summaries compiled by the Reporting Agent.
12. `audit_logs`: Immutable tracking of actions, transitions, and approvals.
