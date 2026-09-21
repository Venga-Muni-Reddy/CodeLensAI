# CodeLensAI — Repository Intelligence Platform

> **Give developers an intelligent X-ray of any software repository so they can understand, explore, modify, and review large codebases with confidence.**

---

## Architecture Overview

- **Backend**: Python 3.11 + FastAPI (Modular Monolith)
- **Frontend**: React + TypeScript + Vite
- **Primary Database**: MongoDB 7.0 (with Vector Search)
- **Queue & Cache**: Redis 7
- **AI Engine**: Provider fallback architecture (Primary: OpenRouter &rarr; Fallbacks: Gemini, OpenAI)
- **Local Infrastructure**: Docker Compose

---

## Project Structure

```text
CodeLensAI/
├── docs/                               # Source of truth design documents
│   ├── Product_Requirement_Doc.md
│   ├── System_Design_Architecture_Doc.md
│   ├── Database_Design_Doc.md
│   ├── REST_API_Design_Doc.md
│   └── FEATURE_STATUS.md               # Feature lifecycle tracking
├── docker-compose.yml                  # MongoDB & Redis services
├── .env.example                        # Root environment configuration
├── backend/                            # FastAPI Modular Monolith
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                     # App entry point & lifespan
│   │   ├── core/                       # Config, database, redis, security, errors
│   │   ├── api/v1/                     # REST API v1 endpoints
│   │   └── services/ai/                # AI provider abstraction & fallback chain
│   └── tests/                          # Automated backend tests
└── frontend/                           # React TypeScript Vite SPA
    ├── package.json
    ├── src/                            # App, UI components, api client, styles
    └── vite.config.ts
```

---

## Quickstart Guide

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (must be running)
- Python 3.11+
- Node.js 18+ and npm

### 2. Start Local Databases (MongoDB & Redis)
```powershell
docker compose up -d
```
Verify containers are running:
```powershell
docker compose ps
```

### 3. Run Backend Server
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```
- API Documentation (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/api/v1/health/live](http://localhost:8000/api/v1/health/live)

### 4. Run Frontend Client
In a second terminal:
```powershell
cd frontend
npm run dev
```
- Web Application: [http://localhost:5173](http://localhost:5173)

---

## Running Tests

### Backend Tests
```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests/
```

### Frontend Build Verification
```powershell
cd frontend
npm run build
```

---

## Feature Roadmap

Detailed status and development phases are tracked in [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md).
