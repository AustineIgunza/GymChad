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

// ── Conversion helpers ────────────────────────────────────────────────────────

/** Decode a JWT payload (without verification) to extract the `sub` claim */
function extractSubFromJwt(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const [, payload] = token.split(".");
    const json = Buffer.from(
      payload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString();
    const decoded = JSON.parse(json);
    return typeof decoded.sub === "string" && decoded.sub.length > 0
      ? decoded.sub
      : null;
  } catch {
    return null;
  }
}

/** Recursively convert camelCase object keys → snake_case (for responses) */
function toSnake(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (typeof obj !== "object") return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/([A-Z])/g, "_$1").toLowerCase(),
      toSnake(v),
    ])
  );
}

/** Recursively convert snake_case object keys → camelCase (for request bodies) */
function toCamel(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
      toCamel(v),
    ])
  );
}

// ── Fitness calculation helpers ───────────────────────────────────────────────

/** Mifflin-St Jeor BMR + activity multiplier + goal adjustment */
function calcTdee(p: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: string;
  activityLevel: string;
  goal: string;
}): number {
  const bmr =
    10 * p.weightKg +
    6.25 * p.heightCm -
    5 * p.age +
    (p.sex === "male" ? 5 : -161);
  const mult: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const adj: Record<string, number> = {
    CUTTING: -500,
    BULKING: 300,
    MAINTENANCE: 0,
  };
  return Math.round(bmr * (mult[p.activityLevel] ?? 1.55) + (adj[p.goal] ?? 0));
}

/** Derive gram targets from calorie budget */
function calcMacros(kcal: number, goal: string) {
  const r: Record<string, { p: number; c: number; f: number }> = {
    CUTTING: { p: 0.35, c: 0.35, f: 0.3 },
    BULKING: { p: 0.25, c: 0.5, f: 0.25 },
    MAINTENANCE: { p: 0.3, c: 0.4, f: 0.3 },
  };
  const { p, c, f } = r[goal] ?? r.MAINTENANCE;
  return {
    proteinTarget: Math.round((kcal * p) / 4),
    carbsTarget: Math.round((kcal * c) / 4),
    fatTarget: Math.round((kcal * f) / 9),
  };
}

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "*" }));
app.use(express.json());
app.use(morgan("dev"));

// Convert all incoming request body keys from snake_case → camelCase
// so Zod schemas and Prisma always see camelCase regardless of what the client sends
app.use((req, _res, next) => {
  if (req.body && typeof req.body === "object") req.body = toCamel(req.body);
  next();
});

app.use("/api/v1", rateLimit({ windowMs: 15 * 60 * 1000, max: 150 }));

