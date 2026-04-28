# GymChad — Local Testing Guide

## 🚀 Status: Both Frontend & Backend Running

**Backend**: http://localhost:3001  
**Frontend**: http://localhost:5174 (or 5173 if port is free)  
**API Docs**: http://localhost:3001/docs (interactive Swagger UI)

### 📱 Responsive Design
✅ **Mobile First** - Optimized for phones (375px+ widths)  
✅ **Tablet Support** - Responsive grids (768px+)  
✅ **Desktop Optimized** - Full-width layouts (1024px+) with sidebar navigation  
✅ **Dark Mode** - Built-in dark theme for all screen sizes  

---

## Quick Links for Testing

| Link | Purpose |
|------|---------|
| **http://localhost:5174** | Main app (React frontend) - auto-responsive |
| **http://localhost:3001/docs** | Swagger UI - test all endpoints |
| **http://localhost:3001/redoc** | ReDoc - alternative API docs |
| **http://localhost:3001/health** | Health check endpoint |

---

## Testing Responsive Design

### Mobile View (375px width)
- Bottom navigation bar visible
- Single-column layout for cards
- Compact padding and text sizing
- Touch-friendly 44px+ tap targets

```
Open DevTools → F12 → Toggle Device Toolbar (Ctrl+Shift+M)
Select "iPhone SE" or "Mobile L" (375-425px)
```

### Tablet View (768px width)
- 2-column grid layouts
- Sidebar navigation (hidden)
- Bottom nav still visible
- Medium padding

```
Select "iPad" or set custom width 768px
```

### Desktop View (1024px+)
- Sidebar navigation visible on left
- 3-column grids for analytics
- Full-width content areas
- Larger text and spacing
- No bottom navigation (sidebar replaces it)

```
Expand browser or select "Desktop" preset
```

---

## Backend Overview (FastAPI + Python)

### Running Services
✅ **FastAPI** on port 3001  
✅ **Uvicorn** ASGI server  
✅ **Rate Limiting** (slowapi) enabled  
✅ **CORS** configured for localhost:5173  

### API Structure
- **Version**: `/api/v1/`
- **Auth**: `x-user-id` header (currently header-based for testing)
- **Response Format**: JSON
- **Rate Limits**: 30/minute on most endpoints, 20/hour on AI coach

### Current Endpoints Available

#### Exercises
- `GET /exercises` - List all exercises
- `GET /exercises?muscle_group=CHEST` - Filter by muscle group

#### Workouts
- `GET /workouts` - Paginated workouts
- `POST /workouts` - Create new workout
- `GET /workouts/today` - Get today's workout
- `GET /workouts/{id}` - Get specific workout
- `PUT /workouts/{id}` - Update workout
- `DELETE /workouts/{id}` - Delete workout

#### Workout Sets
- `POST /workouts/{id}/sets` - Add set to workout
- `PUT /workouts/{id}/sets/{set_id}` - Update set
- `DELETE /workouts/{id}/sets/{set_id}` - Delete set
- `GET /workouts/history/{exercise_id}` - Get exercise history

#### Nutrition
- `GET /nutrition` - Get nutrition logs (supports `?date=YYYY-MM-DD`)
- `POST /nutrition` - Create nutrition log
- `PUT /nutrition/{id}` - Update nutrition log
- `DELETE /nutrition/{id}` - Delete nutrition log
- `GET /nutrition/summary` - Nutrition summary (supports `?days=30`)

#### Foods
- `GET /foods/search?q=chicken` - Search Open Food Facts database
- `GET /foods/custom` - Get custom foods library
- `POST /foods/custom` - Create custom food entry
- `DELETE /foods/custom/{id}` - Delete custom food

#### Splits
- `GET /splits` - List splits
- `POST /splits` - Create split
- `GET /splits/{id}` - Get split details
- `PUT /splits/{id}` - Update split
- `DELETE /splits/{id}` - Delete split
- `PUT /splits/{id}/activate` - Activate split (deactivates others)

#### AI Coach
- `POST /ai/coach` - Stream AI response (SSE streaming)
- `GET /ai/sessions` - Get chat history

#### Progress
- `GET /progress/volume` - Volume tracking per exercise
- `GET /progress/strength` - Strength progression
- `GET /progress/calories` - Calorie history
- `GET /progress/macros` - Macro tracking

