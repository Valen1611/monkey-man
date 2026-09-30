import { apiFetch } from '@/src/lib/api';
import { Category } from '../hooks/useCategories';

export interface Budget {
    id: string;
    yearMonth: string;
    limit: number;
    categoryId: string;
    category: Category;
    usage: number; // Derived from backend
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070';
const ENDPOINT = `${API_URL}/api/budgets`;

export const budgetService = {
    async getBudgets(month: string): Promise<Budget[]> {
        const res = await apiFetch(`${ENDPOINT}?month=${month}`);
        if (!res.ok) throw new Error('Failed to fetch budgets');
        return res.json();
    },

    async updateBudget(yearMonth: string, categoryId: string, limit: number): Promise<Budget> {
        const res = await apiFetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ yearMonth, categoryId, limit })
        });
        if (!res.ok) throw new Error('Failed to update budget');
        return res.json();
    },

    async rolloverBudgets(toMonth: string, fromMonth?: string): Promise<{ count: number; message: string }> {
        const res = await apiFetch(`${ENDPOINT}/rollover`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toMonth, fromMonth })
        });
        if (!res.ok) throw new Error('Failed to copy budgets');
        return res.json();
    }
};
