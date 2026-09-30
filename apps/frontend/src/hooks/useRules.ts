import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/src/lib/api";
import { Category } from "./useCategories";
import { Wallet } from "./useWallets";

export interface ParserRule {
    id: string;
    keyType: string;
    keyValue: string;
    categoryId: string | null;
    category?: Category | null;
    walletId: string | null;
    wallet?: Wallet | null;
    isMine: boolean;
}

export interface CreateRuleInput {
    keyType: string;
    keyValue: string;
    categoryId?: string | null;
    walletId?: string | null;
    isMine?: boolean;
}

export type UpdateRuleInput = CreateRuleInput & { id: string };

/** Allowed keyType returned from backend API authority. */
export interface RuleKeyType {
    value: string;
    caseInsensitive: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7070";

export function useRules() {
    return useQuery({
        queryKey: ["rules"],
        queryFn: async (): Promise<ParserRule[]> => {
            const res = await apiFetch(`${API_URL}/api/rules`);
            if (!res.ok) throw new Error("Failed to fetch rules");
            return res.json();
        }
    });
}

export function useRuleKeyTypes() {
    return useQuery({
        queryKey: ["ruleKeyTypes"],
        queryFn: async (): Promise<RuleKeyType[]> => {
            const res = await apiFetch(`${API_URL}/api/rules/key-types`);
            if (!res.ok) throw new Error("Failed to fetch rule key types");
            const data = await res.json();
            return data.keyTypes;
        }
    });
}

export function useCreateRule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: CreateRuleInput) => {
            const res = await apiFetch(`${API_URL}/api/rules`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error(await errorMessage(res, "Failed to create rule"));
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rules"] });
        }
    });
}

export function useUpdateRule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: UpdateRuleInput) => {
            const res = await apiFetch(`${API_URL}/api/rules/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error(await errorMessage(res, "Failed to update rule"));
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rules"] });
        }
    });
}

export function useDeleteRule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiFetch(`${API_URL}/api/rules/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error(await errorMessage(res, "Failed to delete rule"));
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rules"] });
        }
    });
}

/** Extracts backend error message if present, otherwise returns fallback. */
async function errorMessage(res: Response, fallback: string) {
    try {
        const data = await res.json();
        if (data?.error) return String(data.error);
    } catch {
        // Fall back to default message if body is not JSON
    }
    return fallback;
}