// Resolve the Supabase user from the JWT Bearer token on every /api/v1 request.
// Falls back to x-user-id header (useful for local dev / Postman), then "demo-user".
app.use("/api/v1", async (req, _res, next) => {
  try {
    const supabaseId =
      extractSubFromJwt(req.headers.authorization) ??
      String(req.headers["x-user-id"] ?? "demo-user")
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 64) ||
      "demo-user";
    const user = await prisma.user.upsert({
      where: { supabaseId },
      update: {},
      create: { supabaseId, email: `${supabaseId}@local.gymchad.app` },
    });
    (req as any).userId = user.id;
    next();
  } catch (error) {
    next(error);
  }
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Accepts all profile fields — extra ones are silently stripped by Zod
const profileSchema = z.object({
  name: z.string().min(1).optional(),
  goal: z.enum(["CUTTING", "BULKING", "MAINTENANCE"]).optional(),
  tdee: z.number().int().positive().optional(),
  weightKg: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  age: z.number().int().min(10).max(120).optional(),
  sex: z.enum(["male", "female"]).optional(),
  activityLevel: z.string().optional(),
  calorieTarget: z.number().int().positive().optional(),
  proteinTarget: z.number().positive().optional(),
  carbsTarget: z.number().positive().optional(),
  fatTarget: z.number().positive().optional(),
  goalWeightKg: z.number().positive().optional(),
});

const splitCreateSchema = z.object({
  name: z.string().min(1),
  days: z
    .array(
      z.object({
        dayNumber: z.number().int().min(1).max(7),
        label: z.string().min(1),
        exercises: z
          .array(z.object({ exerciseId: z.string().min(1) }))
          .default([]),
      })
    )
    .default([]),
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
  mealType: z.enum([
    "BREAKFAST",
    "LUNCH",
    "DINNER",
    "SNACK",
    "PRE_WORKOUT",
    "POST_WORKOUT",
  ]),
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

// Accepts both `calories`/`proteinG` and `caloriesPer100g`/`proteinPer100g` variants
const customFoodSchema = z
  .object({
    name: z.string().min(1),
    calories: z.number().int().nonnegative().optional(),
    caloriesPer100g: z.number().int().nonnegative().optional(),
    proteinG: z.number().nonnegative().optional(),
    proteinPer100g: z.number().nonnegative().optional(),
    carbsG: z.number().nonnegative().optional(),
    carbsPer100g: z.number().nonnegative().optional(),
    fatG: z.number().nonnegative().optional(),
    fatPer100g: z.number().nonnegative().optional(),
  })
  .transform((d) => ({
    name: d.name,
    calories: Math.round(d.calories ?? d.caloriesPer100g ?? 0),
    proteinG: d.proteinG ?? d.proteinPer100g ?? 0,
    carbsG: d.carbsG ?? d.carbsPer100g ?? 0,
    fatG: d.fatG ?? d.fatPer100g ?? 0,
  }));

const cardioSchema = z.object({
  date: z.string().optional(),
  cardioType: z.string().min(1),
  durationMin: z.number().positive(),
  level: z.number().optional(),
  rpm: z.number().optional(),
  speedKmh: z.number().optional(),
  inclinePct: z.number().optional(),
  notes: z.string().optional(),
});

// ── Utility functions ─────────────────────────────────────────────────────────

function getUserId(req: express.Request) {
  return String((req as any).userId ?? "");
}

/** Map Prisma CustomFood → frontend CustomFood shape (calories → calories_per_100g) */
function transformCustomFood(f: any) {
  return {
    id: f.id,
    user_id: f.userId,
    name: f.name,
    calories_per_100g: f.calories,
    protein_per_100g: f.proteinG,
    carbs_per_100g: f.carbsG,
    fat_per_100g: f.fatG,
    created_at: f.createdAt,
  };
}

/** Shared profile update logic with TDEE auto-calculation */
async function updateProfile(
  userId: string,
  payload: z.infer<typeof profileSchema>
) {
  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) throw new Error("User not found");

  const data: any = {};
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.goal !== undefined) data.goal = payload.goal;
  if (payload.weightKg !== undefined) data.weightKg = payload.weightKg;
  if (payload.heightCm !== undefined) data.heightCm = payload.heightCm;
  if (payload.age !== undefined) data.age = payload.age;
  if (payload.sex !== undefined) data.sex = payload.sex;
  if (payload.activityLevel !== undefined) data.activityLevel = payload.activityLevel;
  if (payload.goalWeightKg !== undefined) data.goalWeightKg = payload.goalWeightKg;

  // Explicit targets take priority; tdee field is a legacy alias for calorieTarget
  if (payload.calorieTarget !== undefined) {
    data.calorieTarget = payload.calorieTarget;
    data.tdee = payload.calorieTarget;
  } else if (payload.tdee !== undefined) {
    data.tdee = payload.tdee;
    data.calorieTarget = payload.tdee;
  }
  if (payload.proteinTarget !== undefined) data.proteinTarget = payload.proteinTarget;
  if (payload.carbsTarget !== undefined) data.carbsTarget = payload.carbsTarget;
  if (payload.fatTarget !== undefined) data.fatTarget = payload.fatTarget;

  // Auto-recalculate TDEE when body stats are present and no explicit target was given
  const wKg = data.weightKg ?? current.weightKg;
  const hCm = data.heightCm ?? current.heightCm;
  const age = data.age ?? current.age;
  const sex = data.sex ?? current.sex;
  const activity = data.activityLevel ?? current.activityLevel;
  const goal = data.goal ?? current.goal;

  if (
    wKg && hCm && age && sex && activity && goal &&
    data.calorieTarget === undefined
  ) {
    const tdee = calcTdee({
      weightKg: wKg, heightCm: hCm, age, sex,
      activityLevel: activity, goal,
    });
    data.tdee = tdee;
    data.calorieTarget = tdee;
    const macros = calcMacros(tdee, goal);
    if (data.proteinTarget === undefined) data.proteinTarget = macros.proteinTarget;
    if (data.carbsTarget === undefined) data.carbsTarget = macros.carbsTarget;
    if (data.fatTarget === undefined) data.fatTarget = macros.fatTarget;
  }

  return prisma.user.update({ where: { id: userId }, data });
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => res.json({ ok: true }));

// Auth
app.post("/api/v1/auth/verify", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    // Optionally update email/name from the request body
    const { email, name } = req.body;
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(email ? { email } : {}),
        ...(name ? { name } : {}),
      },
    });
    res.json(toSnake(user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/auth/me", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(toSnake(user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/v1/auth/profile", async (req, res, next) => {
  try {
    const payload = profileSchema.parse(req.body);
    const user = await updateProfile(getUserId(req), payload);
    res.json(toSnake(user));
  } catch (error) {
    next(error);
  }
});

// Onboarding is identical to profile update — separate endpoint for clarity
app.put("/api/v1/auth/onboarding", async (req, res, next) => {
  try {
    const payload = profileSchema.parse(req.body);
    const user = await updateProfile(getUserId(req), payload);
    res.json(toSnake(user));
  } catch (error) {
    next(error);
  }
});

// Exercises
app.get("/api/v1/exercises", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    // Accept both camelCase and snake_case query param names
    const muscleGroup = (req.query.muscleGroup ?? req.query.muscle_group) as
      | string
      | undefined;
    const data = await prisma.exercise.findMany({
      where: {
        OR: [{ isCustom: false }, { userId }],
        ...(muscleGroup ? { muscleGroup: muscleGroup as any } : {}),
      },
      orderBy: { name: "asc" },
    });
    res.json(toSnake(data));
  } catch (error) {
    next(error);
  }
});

