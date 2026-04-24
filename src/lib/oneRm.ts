export function estimateOneRM(
  weight: number | string,
  reps: number,
): number {
  const w = typeof weight === 'string' ? parseFloat(weight) : weight;
  if (!isFinite(w) || w <= 0 || reps <= 0) return 0;
  if (reps === 1) return Math.round(w);
  return Math.round(w * (1 + reps / 30));
}

export function totalVolume(
  sets: { weightKg: string | number; reps: number }[],
): number {
  return sets.reduce((sum, s) => {
    const w =
      typeof s.weightKg === 'string' ? parseFloat(s.weightKg) : s.weightKg;
    if (!isFinite(w)) return sum;
    return sum + w * s.reps;
  }, 0);
}