#### Auth
- `POST /auth/verify` - Verify JWT token
- `PUT /auth/profile` - Update user profile

---

## Frontend Overview (React + TypeScript + Tailwind)

### Running Services
✅ **React 18** with Vite  
✅ **Vite dev server** on port 5173  
✅ **Hot Module Replacement (HMR)** enabled  
✅ **Tailwind CSS** configured  

### Key Technologies
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS with custom theme
- **State Management**: Zustand
- **HTTP Client**: Axios (preconfigured for `localhost:3001/api/v1`)
- **Charts**: Recharts
- **Auth UI**: Supabase JS (integrated, testing with mock user)

### Pages Implemented
1. **Dashboard** (`/`) - Overview with today's workout
2. **Workout Logger** (`/workout/new`, `/workout/:id`) - Log exercises
3. **Nutrition Tracker** (`/nutrition`) - Log meals with food search
4. **Progress Analytics** (`/progress`) - Charts and trends
5. **AI Coach** (`/coach`) - Chat interface with streaming responses
6. **Splits Manager** (`/splits`) - Create and manage workout splits
7. **Settings** (`/settings`) - User profile and preferences
8. **History** (`/history`) - Past workouts calendar view
9. **Mobile Bottom Nav** - Home | Workout | Nutrition | Progress | Coach

### UI Components
- **Button** - Primary, secondary, danger variants
- **Card** - Flexible layout component
- **Badge** - Status indicators
- **Input** - Text, number, date inputs
- **Modal** - Dialog overlays
- **Toast** - Notifications (react-hot-toast)
- **Charts** - Bar, Line, Pie charts via Recharts

---

## Testing Workflow

### 1. Test Backend API (Swagger UI)
```
1. Go to http://localhost:3001/docs
2. Expand any endpoint
3. Click "Try it out"
4. Add header: x-user-id = any-test-user-id
5. Execute request
```

### 2. Test Frontend
```
1. Go to http://localhost:5173
2. Use navigation at bottom (or top menu)
3. View pages and components
4. Try creating workouts, logging nutrition, etc.
```

### 3. Check Network Requests
```
1. Open DevTools (F12)
2. Go to Network tab
3. Perform an action in the frontend
4. See the API call to http://localhost:3001/api/v1/*
5. View response in the debugger
```

### 4. Debug Backend
```
1. Terminal shows uvicorn logs
2. All API requests logged with timestamps
3. Errors show full tracebacks
4. Check file: backend/main.py for route implementations
```

---

## Spec Compliance Checklist

### ✅ Backend Requirements
- [x] FastAPI framework
- [x] Python 3.12+
- [x] Pydantic v2 validation
- [x] Async/await throughout
- [x] Rate limiting (slowapi)
- [x] CORS middleware
- [x] All 30+ routes implemented
- [x] Streaming AI response support
- [x] Health endpoint
- [x] Auto-docs at /docs

### ✅ Frontend Requirements
- [x] React 18 + TypeScript
- [x] Tailwind CSS styling
- [x] Zustand state management
- [x] Axios HTTP client
- [x] Recharts integration
- [x] All 9 main pages
- [x] Bottom navigation bar
- [x] Mobile responsive (tested on 375px width)
- [x] Toast notifications
- [x] Chart components

### 🔄 In Progress / Mock Data
- [ ] PostgreSQL database (currently using mock responses)
- [ ] Supabase authentication (testing with mock `x-user-id` header)
- [ ] Prisma ORM (seeded exercises available via API)
- [ ] Redis caching (food search currently uncached)
- [ ] Alembic migrations (schema ready, no DB connected)

### 📦 Deployment Ready
- [ ] Railway backend deployment (Dockerfile included)
- [ ] Vercel frontend deployment (build script ready)
- [ ] Environment variables configured
- [ ] Docker compose for local database (optional)

---

