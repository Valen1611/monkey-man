import { apiFetch } from '@/src/lib/api';

export interface MonthlySummary {
    month: string;
    income: number;
    expenses: {
        total: number;
        fixed: number;
        variable: number;
        savings: number;
    };
    remaining: number;
    spentPercentage: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070';
const ENDPOINT = `${API_URL}/api/stats/monthly-summary`;

export const monthlySummaryService = {
    async getMonthlySummary(month: string): Promise<MonthlySummary> {
        const res = await apiFetch(`${ENDPOINT}?month=${month}`);
        if (!res.ok) throw new Error('Failed to fetch monthly summary');
        return res.json();
    }
};
