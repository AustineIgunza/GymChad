import { type ReactNode, useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function getClientUserId() {
  const existing = localStorage.getItem("gymchad-user-id");
  if (existing) return existing;
  const generated = `guest_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  localStorage.setItem("gymchad-user-id", generated);
  return generated;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3001/api/v1",
});
api.interceptors.request.use((config) => {
  config.headers["x-user-id"] = getClientUserId();
  return config;
});

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-gym-card p-4 shadow-lg">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function DashboardPage() {
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  useEffect(() => {
    api.get("/workouts/today").then((res) => setTodayWorkout(res.data)).catch(() => undefined);
  }, []);
  return (
    <main className="space-y-4 p-4 pb-28">
      <Card title="Today">
        <p className="text-gym-muted">{todayWorkout ? `Workout: ${todayWorkout.label}` : "No workout logged yet today."}</p>
      </Card>
      <Card title="Quick Actions">
        <p className="text-gym-muted">Start workout, log meals, and check coach suggestions quickly.</p>
      </Card>
    </main>
  );
}

function WorkoutPage() {
  const [exerciseId, setExerciseId] = useState("");
  const [weightKg, setWeightKg] = useState(60);
  const [reps, setReps] = useState(8);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [workoutId, setWorkoutId] = useState<string | null>(localStorage.getItem("gymchad-active-workout-id"));

  useEffect(() => {
    api.get("/workouts/recommendations").then((res) => setRecommendations(res.data)).catch(() => undefined);
  }, []);

  const selectedTip = useMemo(() => recommendations.find((item) => item.exerciseId === exerciseId), [recommendations, exerciseId]);

  async function startWorkout() {
    const res = await api.post("/workouts", { label: "Gym Session" });
    localStorage.setItem("gymchad-active-workout-id", res.data.id);
    setWorkoutId(res.data.id);
    toast.success("Workout started");
  }

  async function addSet() {
    if (!workoutId || !exerciseId) return;
    await api.post(`/workouts/${workoutId}/sets`, { exerciseId, setNumber: 1, reps, weightKg });
    toast.success("Set saved");
  }

  return (
    <main className="space-y-4 p-4 pb-28">
      <Card title="Workout Logger">
        <div className="space-y-3">
          <button className="min-h-11 rounded-xl bg-gym-accent px-4 py-2 font-semibold text-black" onClick={startWorkout}>
            {workoutId ? "Workout Active" : "Start Today's Workout"}
          </button>
          <input
            className="min-h-11 w-full rounded-xl bg-slate-900 px-3"
            placeholder="Exercise ID"
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
          />
          {selectedTip ? (
            <p className="rounded-xl bg-slate-800 p-2 text-sm text-gym-muted">
              Tip: {selectedTip.recommendation} Suggested: {selectedTip.suggestedWeightKg}kg ({selectedTip.suggestedReps})
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <input className="min-h-11 rounded-xl bg-slate-900 px-3" type="number" value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))} />
            <input className="min-h-11 rounded-xl bg-slate-900 px-3" type="number" value={reps} onChange={(e) => setReps(Number(e.target.value))} />
          </div>
          <button className="min-h-11 rounded-xl bg-slate-700 px-4 py-2" onClick={addSet}>
            Add Set
          </button>
        </div>
      </Card>
    </main>
  );
}

function NutritionPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [customFoods, setCustomFoods] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [totals, setTotals] = useState({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [quantityG, setQuantityG] = useState(100);

  async function loadDay(selectedDate: string) {
    const res = await api.get("/nutrition", { params: { date: selectedDate } });
    setLogs(res.data.logs);
    setTotals(res.data.totals);
    localStorage.setItem(`gymchad-nutrition-${selectedDate}`, JSON.stringify(res.data));
  }

  async function loadCustomFoods() {
    const res = await api.get("/foods/custom");
    setCustomFoods(res.data);
  }

  useEffect(() => {
    loadCustomFoods().catch(() => undefined);
  }, []);

  useEffect(() => {
    loadDay(date).catch(() => {
      const cached = localStorage.getItem(`gymchad-nutrition-${date}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setLogs(parsed.logs ?? []);
        setTotals(parsed.totals ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
      }
    });
  }, [date]);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      const res = await api.get("/foods/search", { params: { q: query } });
      setSearchResults(res.data);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [query]);

  async function addFood(food: any) {
    const scale = quantityG / 100;
    await api.post("/nutrition", {
      mealType: "SNACK",
      foodName: food.name,
      calories: Math.round(food.caloriesPer100g * scale),
      proteinG: Number((food.proteinPer100g * scale).toFixed(1)),
      carbsG: Number((food.carbsPer100g * scale).toFixed(1)),
      fatG: Number((food.fatPer100g * scale).toFixed(1)),
      quantityG,
      openFoodFactsId: food.id,
      date,
    });
    toast.success("Food logged");
    setSelectedFood(null);
    await loadDay(date);
  }

  async function deleteEntry(id: string) {
    await api.delete(`/nutrition/${id}`);
    toast.success("Entry deleted");
    await loadDay(date);
  }

  async function saveCustomFood(food: any) {
    await api.post("/foods/custom", {
      name: food.name,
      calories: food.caloriesPer100g,
      proteinG: food.proteinPer100g,
      carbsG: food.carbsPer100g,
      fatG: food.fatPer100g,
    });
    toast.success("Saved to My Foods");
    await loadCustomFoods();
  }

  return (
    <main className="space-y-4 p-4 pb-28">
      <Card title="Nutrition">
        <div className="space-y-3">
          <input className="min-h-11 w-full rounded-xl bg-slate-900 px-3" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="rounded-xl bg-slate-800 p-3 text-sm text-gym-muted">
            Calories: {totals.calories} | P: {totals.proteinG.toFixed(1)}g | C: {totals.carbsG.toFixed(1)}g | F: {totals.fatG.toFixed(1)}g
          </div>
          <input
            className="min-h-11 w-full rounded-xl bg-slate-900 px-3"
            placeholder="Search foods..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {selectedFood ? (
            <div className="rounded-xl bg-slate-800 p-3">
              <p className="text-sm">{selectedFood.name}</p>
              <input
                className="mt-2 min-h-11 w-full rounded-xl bg-slate-900 px-3"
                type="number"
                value={quantityG}
                onChange={(e) => setQuantityG(Number(e.target.value))}
              />
              <button className="mt-2 min-h-11 rounded-xl bg-gym-accent px-4 py-2 font-semibold text-black" onClick={() => addFood(selectedFood)}>
                Add Food
              </button>
            </div>
          ) : null}
          <div className="space-y-2">
            {searchResults.slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-800 p-3">
                <p className="text-sm">{item.name}</p>
                <p className="text-xs text-gym-muted">{item.caloriesPer100g} kcal /100g</p>
                <div className="mt-2 flex gap-2">
                  <button className="min-h-11 rounded-lg bg-slate-700 px-3 text-sm" onClick={() => setSelectedFood(item)}>
                    Log
                  </button>
                  <button className="min-h-11 rounded-lg bg-slate-700 px-3 text-sm" onClick={() => saveCustomFood(item)}>
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
          {customFoods.length ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">My Foods</p>
              {customFoods.slice(0, 5).map((food) => (
                <button
                  key={food.id}
                  className="flex min-h-11 w-full items-center justify-between rounded-xl bg-slate-800 px-3 text-left"
                  onClick={() =>
                    setSelectedFood({
                      id: food.id,
                      name: food.name,
                      caloriesPer100g: food.calories,
                      proteinPer100g: food.proteinG,
                      carbsPer100g: food.carbsG,
                      fatPer100g: food.fatG,
                    })
                  }
                >
                  <span>{food.name}</span>
                  <span className="text-xs text-gym-muted">{food.calories} kcal</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="space-y-2">
            <p className="text-sm font-medium">Logged Entries</p>
            {logs.length === 0 ? <p className="text-sm text-gym-muted">No entries for this day.</p> : null}
            {logs.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl bg-slate-800 p-3">
                <div>
                  <p className="text-sm">{entry.foodName}</p>
                  <p className="text-xs text-gym-muted">{entry.calories} kcal | P {entry.proteinG} C {entry.carbsG} F {entry.fatG}</p>
                </div>
                <button className="min-h-11 rounded-lg bg-slate-700 px-3 text-sm" onClick={() => deleteEntry(entry.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </main>
  );
}

function AnalyticsPage() {
  const [exerciseId, setExerciseId] = useState("");
  const [volume, setVolume] = useState<any[]>([]);
  const [strength, setStrength] = useState<any[]>([]);
  const [calories, setCalories] = useState<any[]>([]);
  const [macros, setMacros] = useState<{ proteinG: number; carbsG: number; fatG: number }>({ proteinG: 0, carbsG: 0, fatG: 0 });

  async function load() {
    const [volumeRes, caloriesRes, macrosRes] = await Promise.all([
      api.get("/progress/volume", { params: { weeks: 8, ...(exerciseId ? { exerciseId } : {}) } }),
      api.get("/progress/calories", { params: { days: 30 } }),
      api.get("/progress/macros", { params: { days: 7 } }),
    ]);
    setVolume(volumeRes.data);
    setCalories(caloriesRes.data);
    setMacros(macrosRes.data);
    if (exerciseId) {
      const strengthRes = await api.get("/progress/strength", { params: { exerciseId } });
      setStrength(strengthRes.data);
    } else {
      setStrength([]);
    }
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, [exerciseId]);

  const macroPieData = [
    { name: "Protein", value: macros.proteinG },
    { name: "Carbs", value: macros.carbsG },
    { name: "Fat", value: macros.fatG },
  ];

  return (
    <main className="space-y-4 p-4 pb-28">
      <Card title="Analytics">
        <div className="space-y-4">
          <input
            className="min-h-11 w-full rounded-xl bg-slate-900 px-3"
            placeholder="Exercise ID for strength curve"
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
          />

          <div>
            <p className="mb-2 text-sm text-gym-muted">Calories vs Target (30 days)</p>
            <div className="h-56 rounded-xl bg-slate-900 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calories}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" hide />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="calories" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="target" stroke="#a78bfa" strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-gym-muted">Weekly Volume (8 weeks)</p>
            <div className="h-56 rounded-xl bg-slate-900 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="volume" fill="#38bdf8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-gym-muted">Average Macros (7 days)</p>
            <div className="h-56 rounded-xl bg-slate-900 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={macroPieData} dataKey="value" nameKey="name" outerRadius={80} fill="#22c55e" />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {exerciseId ? (
            <div>
              <p className="mb-2 text-sm text-gym-muted">Strength Curve (estimated 1RM)</p>
              <div className="h-56 rounded-xl bg-slate-900 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={strength}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="estimated1RM" stroke="#f97316" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </main>
  );
}

function CoachPage() {
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");

  async function send() {
    setAnswer("");
    const response = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:3001/api/v1"}/ai/coach`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": getClientUserId() },
      body: JSON.stringify({ message, conversationHistory: [] }),
    });
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      chunk.split("\n").forEach((line) => {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.replace("data: ", ""));
            if (parsed.token) setAnswer((prev) => prev + parsed.token);
          } catch {
            return;
          }
        }
      });
    }
  }

  return (
    <main className="space-y-4 p-4 pb-28">
      <Card title="AI Coach">
        <textarea
          className="min-h-24 w-full rounded-xl bg-slate-900 p-3"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Review my week"
        />
        <button className="mt-3 min-h-11 rounded-xl bg-gym-accent px-4 py-2 font-semibold text-black" onClick={send}>
          Ask Coach
        </button>
        <p className="mt-3 whitespace-pre-wrap text-sm text-gym-muted">{answer}</p>
      </Card>
    </main>
  );
}

