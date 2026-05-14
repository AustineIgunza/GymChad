import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import api from "./services/api";
import { useAuthStore } from "./stores/useAuthStore";
import { Card, Button, Input, Badge } from "./components/ui/index";
import { getMealTypeEmoji } from "./utils/nutrition";
import type { Exercise, NutritionLog } from "./types";

// ─── DASHBOARD ────────────────────────────────────────────────────────
function DashboardPage() {
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [todaySplit, setTodaySplit] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get("/workouts/today").then((res) => setTodayWorkout(res.data)).catch(() => null),
      api.get("/auth/profile").then((res) => setUser(res.data.user)).catch(() => null),
      api.get("/workouts", { params: { limit: 100 } }).then((res) => setWorkoutCount(res.data.total || 0)).catch(() => null),
      api.get("/splits/today").then((res) => setTodaySplit(res.data)).catch(() => null),
    ]).catch(() => null);
  }, []);

  return (
    <main className="space-y-4 p-4 lg:p-8 pb-28 lg:pb-8 max-w-6xl mx-auto w-full">
      <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border-blue-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold">GymChad</h1>
            <p className="text-sm text-gray-400">{user?.name || "Athlete"}</p>
          </div>
          <Badge color="blue">{user?.goal || "CUTTING"}</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Today's Workout" className="lg:col-span-2">
          {todaySplit?.splitDay && (
            <div className="mb-3 bg-purple-900/30 border border-purple-700 rounded-lg p-3">
              <p className="text-sm font-semibold text-purple-300">
                {todaySplit.dayOfWeek} - Day {todaySplit.dayIndex}/{todaySplit.totalDays}: {todaySplit.splitDay.label}
              </p>
              <p className="text-xs text-gray-400">{todaySplit.split?.name}</p>
            </div>
          )}
          {todayWorkout ? (
            <div className="space-y-2">
              <p className="font-semibold">{todayWorkout.label}</p>
              <p className="text-sm text-gray-400">{todayWorkout.sets?.length || 0} sets logged</p>
              <NavLink to="/workout" className="inline-block mt-2">
                <Button size="sm" variant="primary">Continue</Button>
              </NavLink>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">No workout logged yet today</p>
              <NavLink to="/workout">
                <Button size="sm" variant="primary" className="w-full">Start Workout</Button>
              </NavLink>
            </div>
          )}
        </Card>

        <Card title="Quick Stats">
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-400">{user?.tdee || "-"}</p>
              <p className="text-xs text-gray-400">TDEE</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-400">{workoutCount}</p>
              <p className="text-xs text-gray-400">Workouts</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <NavLink to="/nutrition" className="block">
          <Card className="hover:bg-gray-750 cursor-pointer transition-colors h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Log Meal</p>
                <p className="text-xs text-gray-400">Track your nutrition</p>
              </div>
              <span className="text-3xl lg:text-4xl">🍽️</span>
            </div>
          </Card>
        </NavLink>
        <NavLink to="/history" className="block">
          <Card className="hover:bg-gray-750 cursor-pointer transition-colors h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">History</p>
                <p className="text-xs text-gray-400">View weekly, monthly, yearly</p>
              </div>
              <span className="text-3xl lg:text-4xl">📅</span>
            </div>
          </Card>
        </NavLink>
      </div>
    </main>
  );
}

