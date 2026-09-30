import { apiFetch } from '@/src/lib/api';

export interface Wallet {
    id: number;
    name: string;
    balance: number;
    color: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070';
const ENDPOINT = `${API_URL}/api/wallets`;

export const walletService = {
    async getWallets(): Promise<Wallet[]> {
        const res = await apiFetch(ENDPOINT);
        if (!res.ok) throw new Error('Failed to fetch wallets');
        return res.json();
    }
};
