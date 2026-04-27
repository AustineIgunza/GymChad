import { PrismaClient, MuscleGroup } from "@prisma/client";

const prisma = new PrismaClient();

const exercises: Array<{ name: string; muscleGroup: MuscleGroup; equipment?: string }> = [
  { name: "Barbell Bench Press", muscleGroup: "CHEST", equipment: "Barbell" },
  { name: "Incline Dumbbell Press", muscleGroup: "CHEST", equipment: "Dumbbell" },
  { name: "Decline Bench Press", muscleGroup: "CHEST", equipment: "Barbell" },
  { name: "Cable Fly", muscleGroup: "CHEST", equipment: "Cable" },
  { name: "Push-Up", muscleGroup: "CHEST" },
  { name: "Pec Deck", muscleGroup: "CHEST", equipment: "Machine" },
  { name: "Dumbbell Pullover", muscleGroup: "CHEST", equipment: "Dumbbell" },
  { name: "Landmine Press", muscleGroup: "CHEST", equipment: "Barbell" },
  { name: "Deadlift", muscleGroup: "BACK", equipment: "Barbell" },
  { name: "Barbell Row", muscleGroup: "BACK", equipment: "Barbell" },
  { name: "Chest Supported Row", muscleGroup: "BACK", equipment: "Machine" },
  { name: "Lat Pulldown", muscleGroup: "BACK", equipment: "Cable" },
  { name: "Pull-Up", muscleGroup: "BACK" },
  { name: "Seated Cable Row", muscleGroup: "BACK", equipment: "Cable" },
  { name: "Single Arm Dumbbell Row", muscleGroup: "BACK", equipment: "Dumbbell" },
  { name: "T-Bar Row", muscleGroup: "BACK", equipment: "Barbell" },
  { name: "Overhead Press", muscleGroup: "SHOULDERS", equipment: "Barbell" },
  { name: "Dumbbell Shoulder Press", muscleGroup: "SHOULDERS", equipment: "Dumbbell" },
  { name: "Lateral Raise", muscleGroup: "SHOULDERS", equipment: "Dumbbell" },
  { name: "Cable Lateral Raise", muscleGroup: "SHOULDERS", equipment: "Cable" },
  { name: "Rear Delt Fly", muscleGroup: "SHOULDERS", equipment: "Machine" },
  { name: "Face Pull", muscleGroup: "SHOULDERS", equipment: "Cable" },
  { name: "Arnold Press", muscleGroup: "SHOULDERS", equipment: "Dumbbell" },
  { name: "Upright Row", muscleGroup: "SHOULDERS", equipment: "Barbell" },
  { name: "Barbell Curl", muscleGroup: "BICEPS", equipment: "Barbell" },
  { name: "EZ Bar Curl", muscleGroup: "BICEPS", equipment: "EZ Bar" },
  { name: "Alternating Dumbbell Curl", muscleGroup: "BICEPS", equipment: "Dumbbell" },
  { name: "Hammer Curl", muscleGroup: "BICEPS", equipment: "Dumbbell" },
  { name: "Preacher Curl", muscleGroup: "BICEPS", equipment: "Machine" },
  { name: "Cable Curl", muscleGroup: "BICEPS", equipment: "Cable" },
  { name: "Concentration Curl", muscleGroup: "BICEPS", equipment: "Dumbbell" },
  { name: "Spider Curl", muscleGroup: "BICEPS", equipment: "Dumbbell" },
  { name: "Close Grip Bench Press", muscleGroup: "TRICEPS", equipment: "Barbell" },
  { name: "Tricep Pushdown", muscleGroup: "TRICEPS", equipment: "Cable" },
  { name: "Overhead Tricep Extension", muscleGroup: "TRICEPS", equipment: "Dumbbell" },
  { name: "Skull Crusher", muscleGroup: "TRICEPS", equipment: "EZ Bar" },
  { name: "Dips", muscleGroup: "TRICEPS" },
  { name: "Rope Pushdown", muscleGroup: "TRICEPS", equipment: "Cable" },
  { name: "Kickback", muscleGroup: "TRICEPS", equipment: "Dumbbell" },
  { name: "JM Press", muscleGroup: "TRICEPS", equipment: "Barbell" },
  { name: "Back Squat", muscleGroup: "LEGS", equipment: "Barbell" },
  { name: "Front Squat", muscleGroup: "LEGS", equipment: "Barbell" },
  { name: "Leg Press", muscleGroup: "LEGS", equipment: "Machine" },
  { name: "Romanian Deadlift", muscleGroup: "LEGS", equipment: "Barbell" },
  { name: "Hack Squat", muscleGroup: "LEGS", equipment: "Machine" },
  { name: "Leg Extension", muscleGroup: "LEGS", equipment: "Machine" },
  { name: "Leg Curl", muscleGroup: "LEGS", equipment: "Machine" },
  { name: "Walking Lunge", muscleGroup: "LEGS", equipment: "Dumbbell" },
  { name: "Bulgarian Split Squat", muscleGroup: "LEGS", equipment: "Dumbbell" },
  { name: "Goblet Squat", muscleGroup: "LEGS", equipment: "Dumbbell" },
  { name: "Hip Thrust", muscleGroup: "GLUTES", equipment: "Barbell" },
  { name: "Glute Bridge", muscleGroup: "GLUTES", equipment: "Barbell" },
  { name: "Cable Kickback", muscleGroup: "GLUTES", equipment: "Cable" },
  { name: "Step Up", muscleGroup: "GLUTES", equipment: "Dumbbell" },
  { name: "Sumo Deadlift", muscleGroup: "GLUTES", equipment: "Barbell" },
  { name: "Abductor Machine", muscleGroup: "GLUTES", equipment: "Machine" },
  { name: "Reverse Hyper", muscleGroup: "GLUTES", equipment: "Machine" },
  { name: "Single Leg Hip Thrust", muscleGroup: "GLUTES" },
  { name: "Crunch", muscleGroup: "CORE" },
  { name: "Cable Crunch", muscleGroup: "CORE", equipment: "Cable" },
  { name: "Hanging Leg Raise", muscleGroup: "CORE" },
  { name: "Plank", muscleGroup: "CORE" },
  { name: "Ab Wheel Rollout", muscleGroup: "CORE", equipment: "Ab Wheel" },
  { name: "Russian Twist", muscleGroup: "CORE", equipment: "Plate" },
  { name: "Pallof Press", muscleGroup: "CORE", equipment: "Cable" },
  { name: "Side Plank", muscleGroup: "CORE" },
  { name: "Treadmill Run", muscleGroup: "CARDIO", equipment: "Treadmill" },
  { name: "Elliptical", muscleGroup: "CARDIO", equipment: "Machine" },
  { name: "Bike Sprint", muscleGroup: "CARDIO", equipment: "Bike" },
  { name: "Rowing Machine", muscleGroup: "CARDIO", equipment: "Rower" },
  { name: "Jump Rope", muscleGroup: "CARDIO" },
  { name: "Stair Climber", muscleGroup: "CARDIO", equipment: "Machine" },
  { name: "HIIT Intervals", muscleGroup: "CARDIO" },
  { name: "Sled Push", muscleGroup: "CARDIO", equipment: "Sled" },
  { name: "Clean and Press", muscleGroup: "FULL_BODY", equipment: "Barbell" },
  { name: "Snatch", muscleGroup: "FULL_BODY", equipment: "Barbell" },
  { name: "Thruster", muscleGroup: "FULL_BODY", equipment: "Barbell" },
  { name: "Kettlebell Swing", muscleGroup: "FULL_BODY", equipment: "Kettlebell" },
  { name: "Burpee", muscleGroup: "FULL_BODY" },
  { name: "Farmer Carry", muscleGroup: "FULL_BODY", equipment: "Dumbbell" },
  { name: "Turkish Get Up", muscleGroup: "FULL_BODY", equipment: "Kettlebell" },
  { name: "Wall Ball", muscleGroup: "FULL_BODY", equipment: "Medicine Ball" },
];

async function main() {
  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { id: `${exercise.name}-${exercise.muscleGroup}`.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: {
        id: `${exercise.name}-${exercise.muscleGroup}`.toLowerCase().replace(/\s+/g, "-"),
        ...exercise,
        isCustom: false,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