// Splits
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
              create: day.exercises.map((ex, i) => ({
                exerciseId: ex.exerciseId,
                orderIndex: i,
              })),
            },
          })),
        },
      },
      include: { days: { include: { exercises: { include: { exercise: true } } } } },
    });
    res.status(201).json(toSnake(split));
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
    res.json(toSnake(splits));
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/splits/:id/days", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const days = await prisma.splitDay.findMany({
      where: { splitId: req.params.id, split: { userId } },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { dayNumber: "asc" },
    });
    res.json(toSnake(days));
  } catch (error) {
    next(error);
  }
});

app.put("/api/v1/splits/:id", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = splitUpdateSchema.parse(req.body);
    const existing = await prisma.split.findFirst({
      where: { id: req.params.id, userId },
    });
    if (!existing) return res.status(404).json({ error: "Split not found" });
    if (payload.days) {
      await prisma.splitDayExercise.deleteMany({
        where: { splitDay: { splitId: req.params.id } },
      });
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
                    create: day.exercises.map((ex, i) => ({
                      exerciseId: ex.exerciseId,
                      orderIndex: i,
                    })),
                  },
                })),
              },
            }
          : {}),
      },
      include: {
        days: { include: { exercises: { include: { exercise: true } } } },
      },
    });
    res.json(toSnake(split));
  } catch (error) {
    next(error);
  }
});

