import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";
import axios from "axios";
import NodeCache from "node-cache";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT ?? 3001);
const foodCache = new NodeCache({ stdTTL: 3600 });

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "*" }));
app.use(express.json());
app.use(morgan("dev"));
app.use(
  "/api/v1",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
  }),
);
app.use("/api/v1", async (req, _res, next) => {
  try {
    const incoming = String(req.headers["x-user-id"] ?? "demo-user");
    const supabaseId = incoming.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "demo-user";
    const user = await prisma.user.upsert({
      where: { supabaseId },
      update: {},
      create: { supabaseId, email: `${supabaseId}@local.gymchad.app` },
    });
    (req as express.Request & { userId?: string }).userId = user.id;
    next();
  } catch (error) {
    next(error);
  }
});

const authSchema = z.object({ token: z.string().min(10) });
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const profileSchema = z.object({
  name: z.string().min(1).optional(),
  goal: z.enum(["CUTTING", "BULKING", "MAINTENANCE"]).optional(),
  tdee: z.number().int().positive().optional(),
});
const splitCreateSchema = z.object({
  name: z.string().min(1),
  days: z.array(z.object({
    dayNumber: z.number().int().min(1).max(7),
    label: z.string().min(1),
    exercises: z.array(z.object({ exerciseId: z.string().min(1) })).default([]),
  })).default([]),
});
const splitUpdateSchema = splitCreateSchema.partial();
const workoutCreateSchema = z.object({
  splitDayId: z.string().optional(),
  label: z.string().min(1),
  date: z.coerce.date().optional(),
});
const workoutSetSchema = z.object({
  exerciseId: z.string().min(1),
  setNumber: z.number().int().positive(),
  reps: z.number().int().positive(),
  weightKg: z.number().nonnegative(),
  rpe: z.number().int().min(1).max(10).optional(),
  isWarmup: z.boolean().default(false),
});
const nutritionCreateSchema = z.object({
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK", "PRE_WORKOUT", "POST_WORKOUT"]),
  foodName: z.string().min(1),
  calories: z.number().int().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  quantityG: z.number().positive().default(100),
  openFoodFactsId: z.string().optional(),
  date: z.coerce.date().optional(),
});
const nutritionUpdateSchema = nutritionCreateSchema.partial();
const customFoodSchema = z.object({
  name: z.string().min(1),
  calories: z.number().int().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
});

