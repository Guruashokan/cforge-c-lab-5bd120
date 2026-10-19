# CForge — The Ultimate C Programming Practice Lab

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_19_TypeScript-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Monaco Editor](https://img.shields.io/badge/Editor-Monaco_C17-1E1E1E?style=flat-square&logo=visual-studio-code)](https://microsoft.github.io/monaco-editor/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

**CForge** is a full-stack, production-grade interactive coding and assessment platform designed to help computer science students and engineers master C programming from absolute fundamentals to deep systems engineering, low-level memory layout, and top-tier company placement examinations.

---

## Key Highlights & Features

- **180 Battle-Tested C Questions**: 100% standard C with rich markdown descriptions, progressive hints (1–5), detailed editorial solutions, and comprehensive visible + hidden test suites (950+ test cases).
- **In-Browser C IDE (Monaco Editor)**: Full VS Code C editor experience with dark mode (`vs-dark`), line numbering, syntax highlighting, bracket matching, mini-map, and custom shortcuts (`Ctrl+Enter` to Run, `Ctrl+Shift+Enter` to Submit).
- **Real-Time Sandboxed C Compiler**: Backed by the sandboxed Piston API executing real GCC C17 code with memory bounds, timeouts, compilation warnings, and stderr diagnostics.
- **Verdict Diagnostics Engine**: Accurate evaluation returning Accepted (AC), Wrong Answer (WA), Time Limit Exceeded (TLE), Runtime Error (RE), and Compilation Error (CE) with exact output diffing.
- **18 Structured Topic Pathways**: Linear progression covering C Fundamentals, Patterns, Recursion, Pointers, Dynamic Memory, Structs/Unions, Linked Lists, Stacks/Queues, Search/Sort, Trees, Heaps/Tries, Graphs, DP/Greedy, Bitwise, and Systems.
- **10 Target Company Placement Tracks**: Dedicated tracks with exam patterns and tailored problem sets for TCS NQT, Infosys DSE/SP, Cognizant GenC, Wipro Elite, Accenture, Mphasis, Capgemini, IBM, HCLTech, and Tech Mahindra.
- **Timed Mock Assessments**: Real-time examination mode with countdown timers, multi-problem navigation, split coding views, and automated submission grading.
- **Interactive Analytics & Progress Tracking**: Recharts-powered radar, distribution, and completion metrics tracking topic mastery and streak history.
- **Offline & Local Code Persistence**: Editor code automatically syncs with `localStorage` per problem slug, preventing lost work during browser refresh.

---

## Architecture & Tech Stack

```
+----------------------------------------------------------+
|                    CForge Architecture                   |
+-------------------------+--------------------------------+
| Frontend (Port 5173)    | React 19, TypeScript, Vite,    |
|                         | Monaco Editor, Tailwind CSS,   |
|                         | Recharts, Lucide Icons         |
+-------------------------+--------------------------------+
| Backend API (Port 8000) | FastAPI, SQLAlchemy 2.0 Async, |
|                         | Pydantic v2, aiosqlite, HTTPX  |
+-------------------------+--------------------------------+
| Database                | SQLite (aiosqlite async driver)|
|                         | 14 relational tables           |
+-------------------------+--------------------------------+
| Compiler Sandbox        | Piston API (GCC 10.2 / C17)    |
|                         | https://emkc.org/api/v2/piston |
+-------------------------+--------------------------------+
```

---

## Project Structure

```
cforge/
|-- .env.example               # Environment variables template
|-- docker-compose.yml         # Containerized multi-service deployment
|-- README.md                  # Comprehensive project documentation
|-- backend/
|   |-- Dockerfile             # Python 3.11-slim container spec
|   |-- requirements.txt       # Backend dependencies
|   |-- pytest.ini             # Pytest configuration
|   |-- tests/                 # Integration test suite (12 tests)
|   |   +-- test_backend.py
|   +-- app/
|       |-- config.py          # Pydantic BaseSettings config
|       |-- database.py        # Async SQLAlchemy engine & session
|       |-- main.py            # FastAPI app root & lifespan seeder
|       |-- models/            # SQLAlchemy ORM models (14 tables)
|       |   +-- models.py
|       |-- schemas/           # Pydantic v2 schemas
|       |   +-- schemas.py
|       |-- services/          # Business logic & judge service
|       |   |-- judge.py       # Piston API execution & test runner
|       |   +-- problems.py    # Filtering, daily challenge, hints
|       |-- routers/           # REST API endpoints
|       |   |-- problems.py    # /api/problems
|       |   |-- judge.py       # /api/run, /api/submit, /api/execute
|       |   |-- users.py       # /api/users, stats, bookmarks
|       |   |-- topics.py      # /api/topics, /api/roadmap
|       |   |-- companies.py   # /api/companies
|       |   +-- assessments.py # /api/assessments
|       +-- seed/              # Database seeders
|           |-- seeder.py      # Master idempotent seeder
|           |-- topics.py      # 18 Topics seed definitions
|           |-- companies.py   # 10 IT Companies seed definitions
|           +-- questions/     # 18 JSON files (180 questions, IDs 1-180)
+-- frontend/
    |-- Dockerfile             # Node 20-slim container spec
    |-- package.json           # Frontend dependencies
    |-- vite.config.ts         # Vite configuration with Tailwind
    |-- tsconfig.json          # TypeScript configuration
    |-- index.html             # HTML entry point
    +-- src/
        |-- App.tsx            # React Router v6 setup
        |-- main.tsx           # Application mount point
        |-- index.css          # Tailwind CSS styling & dark theme
        |-- types/             # TypeScript definitions
        |   +-- index.ts
        |-- services/          # API client with offline fallback
        |   +-- api.ts
        |-- components/        # Reusable UI components
        +-- pages/             # 11 Application views
            |-- Dashboard.tsx       # KPI metrics & streak
            |-- ProblemList.tsx     # Filterable problem catalog
            |-- ProblemSolve.tsx    # Monaco split-screen arena
            |-- TopicRoadmap.tsx    # Structured 18-step pathway
            |-- CompanyList.tsx     # Company tracks directory
            |-- CompanyDetail.tsx   # Company questions & patterns
            |-- Assessments.tsx     # Timed challenges directory
            |-- AssessmentTake.tsx  # Timed exam test taker
            |-- Analytics.tsx       # Recharts visualizations
            |-- Bookmarks.tsx       # Saved problem manager
            +-- Settings.tsx        # Compiler & editor preferences
```

---

## Quick Start Guide

### Prerequisites
- **Python 3.11+** installed
- **Node.js 18+** & `npm` installed
- Git

---

### Option 1: Local Development (Windows PowerShell)

#### Step 1: Start the Backend
Open a PowerShell terminal:
```powershell
# Navigate to backend directory
cd "v:\C Programming\cforge\backend"

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server (auto-seeds SQLite database on first launch)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Backend API will be live at: `http://localhost:8000`  
Interactive Swagger Docs: `http://localhost:8000/docs`

#### Step 2: Start the Frontend
Open a second PowerShell terminal:
```powershell
# Navigate to frontend directory
cd "v:\C Programming\cforge\frontend"

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Frontend interface will be live at: `http://localhost:5173`

---

### Option 2: Local Development (Linux / macOS)

```bash
# Terminal 1: Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

---

### Option 3: Docker Compose (One-Click Launch)

```bash
cd "v:\C Programming\cforge"

# Build and start all services in detached mode
docker-compose up --build -d

# View service logs
docker-compose logs -f
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

---

## Testing & Verification

### Run Backend Integration Tests
CForge includes a 12-suite automated integration test covering API routes, database seeding, models, and code execution:
```powershell
cd "v:\C Programming\cforge\backend"
python -m pytest -v
```
All 12 test suites pass with 100% success rate.

### Run Frontend Production Build Check
```powershell
cd "v:\C Programming\cforge\frontend"
npm run build
```
Type checks and bundles cleanly in Vite with 0 errors.

---

## Question Bank Curriculum (180 Problems)

| # | Topic / Module | Slug | Problems | Range | Difficulty Mix |
|---|----------------|------|:--------:|:-----:|:--------------:|
| 1 | C Fundamentals | `c_fundamentals` | 10 | 1-10 | Medium / Hard / Very Hard |
| 2 | Pattern Programming | `pattern_programming` | 8 | 11-18 | Medium / Hard / Very Hard |
| 3 | Functions & Recursion | `functions_recursion` | 10 | 19-28 | Medium / Hard / Very Hard |
| 4 | Arrays & Matrices | `arrays` | 15 | 29-43 | Medium / Hard / Very Hard |
| 5 | Strings & Character Manipulation | `strings` | 12 | 44-55 | Medium / Hard / Very Hard |
| 6 | Pointers & Address Arithmetic | `pointers` | 12 | 56-67 | Medium / Hard / Very Hard |
| 7 | Dynamic Memory Allocation | `dynamic_memory` | 8 | 68-75 | Medium / Hard / Very Hard |
| 8 | Structures & Unions | `structures_unions` | 8 | 76-83 | Medium / Hard / Very Hard |
| 9 | Linked Lists | `linked_lists` | 12 | 84-95 | Medium / Hard / Very Hard |
| 10 | Stacks & Queues | `stacks_queues` | 10 | 96-105 | Medium / Hard / Very Hard |
| 11 | Searching & Sorting | `searching_sorting` | 12 | 106-117 | Medium / Hard / Very Hard |
| 12 | Trees & Binary Search Trees | `trees_bst` | 12 | 118-129 | Medium / Hard / Very Hard |
| 13 | Heaps, Hashing & Tries | `heaps_hashing_tries` | 8 | 130-137 | Medium / Hard / Very Hard |
| 14 | Graph Algorithms | `graphs` | 10 | 138-147 | Medium / Hard / Very Hard |
| 15 | Dynamic Programming & Greedy | `dp_greedy` | 12 | 148-159 | Medium / Hard / Very Hard |
| 16 | Bitwise Operations | `bitwise_ops` | 8 | 160-167 | Medium / Hard / Very Hard |
| 17 | File Handling & Preprocessor | `file_handling_preprocessor` | 5 | 168-172 | Medium / Hard / Very Hard |
| 18 | Advanced C & Systems | `advanced_c_systems` | 8 | 173-180 | Hard / Very Hard |
| **Total** | | | **180** | **1-180** | **950+ Test Cases** |

---

## Company Tracks & Exam Profiles

CForge provides dedicated practice modules and mock assessments designed for top Indian tech recruiting patterns:

1. **TCS NQT**: Number theory, base conversions, matrix operations, string manipulations.
2. **Infosys (DSE/SP)**: Dynamic programming, grid algorithms, greedy intervals, trees.
3. **Cognizant (GenC Next)**: Arrays, recursion, bitwise flags, anagrams.
4. **Wipro (Elite NLTH)**: In-place reversal, pointer swapping, pyramid patterns.
5. **Accenture**: Bitwise logic, XOR manipulation, carry addition, monotonic sequences.
6. **Mphasis**: Linked list restructuring, binary search variants, ASCII frequency maps.
7. **Capgemini**: Kadane's algorithm, tokenization, memoized recursion.
8. **IBM**: Expression evaluation with stacks, cycle detection in lists, heap order.
9. **HCLTech**: Matrix traversals, prime sieve, majority element, pointer chains.
10. **Tech Mahindra**: Spiral matrices, rightmost set bit hacks, string compression.

---

## REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/problems` | List problems with filters (topic, difficulty, company, search, pagination) |
| `GET` | `/api/problems/{slug}` | Problem statement, starter code, sample test cases |
| `GET` | `/api/problems/{slug}/hints/{level}` | Progressive hint reveal (levels 1-5) |
| `GET` | `/api/problems/{slug}/solution` | Full C reference editorial solution with complexity notes |
| `POST` | `/api/run` | Run code against visible sample test cases |
| `POST` | `/api/submit` | Evaluate code against all hidden test cases and record submission |
| `POST` | `/api/execute` | Raw code execution with custom stdin |
| `GET` | `/api/daily-challenge` | Deterministic daily problem based on calendar date |
| `GET` | `/api/topics` | List all 18 topics with problem counts |
| `GET` | `/api/roadmap` | Structured sequential topic roadmap with prerequisites |
| `GET` | `/api/companies` | List hiring companies with problem counts and readiness stats |
| `GET` | `/api/companies/{slug}` | Company detail and question catalog |
| `GET` | `/api/assessments` | List available timed exams and mock assessments |
| `POST` | `/api/assessments/{id}/start` | Start timed attempt and fetch exam questions |
| `POST` | `/api/assessments/{id}/submit` | Submit assessment attempt and generate score breakdown |
| `GET` | `/api/users/{id}/stats` | User solving statistics, streak, and difficulty breakdown |
| `POST` | `/api/users/{id}/bookmarks` | Toggle problem bookmark status |
| `GET` | `/api/health` | Service health status |

---

## Keyboard Shortcuts in Problem Arena

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` / `Cmd + Enter` | Run Code on Sample Tests |
| `Ctrl + Shift + Enter` / `Cmd + Shift + Enter` | Submit Code for Full Evaluation |
| `Ctrl + S` / `Cmd + S` | Save Code to Local Storage |
| `F1` | Monaco Command Palette |

---

## License
This project is open-source and available under the [MIT License](LICENSE).
