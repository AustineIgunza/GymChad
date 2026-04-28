# GymChad Quick Reference Card 🏋️

## 🚀 Start Here

```powershell
# Terminal 1: Backend
cd backend
.\venv\Scripts\python.exe main.py

# Terminal 2: Frontend  
cd frontend
npm run dev
```

**Then open:**
- 🎨 Frontend: http://localhost:5173
- 📚 API Docs: http://localhost:3001/docs
- ✅ Health: http://localhost:3001/health

---

## 🔌 API Testing

### Swagger UI (Best for Testing)
```
1. Open http://localhost:3001/docs
2. Expand any endpoint (e.g., GET /exercises)
3. Click "Try it out"
4. Add header: x-user-id = test-user
5. Click "Execute"
```

### With curl (Terminal)
```bash
curl -H "x-user-id: test-user" http://localhost:3001/api/v1/exercises
curl -X POST http://localhost:3001/api/v1/workouts \
  -H "x-user-id: test-user" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### With Python
```python
import httpx

async with httpx.AsyncClient() as client:
    response = await client.get(
        "http://localhost:3001/api/v1/exercises",
        headers={"x-user-id": "test-user"}
    )
    print(response.json())
```

---

## 📋 API Endpoints (All Under `/api/v1/`)

### Exercises
```
GET  /exercises              # List all
GET  /exercises?muscle_group=CHEST
POST /exercises              # Create custom
DEL  /exercises/{id}
```

### Workouts
```
GET  /workouts               # Paginated: ?page=1&limit=20
GET  /workouts/today
GET  /workouts/{id}
POST /workouts               # Create with sets
PUT  /workouts/{id}
DEL  /workouts/{id}

# Sets
POST /workouts/{id}/sets
PUT  /workouts/{id}/sets/{set_id}
DEL  /workouts/{id}/sets/{set_id}
GET  /workouts/history/{exercise_id}
```

### Nutrition
```
GET  /nutrition              # ?date=2026-04-27
GET  /nutrition/summary      # ?days=30
POST /nutrition              # Create log
PUT  /nutrition/{id}
DEL  /nutrition/{id}
```

### Foods
```
GET  /foods/search?q=chicken    # Open Food Facts
GET  /foods/custom              # User's library
POST /foods/custom              # Create custom food
DEL  /foods/custom/{id}
```

### Splits
```
GET  /splits
GET  /splits/{id}
GET  /splits/{id}/days
POST /splits                 # Create
PUT  /splits/{id}
PUT  /splits/{id}/activate   # Set as active
DEL  /splits/{id}
```

### Progress
```
GET  /progress/volume        # Per exercise
GET  /progress/strength
GET  /progress/bodyweight
GET  /progress/calories      # ?days=30
GET  /progress/macros
```

### AI Coach
```
POST /ai/coach               # Streaming response
GET  /ai/sessions            # Chat history
```

### Auth
```
POST /auth/verify
PUT  /auth/profile
GET  /health
```

---

## 🎨 Frontend Pages

### Bottom Navigation Routes
```
/ = Home/Dashboard
/workout/new = Log workout
/nutrition = Track meals
/progress = View charts
/coach = AI assistant
```

### Other Routes
```
/splits = Manage splits
/history = Past workouts
/settings = User profile
```

---

## 📊 Example Payloads

### Create Workout
```json
POST /api/v1/workouts
{
  "label": "Chest Day",
  "splitDayId": "optional-id",
  "date": "2026-04-27T10:00:00"
}
```

### Add Set to Workout
```json
POST /api/v1/workouts/workout_123/sets
{
  "exerciseId": "ex_1",
  "setNumber": 1,
  "reps": 10,
  "weightKg": 100,
  "rpe": 8,
  "isWarmup": false
}
```

### Log Nutrition
```json
POST /api/v1/nutrition
{
  "mealType": "BREAKFAST",
  "foodName": "Chicken Breast",
  "calories": 165,
  "proteinG": 31,
  "carbsG": 0,
  "fatG": 3.6,
  "quantityG": 100,
  "date": "2026-04-27T08:00:00"
}
```

### Create Split
```json
POST /api/v1/splits
{
  "name": "Upper/Lower",
  "days": ["Upper A", "Lower A", "Upper B", "Lower B"]
}
```

---

## 🐛 Debugging

### See Backend Logs
Look at terminal running `python main.py`
```
INFO:     Started server process [12976]
INFO:main:GymChad API starting on 0.0.0.0:3001
```

### See Frontend Requests
```
1. Open DevTools (F12)
2. Go to Network tab
3. Filter: XHR
4. Perform action
5. Click request to see details
```

### Check if Services Running
```powershell
# Backend
curl http://localhost:3001/health
# Returns: {"ok": true}

# Frontend
curl http://localhost:5173
# Returns: HTML with React app
```

### Common Issues

| Problem | Solution |
|---------|----------|
| Port 3001 in use | Change in `backend/.env`: `PORT=3002` |
| Port 5173 in use | Change in `frontend/vite.config.ts`: `port: 5174` |
| CORS error | Check `FRONTEND_URL` in backend/.env |
| API 404 | Check endpoint spelling and `/api/v1/` prefix |
| No header provided | Add `x-user-id: test-user` to requests |

---

## 📁 Project Structure

```
gymtracker-pro/
├── backend/
│   ├── main.py              # All routes (1120 lines)
│   ├── database.py          # DB connection
│   ├── requirements.txt      # 42 packages
│   ├── .env                 # Config
│   └── venv/                # Virtual env
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # 9 pages (1121 lines)
│   │   ├── components/      # UI components
│   │   ├── services/api.ts  # Axios instance
│   │   ├── stores/          # Zustand state
│   │   └── types/           # TypeScript types
│   ├── vite.config.ts
│   └── tailwind.config.ts
│
├── LOCAL_TESTING.md         # This guide
├── SPEC_COMPLIANCE.md       # Detailed compliance
└── README.md
```

---

## 🚀 Environment

### Backend .env
```env
DATABASE_URL=postgresql://localhost/gymchad
ANTHROPIC_API_KEY=sk-test-key
PORT=3001
FRONTEND_URL=http://localhost:5173
HOST=0.0.0.0
```

### Frontend .env (optional)
```env
VITE_API_URL=http://localhost:3001/api/v1
```

---

## 💡 Tips

- **API Docs**: Always check `/docs` for exact endpoint signatures
- **Type Safety**: Frontend has TypeScript types matching Pydantic schemas
- **Rate Limits**: AI coach is 20/hour, most others 30/minute
- **Mock Data**: No database needed yet, routes return sensible defaults
- **Headers**: Always include `x-user-id` header on requests
- **Async**: Backend uses native async—no blocking!

---

## 📚 Learn More

- **FastAPI**: http://fastapi.tiangolo.com
- **React**: https://react.dev
- **Tailwind**: https://tailwindcss.com/docs
- **Zustand**: https://github.com/pmndrs/zustand
- **Recharts**: https://recharts.org/

---

## ✅ Checklist

- [x] Backend running on 3001
- [x] Frontend running on 5173
- [x] Swagger UI live at /docs
- [x] Can make API requests
- [x] Frontend can reach backend
- [x] All pages loading
- [x] Charts rendering
- [x] Mobile responsive

---

**Ready to build?** Start testing: http://localhost:3001/docs 🎉