app.put("/api/v1/splits/:id/activate", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await prisma.$transaction([
      prisma.split.updateMany({ where: { userId }, data: { isActive: false } }),
      prisma.split.updateMany({
        where: { id: req.params.id, userId },
        data: { isActive: true },
      }),
      prisma.user.updateMany({
        where: { id: userId },
        data: { currentSplitId: req.params.id },
      }),
    ]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/v1/splits/:id", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await prisma.splitDayExercise.deleteMany({
      where: { splitDay: { splitId: req.params.id, split: { userId } } },
    });
    await prisma.splitDay.deleteMany({
      where: { splitId: req.params.id, split: { userId } },
    });
    await prisma.split.deleteMany({ where: { id: req.params.id, userId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Workouts — specific routes must be registered before /:id to avoid conflicts
app.get("/api/v1/workouts/today", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const workouts = await prisma.workout.findMany({
      where: { userId, date: { gte: start, lt: end }, deletedAt: null },
      include: { sets: { include: { exercise: true } } },
    });
    res.json(toSnake(workouts));
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/workouts/recommendations", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { getProgressiveOverloadRecommendation } = await import(
      "./services/progressiveOverload"
    );
    const activeSplit = await prisma.split.findFirst({
      where: { userId, isActive: true },
      include: { days: { include: { exercises: true } } },
    });
    if (!activeSplit) return res.json([]);
    const exerciseIds = activeSplit.days.flatMap((d) =>
      d.exercises.map((e) => e.exerciseId)
    );
    const uniqueIds = [...new Set(exerciseIds)];
    const recommendations = await Promise.all(
      uniqueIds.map(async (exerciseId) => {
        const sets = await prisma.workoutSet.findMany({
          where: { exerciseId, workout: { userId, deletedAt: null } },
          include: { workout: true },
          orderBy: { workout: { date: "desc" } },
          take: 100,
        });
        const byWorkout = new Map<string, typeof sets>();
        sets.forEach((s) =>
          byWorkout.set(s.workoutId, [...(byWorkout.get(s.workoutId) ?? []), s])
        );
        const sessions = Array.from(byWorkout.values()).slice(0, 4);
        const rec = getProgressiveOverloadRecommendation(sessions);
        const exercise = await prisma.exercise.findUnique({
          where: { id: exerciseId },
        });
        return { exerciseId, exerciseName: exercise?.name ?? "Exercise", ...rec };
      })
    );
    res.json(toSnake(recommendations));
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/workouts/history/:exerciseId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const sets = await prisma.workoutSet.findMany({
      where: {
        exerciseId: req.params.exerciseId,
        workout: { userId, deletedAt: null },
      },
      include: { workout: true, exercise: true },
      orderBy: { workout: { date: "desc" } },
      take: 100,
    });
    const grouped = new Map<string, typeof sets>();
    for (const s of sets) {
      grouped.set(s.workoutId, [...(grouped.get(s.workoutId) ?? []), s]);
    }
    const result = Array.from(grouped.values())
      .slice(0, 10)
      .map((session) => ({
        workout: toSnake(session[0].workout),
        sets: toSnake(session),
      }));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/workouts", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = workoutCreateSchema.parse(req.body);
    const workout = await prisma.workout.create({ data: { userId, ...payload } });
    res.status(201).json(toSnake(workout));
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/workouts", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { page, limit } = paginationSchema.parse(req.query);
    const splitDayId = req.query.splitDayId
      ? String(req.query.splitDayId)
      : undefined;
    const [items, total] = await Promise.all([
      prisma.workout.findMany({
        where: { userId, deletedAt: null, ...(splitDayId ? { splitDayId } : {}) },
        include: { sets: { include: { exercise: true } } },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.workout.count({
        where: { userId, deletedAt: null, ...(splitDayId ? { splitDayId } : {}) },
      }),
    ]);
    res.json(toSnake({ items, page, limit, total }));
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/workouts/:id", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const workout = await prisma.workout.findFirst({
      where: { id: req.params.id, userId, deletedAt: null },
      include: {
        sets: {
          include: { exercise: true },
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
        },
      },
    });
    if (!workout) return res.status(404).json({ error: "Workout not found" });
    res.json(toSnake(workout));
  } catch (error) {
    next(error);
  }
});

