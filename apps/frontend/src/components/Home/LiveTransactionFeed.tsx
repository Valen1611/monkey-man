"use client";

import { useState } from "react";
import { useTransactions, useUpdateTransaction } from "@/src/hooks/useTransactions";
import { useCategories } from "@/src/hooks/useCategories";
import { moneyFormat } from "@/src/utils/utils";

const CATEGORY_GROUP_ORDER = ['VARIABLE', 'FIXED', 'TRANSFER', 'SAVINGS', 'INCOME'];

export default function LiveTransactionFeed({ onAddTransaction }: { onAddTransaction?: () => void }) {
    const { data: transactions = [], isLoading } = useTransactions({
        refetchInterval: 3000 // Poll every 3 seconds
    });
    const { data: categories = [] } = useCategories();
    const updateMutation = useUpdateTransaction();
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const uncategorizedTransactions = transactions.filter(
        (tx) => !tx.categoryId || !tx.category
    );
    const recentTransactions = transactions.filter(
        (tx) => Boolean(tx.categoryId && tx.category)
    );

    const handleAssignCategory = (transactionId: string, categoryId: string) => {
        if (!categoryId) return;
        setUpdatingId(transactionId);
        updateMutation.mutate(
            { id: transactionId, updates: { categoryId } },
            {
                onSettled: () => {
                    setUpdatingId(null);
                }
            }
        );
    };

    const groups = Array.from(new Set(categories.map((c) => c.group))).sort((a, b) => {
        const idxA = CATEGORY_GROUP_ORDER.indexOf(a);
        const idxB = CATEGORY_GROUP_ORDER.indexOf(b);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    return (
        <div className="w-full p-6 rounded-[20px] bg-[#e0e0e0] shadow-[10px_10px_20px_#bebebe,_-10px_-10px_20px_#ffffff] flex flex-col h-full min-h-[420px]">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2.5">
                    <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        Live Feed
                    </h3>
                    {uncategorizedTransactions.length > 0 && (
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 border border-amber-500/30">
                            {uncategorizedTransactions.length} pending
                        </span>
                    )}
                </div>
                {onAddTransaction && (
                    <button
                        onClick={onAddTransaction}
                        className="px-3 py-1.5 rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] text-xs font-black text-blue-600 active:scale-95 transition-all flex items-center gap-1.5"
                        title="Add transaction (Hotkey: N)"
                    >
                        <span>+</span>
                        <span>Add</span>
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="text-gray-500 text-center py-4 flex-1 flex items-center justify-center">Loading...</div>
            ) : (
                <div className="flex flex-col flex-1 min-h-0">
                    {/* Uncategorized Transfers / Transactions List */}
                    {uncategorizedTransactions.length > 0 && (
                        <div className="mb-4 p-3.5 rounded-[18px] bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] border border-amber-500/40 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                    Pending Categorization
                                </span>
                                <span className="text-[10px] font-bold text-gray-500">
                                    {uncategorizedTransactions.length} {uncategorizedTransactions.length === 1 ? 'item' : 'items'}
                                </span>
                            </div>

                            <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                {uncategorizedTransactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="p-3 rounded-[14px] bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] flex flex-col gap-2"
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex flex-col min-w-0">
                                                <span
                                                    className="text-xs font-bold text-gray-800 truncate"
                                                    title={tx.description || "Transfer"}
                                                >
                                                    {tx.description || "Transfer"}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-semibold">
                                                    <span>
                                                        {new Date(tx.date).toLocaleDateString([], {
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </span>
                                                    {tx.wallet && <span>• {tx.wallet.name}</span>}
                                                </div>
                                            </div>
                                            <span className="text-xs font-black text-gray-800 shrink-0">
                                                -{moneyFormat(tx.amount)}
                                            </span>
                                        </div>

                                        <select
                                            value=""
                                            onChange={(e) => handleAssignCategory(tx.id, e.target.value)}
                                            disabled={updatingId === tx.id}
                                            className="w-full py-1.5 px-2.5 rounded-lg bg-[#e0e0e0] shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] focus:ring-1 focus:ring-amber-500 outline-none text-xs font-bold text-gray-700 cursor-pointer disabled:opacity-50 transition-all"
                                        >
                                            <option value="" disabled>
                                                {updatingId === tx.id ? "Assigning category..." : "⚡ Select category..."}
                                            </option>
                                            {groups.map((group) => (
                                                <optgroup key={group} label={group}>
                                                    {categories
                                                        .filter((c) => c.group === group)
                                                        .map((c) => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.name}
                                                            </option>
                                                        ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recent Activity Live Feed List */}
                    {uncategorizedTransactions.length > 0 && (
                        <div className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2 px-1">
                            Recent Activity
                        </div>
                    )}

                    <div className="flex flex-col gap-3.5 flex-1 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
                        {recentTransactions.length === 0 ? (
                            <div className="text-center text-sm text-gray-400 font-bold py-6">
                                {uncategorizedTransactions.length > 0
                                    ? "All other transactions categorized."
                                    : "No transactions yet."}
                            </div>
                        ) : (
                            recentTransactions.slice(0, 10).map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex justify-between items-center p-4 rounded-[15px] bg-[#e0e0e0] shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff]">
                                            <div
                                                className="w-3 h-3 rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]"
                                                style={{ backgroundColor: tx.category?.color || "#000" }}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-700">
                                                {tx.description || tx.category?.name || "Transaction"}
                                            </span>
                                            <span className="text-xs text-gray-500 font-semibold">
                                                {new Date(tx.date).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span
                                            className={`font-black ${
                                                tx.category?.group === "INCOME" ? "text-green-500" : "text-gray-700"
                                            }`}
                                        >
                                            {tx.category?.group === "INCOME" ? "+" : "-"}
                                            {moneyFormat(tx.amount)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
