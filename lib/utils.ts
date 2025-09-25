import {type ClassValue, clsx} from 'clsx';
import {twMerge} from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const BASE_URL = process.env.BASE_URL || 'https://ai-back.milliytech.uz';
export const WS_URL = process.env.WS_URL || 'wss://ai-back.milliytech.uz';