app.put("/api/v1/workouts/:id", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = z
      .object({
        notes: z.string().optional(),
        durationMin: z.number().int().positive().optional(),
      })
      .parse(req.body);
    const updated = await prisma.workout.updateMany({
      where: { id: req.params.id, userId },
      data: payload,
    });
    if (!updated.count) return res.status(404).json({ error: "Workout not found" });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/v1/workouts/:id", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await prisma.workout.updateMany({
      where: { id: req.params.id, userId },
      data: { deletedAt: new Date() },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/workouts/:id/sets", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = workoutSetSchema.parse(req.body);
    const exists = await prisma.workout.findFirst({
      where: { id: req.params.id, userId, deletedAt: null },
    });
    if (!exists) return res.status(404).json({ error: "Workout not found" });
    const set = await prisma.workoutSet.create({
      data: { ...payload, workoutId: req.params.id },
    });
    res.status(201).json(toSnake(set));
  } catch (error) {
    next(error);
  }
});

app.put("/api/v1/workouts/:id/sets/:setId", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = workoutSetSchema.partial().parse(req.body);
    const updated = await prisma.workoutSet.updateMany({
      where: {
        id: req.params.setId,
        workoutId: req.params.id,
        workout: { userId },
      },
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
    await prisma.workoutSet.deleteMany({
      where: {
        id: req.params.setId,
        workoutId: req.params.id,
        workout: { userId },
      },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Progress analytics
app.get("/api/v1/progress/volume", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const exerciseId = String(
      req.query.exerciseId ?? req.query.exercise_id ?? ""
    );
    const weeks = Number(req.query.weeks ?? 8);
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - weeks * 7);
    const sets = await prisma.workoutSet.findMany({
      where: {
        exerciseId: exerciseId || undefined,
        workout: { userId, deletedAt: null, date: { gte: start } },
      },
      include: { workout: true },
      orderBy: { workout: { date: "asc" } },
    });
    const byWeek = new Map<string, number>();
    sets.forEach((s) => {
      const d = new Date(s.workout.date);
      const week = `${d.getUTCFullYear()}-W${Math.ceil(
        (d.getUTCDate() + 6 - d.getUTCDay()) / 7
      )}`;
      byWeek.set(week, (byWeek.get(week) ?? 0) + s.weightKg * s.reps);
    });
    res.json(
      Array.from(byWeek.entries()).map(([week, volume]) => ({
        week,
        volume: Math.round(volume),
      }))
    );
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/progress/strength", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const exerciseId = String(
      req.query.exerciseId ?? req.query.exercise_id ?? ""
    );
    const sets = await prisma.workoutSet.findMany({
      where: { exerciseId, workout: { userId, deletedAt: null } },
      include: { workout: true },
      orderBy: { workout: { date: "asc" } },
    });
    const byDate = new Map<
      string,
      { weight_kg: number; reps: number; estimated_1rm: number }
    >();
    sets.forEach((s) => {
      const date = s.workout.date.toISOString().slice(0, 10);
      const e1rm = s.weightKg * (1 + s.reps / 30);
      const cur = byDate.get(date);
      if (!cur || e1rm > cur.estimated_1rm) {
        byDate.set(date, {
          weight_kg: s.weightKg,
          reps: s.reps,
          estimated_1rm: Number(e1rm.toFixed(1)),
        });
      }
    });
    res.json(
      Array.from(byDate.entries()).map(([date, best]) => ({ date, ...best }))
    );
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
    const data = rows
      .map((r) => ({
        date: r.timestamp.toISOString().slice(0, 10),
        weight_kg: Number((r.metadata as any)?.weightKg ?? 0),
      }))
      .filter((item) => Number.isFinite(item.weight_kg) && item.weight_kg > 0);
    res.json(data);
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
    const [user, logs] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.nutritionLog.findMany({
        where: { userId, date: { gte: start } },
        orderBy: { date: "asc" },
      }),
    ]);
    const byDay = new Map<string, number>();
    logs.forEach((l) => {
      const date = l.date.toISOString().slice(0, 10);
      byDay.set(date, (byDay.get(date) ?? 0) + l.calories);
    });
    const data: Array<{ date: string; calories: number; target: number | null }> =
      [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      data.push({
        date: key,
        calories: byDay.get(key) ?? 0,
        target: user?.calorieTarget ?? user?.tdee ?? null,
      });
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
    if (!logs.length) return res.json({ protein_g: 0, carbs_g: 0, fat_g: 0, days });
    const totals = logs.reduce(
      (acc, l) => {
        acc.p += l.proteinG;
        acc.c += l.carbsG;
        acc.f += l.fatG;
        return acc;
      },
      { p: 0, c: 0, f: 0 }
    );
    res.json({
      days,
      protein_g: Number((totals.p / days).toFixed(1)),
      carbs_g: Number((totals.c / days).toFixed(1)),
      fat_g: Number((totals.f / days).toFixed(1)),
    });
  } catch (error) {
    next(error);
  }
});