function getUserId(req: express.Request) {
  return String((req as express.Request & { userId?: string }).userId ?? req.headers["x-user-id"] ?? "");
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/v1/auth/verify", async (req, res, next) => {
  try {
    const { token } = authSchema.parse(req.body);
    const supabaseId = token.slice(0, 20);
    const email = `${supabaseId}@placeholder.local`;
    const user = await prisma.user.upsert({
      where: { supabaseId },
      update: {},
      create: { supabaseId, email },
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

app.put("/api/v1/auth/profile", async (req, res, next) => {
  try {
    const payload = profileSchema.parse(req.body);
    const userId = getUserId(req);
    const user = await prisma.user.update({ where: { id: userId }, data: payload });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/exercises", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const muscleGroup = req.query.muscleGroup as string | undefined;
    const data = await prisma.exercise.findMany({
      where: {
        OR: [{ isCustom: false }, { userId }],
        ...(muscleGroup ? { muscleGroup: muscleGroup as any } : {}),
      },
      orderBy: { name: "asc" },
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/splits", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = splitCreateSchema.parse(req.body);
    const split = await prisma.split.create({
      data: {
        name: payload.name,
        userId,
        days: {
          create: payload.days.map((day) => ({
            dayNumber: day.dayNumber,
            label: day.label,
            exercises: {
              create: day.exercises.map((exercise, index) => ({
                exerciseId: exercise.exerciseId,
                orderIndex: index,
              })),
            },
          })),
        },
      },
      include: { days: { include: { exercises: true } } },
    });
    res.status(201).json(split);
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/splits", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const splits = await prisma.split.findMany({
      where: { userId },
      include: { days: { include: { exercises: { include: { exercise: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(splits);
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/splits/:id/days", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const days = await prisma.splitDay.findMany({
      where: { splitId: req.params.id, split: { userId } },
      include: { exercises: { include: { exercise: true }, orderBy: { orderIndex: "asc" } } },
      orderBy: { dayNumber: "asc" },
    });
    res.json(days);
  } catch (error) {
    next(error);
  }
});

app.put("/api/v1/splits/:id", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = splitUpdateSchema.parse(req.body);
    const existing = await prisma.split.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) return res.status(404).json({ error: "Split not found" });
    if (payload.days) {
      await prisma.splitDayExercise.deleteMany({ where: { splitDay: { splitId: req.params.id } } });
      await prisma.splitDay.deleteMany({ where: { splitId: req.params.id } });
    }
    const split = await prisma.split.update({
      where: { id: req.params.id },
      data: {
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.days
          ? {
              days: {
                create: payload.days.map((day) => ({
                  dayNumber: day.dayNumber,
                  label: day.label,
                  exercises: {
                    create: day.exercises.map((exercise, index) => ({
                      exerciseId: exercise.exerciseId,
                      orderIndex: index,
                    })),
                  },
                })),
              },
            }
          : {}),
      },
      include: { days: { include: { exercises: { include: { exercise: true } } } } },
    });
    res.json(split);
  } catch (error) {
    next(error);
  }
});

app.put("/api/v1/splits/:id/activate", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await prisma.$transaction([
      prisma.split.updateMany({ where: { userId }, data: { isActive: false } }),
      prisma.split.updateMany({ where: { id: req.params.id, userId }, data: { isActive: true } }),
      prisma.user.updateMany({ where: { id: userId }, data: { currentSplitId: req.params.id } }),
    ]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/v1/splits/:id", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await prisma.splitDayExercise.deleteMany({ where: { splitDay: { splitId: req.params.id, split: { userId } } } });
    await prisma.splitDay.deleteMany({ where: { splitId: req.params.id, split: { userId } } });
    await prisma.split.deleteMany({ where: { id: req.params.id, userId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/workouts", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = workoutCreateSchema.parse(req.body);
    const workout = await prisma.workout.create({ data: { userId, ...payload } });
    res.status(201).json(workout);
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/workouts", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { page, limit } = paginationSchema.parse(req.query);
    const splitDayId = req.query.splitDayId ? String(req.query.splitDayId) : undefined;
    const [items, total] = await Promise.all([
      prisma.workout.findMany({
        where: { userId, deletedAt: null, ...(splitDayId ? { splitDayId } : {}) },
        include: { sets: true },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workout.count({ where: { userId, deletedAt: null, ...(splitDayId ? { splitDayId } : {}) } }),
    ]);
    res.json({ items, page, limit, total });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/workouts/today", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const workout = await prisma.workout.findFirst({
      where: { userId, date: { gte: start, lt: end }, deletedAt: null },
      include: { sets: { include: { exercise: true } } },
    });
    res.json(workout);
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/workouts/:id", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const workout = await prisma.workout.findFirst({
      where: { id: req.params.id, userId, deletedAt: null },
      include: { sets: { include: { exercise: true }, orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }] } },
    });
    if (!workout) return res.status(404).json({ error: "Workout not found" });
    res.json(workout);
  } catch (error) {
    next(error);
  }
});

app.put("/api/v1/workouts/:id", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = z.object({ notes: z.string().optional(), durationMin: z.number().int().positive().optional() }).parse(req.body);
    const updated = await prisma.workout.updateMany({ where: { id: req.params.id, userId }, data: payload });
    if (!updated.count) return res.status(404).json({ error: "Workout not found" });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/v1/workouts/:id", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await prisma.workout.updateMany({ where: { id: req.params.id, userId }, data: { deletedAt: new Date() } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/workouts/:id/sets", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = workoutSetSchema.parse(req.body);
    const exists = await prisma.workout.findFirst({ where: { id: req.params.id, userId, deletedAt: null } });
    if (!exists) return res.status(404).json({ error: "Workout not found" });
    const set = await prisma.workoutSet.create({ data: { ...payload, workoutId: req.params.id } });
    res.status(201).json(set);
  } catch (error) {
    next(error);
  }
});

app.put("/api/v1/workouts/:id/sets/:setId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = workoutSetSchema.partial().parse(req.body);
    const updated = await prisma.workoutSet.updateMany({
      where: { id: req.params.setId, workoutId: req.params.id, workout: { userId } },
      data: payload,
    });
    if (!updated.count) return res.status(404).json({ error: "Set not found" });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/v1/workouts/:id/sets/:setId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await prisma.workoutSet.deleteMany({ where: { id: req.params.setId, workoutId: req.params.id, workout: { userId } } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/workouts/history/:exerciseId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const sets = await prisma.workoutSet.findMany({
      where: { exerciseId: req.params.exerciseId, workout: { userId, deletedAt: null } },
      include: { workout: true },
      orderBy: { workout: { date: "desc" } },
      take: 100,
    });
    const grouped = new Map<string, typeof sets>();
    for (const set of sets) {
      const key = set.workoutId;
      grouped.set(key, [...(grouped.get(key) ?? []), set]);
    }
    res.json(Array.from(grouped.values()).slice(0, 10));
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/workouts/recommendations", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { getProgressiveOverloadRecommendation } = await import("./services/progressiveOverload");
    const activeSplit = await prisma.split.findFirst({
      where: { userId, isActive: true },
      include: { days: { include: { exercises: true } } },
    });
    if (!activeSplit) return res.json([]);
    const exerciseIds = activeSplit.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId));
    const uniqueIds = [...new Set(exerciseIds)];
    const recommendations = await Promise.all(uniqueIds.map(async (exerciseId) => {
      const sets = await prisma.workoutSet.findMany({
        where: { exerciseId, workout: { userId, deletedAt: null } },
        include: { workout: true },
        orderBy: { workout: { date: "desc" } },
        take: 100,
      });
      const byWorkout = new Map<string, typeof sets>();
      sets.forEach((set) => byWorkout.set(set.workoutId, [...(byWorkout.get(set.workoutId) ?? []), set]));
      const sessions = Array.from(byWorkout.values()).slice(0, 4);
      const recommendation = getProgressiveOverloadRecommendation(sessions);
      const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
      return { exerciseId, exerciseName: exercise?.name ?? "Exercise", ...recommendation };
    }));
    res.json(recommendations);
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/progress/volume", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const exerciseId = String(req.query.exerciseId ?? "");
    const weeks = Number(req.query.weeks ?? 8);
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - weeks * 7);
    const sets = await prisma.workoutSet.findMany({
      where: {
        exerciseId: exerciseId || undefined,
        workout: { userId, deletedAt: null, date: { gte: start } },
      },
      include: { workout: true, exercise: true },
      orderBy: { workout: { date: "asc" } },
    });
    const byWeek = new Map<string, number>();
    sets.forEach((set) => {
      const d = new Date(set.workout.date);
      const weekKey = `${d.getUTCFullYear()}-W${Math.ceil((d.getUTCDate() + 6 - d.getUTCDay()) / 7)}`;
      const volume = set.weightKg * set.reps;
      byWeek.set(weekKey, (byWeek.get(weekKey) ?? 0) + volume);
    });
    res.json(Array.from(byWeek.entries()).map(([week, volume]) => ({ week, volume: Math.round(volume) })));
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/progress/strength", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const exerciseId = String(req.query.exerciseId ?? "");
    const sets = await prisma.workoutSet.findMany({
      where: { exerciseId, workout: { userId, deletedAt: null } },
      include: { workout: true },
      orderBy: { workout: { date: "asc" } },
    });
    const byDate = new Map<string, { weightKg: number; reps: number; estimated1RM: number }>();
    sets.forEach((set) => {
      const date = set.workout.date.toISOString().slice(0, 10);
      const estimated1RM = set.weightKg * (1 + set.reps / 30);
      const current = byDate.get(date);
      if (!current || estimated1RM > current.estimated1RM) {
        byDate.set(date, { weightKg: set.weightKg, reps: set.reps, estimated1RM: Number(estimated1RM.toFixed(1)) });
      }
    });
    res.json(Array.from(byDate.entries()).map(([date, best]) => ({ date, ...best })));
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/progress/bodyweight", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const rows = await prisma.event.findMany({
      where: { userId, event: "BODYWEIGHT_LOG" },
      orderBy: { timestamp: "asc" },
      take: 180,
    });
    const data = rows.map((row) => ({
      date: row.timestamp.toISOString().slice(0, 10),
      weightKg: Number((row.metadata as any)?.weightKg ?? 0),
    }));
    res.json(data.filter((item) => Number.isFinite(item.weightKg) && item.weightKg > 0));
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/progress/calories", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const days = Number(req.query.days ?? 30);
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const logs = await prisma.nutritionLog.findMany({
      where: { userId, date: { gte: start } },
      orderBy: { date: "asc" },
    });
    const byDay = new Map<string, number>();
    logs.forEach((log) => {
      const date = log.date.toISOString().slice(0, 10);
      byDay.set(date, (byDay.get(date) ?? 0) + log.calories);
    });
    const data: Array<{ date: string; calories: number; target: number | null }> = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      data.push({ date: key, calories: byDay.get(key) ?? 0, target: user?.tdee ?? null });
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/progress/macros", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const days = Number(req.query.days ?? 7);
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);
    const logs = await prisma.nutritionLog.findMany({
      where: { userId, date: { gte: start } },
    });
    if (!logs.length) return res.json({ proteinG: 0, carbsG: 0, fatG: 0, days });
    const totals = logs.reduce(
      (acc, log) => {
        acc.proteinG += log.proteinG;
        acc.carbsG += log.carbsG;
        acc.fatG += log.fatG;
        return acc;
      },
      { proteinG: 0, carbsG: 0, fatG: 0 },
    );
    res.json({
      days,
      proteinG: Number((totals.proteinG / days).toFixed(1)),
      carbsG: Number((totals.carbsG / days).toFixed(1)),
      fatG: Number((totals.fatG / days).toFixed(1)),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/foods/search", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "");
    const cacheKey = `food:${q.toLowerCase().trim()}`;
    const cached = foodCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const { data } = await axios.get("https://world.openfoodfacts.org/cgi/search.pl", {
      params: {
        search_terms: q,
        json: 1,
        page_size: 20,
        fields: "code,product_name,nutriments,serving_size",
      },
    });
    const parsed = (data.products ?? [])
      .map((product: any) => ({
        id: product.code,
        name: product.product_name,
        caloriesPer100g: Number(product.nutriments?.["energy-kcal_100g"]),
        proteinPer100g: Number(product.nutriments?.proteins_100g),
        carbsPer100g: Number(product.nutriments?.carbohydrates_100g),
        fatPer100g: Number(product.nutriments?.fat_100g),
      }))
      .filter((item: any) => item.name && Number.isFinite(item.caloriesPer100g));
    foodCache.set(cacheKey, parsed);
    res.json(parsed);
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/foods/custom", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const foods = await prisma.customFood.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    res.json(foods);
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/foods/custom", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = customFoodSchema.parse(req.body);
    const food = await prisma.customFood.create({ data: { ...payload, userId } });
    res.status(201).json(food);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/v1/foods/custom/:id", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await prisma.customFood.deleteMany({ where: { id: req.params.id, userId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/nutrition", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const dateStr = String(req.query.date ?? new Date().toISOString().slice(0, 10));
    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const logs = await prisma.nutritionLog.findMany({
      where: { userId, date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
    });
    const totals = logs.reduce(
      (acc, item) => {
        acc.calories += item.calories;
        acc.proteinG += item.proteinG;
        acc.carbsG += item.carbsG;
        acc.fatG += item.fatG;
        return acc;
      },
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );
    res.json({ date: dateStr, logs, totals });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/nutrition", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = nutritionCreateSchema.parse(req.body);
    const entry = await prisma.nutritionLog.create({ data: { ...payload, userId } });
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

app.put("/api/v1/nutrition/:id", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = nutritionUpdateSchema.parse(req.body);
    const updated = await prisma.nutritionLog.updateMany({ where: { id: req.params.id, userId }, data: payload });
    if (!updated.count) return res.status(404).json({ error: "Nutrition entry not found" });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/v1/nutrition/:id", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await prisma.nutritionLog.deleteMany({ where: { id: req.params.id, userId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/nutrition/summary", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const days = Number(req.query.days ?? 30);
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);
    const logs = await prisma.nutritionLog.findMany({
      where: { userId, date: { gte: start } },
      orderBy: { date: "asc" },
    });
    const byDay = new Map<string, { calories: number; proteinG: number; carbsG: number; fatG: number }>();
    logs.forEach((item) => {
      const key = item.date.toISOString().slice(0, 10);
      const current = byDay.get(key) ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
      current.calories += item.calories;
      current.proteinG += item.proteinG;
      current.carbsG += item.carbsG;
      current.fatG += item.fatG;
      byDay.set(key, current);
    });
    const daily = Array.from(byDay.entries()).map(([date, totals]) => ({ date, ...totals }));
    const avg = daily.length
      ? {
          calories: Math.round(daily.reduce((a, b) => a + b.calories, 0) / daily.length),
          proteinG: Math.round(daily.reduce((a, b) => a + b.proteinG, 0) / daily.length),
          carbsG: Math.round(daily.reduce((a, b) => a + b.carbsG, 0) / daily.length),
          fatG: Math.round(daily.reduce((a, b) => a + b.fatG, 0) / daily.length),
        }
      : { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    res.json({ days, daily, average: avg });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/ai/coach", async (req, res, next) => {
  try {
    const { message, conversationHistory } = z
      .object({
        message: z.string().min(1),
        conversationHistory: z.array(z.object({ role: z.string(), content: z.string() })).default([]),
      })
      .parse(req.body);
    const userId = getUserId(req);
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { splits: true } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const systemPrompt = `You are GymAI. Goal=${user.goal}, TDEE=${user.tdee ?? "unknown"}, activeSplits=${user.splits.length}. Give 3 numbered, data-driven recommendations.`;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      system: systemPrompt,
      messages: [...conversationHistory, { role: "user", content: message }] as any,
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ token: event.delta.text })}\n\n`);
      }
    }
    res.write("event: done\ndata: {}\n\n");
    res.end();
  } catch (error) {
    next(error);
  }
});

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: error?.message ?? "Internal Server Error" });
});

app.listen(port, () => {
  console.log(`GymChad API listening on ${port}`);
});
