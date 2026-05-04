# GymChad Bug Audit & Fix Log

Generated: 2026-05-03

---

## Files Changed

### Frontend

| File | Changes |
|------|---------|
| `frontend/src/App.tsx` | BUG 4 fix — lazy-load all heavy pages; add Suspense wrapper |
| `frontend/src/pages/Workout.tsx` | BUG 2, 3, 5 fixes — saveSet calls updateSet for existing sets, per-set saving flag, double-creation guard, double-finish guard |
| `frontend/src/pages/Nutrition.tsx` | BUG 1 fix — optimistic calorie/macro update + awaited server refresh after food log |
| `frontend/src/stores/workoutStore.ts` | BUG 5 / Proactive — stale session discard on rehydration (>24h old) |
| `frontend/src/stores/authStore.ts` | Proactive — logout clears both in-memory workout store state and localStorage key |
| `frontend/src/pages/Workout.tsx` (session 2) | PROACTIVE-4 — connect to workoutStore: save on start, restore sets on mount, clear on finish |

### Backend

| File | Changes |
|------|---------|
| `backend/app/routers/splits.py` | Proactive — added missing `/splits/{id}/duplicate`, `/splits/{id}/share`, `/splits/shared/{token}`, `/splits/shared/{token}/import` endpoints |

---

## Bugs Found & Fixed

### Reported Bugs

#### BUG 1 — NUTRITION: Food added doesn't update calorie/macro totals
- **Root cause**: `logAll()` called `refreshNutrition()` as fire-and-forget (no await). Even on success, if the server was slow the UI stayed stale. There was also no optimistic update.
- **Fix**: Added optimistic update of `summary` totals immediately when user taps "Log Foods" (within 1 render cycle, well under 300ms). After the POST resolves, the server response is awaited to replace the optimistic data with accurate values (including real log IDs). On failure, the optimistic update is reverted via server refresh.
- **File**: `frontend/src/pages/Nutrition.tsx`

#### BUG 2 — WORKOUT: Editing reps/weight on a set doesn't save
- **Root cause**: `saveSet()` always called `workoutsApi.addSet()` (POST), even when the set already had a server-assigned `id`. Editing an already-saved set just created a duplicate on the server while the UI showed the edit as saved.
- **Fix**: `saveSet()` now branches on whether `s.id` exists. If the set has already been saved (has an `id`), it calls `workoutsApi.updateSet()` (PUT) instead. On API failure, the saving flag is reset and a toast error is shown.
- **File**: `frontend/src/pages/Workout.tsx`

#### BUG 3 — WORKOUT: Sets fail to save intermittently
- **Root cause**: No guard against rapid double-taps of the "Log Set" check button. Multiple rapid taps could fire multiple concurrent POST requests for the same set, causing race conditions and duplicate database rows.
- **Fix**: Added a `saving` boolean flag to the `LiveSet` interface. The check button is disabled (`disabled={!!set.saving}`) while an API call is in flight. State is updated to `saving: true` immediately when the button is tapped and reverted on failure.
- **File**: `frontend/src/pages/Workout.tsx`

#### BUG 4 — NAVIGATION: Tab switching causes significant hangs
- **Root cause**: All page components (Dashboard, Workout, Nutrition, Analytics, Splits, History, Settings, Schedule, Tools) were eagerly imported at app startup, loading the entire application bundle upfront. Switching tabs parsed and executed large component modules synchronously.
- **Fix**: All heavy page components are now `React.lazy()` imports, code-split into separate chunks. Each lazy-loaded route is wrapped in a `<Suspense>` fallback (`PageSuspense` component) to prevent blank screens during chunk loading.
- **File**: `frontend/src/App.tsx`

#### BUG 5 — WORKOUT LOGGING: Overall flow is unreliable
- **Root cause (double creation)**: `beginWorkout()` had no idempotency guard. Rapid double-taps on "Start Workout" could create two workout records in the database.
- **Root cause (double finish)**: `finishWorkout()` had no guard. Rapid taps on "Done" could fire multiple PUT requests and potentially clear state prematurely.
- **Root cause (stale rehydration)**: The Zustand persisted workout store had no timestamp check. A workout session started yesterday and abandoned without completing would be resurrected on the next app open.
- **Fix**: Added `creatingWorkoutRef` (useRef) that gates `beginWorkout()` — a second call while the first is in flight is a no-op. Added `finishingRef` that gates `finishWorkout()`. Added `startTime` timestamp check in `onRehydrateStorage` — sessions older than 24 hours are discarded on rehydration.
- **Files**: `frontend/src/pages/Workout.tsx`, `frontend/src/stores/workoutStore.ts`

