import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';
export const WS_URL = process.env.WS_URL || 'ws://localhost:8000';
