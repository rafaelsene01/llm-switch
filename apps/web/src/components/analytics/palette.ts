export const MODEL_PALETTE = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#f43f5e', // rose
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
  '#ec4899', // pink
  '#84cc16', // lime
];

export function modelColor(index: number): string {
  return MODEL_PALETTE[index % MODEL_PALETTE.length];
}

/** Same hue, 55% opacity — used for the secondary bar (Requisições) */
export function modelColorAlpha(index: number): string {
  const hex = modelColor(index).slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.55)`;
}