// ─── WORKOUT LOGGER ────────────────────────────────────────────────────
function WorkoutPage() {
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [weightKg, setWeightKg] = useState(80);
  const [reps, setReps] = useState(8);
  const [rpe, setRpe] = useState(7);
  const [sets, setSets] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [todaySplit, setTodaySplit] = useState<any>(null);
  const [splitExercises, setSplitExercises] = useState<any[]>([]);

  useEffect(() => {
    api.get("/exercises").then((res) => setExercises(res.data)).catch(() => null);
    api.get("/workouts/recommendations").then((res) => setRecommendations(res.data)).catch(() => null);
    // Check if there's already a workout today
    api.get("/workouts/today").then((res) => {
      if (res.data) {
        setWorkoutId(res.data.id);
        setLabel(res.data.label);
        setSets(res.data.sets || []);
      }
    }).catch(() => null);
    // Fetch today's split day
    api.get("/splits/today").then((res) => {
      if (res.data?.splitDay) {
        setTodaySplit(res.data);
        setSplitExercises(res.data.splitDay.exercises || []);
        if (!label) {
          setLabel(res.data.splitDay.label);
        }
      }
    }).catch(() => null);
  }, []);

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);
  const selectedRecommendation = recommendations.find((r) => r.exerciseId === selectedExerciseId);

  async function startWorkout() {
    try {
      setLoading(true);
      const workoutLabel = label || todaySplit?.splitDay?.label || "Gym Session";
      const res = await api.post("/workouts", {
        label: workoutLabel,
        splitDayId: todaySplit?.splitDay?.id,
      });
      setWorkoutId(res.data.id);
      setLabel(workoutLabel);
      setSets([]);
      toast.success("Workout started!");
    } catch {
      toast.error("Failed to start workout");
    } finally {
      setLoading(false);
    }
  }

  async function addSet() {
    if (!workoutId || !selectedExerciseId) {
      toast.error("Select an exercise and start a workout");
      return;
    }
    try {
      setLoading(true);
      const res = await api.post(`/workouts/${workoutId}/sets`, {
        exerciseId: selectedExerciseId,
        setNumber: sets.filter((s) => s.exerciseId === selectedExerciseId).length + 1,
        reps,
        weightKg,
        rpe: rpe || undefined,
      });
      setSets([...sets, res.data]);
      toast.success("Set added!");
    } catch {
      toast.error("Failed to add set");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSet(setId: string) {
    if (!workoutId) return;
    try {
      await api.delete(`/workouts/${workoutId}/sets/${setId}`);
      setSets(sets.filter((s) => s.id !== setId));
      toast.success("Set deleted");
    } catch {
      toast.error("Failed to delete set");
    }
  }

  async function finishWorkout() {
    if (!workoutId) return;
    try {
      setLoading(true);
      await api.put(`/workouts/${workoutId}`, { notes: `${sets.length} sets completed` });
      toast.success("Workout saved!");
      setWorkoutId(null);
      setSets([]);
      setLabel("");
    } catch {
      toast.error("Failed to save workout");
    } finally {
      setLoading(false);
    }
  }

  // Group sets by exercise for display
  const setsByExercise: Record<string, any[]> = {};
  sets.forEach((s) => {
    if (!setsByExercise[s.exerciseId]) setsByExercise[s.exerciseId] = [];
    setsByExercise[s.exerciseId].push(s);
  });

  return (
    <main className="space-y-4 p-4 pb-28">
      {!workoutId ? (
        <Card title="Start Workout">
          <div className="space-y-3">
            {todaySplit?.splitDay && (
              <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3">
                <p className="text-sm font-semibold text-purple-300">
                  {todaySplit.dayOfWeek} - Day {todaySplit.dayIndex}/{todaySplit.totalDays}
                </p>
                <p className="text-lg font-bold">{todaySplit.splitDay.label}</p>
                <p className="text-xs text-gray-400">{todaySplit.split?.name}</p>
                {splitExercises.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {splitExercises.map((ex: any) => (
                      <span key={ex.id} className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                        {ex.exerciseName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Input
              label="Workout Label"
              placeholder="e.g., Chest Day"
              value={label || todaySplit?.splitDay?.label || ""}
              onChange={(e) => setLabel(e.target.value)}
            />
            <Button variant="primary" onClick={startWorkout} loading={loading} className="w-full">
              {todaySplit?.splitDay ? `Start: ${todaySplit.splitDay.label}` : "Start Workout"}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card className="bg-green-900/30 border-green-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Workout</p>
                <p className="font-semibold">{label || "Gym Session"}</p>
                {todaySplit?.splitDay && (
                  <p className="text-xs text-gray-400">
                    Day {todaySplit.dayIndex}/{todaySplit.totalDays} - {todaySplit.split?.name}
                  </p>
                )}
              </div>
              <Button variant="danger" size="sm" onClick={finishWorkout} loading={loading}>Finish</Button>
            </div>
          </Card>

          {/* Split exercises quick-select */}
          {splitExercises.length > 0 && (
            <Card title="Today's Exercises">
              <div className="flex flex-wrap gap-2">
                {splitExercises.map((ex: any) => {
                  const done = sets.some((s) => s.exerciseId === ex.exerciseId);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => setSelectedExerciseId(ex.exerciseId)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        selectedExerciseId === ex.exerciseId
                          ? "bg-blue-600 border-blue-500 text-white"
                          : done
                          ? "bg-green-900/30 border-green-700 text-green-300"
                          : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {done && "✓ "}{ex.exerciseName}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          <Card title="Add Set">
            <div className="space-y-3">
              <select
                className="w-full px-3 py-2.5 rounded-lg bg-gray-700 text-white border-2 border-gray-600 focus:border-blue-500 focus:outline-none"
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
              >
                <option value="">Select Exercise</option>
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>

              {selectedExercise && (
                <div className="text-xs text-gray-400">
                  <Badge color="blue">{selectedExercise.muscleGroup}</Badge>
                </div>
              )}

              {selectedRecommendation && (
                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-2 text-sm text-yellow-200">
                  {selectedRecommendation.recommendation}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Weight (kg)</label>
                  <div className="flex items-center gap-1 mt-1">
                    <Button size="sm" variant="secondary" onClick={() => setWeightKg(Math.max(0, weightKg - 2.5))}>-</Button>
                    <input type="number" value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))} className="flex-1 px-2 py-1 rounded bg-gray-700 text-center text-white" />
                    <Button size="sm" variant="secondary" onClick={() => setWeightKg(weightKg + 2.5)}>+</Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Reps</label>
                  <div className="flex items-center gap-1 mt-1">
                    <Button size="sm" variant="secondary" onClick={() => setReps(Math.max(1, reps - 1))}>-</Button>
                    <input type="number" value={reps} onChange={(e) => setReps(Number(e.target.value))} className="flex-1 px-2 py-1 rounded bg-gray-700 text-center text-white" />
                    <Button size="sm" variant="secondary" onClick={() => setReps(reps + 1)}>+</Button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400">RPE (1-10)</label>
                <input type="range" min="1" max="10" value={rpe} onChange={(e) => setRpe(Number(e.target.value))} className="w-full mt-1" />
                <p className="text-xs text-center mt-1">{rpe}</p>
              </div>

              <Button variant="primary" onClick={addSet} loading={loading} className="w-full">
                Add Set ({sets.filter((s) => s.exerciseId === selectedExerciseId).length + 1})
              </Button>
            </div>
          </Card>

          {sets.length > 0 && (
            <Card title={`Sets (${sets.length})`}>
              <div className="space-y-3">
                {Object.entries(setsByExercise).map(([exId, exSets]) => {
                  const ex = exercises.find((e) => e.id === exId);
                  return (
                    <div key={exId}>
                      <p className="text-sm font-semibold text-blue-300 mb-1">{ex?.name || exId}</p>
                      <div className="space-y-1">
                        {exSets.map((set, idx) => (
                          <div key={set.id} className="flex items-center justify-between bg-gray-700 p-2 rounded-lg">
                            <p className="text-sm">
                              <span className="text-gray-400 mr-2">#{idx + 1}</span>
                              {set.weightKg}kg x {set.reps} {set.rpe && `@ RPE ${set.rpe}`}
                            </p>
                            <Button variant="danger" size="sm" onClick={() => deleteSet(set.id)}>X</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </main>
  );
}

// ─── SMART SERVING HELPERS ──────────────────────────────────────────────

// Foods that are typically counted in units rather than weighed
const UNIT_FOODS: Record<string, { unit: string; gramsPerUnit: number }> = {
  egg: { unit: "egg", gramsPerUnit: 50 },
  eggs: { unit: "egg", gramsPerUnit: 50 },
  banana: { unit: "banana", gramsPerUnit: 120 },
  bananas: { unit: "banana", gramsPerUnit: 120 },
  apple: { unit: "apple", gramsPerUnit: 180 },
  apples: { unit: "apple", gramsPerUnit: 180 },
  orange: { unit: "orange", gramsPerUnit: 130 },
  oranges: { unit: "orange", gramsPerUnit: 130 },
  avocado: { unit: "avocado", gramsPerUnit: 150 },
  slice: { unit: "slice", gramsPerUnit: 30 },
  tortilla: { unit: "tortilla", gramsPerUnit: 45 },
  "rice cake": { unit: "cake", gramsPerUnit: 9 },
};

function getSmartServings(foodName: string, servingSize?: string, servingQty?: number | null) {
  const lower = foodName.toLowerCase();

  // Check if it's a unit-based food
  for (const [keyword, info] of Object.entries(UNIT_FOODS)) {
    if (lower.includes(keyword)) {
      return {
        isUnitBased: true,
        unit: info.unit,
        gramsPerUnit: info.gramsPerUnit,
        presets: [
          { label: `1 ${info.unit}`, grams: info.gramsPerUnit, count: 1 },
          { label: `2 ${info.unit}s`, grams: info.gramsPerUnit * 2, count: 2 },
          { label: `3 ${info.unit}s`, grams: info.gramsPerUnit * 3, count: 3 },
          { label: `4 ${info.unit}s`, grams: info.gramsPerUnit * 4, count: 4 },
          { label: "Custom", grams: 0, count: 0 },
        ],
      };
    }
  }

  // Weight-based foods with smart presets
  const presets = [
    { label: "100g", grams: 100 },
    { label: "150g", grams: 150 },
    { label: "200g", grams: 200 },
    { label: "250g", grams: 250 },
  ];

  // Add a product serving if available
  if (servingQty && servingQty > 0) {
    presets.unshift({ label: servingSize || `${servingQty}g`, grams: servingQty });
  }

  // Chicken/meat specific
  if (lower.includes("chicken") || lower.includes("beef") || lower.includes("turkey") || lower.includes("steak") || lower.includes("fish") || lower.includes("salmon") || lower.includes("tuna")) {
    return {
      isUnitBased: false,
      unit: "g",
      presets: [
        { label: "100g", grams: 100 },
        { label: "150g", grams: 150 },
        { label: "200g", grams: 200 },
        { label: "300g", grams: 300 },
        ...(servingQty ? [{ label: servingSize || `${servingQty}g`, grams: servingQty }] : []),
        { label: "Custom", grams: 0 },
      ],
    };
  }

  // Rice/pasta/oats
  if (lower.includes("rice") || lower.includes("pasta") || lower.includes("oats") || lower.includes("oatmeal")) {
    return {
      isUnitBased: false,
      unit: "g",
      presets: [
        { label: "50g (dry)", grams: 50 },
        { label: "75g (dry)", grams: 75 },
        { label: "100g (dry)", grams: 100 },
        { label: "1 cup cooked (200g)", grams: 200 },
        { label: "Custom", grams: 0 },
      ],
    };
  }

  // Protein powder/scoop
  if (lower.includes("whey") || lower.includes("protein") || lower.includes("powder") || lower.includes("scoop")) {
    return {
      isUnitBased: false,
      unit: "g",
      presets: [
        { label: "1 scoop (30g)", grams: 30 },
        { label: "2 scoops (60g)", grams: 60 },
        { label: "Custom", grams: 0 },
      ],
    };
  }

  presets.push({ label: "Custom", grams: 0 });

  return { isUnitBased: false, unit: "g", presets };
}

// ─── NUTRITION LOGGER ──────────────────────────────────────────────────
function NutritionPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [totals, setTotals] = useState({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [quantityG, setQuantityG] = useState(100);
  const [unitCount, setUnitCount] = useState(1);
  const [selectedServing, setSelectedServing] = useState("100g");
  const [customFoods, setCustomFoods] = useState<any[]>([]);
  const [mealType, setMealType] = useState("SNACK");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState(0);
  const [manualProtein, setManualProtein] = useState(0);
  const [manualCarbs, setManualCarbs] = useState(0);
  const [manualFat, setManualFat] = useState(0);
  // Cart for batch adding
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    api.get("/foods/custom").then((res) => setCustomFoods(res.data)).catch(() => null);
  }, []);

  function loadLogs() {
    api.get("/nutrition", { params: { date } })
      .then((res) => {
        setLogs(res.data.logs);
        setTotals(res.data.totals);
      })
      .catch(() => null);
  }

  useEffect(() => { loadLogs(); }, [date]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 1) {
        setSearching(true);
        api.get("/foods/search", { params: { q: query } })
          .then((res) => setSearchResults(res.data))
          .catch(() => null)
          .finally(() => setSearching(false));
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  function addToCart(food: any) {
    const scale = quantityG / 100;
    cart.push({
      food,
      quantityG,
      servingLabel: selectedServing,
      calories: Math.round(food.caloriesPer100g * scale),
      proteinG: Number((food.proteinPer100g * scale).toFixed(1)),
      carbsG: Number((food.carbsPer100g * scale).toFixed(1)),
      fatG: Number((food.fatPer100g * scale).toFixed(1)),
    });
    setCart([...cart]);
    setSelectedFood(null);
    setQuery("");
    setQuantityG(100);
    setUnitCount(1);
    setSelectedServing("100g");
    toast.success(`${food.name} added to cart`);
  }

  function removeFromCart(index: number) {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  }

  async function logCart() {
    if (cart.length === 0) return;
    try {
      setLoading(true);
      const items = cart.map((item) => ({
        mealType,
        foodName: item.food.name,
        calories: item.calories,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG,
        quantityG: item.quantityG,
        servingUnit: item.servingLabel,
        openFoodFactsId: item.food.id,
        date,
      }));
      await api.post("/nutrition/batch", { items });
      toast.success(`${cart.length} items logged!`);
      setCart([]);
      loadLogs();
    } catch {
      toast.error("Failed to log foods");
    } finally {
      setLoading(false);
    }
  }

  async function addSingleFood(food: any) {
    try {
      setLoading(true);
      const scale = quantityG / 100;
      await api.post("/nutrition", {
        mealType,
        foodName: food.name,
        calories: Math.round(food.caloriesPer100g * scale),
        proteinG: Number((food.proteinPer100g * scale).toFixed(1)),
        carbsG: Number((food.carbsPer100g * scale).toFixed(1)),
        fatG: Number((food.fatPer100g * scale).toFixed(1)),
        quantityG,
        servingUnit: selectedServing,
        openFoodFactsId: food.id,
        date,
      });
      toast.success("Food logged!");
      setSelectedFood(null);
      setQuery("");
      setQuantityG(100);
      setUnitCount(1);
      setSelectedServing("100g");
      loadLogs();
    } catch {
      toast.error("Failed to log food");
    } finally {
      setLoading(false);
    }
  }

  async function addManualFood() {
    if (!manualName.trim()) {
      toast.error("Enter a food name");
      return;
    }
    try {
      setLoading(true);
      await api.post("/nutrition", {
        mealType,
        foodName: manualName,
        calories: manualCalories,
        proteinG: manualProtein,
        carbsG: manualCarbs,
        fatG: manualFat,
        quantityG: 1,
        date,
      });
      toast.success("Food logged!");
      setManualName("");
      setManualCalories(0);
      setManualProtein(0);
      setManualCarbs(0);
      setManualFat(0);
      setShowManual(false);
      loadLogs();
    } catch {
      toast.error("Failed to log food");
    } finally {
      setLoading(false);
    }
  }

  async function deleteLog(logId: string) {
    try {
      await api.delete(`/nutrition/${logId}`);
      toast.success("Entry deleted");
      loadLogs();
    } catch {
      toast.error("Failed to delete entry");
    }
  }

  // Smart serving info for selected food
  const smartServing = selectedFood ? getSmartServings(selectedFood.name, selectedFood.servingSize, selectedFood.servingQuantity) : null;

  const calorieTarget = 2200;

  return (
    <main className="space-y-4 p-4 lg:p-8 pb-28 lg:pb-8 max-w-6xl mx-auto w-full">
      <Card title="Daily Nutrition">
        <div className="space-y-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <div className="bg-gray-700/50 rounded-lg p-4 lg:p-6 text-center">
            <p className="text-3xl lg:text-4xl font-bold text-green-400">{totals.calories}</p>
            <p className="text-sm lg:text-base text-gray-400">/ {calorieTarget} kcal</p>
            <div className="mt-2 w-full bg-gray-600 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (totals.calories / calorieTarget) * 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:gap-4">
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 lg:p-4 text-center">
              <p className="text-xl lg:text-2xl font-bold text-red-300">{Math.round(totals.proteinG)}</p>
              <p className="text-xs lg:text-sm text-gray-400">Protein (g)</p>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 lg:p-4 text-center">
              <p className="text-xl lg:text-2xl font-bold text-yellow-300">{Math.round(totals.carbsG)}</p>
              <p className="text-xs lg:text-sm text-gray-400">Carbs (g)</p>
            </div>
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 lg:p-4 text-center">
              <p className="text-xl lg:text-2xl font-bold text-blue-300">{Math.round(totals.fatG)}</p>
              <p className="text-xs lg:text-sm text-gray-400">Fat (g)</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Log Food" className="lg:col-span-2">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant={!showManual ? "primary" : "secondary"} size="sm" onClick={() => setShowManual(false)} className="flex-1">
                Search
              </Button>
              <Button variant={showManual ? "primary" : "secondary"} size="sm" onClick={() => setShowManual(true)} className="flex-1">
                Manual Entry
              </Button>
            </div>

            <select
              className="w-full px-3 py-2.5 rounded-lg bg-gray-700 text-white border-2 border-gray-600"
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
            >
              <option value="BREAKFAST">Breakfast</option>
              <option value="LUNCH">Lunch</option>
              <option value="DINNER">Dinner</option>
              <option value="SNACK">Snack</option>
              <option value="PRE_WORKOUT">Pre-Workout</option>
              <option value="POST_WORKOUT">Post-Workout</option>
            </select>

            {showManual ? (
              <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                <Input label="Food Name" placeholder="e.g., 2 eggs, rice bowl" value={manualName} onChange={(e) => setManualName(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400">Calories</label>
                    <input type="number" value={manualCalories || ""} onChange={(e) => setManualCalories(Number(e.target.value) || 0)} placeholder="0" className="w-full mt-1 px-3 py-2 rounded bg-gray-600 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Protein (g)</label>
                    <input type="number" value={manualProtein || ""} onChange={(e) => setManualProtein(Number(e.target.value) || 0)} placeholder="0" className="w-full mt-1 px-3 py-2 rounded bg-gray-600 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Carbs (g)</label>
                    <input type="number" value={manualCarbs || ""} onChange={(e) => setManualCarbs(Number(e.target.value) || 0)} placeholder="0" className="w-full mt-1 px-3 py-2 rounded bg-gray-600 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Fat (g)</label>
                    <input type="number" value={manualFat || ""} onChange={(e) => setManualFat(Number(e.target.value) || 0)} placeholder="0" className="w-full mt-1 px-3 py-2 rounded bg-gray-600 text-white" />
                  </div>
                </div>
                <Button variant="primary" onClick={addManualFood} loading={loading} className="w-full">
                  Log Food
                </Button>
              </div>
            ) : selectedFood ? (
              <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                <p className="font-semibold">{selectedFood.name}</p>
                <div className="text-sm text-gray-400">
                  {selectedFood.caloriesPer100g} kcal / 100g
                </div>

                {/* Smart serving selector */}
                {smartServing && (
                  <div>
                    <label className="text-xs text-gray-400">
                      {smartServing.isUnitBased ? "How many?" : "Serving Size"}
                    </label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {smartServing.presets.map((preset: any) => (
                        <button
                          key={preset.label}
                          onClick={() => {
                            setSelectedServing(preset.label);
                            if (preset.grams > 0) {
                              setQuantityG(preset.grams);
                              if (smartServing.isUnitBased && preset.count) {
                                setUnitCount(preset.count);
                              }
                            }
                          }}
                          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                            selectedServing === preset.label
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "bg-gray-600 border-gray-500 text-gray-300 hover:bg-gray-500"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity input */}
                <div>
                  {smartServing?.isUnitBased ? (
                    <div>
                      <label className="text-xs text-gray-400">Count</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Button size="sm" variant="secondary" onClick={() => {
                          const n = Math.max(1, unitCount - 1);
                          setUnitCount(n);
                          setQuantityG(n * (smartServing.gramsPerUnit || 100));
                          setSelectedServing(`${n} ${smartServing.unit}${n > 1 ? "s" : ""}`);
                        }}>-</Button>
                        <input
                          type="number"
                          value={unitCount}
                          onChange={(e) => {
                            const n = Math.max(1, Number(e.target.value) || 1);
                            setUnitCount(n);
                            setQuantityG(n * (smartServing.gramsPerUnit || 100));
                            setSelectedServing(`${n} ${smartServing.unit}${n > 1 ? "s" : ""}`);
                          }}
                          className="w-20 px-3 py-2 rounded bg-gray-600 text-white text-center"
                        />
                        <Button size="sm" variant="secondary" onClick={() => {
                          const n = unitCount + 1;
                          setUnitCount(n);
                          setQuantityG(n * (smartServing.gramsPerUnit || 100));
                          setSelectedServing(`${n} ${smartServing.unit}${n > 1 ? "s" : ""}`);
                        }}>+</Button>
                        <span className="text-sm text-gray-400">= {quantityG}g</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-gray-400">Quantity (grams)</label>
                      <input
                        type="number"
                        value={quantityG}
                        onChange={(e) => {
                          setQuantityG(Number(e.target.value));
                          setSelectedServing("Custom");
                        }}
                        className="w-full mt-1 px-3 py-2 rounded bg-gray-600 text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Macro preview */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-gray-600 rounded p-2">
                    <p className="font-bold text-green-300">{Math.round(selectedFood.caloriesPer100g * quantityG / 100)}</p>
                    <p className="text-gray-400">kcal</p>
                  </div>
                  <div className="bg-gray-600 rounded p-2">
                    <p className="font-bold text-red-300">{(selectedFood.proteinPer100g * quantityG / 100).toFixed(1)}</p>
                    <p className="text-gray-400">P</p>
                  </div>
                  <div className="bg-gray-600 rounded p-2">
                    <p className="font-bold text-yellow-300">{(selectedFood.carbsPer100g * quantityG / 100).toFixed(1)}</p>
                    <p className="text-gray-400">C</p>
                  </div>
                  <div className="bg-gray-600 rounded p-2">
                    <p className="font-bold text-blue-300">{(selectedFood.fatPer100g * quantityG / 100).toFixed(1)}</p>
                    <p className="text-gray-400">F</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => addSingleFood(selectedFood)} loading={loading} className="flex-1">
                    Log Now
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => addToCart(selectedFood)} className="flex-1">
                    + Cart
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedFood(null); setQuantityG(100); setUnitCount(1); setSelectedServing("100g"); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Input placeholder="Search foods (e.g., rice, chicken breast, eggs)..." value={query} onChange={(e) => setQuery(e.target.value)} />
                {searching && <p className="text-xs text-gray-400">Searching...</p>}
                <div className="space-y-2 max-h-80 lg:max-h-96 overflow-y-auto">
                  {searchResults.map((food) => (
                    <div
                      key={food.id}
                      className="bg-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-600 transition-colors"
                      onClick={() => {
                        setSelectedFood(food);
                        const smart = getSmartServings(food.name, food.servingSize, food.servingQuantity);
                        if (smart.isUnitBased) {
                          setQuantityG(smart.presets[0].grams);
                          setUnitCount(1);
                          setSelectedServing(smart.presets[0].label);
                        } else if (food.servingQuantity) {
                          setQuantityG(food.servingQuantity);
                          setSelectedServing("product serving");
                        } else {
                          setQuantityG(100);
                          setSelectedServing("100g");
                        }
                      }}
                    >
                      <p className="font-semibold text-sm">{food.name}</p>
                      <p className="text-xs text-gray-400">
                        {food.caloriesPer100g} kcal | P: {food.proteinPer100g}g | C: {food.carbsPer100g}g | F: {food.fatPer100g}g
                      </p>
                    </div>
                  ))}
                  {customFoods.length > 0 && !query && (
                    <>
                      <p className="text-xs font-semibold text-gray-400 mt-3">My Foods</p>
                      {customFoods.map((food) => (
                        <div
                          key={food.id}
                          className="bg-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-600 transition-colors"
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
                          <p className="font-semibold text-sm">{food.name}</p>
                          <p className="text-xs text-gray-400">{food.calories} kcal /100g</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}

            {/* Cart */}
            {cart.length > 0 && (
              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 space-y-2">
                <p className="text-sm font-semibold text-blue-300">Cart ({cart.length} items)</p>
                {cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex-1">
                      <span>{item.food.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{item.calories} kcal</span>
                    </div>
                    <button onClick={() => removeFromCart(idx)} className="text-red-400 hover:text-red-300 text-xs ml-2">Remove</button>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm font-semibold border-t border-blue-700 pt-2">
                  <span>Total</span>
                  <span>{cart.reduce((sum, i) => sum + i.calories, 0)} kcal | P:{cart.reduce((sum, i) => sum + i.proteinG, 0).toFixed(1)}g</span>
                </div>
                <Button variant="primary" size="sm" onClick={logCart} loading={loading} className="w-full">
                  Log All ({cart.length} items)
                </Button>
              </div>
            )}
          </div>
        </Card>

        {logs.length > 0 && (
          <Card title={`Entries (${logs.length})`} className="lg:col-span-1">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="bg-gray-700 rounded-lg p-2 text-xs lg:text-sm flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold">{getMealTypeEmoji(log.mealType)} {log.foodName}</p>
                    <p className="text-xs text-gray-400">
                      {log.calories} kcal | P:{Math.round(log.proteinG)}g C:{Math.round(log.carbsG)}g F:{Math.round(log.fatG)}g
                    </p>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => deleteLog(log.id)}>X</Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}

// ─── PROGRESS & ANALYTICS ─────────────────────────────────────────────
function AnalyticsPage() {
  const [exerciseId, setExerciseId] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [volume, setVolume] = useState<any[]>([]);
  const [strength, setStrength] = useState<any[]>([]);
  const [calories, setCalories] = useState<any[]>([]);
  const [macros, setMacros] = useState({ proteinG: 0, carbsG: 0, fatG: 0 });

  useEffect(() => {
    api.get("/exercises").then((res) => setExercises(res.data)).catch(() => null);
  }, []);

  useEffect(() => {
    Promise.all([
      api.get("/progress/volume", { params: { weeks: 8, ...(exerciseId ? { exerciseId } : {}) } }),
      api.get("/progress/calories", { params: { days: 30 } }),
      api.get("/progress/macros", { params: { days: 7 } }),
      ...(exerciseId ? [api.get("/progress/strength", { params: { exerciseId } })] : []),
    ])
      .then(([volRes, calRes, macRes, ...rest]) => {
        setVolume(volRes.data);
        setCalories(calRes.data);
        setMacros(macRes.data);
        if (rest[0]) setStrength(rest[0].data);
      })
      .catch(() => null);
  }, [exerciseId]);

  const macroPieData = [
    { name: "Protein", value: macros.proteinG },
    { name: "Carbs", value: macros.carbsG },
    { name: "Fat", value: macros.fatG },
  ];
  const COLORS = ["#ef4444", "#eab308", "#3b82f6"];

  return (
    <main className="space-y-4 p-4 lg:p-8 pb-28 lg:pb-8 max-w-6xl mx-auto w-full">
      <Card title="Analytics">
        <div className="space-y-6">
          <select
            className="w-full px-3 py-2.5 rounded-lg bg-gray-700 text-white border-2 border-gray-600"
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
          >
            <option value="">Select Exercise (optional)</option>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>

          {calories.length > 0 && (
            <div>
              <p className="text-sm lg:text-base font-semibold mb-3">Calories vs Target (30 days)</p>
              <div className="h-56 lg:h-64 rounded-lg bg-gray-700 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={calories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none" }} />
                    <Line type="monotone" dataKey="calories" stroke="#10b981" strokeWidth={2} />
                    <Line type="monotone" dataKey="target" stroke="#a78bfa" strokeDasharray="5 5" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {volume.length > 0 && (
            <div>
              <p className="text-sm lg:text-base font-semibold mb-3">Training Volume (8 weeks)</p>
              <div className="h-56 lg:h-64 rounded-lg bg-gray-700 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volume}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none" }} />
                    <Bar dataKey="volume" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {macros.proteinG > 0 && (
            <div>
              <p className="text-sm lg:text-base font-semibold mb-3">Macro Breakdown (7 days)</p>
              <div className="h-56 lg:h-64 rounded-lg bg-gray-700 p-2 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={macroPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={{ fontSize: 12 }}>
                      {COLORS.map((color, idx) => (
                        <Cell key={`cell-${idx}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {strength.length > 0 && (
            <div>
              <p className="text-sm lg:text-base font-semibold mb-3">Strength Curve (1RM estimate)</p>
              <div className="h-56 lg:h-64 rounded-lg bg-gray-700 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={strength}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none" }} />
                    <Line type="monotone" dataKey="estimated1RM" stroke="#f97316" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </Card>
    </main>
  );
}

// ─── STRENGTH / ESTIMATED 1RM ─────────────────────────────────────────
function StrengthPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/progress/all-1rm")
      .then((res) => setData(res.data))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  // Group by muscle group
  const grouped: Record<string, any[]> = {};
  data.forEach((item) => {
    if (!grouped[item.muscleGroup]) grouped[item.muscleGroup] = [];
    grouped[item.muscleGroup].push(item);
  });

  const trendIcon = (trend: string) => {
    if (trend === "up") return "↑";
    if (trend === "down") return "↓";
    return "→";
  };
  const trendColor = (trend: string) => {
    if (trend === "up") return "text-green-400";
    if (trend === "down") return "text-red-400";
    return "text-gray-400";
  };

  return (
    <main className="space-y-4 p-4 lg:p-8 pb-28 lg:pb-8 max-w-6xl mx-auto w-full">
      <Card title="Estimated 1RM - All Exercises">
        <p className="text-sm text-gray-400 mb-4">Based on your logged sets using the Epley formula</p>

        {loading && <p className="text-gray-400 text-sm">Loading...</p>}

        {!loading && data.length === 0 && (
          <p className="text-gray-400 text-center py-8">No workout data yet. Start logging sets to see your estimated 1RMs.</p>
        )}

        {Object.entries(grouped).map(([muscleGroup, exercises]) => (
          <div key={muscleGroup} className="mb-6">
            <h3 className="text-sm font-semibold text-blue-300 mb-2">{muscleGroup}</h3>
            <div className="space-y-2">
              {exercises.map((ex) => (
                <div key={ex.exerciseId} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{ex.exerciseName}</p>
                      <p className="text-xs text-gray-400">
                        Best: {ex.bestWeight}kg x {ex.bestReps} | {ex.totalSets} sets logged
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-400">{ex.estimated1RM}<span className="text-sm text-gray-400">kg</span></p>
                      <p className={`text-xs font-semibold ${trendColor(ex.trend)}`}>
                        {trendIcon(ex.trend)} {ex.trend}
                      </p>
                    </div>
                  </div>
                  {ex.latestDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Latest: {ex.latestWeight}kg x {ex.latestReps} ({ex.latestDate})
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </Card>
    </main>
  );
}

// ─── AI COACH ──────────────────────────────────────────────────────────
function CoachPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    "Review my week",
    "Suggest progressive overload",
    "Adjust my diet for this week",
    "Am I making progress?",
  ];

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    try {
      setLoading(true);
      const newMessages = [...messages, { role: "user" as const, content: text }];
      setMessages(newMessages);
      setMessage("");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001/api/v1"}/ai/coach`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": localStorage.getItem("gymchad-user-id") || "demo-user",
          },
          body: JSON.stringify({ message: text, conversationHistory: messages }),
        }
      );

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) {
                aiMessage += data.token;
                setMessages((prev) => {
                  const updated = [...prev];
                  if (updated[updated.length - 1]?.role === "assistant") {
                    updated[updated.length - 1].content = aiMessage;
                  } else {
                    updated.push({ role: "assistant", content: aiMessage });
                  }
                  return updated;
                });
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch {
      toast.error("Failed to get response from coach");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-4 p-4 lg:p-8 pb-28 lg:pb-8 max-w-4xl mx-auto w-full">
      <Card title="AI Coach">
        <div className="space-y-4 flex flex-col h-96 lg:h-[500px]">
          <div className="bg-gray-700/50 rounded-lg p-3 lg:p-4 text-sm space-y-3 overflow-y-auto flex-1">
            {messages.length === 0 ? (
              <p className="text-gray-400 text-center py-6">Ask your AI coach for personalized advice</p>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm lg:text-base ${
                    msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-600 text-gray-100"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-600 text-gray-400 px-3 py-2 rounded-lg">
                  <span className="inline-block animate-pulse">...</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-3 py-1.5 rounded-full transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(message)}
                placeholder="Ask something..."
                className="flex-1 px-3 py-2.5 rounded-lg bg-gray-700 text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500 focus:outline-none text-sm lg:text-base"
                disabled={loading}
              />
              <Button variant="primary" onClick={() => sendMessage(message)} loading={loading}>Send</Button>
            </div>
          </div>
        </div>
      </Card>
    </main>
  );
}

// ─── SPLITS MANAGER ────────────────────────────────────────────────────
function SplitsPage() {
  const [splits, setSplits] = useState<any[]>([]);
  const [newSplitName, setNewSplitName] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genDays, setGenDays] = useState(4);

  useEffect(() => { loadSplits(); }, []);

  async function loadSplits() {
    try {
      setLoading(true);
      const res = await api.get("/splits");
      setSplits(res.data);
    } catch {
      toast.error("Failed to load splits");
    } finally {
      setLoading(false);
    }
  }

  async function createSplit() {
    if (!newSplitName.trim()) {
      toast.error("Enter a split name");
      return;
    }
    try {
      setLoading(true);
      await api.post("/splits", { name: newSplitName, days: [] });
      toast.success("Split created!");
      setNewSplitName("");
      await loadSplits();
    } catch {
      toast.error("Failed to create split");
    } finally {
      setLoading(false);
    }
  }

  async function generateProgram() {
    try {
      setGenerating(true);
      await api.post("/programs/generate", { daysPerWeek: genDays });
      toast.success("Program generated!");
      await loadSplits();
    } catch {
      toast.error("Failed to generate program");
    } finally {
      setGenerating(false);
    }
  }

  async function activateSplit(id: string) {
    try {
      await api.put(`/splits/${id}/activate`);
      toast.success("Split activated!");
      await loadSplits();
    } catch {
      toast.error("Failed to activate split");
    }
  }

  async function deleteSplit(id: string) {
    try {
      await api.delete(`/splits/${id}`);
      toast.success("Split deleted");
      await loadSplits();
    } catch {
      toast.error("Failed to delete split");
    }
  }

  return (
    <main className="space-y-4 p-4 lg:p-8 pb-28 lg:pb-8 max-w-6xl mx-auto w-full">
      {/* Generate Program */}
      <Card title="Generate Program">
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Auto-generate a training split based on how many days per week you train.</p>
          <div className="flex gap-2 flex-wrap">
            {[2, 3, 4, 5, 6, 7].map((d) => (
              <button
                key={d}
                onClick={() => setGenDays(d)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  genDays === d ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            {genDays === 2 && "Upper/Lower split"}
            {genDays === 3 && "Push/Pull/Legs split"}
            {genDays === 4 && "Upper/Lower x2 (strength + hypertrophy)"}
            {genDays === 5 && "PPL + Upper/Lower hybrid"}
            {genDays === 6 && "Push/Pull/Legs x2"}
            {genDays === 7 && "Bro Split (one muscle group per day)"}
          </p>
          <Button variant="primary" onClick={generateProgram} loading={generating} className="w-full">
            Generate {genDays}-Day Program
          </Button>
        </div>
      </Card>

      <Card title="Splits Manager">
        <div className="space-y-4">
          <div className="flex gap-2 flex-col sm:flex-row">
            <Input placeholder="Split name (e.g., Push Pull Legs)" value={newSplitName} onChange={(e) => setNewSplitName(e.target.value)} />
            <Button variant="primary" onClick={createSplit} loading={loading} className="w-full sm:w-auto">Create</Button>
          </div>

          {loading && splits.length === 0 ? (
            <p className="text-gray-400 text-sm">Loading splits...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {splits.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8 col-span-full">No splits created yet. Generate a program above or create one manually.</p>
              ) : (
                splits.map((split) => (
                  <div key={split.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-semibold">{split.name}</p>
                        <p className="text-xs text-gray-400">{split.days?.length || 0} days</p>
                      </div>
                      {split.isActive && <Badge color="green">Active</Badge>}
                    </div>
                    {split.days && split.days.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {split.days.map((day: any) => (
                          <p key={day.id} className="text-xs text-gray-400">
                            Day {day.dayNumber}: {day.label} ({day.exercises?.length || 0} exercises)
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 flex-col sm:flex-row">
                      {!split.isActive && (
                        <Button variant="secondary" size="sm" onClick={() => activateSplit(split.id)} className="flex-1">Activate</Button>
                      )}
                      <Button variant="danger" size="sm" onClick={() => deleteSplit(split.id)} className="flex-1">Delete</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Card>
    </main>
  );
}

// ─── HISTORY PAGE ─────────────────────────────────────────────────────
function HistoryPage() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("week");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    api.get("/exercises").then((res) => setExercises(res.data)).catch(() => null);
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get("/history", { params: { period, offset } })
      .then((res) => setData(res.data))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [period, offset]);

  function getExerciseName(id: string) {
    return exercises.find((e) => e.id === id)?.name || id;
  }

  const periodLabels: Record<string, string> = { week: "Week", month: "Month", year: "Year" };

  return (
    <main className="space-y-4 p-4 lg:p-8 pb-28 lg:pb-8 max-w-6xl mx-auto w-full">
      <Card>
        <div className="flex gap-2 justify-center">
          {(["week", "month", "year"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "primary" : "secondary"}
              size="sm"
              onClick={() => { setPeriod(p); setOffset(0); }}
            >
              {periodLabels[p]}
            </Button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3">
          <Button variant="ghost" size="sm" onClick={() => setOffset(offset + 1)}>
            Prev {periodLabels[period]}
          </Button>
          <span className="text-sm text-gray-400">
            {data?.startDate && `${data.startDate} - ${data.endDate}`}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setOffset(Math.max(0, offset - 1))} disabled={offset === 0}>
            Next {periodLabels[period]}
          </Button>
        </div>
      </Card>

      {loading && <p className="text-center text-gray-400 text-sm">Loading...</p>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{data.summary.totalWorkouts}</p>
                <p className="text-xs text-gray-400">Workouts</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{data.summary.totalSets}</p>
                <p className="text-xs text-gray-400">Total Sets</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">{(data.summary.totalVolume / 1000).toFixed(1)}k</p>
                <p className="text-xs text-gray-400">Volume (kg)</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{data.summary.avgCaloriesPerDay}</p>
                <p className="text-xs text-gray-400">Avg Cal/Day</p>
              </div>
            </Card>
          </div>

          {data.dailyNutrition.length > 0 && (
            <Card title="Daily Calories">
              <div className="h-48 lg:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...data.dailyNutrition].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none" }} />
                    <Bar dataKey="calories" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {data.workouts.length > 0 && (
            <Card title="Workouts">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {data.workouts.map((w: any) => (
                  <div key={w.id} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold">{w.label}</p>
                      <span className="text-xs text-gray-400">{w.date}</span>
                    </div>
                    {w.sets && w.sets.length > 0 && (
                      <div className="space-y-1">
                        {w.sets.map((s: any) => (
                          <p key={s.id} className="text-xs text-gray-400">
                            {getExerciseName(s.exerciseId)}: {s.weightKg}kg x {s.reps}
                            {s.rpe ? ` @ RPE ${s.rpe}` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                    {(!w.sets || w.sets.length === 0) && (
                      <p className="text-xs text-gray-500">No sets recorded</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {data.dailyNutrition.length > 0 && (
            <Card title="Daily Nutrition Breakdown">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {data.dailyNutrition.map((d: any) => (
                  <div key={d.date} className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm font-medium">{d.date}</span>
                    <div className="flex gap-3 text-xs">
                      <span className="text-green-300">{d.calories} kcal</span>
                      <span className="text-red-300">P:{Math.round(d.proteinG)}g</span>
                      <span className="text-yellow-300">C:{Math.round(d.carbsG)}g</span>
                      <span className="text-blue-300">F:{Math.round(d.fatG)}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {data.workouts.length === 0 && data.dailyNutrition.length === 0 && (
            <Card>
              <p className="text-center text-gray-400 py-8">No data for this period</p>
            </Card>
          )}
        </>
      )}
    </main>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────
export default function App() {
  const { setUserId } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("gymchad-user-id");
    if (!stored) {
      const newId = `guest_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      setUserId(newId);
    }
    setInitialized(true);
  }, [setUserId]);

  if (!initialized) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="flex h-screen w-full">
        {/* Desktop Sidebar */}
        <nav className="hidden lg:flex flex-col w-64 border-r border-gray-700 bg-gray-800 p-4 space-y-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            GymChad
          </h1>
          <div className="space-y-2 flex-1">
            {[
              { to: "/", icon: "H", label: "Dashboard" },
              { to: "/workout", icon: "W", label: "Workout" },
              { to: "/nutrition", icon: "N", label: "Nutrition" },
              { to: "/history", icon: "Hi", label: "History" },
              { to: "/analytics", icon: "A", label: "Analytics" },
              { to: "/strength", icon: "1RM", label: "Strength" },
              { to: "/coach", icon: "AI", label: "AI Coach" },
              { to: "/splits", icon: "S", label: "Splits" },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-lg transition-colors ${
                    isActive ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-700"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="border-t border-gray-700 pt-4">
            <Badge color="blue">PRO</Badge>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 flex flex-col w-full lg:w-auto max-w-full">
          {/* Mobile Header */}
          <header className="sticky top-0 z-40 border-b border-gray-700 bg-gray-900/95 backdrop-blur p-4 lg:hidden">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                GymChad
              </h1>
              <Badge color="blue">PRO</Badge>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto pb-20 lg:pb-4">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/workout/*" element={<WorkoutPage />} />
              <Route path="/nutrition" element={<NutritionPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/strength" element={<StrengthPage />} />
              <Route path="/coach" element={<CoachPage />} />
              <Route path="/splits" element={<SplitsPage />} />
            </Routes>
          </div>

          {/* Mobile Bottom Nav */}
          <nav className="fixed bottom-0 left-0 right-0 lg:hidden border-t border-gray-700 bg-gray-900 flex h-16 items-center justify-around z-40">
            {[
              { to: "/", label: "Home" },
              { to: "/workout", label: "Workout" },
              { to: "/nutrition", label: "Food" },
              { to: "/strength", label: "1RM" },
              { to: "/analytics", label: "Stats" },
              { to: "/splits", label: "Splits" },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 h-full text-xs transition-colors ${
                    isActive ? "text-blue-400 bg-gray-800" : "text-gray-400 hover:text-white"
                  }`
                }
              >
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <Toaster position="bottom-center" />
    </div>
  );
}
