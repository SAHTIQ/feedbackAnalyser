import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.core.config import settings
from app.db.session import Base, get_db
from app.main import app
from app.models.entities import Organization, Location, UserProfile
from app.core.auth import create_access_token

# In-memory test SQLite DB
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_org(db_session):
    org = Organization(name="Test Grand Hotel", slug="test-grand-hotel")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture
def test_location(db_session, test_org):
    loc = Location(organization_id=test_org.id, name="Bistro Central", address="Ground Floor")
    db_session.add(loc)
    db_session.commit()
    db_session.refresh(loc)
    return loc


@pytest.fixture
def admin_token(test_org):
    return create_access_token({
        "sub": "test-admin-uuid",
        "email": "admin@test.hotel",
        "role": "ADMIN",
        "org_id": test_org.id
    })


@pytest.fixture
def supervisor_token(test_org):
    return create_access_token({
        "sub": "test-sup-uuid",
        "email": "supervisor@test.hotel",
        "role": "SUPERVISOR",
        "org_id": test_org.id
    })


@pytest.fixture
def kitchen_token(test_org):
    return create_access_token({
        "sub": "test-kitchen-uuid",
        "email": "kitchen@test.hotel",
        "role": "KITCHEN_STAFF",
        "org_id": test_org.id
    })
