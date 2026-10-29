from sqlalchemy.orm import Session
from app.db.session import SessionLocal, Base, engine
from app.models.entities import Organization, Location, UserProfile, Feedback, ActionTask, AuditLog, Notification
from datetime import datetime, timezone, timedelta


def init_db(db: Session = None) -> None:
    """Initialize database tables and seed demo organization, branches, and staff profiles."""
    # Ensure all tables exist
    Base.metadata.create_all(bind=engine)

    close_after = False
    if db is None:
        db = SessionLocal()
        close_after = True

    try:
        # Check or create default organization
        org = db.query(Organization).filter(Organization.slug == "grand-hotel").first()
        if not org:
            org = Organization(name="Grand Luxury Hotel & Suites", slug="grand-hotel")
            db.add(org)
            db.commit()
            db.refresh(org)

        # Seed 4 Branches matching the frontend specifications
        branches_data = [
            {
                "id": "branch-1",
                "code": "BR-01",
                "name": "Downtown Bistro Flagship",
                "address": "450 Grand Avenue, Financial District",
                "city": "New York, NY",
                "phone": "+1 (555) 234-5670",
                "manager_name": "Maria Chen",
            },
            {
                "id": "branch-2",
                "code": "BR-02",
                "name": "Westside Gourmet Kitchen",
                "address": "1180 Broadway Avenue, Midtown",
                "city": "New York, NY",
                "phone": "+1 (555) 345-6781",
                "manager_name": "Marcus Vance",
            },
            {
                "id": "branch-3",
                "code": "BR-03",
                "name": "Airport Terminal Hub",
                "address": "JFK Terminal 4 Concourse B",
                "city": "Queens, NY",
                "phone": "+1 (555) 456-7892",
                "manager_name": "David Kalu",
            },
            {
                "id": "branch-4",
                "code": "BR-04",
                "name": "Riverside Waterfront Terrace",
                "address": "22 River Road, Hudson Yards",
                "city": "New York, NY",
                "phone": "+1 (555) 567-8903",
                "manager_name": "Aisha Patel",
            },
        ]

        created_locations = {}
        for b in branches_data:
            loc = db.query(Location).filter(
                (Location.id == b["id"]) | (Location.code == b["code"])
            ).first()
            if not loc:
                loc = Location(
                    id=b["id"],
                    organization_id=org.id,
                    code=b["code"],
                    name=b["name"],
                    address=b["address"],
                    city=b["city"],
                    phone=b["phone"],
                    manager_name=b["manager_name"],
                    is_active=True,
                )
                db.add(loc)
                db.commit()
                db.refresh(loc)
            created_locations[b["id"]] = loc

        # Also support legacy location names if tests check for them
        for legacy_name in ["Main Dining Room & Terrace", "Rooftop Grill & Lounge"]:
            loc_leg = db.query(Location).filter(Location.name == legacy_name).first()
            if not loc_leg:
                loc_leg = Location(
                    organization_id=org.id,
                    code="LEGACY",
                    name=legacy_name,
                    address="Hotel Ground Floor",
                    city="New York, NY",
                    manager_name="Manager",
                    is_active=True,
                )
                db.add(loc_leg)
                db.commit()

        # Seed Users matching roles & staff accounts
        users_seed = [
            {
                "id": "user-admin",
                "supabase_id": "dev-admin-id",
                "email": "admin@feedbackiq.hotel",
                "name": "Sarah Jenkins",
                "role": "ADMIN",
                "department": "Executive Administration",
                "branches": ["branch-1", "branch-2", "branch-3", "branch-4"],
            },
            {
                "id": "user-supervisor",
                "supabase_id": "dev-sup-id",
                "email": "supervisor@feedbackiq.hotel",
                "name": "Maria Chen",
                "role": "SUPERVISOR",
                "department": "Quality Supervision",
                "branches": ["branch-1", "branch-2"],
            },
            {
                "id": "user-kitchen",
                "supabase_id": "dev-kitchen-id",
                "email": "chef@feedbackiq.hotel",
                "name": "Marco Rossi",
                "role": "KITCHEN_STAFF",
                "department": "Culinary Team (Line Chef)",
                "branches": ["branch-1"],
            },
            {
                "id": "user-kitchen-2",
                "supabase_id": "dev-kitchen-2-id",
                "email": "elena.rostova@feedbackiq.hotel",
                "name": "Elena Rostova",
                "role": "KITCHEN_STAFF",
                "department": "Culinary Team (Sous Chef)",
                "branches": ["branch-2"],
            },
        ]

        for u in users_seed:
            existing = db.query(UserProfile).filter(UserProfile.email == u["email"]).first()
            if not existing:
                profile = UserProfile(
                    id=u["id"],
                    organization_id=org.id,
                    supabase_user_id=u["supabase_id"],
                    email=u["email"],
                    full_name=u["name"],
                    role=u["role"],
                    department=u["department"],
                    is_active=True,
                )
                # Assign locations
                for branch_id in u["branches"]:
                    if branch_id in created_locations:
                        profile.assigned_locations.append(created_locations[branch_id])
                db.add(profile)
                db.commit()

        # Seed sample feedback records if empty
        if db.query(Feedback).count() == 0:
            sample_feedbacks = [
                {
                    "id": "fb-001",
                    "reference_id": "FB-2026-901",
                    "access_token": "TK-8412",
                    "location_id": "branch-1",
                    "rating": 1,
                    "comment": "The chicken skewer was completely pink and bloody in the center! Freezing cold inside.",
                    "categories": ["Food Quality"],
                    "tags": ["Undercooked", "Cold food"],
                    "customer_name": "Robert Vance",
                    "customer_contact": "robert.vance@example.com",
                    "sentiment": "NEGATIVE",
                    "severity": "CRITICAL",
                    "priority_score": 96.0,
                    "workflow_status": "ACTION_IN_PROGRESS",
                    "is_recurring": True,
                    "recurrence_count": 3,
                },
                {
                    "id": "fb-002",
                    "reference_id": "FB-2026-902",
                    "access_token": "TK-7741",
                    "location_id": "branch-1",
                    "rating": 2,
                    "comment": "We waited 45 minutes for our entrees. Truffle mashed potatoes were cold.",
                    "categories": ["Food Quality", "Service"],
                    "tags": ["Cold food", "Slow service"],
                    "is_anonymous": True,
                    "sentiment": "NEGATIVE",
                    "severity": "HIGH",
                    "priority_score": 78.0,
                    "workflow_status": "AWAITING_VERIFICATION",
                    "is_recurring": True,
                    "recurrence_count": 4,
                },
                {
                    "id": "fb-005",
                    "reference_id": "FB-2026-905",
                    "access_token": "TK-5531",
                    "location_id": "branch-1",
                    "rating": 3,
                    "comment": "The French onion soup was far too salty today.",
                    "categories": ["Food Quality"],
                    "tags": ["Too salty"],
                    "is_anonymous": True,
                    "sentiment": "MIXED",
                    "severity": "MEDIUM",
                    "priority_score": 52.0,
                    "workflow_status": "VERIFIED_RESOLVED",
                    "is_recurring": True,
                    "recurrence_count": 2,
                },
                {
                    "id": "fb-007",
                    "reference_id": "FB-2026-907",
                    "access_token": "TK-4410",
                    "location_id": "branch-3",
                    "rating": 5,
                    "comment": "Incredible experience before my flight! Avocado toast was fresh and fast.",
                    "categories": ["Food Quality", "Service"],
                    "tags": ["Delicious", "Fast service"],
                    "customer_name": "Sophia Loren",
                    "sentiment": "POSITIVE",
                    "severity": "LOW",
                    "priority_score": 12.0,
                    "workflow_status": "CLOSED",
                    "is_recurring": False,
                    "recurrence_count": 0,
                },
            ]

            now = datetime.now(timezone.utc)
            for sf in sample_feedbacks:
                fb = Feedback(
                    id=sf["id"],
                    organization_id=org.id,
                    location_id=sf["location_id"],
                    reference_id=sf["reference_id"],
                    access_token=sf["access_token"],
                    rating=sf["rating"],
                    comment=sf["comment"],
                    categories=sf["categories"],
                    tags=sf["tags"],
                    customer_name=sf.get("customer_name"),
                    customer_contact=sf.get("customer_contact"),
                    is_anonymous=sf.get("is_anonymous", False),
                    sentiment=sf["sentiment"],
                    severity=sf["severity"],
                    priority_score=sf["priority_score"],
                    workflow_status=sf["workflow_status"],
                    is_recurring=sf["is_recurring"],
                    recurrence_count=sf["recurrence_count"],
                    created_at=now - timedelta(hours=4),
                )
                db.add(fb)
            db.commit()

        # Seed sample action tasks if empty
        if db.query(ActionTask).count() == 0:
            now = datetime.now(timezone.utc)
            t1 = ActionTask(
                id="task-101",
                location_id="branch-1",
                feedback_id="fb-001",
                title="Recalibrate Poultry Line Probe & Retrain Cook #2",
                description="Immediately test core thermometers and review chicken thigh internal temperature logging (min 74°C).",
                assigned_user_id="user-kitchen",
                severity="CRITICAL",
                priority="CRITICAL",
                proposed_deadline=now + timedelta(hours=4),
                approved_deadline=now + timedelta(hours=4),
                is_schedule_approved=True,
                approved_by_user_id="user-supervisor",
                approved_by_name="Maria Chen",
                approved_at=now - timedelta(hours=2),
                status="IN_PROGRESS",
            )
            t2 = ActionTask(
                id="task-102",
                location_id="branch-1",
                feedback_id="fb-002",
                title="Replace Line Heat Lamps & Restructure Food Runner Handoff",
                description="Check pass heat lamp bulb wattage and enforce runner bell protocol.",
                assigned_user_id="user-kitchen",
                severity="HIGH",
                priority="HIGH",
                proposed_deadline=now + timedelta(days=1),
                approved_deadline=now + timedelta(days=1),
                is_schedule_approved=True,
                approved_by_user_id="user-supervisor",
                approved_by_name="Maria Chen",
                approved_at=now - timedelta(days=1),
                status="COMPLETED_AWAITING_VERIFICATION",
                completion_notes="Replaced both infrared heating bulbs on the main pass.",
                completion_photo_url="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500&h=300&fit=crop",
                completed_at=now - timedelta(hours=1),
                verification_status="PENDING",
            )
            db.add_all([t1, t2])
            db.commit()

    finally:
        if close_after:
            db.close()


if __name__ == "__main__":
    init_db()
    print("Database successfully initialized with FeedbackIQ schema and seed data.")
