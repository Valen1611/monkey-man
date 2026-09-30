import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/src/lib/api';

export interface Category {
    id: string;
    name: string;
    color: string;
    group: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070';

export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async (): Promise<Category[]> => {
            const res = await apiFetch(`${API_URL}/api/categories`);
            if (!res.ok) throw new Error('Failed to fetch categories');
            return res.json();
        }
    });
}

export function useCreateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Omit<Category, 'id'>) => {
            const res = await apiFetch(`${API_URL}/api/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to create category');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Category) => {
            const res = await apiFetch(`${API_URL}/api/categories/${data.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to update category');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });
}

export function useDeleteCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiFetch(`${API_URL}/api/categories/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete category');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });
}
