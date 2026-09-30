import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetService } from '../services/budgetService';

export function useBudgets(month: string) {
    return useQuery({
        queryKey: ['budgets', month],
        queryFn: () => budgetService.getBudgets(month),
        enabled: !!month
    });
}

export function useUpdateBudget() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ yearMonth, categoryId, limit }: { yearMonth: string; categoryId: string; limit: number }) => 
            budgetService.updateBudget(yearMonth, categoryId, limit),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
            queryClient.invalidateQueries({ queryKey: ['budgetHistory'] });
        }
    });
}

export function useRolloverBudgets() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ toMonth, fromMonth }: { toMonth: string; fromMonth?: string }) =>
            budgetService.rolloverBudgets(toMonth, fromMonth),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
            queryClient.invalidateQueries({ queryKey: ['budgetHistory'] });
        }
    });
}
