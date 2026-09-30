import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { transactionService, Transaction, CreateTransactionPayload } from '../services/transactionService';

const QUERY_KEY = ['transactions'];

export function useTransactions(options?: Omit<UseQueryOptions<Transaction[], Error, Transaction[], string[]>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn: () => transactionService.getTransactions(),
        ...options
    });
}

export function useCreateTransaction() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (newTransaction: CreateTransactionPayload) => 
            transactionService.createTransaction(newTransaction),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
            queryClient.invalidateQueries({ queryKey: ['monthlyExpenses'] });
            queryClient.invalidateQueries({ queryKey: ['budgetHistory'] });
        },
    });
}

export function useUpdateTransaction() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateTransactionPayload> }) => 
            transactionService.updateTransaction(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
            queryClient.invalidateQueries({ queryKey: ['monthlyExpenses'] });
            queryClient.invalidateQueries({ queryKey: ['budgetHistory'] });
        },
    });
}

export function useDeleteTransaction() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (id: string) => transactionService.deleteTransaction(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
            queryClient.invalidateQueries({ queryKey: ['monthlyExpenses'] });
            queryClient.invalidateQueries({ queryKey: ['budgetHistory'] });
        },
    });
}
