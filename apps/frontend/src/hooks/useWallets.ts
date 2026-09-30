import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/src/lib/api';

export interface Wallet {
    id: string;
    name: string;
    balance: number;
    color: string;
    imageUrl?: string | null;
}

export interface CreateWalletInput {
    name: string;
    color: string;
    balance?: number;
    imageUrl?: string | null;
}

export interface UpdateWalletInput {
    id: string;
    name?: string;
    color?: string;
    balance?: number;
    imageUrl?: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070';

export function useWallets(options?: Omit<UseQueryOptions<Wallet[], Error, Wallet[], string[]>, 'queryKey' | 'queryFn'>) {
    return useQuery({
        queryKey: ['wallets'],
        queryFn: async () => {
            const res = await apiFetch(`${API_URL}/api/wallets`);
            if (!res.ok) throw new Error('Failed to fetch wallets');
            return res.json() as Promise<Wallet[]>;
        },
        ...options
    });
}

export function useCreateWallet() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreateWalletInput) => {
            const res = await apiFetch(`${API_URL}/api/wallets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to create wallet');
            return json as Wallet;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
        }
    });
}

export function useUpdateWallet() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: UpdateWalletInput) => {
            const res = await apiFetch(`${API_URL}/api/wallets/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to update wallet');
            return json as Wallet;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
        }
    });
}

export function useDeleteWallet() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiFetch(`${API_URL}/api/wallets/${id}`, {
                method: 'DELETE'
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to delete wallet');
            return json;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
        }
    });
}
