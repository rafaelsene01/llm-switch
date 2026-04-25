import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCost(value: number): string {
  return `$${parseFloat(value.toPrecision(7)).toString()}`;
}
