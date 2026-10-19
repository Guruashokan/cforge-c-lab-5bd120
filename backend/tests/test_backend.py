import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.database import init_db, AsyncSessionLocal
from app.seed.seeder import seed_all


@pytest_asyncio.fixture(scope="session", autouse=True, loop_scope="session")
async def setup_database():
    await init_db()
    async with AsyncSessionLocal() as session:
        await seed_all(session)


@pytest.mark.asyncio(loop_scope="session")
async def test_root():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "Welcome to CForge API" in data["message"]
        assert data["status"] == "operational"


@pytest.mark.asyncio(loop_scope="session")
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "CForge Backend API"


@pytest.mark.asyncio(loop_scope="session")
async def test_topics_list():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/topics")
        assert response.status_code == 200
        topics = response.json()
        assert len(topics) == 18
        slugs = [t["slug"] for t in topics]
        assert "c_fundamentals" in slugs
        assert "pointers" in slugs
        assert "advanced_c_systems" in slugs


@pytest.mark.asyncio(loop_scope="session")
async def test_topic_detail():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/topics/pointers")
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == "pointers"
        assert "Pointers" in data["name"]


@pytest.mark.asyncio(loop_scope="session")
async def test_roadmap():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/roadmap")
        assert response.status_code == 200
        roadmap = response.json()
        assert len(roadmap) == 18
        pointers_topic = next((t for t in roadmap if t["slug"] == "pointers"), None)
        assert pointers_topic is not None
        assert "c_fundamentals" in pointers_topic["prerequisites"]


@pytest.mark.asyncio(loop_scope="session")
async def test_companies_list():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/companies")
        assert response.status_code == 200
        companies = response.json()
        assert len(companies) >= 10
        slugs = [c["slug"] for c in companies]
        assert "tcs-nqt" in slugs
        assert "infosys" in slugs
        assert "accenture" in slugs


@pytest.mark.asyncio(loop_scope="session")
async def test_company_detail():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/companies/tcs-nqt")
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == "tcs-nqt"
        assert "TCS NQT" in data["name"]
        assert len(data["common_patterns"]) > 0


@pytest.mark.asyncio(loop_scope="session")
async def test_company_assessments():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/companies/tcs-nqt/assessments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


@pytest.mark.asyncio(loop_scope="session")
async def test_user_creation_and_stats():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Default user check
        user_res = await client.get("/api/users/1")
        assert user_res.status_code == 200
        user = user_res.json()
        assert user["username"] == "cforge_dev"

        # User stats
        stats_res = await client.get("/api/users/1/stats")
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["user_id"] == 1
        assert "difficulty_breakdown" in stats
        assert len(stats["topic_breakdown"]) == 18

        # Create new user
        import uuid
        uname = f"user_{uuid.uuid4().hex[:8]}"
        new_u = await client.post(
            "/api/users",
            json={"username": uname, "display_name": "Test Coder"},
        )
        assert new_u.status_code == 201
        created_user = new_u.json()
        assert created_user["username"] == uname


@pytest.mark.asyncio(loop_scope="session")
async def test_assessments_lifecycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # List assessments
        resp = await client.get("/api/assessments")
        assert resp.status_code == 200
        assessments = resp.json()
        assert len(assessments) >= 4

        first_id = assessments[0]["id"]

        # Detail
        detail_resp = await client.get(f"/api/assessments/{first_id}")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert "questions" in detail

        # Start attempt
        start_resp = await client.post(
            f"/api/assessments/{first_id}/start",
            json={"user_id": 1},
        )
        assert start_resp.status_code == 200
        attempt = start_resp.json()
        attempt_id = attempt["id"]
        assert attempt["user_id"] == 1

        # Submit attempt
        submit_resp = await client.post(
            f"/api/assessments/{first_id}/submit",
            json={"attempt_id": attempt_id, "user_id": 1, "answers": {}},
        )
        assert submit_resp.status_code == 200
        sub_res = submit_resp.json()
        assert sub_res["finished_at"] is not None

        # Fetch attempt result
        get_att = await client.get(f"/api/assessments/attempts/{attempt_id}")
        assert get_att.status_code == 200
        att_data = get_att.json()
        assert att_data["id"] == attempt_id


@pytest.mark.asyncio(loop_scope="session")
async def test_problems_list():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/problems?page=1&limit=10")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "total_pages" in data


@pytest.mark.asyncio(loop_scope="session")
async def test_execute_code_raw():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        code = (
            "#include <stdio.h>\n"
            "int main() {\n"
            "    printf(\"CForge Test Execution\\n\");\n"
            "    return 0;\n"
            "}\n"
        )
        resp = await client.post("/api/execute", json={"code": code, "stdin": ""})
        assert resp.status_code == 200
        data = resp.json()
        # Even if Piston is slow or offline, we get structured response
        assert "stdout" in data
        assert "stderr" in data
        assert "exit_code" in data
