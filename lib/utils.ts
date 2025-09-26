import {type ClassValue, clsx} from 'clsx';
import {twMerge} from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const BASE_URL = process.env.BASE_URL || 'https://ai-back.milliytech.uz';
export const WS_URL = process.env.WS_URL || 'wss://ai-back.milliytech.uz';

// export const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8000';
// export const WS_URL = process.env.WS_URL || 'ws://127.0.0.1:8000';