function SplitsPage() {
  const [name, setName] = useState("Bro Split");
  const [splits, setSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    const res = await api.get("/splits");
    setSplits(res.data);
    setLoading(false);
  }
  useEffect(() => {
    load().catch(() => undefined);
  }, []);
  async function createSplit() {
    await api.post("/splits", { name, days: [] });
    toast.success("Split created");
    await load();
  }
  async function activate(id: string) {
    await api.put(`/splits/${id}/activate`);
    toast.success("Split activated");
    await load();
  }
  return (
    <main className="space-y-4 p-4 pb-28">
      <Card title="Split Manager">
        <div className="space-y-3">
          <input className="min-h-11 w-full rounded-xl bg-slate-900 px-3" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="min-h-11 rounded-xl bg-slate-700 px-4 py-2" onClick={createSplit}>Create Split</button>
          {loading ? <p className="text-gym-muted">Loading...</p> : (
            <div className="space-y-2">
              {splits.map((split) => (
                <div key={split.id} className="rounded-xl bg-slate-800 p-3">
                  <p>{split.name}</p>
                  <button className="mt-2 min-h-11 rounded-lg bg-slate-700 px-3 py-1 text-sm" onClick={() => activate(split.id)}>
                    {split.isActive ? "Active" : "Set Active"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </main>
  );
}

export default function App() {
  const pages = [
    { path: "/", label: "Home" },
    { path: "/workout/new", label: "Workout" },
    { path: "/nutrition", label: "Nutrition" },
    { path: "/analytics", label: "Progress" },
    { path: "/coach", label: "Coach" },
  ];

  useEffect(() => {
    const userId = getClientUserId();
    api.post("/auth/verify", { token: `${userId}tokenseed` }).catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gym-bg text-gym-text">
      <header className="sticky top-0 z-10 border-b border-slate-700 bg-gym-bg/95 p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="font-semibold">GymChad</p>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs">CUTTING</span>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/workout/new" element={<WorkoutPage />} />
        <Route path="/nutrition" element={<NutritionPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/coach" element={<CoachPage />} />
        <Route path="/splits" element={<SplitsPage />} />
      </Routes>

      <nav className="fixed bottom-0 left-0 right-0 mx-auto flex h-16 max-w-md items-center justify-around border-t border-slate-700 bg-gym-card">
        {pages.map((page) => (
          <NavLink
            key={page.path}
            to={page.path}
            className={({ isActive }) =>
              `min-h-11 min-w-11 rounded-xl px-3 py-2 text-sm ${isActive ? "bg-slate-700 text-white" : "text-gym-muted"}`
            }
          >
            {page.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