// Foods
app.get("/api/v1/foods/search", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "");
    const cacheKey = `food:${q.toLowerCase().trim()}`;
    const cached = foodCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const { data } = await axios.get(
      "https://world.openfoodfacts.org/cgi/search.pl",
      {
        params: {
          search_terms: q,
          json: 1,
          page_size: 20,
          fields: "code,product_name,nutriments,serving_size",
        },
      }
    );
    const parsed = (data.products ?? [])
      .map((product: any) => ({
        id: product.code,
        name: product.product_name,
        // Use snake_case to match frontend FoodSearchResult type
        calories_per_100g: Number(product.nutriments?.["energy-kcal_100g"]),
        protein_per_100g: Number(product.nutriments?.proteins_100g),
        carbs_per_100g: Number(product.nutriments?.carbohydrates_100g),
        fat_per_100g: Number(product.nutriments?.fat_100g),
      }))
      .filter(
        (item: any) => item.name && Number.isFinite(item.calories_per_100g)
      );
    foodCache.set(cacheKey, parsed);
    res.json(parsed);
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/foods/custom", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const foods = await prisma.customFood.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(foods.map(transformCustomFood));
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/foods/custom", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = customFoodSchema.parse(req.body);
    const food = await prisma.customFood.create({ data: { ...payload, userId } });
    res.status(201).json(transformCustomFood(food));
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

// Nutrition
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
    const byDay = new Map<
      string,
      { calories: number; proteinG: number; carbsG: number; fatG: number }
    >();
    logs.forEach((l) => {
      const key = l.date.toISOString().slice(0, 10);
      const cur = byDay.get(key) ?? {
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
      };
      cur.calories += l.calories;
      cur.proteinG += l.proteinG;
      cur.carbsG += l.carbsG;
      cur.fatG += l.fatG;
      byDay.set(key, cur);
    });
    const daily = Array.from(byDay.entries()).map(([date, t]) => ({
      date,
      total_calories: t.calories,
      total_protein_g: t.proteinG,
      total_carbs_g: t.carbsG,
      total_fat_g: t.fatG,
    }));
    const avg = daily.length
      ? {
          calories: Math.round(
            daily.reduce((a, b) => a + b.total_calories, 0) / daily.length
          ),
          protein_g: Math.round(
            daily.reduce((a, b) => a + b.total_protein_g, 0) / daily.length
          ),
          carbs_g: Math.round(
            daily.reduce((a, b) => a + b.total_carbs_g, 0) / daily.length
          ),
          fat_g: Math.round(
            daily.reduce((a, b) => a + b.total_fat_g, 0) / daily.length
          ),
        }
      : { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    res.json({ days, daily, average: avg });
  } catch (error) {
    next(error);
  }
});

