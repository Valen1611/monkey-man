import { apiFetch } from '@/src/lib/api';

export interface Transaction {
    id: string;
    date: string;
    description?: string | null;
    amount: number;
    categoryId: string;
    category?: { id: string; name: string; color: string; group: string } | null;
    walletId: string;
    wallet?: { id: string; name: string; color: string } | null;
    toWalletId?: string | null;
    toWallet?: { id: string; name: string; color: string } | null;
}

export interface CreateTransactionPayload {
    date: string;
    description?: string;
    amount: number;
    categoryId: string;
    walletId: string;
    toWalletId?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070';
const ENDPOINT = `${API_URL}/api/transactions`;

export const transactionService = {
    async getTransactions(): Promise<Transaction[]> {
        const res = await apiFetch(ENDPOINT);
        if (!res.ok) throw new Error('Failed to fetch transactions');
        return res.json();
    },

    async createTransaction(transaction: CreateTransactionPayload): Promise<Transaction> {
        const res = await apiFetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        });
        if (!res.ok) throw new Error('Failed to create transaction');
        return res.json();
    },

    async updateTransaction(id: string, updates: Partial<CreateTransactionPayload>): Promise<Transaction> {
        const res = await apiFetch(`${ENDPOINT}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error('Failed to update transaction');
        return res.json();
    },

    async deleteTransaction(id: string): Promise<void> {
        const res = await apiFetch(`${ENDPOINT}/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete transaction');
    }
};
