export function roundDownTo15Minutes(ms: number): number {
  const minutes = ms / 1000 / 60;
  const rounded = Math.floor(minutes / 15) * 15;
  return rounded * 60 * 1000;
}

export function formatMsToHHMM(ms: number) {
  const totalMinutes = Math.floor(ms / 1000 / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
