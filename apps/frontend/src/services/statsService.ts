import { apiFetch } from '@/src/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070';

export interface MonthlyExpense {
    month: string;
    total: number;
    byGroup?: {
        FIXED?: number;
        VARIABLE?: number;
        SAVINGS?: number;
        INCOME?: number;
    };
}

export interface BudgetHistoryMonth {
    month: string;
    totalExpenseLimit: number;
    totalExpenseActual: number;
    totalIncomeLimit: number;
    totalIncomeActual: number;
    adherencePct: number;
    status: 'under' | 'warning' | 'over' | 'unbudgeted';
    byGroup: Record<string, { limit: number; actual: number }>;
    overspentCategories: Array<{
        id: string;
        name: string;
        group: string;
        color: string;
        limit: number;
        actual: number;
        diff: number;
        isOver: boolean;
    }>;
    categoryBreakdown: Array<{
        id: string;
        name: string;
        group: string;
        color: string;
        limit: number;
        actual: number;
        diff: number;
        isOver: boolean;
    }>;
}

export const statsService = {
    async getMonthlyExpenses(): Promise<MonthlyExpense[]> {
        const res = await apiFetch(`${API_URL}/api/stats/monthly-expenses`);
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
    },

    async getBudgetHistory(): Promise<BudgetHistoryMonth[]> {
        const res = await apiFetch(`${API_URL}/api/stats/budget-history`);
        if (!res.ok) throw new Error('Failed to fetch budget history');
        return res.json();
    }
};
