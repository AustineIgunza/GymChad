# Local Testing Guide

## Quick Start

### Windows
```bash
start.bat
```

### macOS/Linux
```bash
bash start.sh
```

This will start both backend and frontend automatically.

---

## 🌐 Testing Links

### Frontend
- **App**: http://localhost:5173
- **Hot reload**: Auto-refresh on file changes

### Backend API
- **Health**: http://localhost:3001/health
- **API Docs (Swagger)**: http://localhost:3001/docs ⭐ **USE THIS TO TEST**
- **Alternative Docs**: http://localhost:3001/redoc
- **OpenAPI Schema**: http://localhost:3001/openapi.json

---

## 🧪 Testing Workflow

### 1. Test Backend Only (No Frontend)
1. Open: http://localhost:3001/docs
2. Click any endpoint
3. Click "Try it out"
4. Add required header: `x-user-id: test_user`
5. Fill in parameters
6. Click "Execute"
7. See response

### 2. Test Frontend with Backend
1. Open: http://localhost:5173
2. Use the app normally
3. Open browser DevTools (F12)
4. Watch Network tab for API calls
5. Check Console for errors

### 3. Quick API Tests

**Health Check:**
```bash
curl http://localhost:3001/health
```

**List Exercises:**
```bash
curl -H "x-user-id: test_user" http://localhost:3001/api/v1/exercises
```

**Create Workout:**
```bash
curl -X POST http://localhost:3001/api/v1/workouts \
  -H "x-user-id: test_user" \
  -H "Content-Type: application/json" \
  -d '{"label": "Chest Day"}'
```

---

## 📊 Testing Checklist

- [ ] Backend starts (http://localhost:3001/health = OK)
- [ ] API docs load (http://localhost:3001/docs)
- [ ] Frontend loads (http://localhost:5173)
- [ ] Can test endpoints in API docs
- [ ] Hot reload works (edit code, see changes)
- [ ] No console errors in browser

---

## 🐛 Troubleshooting

**Port Already in Use:**
```bash
# Find what's using port 3001
lsof -i :3001
# Or 5173
lsof -i :5173

# Kill it
kill -9 <PID>
```

**Backend won't start:**
```bash
# Check Python is installed
python --version

# Check dependencies
pip install -r requirements.txt
```

**Frontend won't start:**
```bash
# Check Node is installed
node --version
npm --version

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Can't reach API from frontend:**
- Check FRONTEND_URL in backend/.env
- Should be: `http://localhost:5173`
- Restart backend if you change it

---

## 📝 Making Changes

### Changing Backend Code
1. Edit file in `backend/main.py` or other files
2. Server auto-reloads
3. Test in API docs: http://localhost:3001/docs
4. Check changes take effect

### Changing Frontend Code
1. Edit file in `frontend/src/`
2. Browser auto-refreshes (hot reload)
3. Test in http://localhost:5173
4. Check DevTools for errors

### Testing the AI Coach
1. Go to http://localhost:5173
2. Click Coach tab
3. Type a message
4. Should see streaming response
5. Check browser console for errors

---

## 🔗 Key Endpoints to Test

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Verify backend is running |
| GET | `/api/v1/exercises` | List exercises |
| POST | `/api/v1/workouts` | Create workout |
| POST | `/api/v1/nutrition` | Log food |
| GET | `/api/v1/nutrition?date=2024-04-27` | Get daily nutrition |
| POST | `/api/v1/ai/coach` | Test AI coach (streaming) |
| GET | `/api/v1/progress/calories` | Get calorie charts data |

---

## 💡 Pro Tips

1. **Use Swagger UI** (http://localhost:3001/docs) - it's perfect for testing
2. **Keep DevTools open** - watch network requests as you use the app
3. **Test with mock data** - no database needed yet, routes return mock data
4. **Try different `x-user-id` values** - each is a different "user"
5. **Check for errors** - backend logs appear in terminal, frontend logs in DevTools

---

**Ready to test? Start with http://localhost:3001/docs!** 🚀
