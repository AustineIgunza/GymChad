type SessionSet = { reps: number; weightKg: number; isWarmup?: boolean };

export function getProgressiveOverloadRecommendation(exerciseSessions: SessionSet[][]) {
  const topRepRange = 12;
  const latestSessions = exerciseSessions.slice(0, 4).map((session) => session.filter((set) => !set.isWarmup));
  if (latestSessions.length < 2) {
    return { recommendation: "Log at least 2 sessions to get recommendations.", suggestedWeightKg: 0, suggestedReps: "8-12" };
  }

  const [current, previous] = latestSessions;
  const currentBest = current.reduce((best, set) => (set.weightKg * set.reps > best.weightKg * best.reps ? set : best), current[0]);
  const previousBest = previous.reduce((best, set) => (set.weightKg * set.reps > best.weightKg * best.reps ? set : best), previous[0]);

  const hitTopRepTwice = currentBest.reps >= topRepRange && previousBest.reps >= topRepRange && currentBest.weightKg === previousBest.weightKg;
  if (hitTopRepTwice) {
    return {
      recommendation: "Increase load next session. You have hit top reps twice.",
      suggestedWeightKg: currentBest.weightKg + 2.5,
      suggestedReps: "8-10",
    };
  }

  if (currentBest.weightKg >= previousBest.weightKg && currentBest.reps > previousBest.reps) {
    return {
      recommendation: "Keep same load and aim to hit top of rep range.",
      suggestedWeightKg: currentBest.weightKg,
      suggestedReps: `${currentBest.reps + 1}-${topRepRange}`,
    };
  }

  const stalled = latestSessions.length >= 3 && latestSessions.every((session) => {
    const best = session.reduce((a, b) => (a.weightKg * a.reps > b.weightKg * b.reps ? a : b), session[0]);
    return best.weightKg <= previousBest.weightKg && best.reps <= previousBest.reps;
  });

  if (stalled) {
    return {
      recommendation: "Progress is flat for 3+ sessions. Consider a deload or form-focus week.",
      suggestedWeightKg: Math.max(currentBest.weightKg - 5, 0),
      suggestedReps: "6-8",
    };
  }

  return {
    recommendation: "Consolidate current working weight and improve rep quality.",
    suggestedWeightKg: currentBest.weightKg,
    suggestedReps: "8-12",
  };
}
