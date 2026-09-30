import { useQuery } from '@tanstack/react-query';
import { statsService } from '../services/statsService';

export function useMonthlyExpenses() {
    return useQuery({
        queryKey: ['monthlyExpenses'],
        queryFn: statsService.getMonthlyExpenses
    });
}

export function useBudgetHistory() {
    return useQuery({
        queryKey: ['budgetHistory'],
        queryFn: statsService.getBudgetHistory
    });
}
