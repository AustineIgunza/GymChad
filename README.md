# GymChad 🏋️

> AI-powered gym tracking, nutrition logging, and coaching — built with FastAPI + React.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion |
| State | Zustand |
| Charts | Recharts |
| Auth | Supabase Auth (JWT) |
| Backend | FastAPI (Python 3.11) |
| Database | PostgreSQL via Supabase |
| ORM | SQLAlchemy 2.0 async |
| AI | Anthropic Claude (streaming SSE) |
| Food data | Open Food Facts API |
| Cache | Redis via Upstash |
| Deploy | Railway (backend) + Vercel (frontend) |
| PWA | Vite PWA plugin |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier)
- An [Anthropic](https://console.anthropic.com) API key

### 1. Clone & env setup

```bash
git clone <repo>
cd gymchad

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your Supabase public keys
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt

# Run migrations (creates all tables)
alembic upgrade head

# Seed the exercise library (80+ exercises)
python seed.py

# Start dev server
uvicorn app.main:app --reload --port 8000
```

API docs available at: **http://localhost:8000/docs**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at: **http://localhost:5173**

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://...` (Supabase connection string) |
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service role key (from Supabase dashboard) |
| `ANTHROPIC_API_KEY` | From [console.anthropic.com](https://console.anthropic.com) |
| `REDIS_URL` | Optional — Upstash Redis for food search caching |
| `FRONTEND_URL` | CORS origin, e.g. `http://localhost:5173` |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL e.g. `http://localhost:8000/api/v1` |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (from Supabase dashboard) |

---

## Supabase Setup

1. Go to [supabase.com](https://supabase.com), create a project
2. Under **Settings → Database** → copy the connection string (use port 5432)
   - Format: `postgresql+asyncpg://postgres:[password]@db.[ref].supabase.co:5432/postgres`
3. Under **Settings → API** → copy `URL` and both keys
4. Under **Authentication → Providers** → enable Email/Password

---

## Deployment

### Backend → Railway

1. Connect your GitHub repo to [Railway](https://railway.app)
2. Railway auto-detects the `Dockerfile`
3. Set all env vars in Railway dashboard
4. The start command in Dockerfile runs `alembic upgrade head` before starting

### Frontend → Vercel

1. Connect GitHub repo to [Vercel](https://vercel.com)
2. Set root directory to `frontend`
3. Add all `VITE_*` env vars in Vercel dashboard
4. Auto-deploys on push to `main`

---

## Features

- **Workout Logger** — mobile-first, large tap targets, weight/rep steppers, set timer
- **Progressive Overload** — Epley 1RM tracking, auto recommendations
- **Nutrition Logger** — Open Food Facts search, macro ring, meal grouping
- **AI Coach** — streaming Claude responses with your real workout/nutrition data
- **Split Manager** — create multi-day programs, activate with one tap
- **Analytics** — calorie adherence, strength curves, volume charts
- **PWA** — installable on mobile, offline caching

---

## FastAPI Learning Notes

The backend is extensively commented to teach FastAPI concepts:
- `app/main.py` — app setup, CORS, router registration
- `app/dependencies.py` — dependency injection (`Depends()`)
- `app/database.py` — async SQLAlchemy engine
- `app/models/` — SQLAlchemy 2.0 `Mapped` style ORM models
- `app/schemas/` — Pydantic v2 request/response validation
- `app/routers/` — `APIRouter` patterns, path/query/body params
- `app/services/ai_coach.py` — async streaming with Anthropic SDK