// /nutrition must come after /nutrition/summary to avoid param collision
app.get("/api/v1/nutrition", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const dateStr = String(
      req.query.date ?? new Date().toISOString().slice(0, 10)
    );
    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const logs = await prisma.nutritionLog.findMany({
      where: { userId, date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
    });
    const totals = logs.reduce(
      (acc, l) => {
        acc.calories += l.calories;
        acc.proteinG += l.proteinG;
        acc.carbsG += l.carbsG;
        acc.fatG += l.fatG;
        return acc;
      },
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    );
    res.json({
      date: dateStr,
      logs: toSnake(logs),
      total_calories: totals.calories,
      total_protein_g: totals.proteinG,
      total_carbs_g: totals.carbsG,
      total_fat_g: totals.fatG,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/nutrition", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = nutritionCreateSchema.parse(req.body);
    const entry = await prisma.nutritionLog.create({ data: { ...payload, userId } });
    res.status(201).json(toSnake(entry));
  } catch (error) {
    next(error);
  }
});

app.put("/api/v1/nutrition/:id", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = nutritionUpdateSchema.parse(req.body);
    const updated = await prisma.nutritionLog.updateMany({
      where: { id: req.params.id, userId },
      data: payload,
    });
    if (!updated.count)
      return res.status(404).json({ error: "Nutrition entry not found" });
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

// Cardio (stored in Event table so no migration needed)
const CARDIO_MET: Record<string, number> = {
  recumbent_bike: 5.5, upright_bike: 7.0, spinning: 8.5, treadmill: 9.0,
  walking: 3.5, elliptical: 6.0, rowing: 7.0, stairmaster: 9.0,
  jump_rope: 11.0, swimming: 8.0, hiking: 6.0, battle_ropes: 10.0,
  hiit: 10.0, other: 6.0,
};

// /cardio/activity/* must be registered before /cardio/:id
app.get("/api/v1/cardio/activity/today", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date(`${today}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    let bmr: number | null = null;
    if (user?.weightKg && user.heightCm && user.age && user.sex) {
      bmr = Math.round(
        10 * user.weightKg +
          6.25 * user.heightCm -
          5 * user.age +
          (user.sex === "male" ? 5 : -161)
      );
    }

    const stepsEvent = await prisma.event.findFirst({
      where: { userId, event: "STEPS_LOG", timestamp: { gte: start, lt: end } },
      orderBy: { timestamp: "desc" },
    });
    const steps = (stepsEvent?.metadata as any)?.steps ?? 0;
    const caloriesFromSteps = Math.round(steps * 0.04);

    const cardioEvents = await prisma.event.findMany({
      where: { userId, event: "CARDIO_SESSION", timestamp: { gte: start, lt: end } },
    });
    const cardioCalories = cardioEvents.reduce(
      (s, e) => s + ((e.metadata as any)?.caloriesBurned ?? 0),
      0
    );

    const workingSets = await prisma.workoutSet.count({
      where: {
        isWarmup: false,
        workout: { userId, date: { gte: start, lt: end }, deletedAt: null },
      },
    });
    const liftingCalories = Math.round(workingSets * 8);

    const totalBurned =
      (bmr ?? 1800) + caloriesFromSteps + cardioCalories + liftingCalories;

    res.json({
      date: today,
      steps,
      calories_from_steps: caloriesFromSteps,
      cardio_calories: cardioCalories,
      lifting_calories: liftingCalories,
      working_sets: workingSets,
      bmr,
      total_burned: totalBurned,
      calorie_target: user?.calorieTarget ?? user?.tdee ?? null,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/cardio/activity", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { date, steps } = z
      .object({ date: z.string(), steps: z.number().int().nonnegative() })
      .parse(req.body);
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    // Upsert: replace any existing steps log for that day
    await prisma.event.deleteMany({
      where: { userId, event: "STEPS_LOG", timestamp: { gte: start, lt: end } },
    });
    await prisma.event.create({
      data: {
        userId,
        event: "STEPS_LOG",
        metadata: { steps, date },
        timestamp: new Date(`${date}T12:00:00Z`),
      },
    });
    res.json({ ok: true, date, steps });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/cardio", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const days = Number(req.query.days ?? 7);
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);
    const rows = await prisma.event.findMany({
      where: { userId, event: "CARDIO_SESSION", timestamp: { gte: start } },
      orderBy: { timestamp: "desc" },
    });
    const sessions = rows.map((r) => {
      const m = (r.metadata as any) ?? {};
      return {
        id: r.id,
        user_id: r.userId,
        date: r.timestamp.toISOString().slice(0, 10),
        cardio_type: m.cardioType,
        duration_min: m.durationMin,
        calories_burned: m.caloriesBurned ?? null,
        level: m.level ?? null,
        speed_kmh: m.speedKmh ?? null,
        incline_pct: m.inclinePct ?? null,
        rpm: m.rpm ?? null,
        notes: m.notes ?? null,
        created_at: r.timestamp,
      };
    });
    res.json(sessions);
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/cardio", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = cardioSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const weightKg = user?.weightKg ?? 75;
    const met = CARDIO_MET[payload.cardioType] ?? 6.0;
    const caloriesBurned = Math.round(met * weightKg * (payload.durationMin / 60));
    const event = await prisma.event.create({
      data: {
        userId,
        event: "CARDIO_SESSION",
        metadata: { ...payload, caloriesBurned },
        timestamp: payload.date
          ? new Date(`${payload.date}T12:00:00Z`)
          : new Date(),
      },
    });
    res.status(201).json({
      id: event.id,
      user_id: event.userId,
      date: payload.date ?? event.timestamp.toISOString().slice(0, 10),
      cardio_type: payload.cardioType,
      duration_min: payload.durationMin,
      calories_burned: caloriesBurned,
      created_at: event.timestamp,
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/v1/cardio/:id", async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await prisma.event.deleteMany({
      where: { id: req.params.id, userId, event: "CARDIO_SESSION" },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// AI Coach (SSE streaming)
app.post("/api/v1/ai/coach", async (req, res, next) => {
  try {
    const { message, conversationHistory } = z
      .object({
        message: z.string().min(1),
        conversationHistory: z
          .array(z.object({ role: z.string(), content: z.string() }))
          .default([]),
      })
      .parse(req.body);
    const userId = getUserId(req);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { splits: true },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const systemPrompt = [
      "You are GymAI, an expert fitness and nutrition coach.",
      `User goal: ${user.goal}`,
      `Calorie target: ${user.calorieTarget ?? user.tdee ?? "unknown"} kcal/day`,
      user.weightKg ? `Weight: ${user.weightKg}kg` : null,
      user.heightCm ? `Height: ${user.heightCm}cm` : null,
      user.age ? `Age: ${user.age}` : null,
      `Active splits: ${user.splits.filter((s: any) => s.isActive).length} / ${user.splits.length} total`,
      "Give concise, data-driven advice. Be specific about weights, reps, sets, and calories.",
    ]
      .filter(Boolean)
      .join("\n");

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: "user", content: message },
      ] as any,
    });
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(`data: ${JSON.stringify({ token: event.delta.text })}\n\n`);
      }
    }
    res.write("event: done\ndata: {}\n\n");
    res.end();
  } catch (error) {
    next(error);
  }
});

// ── Error handler ─────────────────────────────────────────────────────────────

app.use(
  (
    error: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(error);
    if (error?.name === "ZodError") {
      res.status(400).json({ error: "Validation failed", details: error.issues });
      return;
    }
    res.status(500).json({ error: error?.message ?? "Internal Server Error" });
  }
);

app.listen(port, () => {
  console.log(`GymChad API listening on ${port}`);
});