---

### Proactive Audit Bugs Found

#### PROACTIVE-1 — BACKEND: Split duplicate/share/shared-lookup endpoints missing
- **Root cause**: The frontend's Splits page calls `POST /splits/{id}/duplicate` and `POST /splits/{id}/share`, and SharedSplit page calls `GET /splits/shared/{token}` and `POST /splits/shared/{token}/import`. None of these endpoints existed in the backend splits router. Every tap on "Share" or "Duplicate" was returning a 404 error.
- **Fix**: Implemented all four missing endpoints in `backend/app/routers/splits.py`:
  - `POST /{split_id}/duplicate` — deep-copies a split and all its days/exercises
  - `POST /{split_id}/share` — generates or returns a UUID shareable token
  - `GET /shared/{token}` — public (no auth) lookup by shared token
  - `POST /shared/{token}/import` — copies a shared split into the authenticated user's account
- **File**: `backend/app/routers/splits.py`

#### PROACTIVE-2 — AUTH: Logout doesn't clear persisted workout state
- **Root cause**: `logout()` in `authStore.ts` called `supabase.auth.signOut()` and set `user: null`, but the Zustand `gymchad-active-workout` localStorage key was never cleared. If a second user logged into the same device, they would see the previous user's in-progress workout state. Additionally, the in-memory Zustand state was not cleared, meaning the store's `activeWorkout` would survive within the same browser session.
- **Fix**: `logout()` now calls both `useWorkoutStore.getState().clearActive()` (clears in-memory state) and `localStorage.removeItem('gymchad-active-workout')` (clears persisted state) after signing out.
- **File**: `frontend/src/stores/authStore.ts`

#### PROACTIVE-4 — BUG 5 EXTENSION: Active workout not restored after tab navigation
- **Root cause**: `WorkoutPage` stored the active workout in local `useState`, not connected to the Zustand store. Navigating away from `/workout` to any other page unmounted the component, destroying all workout state. The store had `activeWorkout` but it was never written to or read from by the page.
- **Fix**: On `beginWorkout()` success, calls `storeSetWorkout(w)` to persist the workout to Zustand. On `finishWorkout()`, calls `clearActive()` to remove it. On mount, if `storedWorkout` exists (user navigated away mid-workout), restores the `workout` state and calls `workoutsApi.get(id)` to refetch the saved sets from the backend, rebuilding the exercise blocks.
- **Files**: `frontend/src/pages/Workout.tsx`, `frontend/src/stores/authStore.ts`

#### PROACTIVE-3 — WORKOUT STORE: Stale session rehydration
- **Root cause**: The Zustand persist middleware would restore `activeWorkout` and `activeSets` from localStorage regardless of age. A workout started 3 days ago and never finished would appear as active when the app reopened.
- **Fix**: Added `onRehydrateStorage` callback that nullifies `activeWorkout`, `activeSets`, and `startTime` if `startTime` is older than 24 hours.
- **File**: `frontend/src/stores/workoutStore.ts`

---

## Bugs NOT Fixed (Out of Scope / Already Working)

- **Token refresh**: The Supabase client handles JWT refresh automatically via `onAuthStateChange`. The `api.ts` interceptor reads from the cached `_token` which is updated on every auth state change. No additional refresh logic needed.
- **Food search debounce**: The nutrition search is manually triggered (user presses "Go" or Enter), not auto-debounced. This is intentional UX; the button prevents excessive API calls.
- **History pagination**: Already implemented — `workoutsApi.list({ page, limit: 20 })` with "Load more" button.
- **Analytics empty states**: Charts already handle empty data with proper empty-state UI (no crash paths found).
- **Backend auth on all routes**: Every protected endpoint already uses `Depends(get_current_user)`. Public endpoints (`/auth/verify`, `/splits/shared/{token}`) are correctly unauthenticated.
- **CORS**: Backend uses `allow_origins=["*"]` — appropriate for a development/Railway setup; production should tighten this.
- **Request timeout**: Already set to 15s in `api.ts` (`timeout: 15000`).