## Environment Setup

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gymchad
ANTHROPIC_API_KEY=sk-test-key
PORT=3001
FRONTEND_URL=http://localhost:5173
HOST=0.0.0.0
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=https://xxx.supabase.co  (optional)
VITE_SUPABASE_ANON_KEY=xxx  (optional)
```

---

## Responsive Layout Breakdown

### Pages & Breakpoints

**Dashboard** (`/`)
- Mobile: Card stack (1 column)
- Tablet: 2 columns (Today's Workout + Quick Stats)
- Desktop: 3 columns with action cards below

**Nutrition** (`/nutrition`)
- Mobile: Full-width card stack
- Tablet: 2-column layout (Food Log + Entries)
- Desktop: 3-column layout with larger charts

**Analytics** (`/progress`)
- Mobile: Charts stack vertically (h-56)
- Tablet: Same layout, slightly larger charts
- Desktop: Full-width charts (h-64)

**AI Coach** (`/coach`)
- Mobile: Compact chat (h-96)
- Desktop: Expanded chat (h-[500px])

**Splits Manager** (`/splits`)
- Mobile: Single column card list
- Tablet: 2-column grid
- Desktop: 3-column grid

### Navigation

**Mobile & Tablet** (< 1024px)
- Bottom navigation bar with 5 icons
- Fixed position for easy thumb access
- Icons: 🏠 Home | 💪 Workout | 🍽️ Nutrition | 📊 Analytics | 🤖 Coach

**Desktop** (1024px+)
- Left sidebar navigation
- Sticky position
- Full text labels
- Settings and additional options

---

## Common Testing Scenarios

### 1. Log a Workout
```
1. Frontend: Click "Workout" (bottom nav)
2. Click "Start Workout"
3. Select split/date
4. Add exercises with weight, reps, sets
5. Click "Finish"
6. Backend: POST /workouts creates record
7. Backend: POST /workouts/{id}/sets adds sets
```

### 2. Search Food & Log Nutrition
```
1. Frontend: Click "Nutrition" (bottom nav)
2. Click "Add Food"
3. Type "chicken" in search
4. Backend: GET /foods/search?q=chicken calls Open Food Facts API
5. Select food from results
6. Enter quantity, meal type
7. Backend: POST /nutrition logs entry
8. Frontend: Updates total calories and macros
```

### 3. View Progress Charts
```
1. Frontend: Click "Progress" (bottom nav)
2. Backend: GET /progress/volume fetches volume data
3. Backend: GET /progress/strength fetches strength data
4. Frontend: Recharts renders Line/Bar chart
5. Toggle timeframe: 4 weeks, 8 weeks, etc.
```

### 4. Chat with AI Coach
```
1. Frontend: Click "Coach" (bottom nav)
2. Type message: "Review my week"
3. Frontend: POST /ai/coach sends message
4. Backend: Connects to Anthropic API
5. Backend: Streams response via SSE
6. Frontend: Displays streaming text in real-time
7. Save conversation in history
```

---

## Troubleshooting

### Backend Not Running?
```powershell
cd backend
.\venv\Scripts\python.exe main.py
```

### Frontend Not Running?
```powershell
cd frontend
npm run dev
```

### API Calls Failing?
1. Check DevTools Network tab for error response
2. Verify `x-user-id` header is being sent
3. Check http://localhost:3001/docs for endpoint signature
4. Look at backend terminal for error traceback

### Styles Not Loading?
```powershell
cd frontend
npx tailwindcss -i ./src/style.css -o ./dist/output.css
```

### Port Already in Use?
```powershell
# Change backend port in .env to 3002
# Change frontend port in vite.config.ts to 5174
```

---

## Next Steps

1. **Connect PostgreSQL** - Update `DATABASE_URL` to real Supabase instance
2. **Set up Supabase Auth** - Replace mock `x-user-id` with real JWT verification
3. **Add Anthropic API Key** - Get real API key from https://console.anthropic.com
4. **Deploy** - Push to GitHub, deploy backend to Railway, frontend to Vercel
5. **Data Seed** - Run seed script to populate exercises and example data

---

## Performance Tips

- **Backend**: FastAPI auto-reload enabled (change to `reload=False` in production)
- **Frontend**: Vite caches node_modules and assets (fast rebuilds)
- **API Calls**: Configured with axios instance (automatic retries/timeouts optional)
- **Charts**: Recharts is lightweight, renders 100+ data points smoothly

---

## References

- **FastAPI Docs**: http://localhost:3001/docs (when running)
- **FastAPI Book**: https://fastapi.tiangolo.com/
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Zustand**: https://github.com/pmndrs/zustand
- **Axios**: https://axios-http.com/

---

**Last Updated**: 2026-04-27  
**Status**: ✅ Both services running locally and ready for feature development
