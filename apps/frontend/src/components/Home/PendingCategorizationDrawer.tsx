"use client";

import { useState, useEffect } from "react";
import { useTransactions, useUpdateTransaction } from "@/src/hooks/useTransactions";
import { useCategories } from "@/src/hooks/useCategories";
import TransactionCard from "@/src/components/TransactionCard";

interface PendingCategorizationDrawerProps {
    headerHeight?: number;
}

export default function PendingCategorizationDrawer({ headerHeight = 84 }: PendingCategorizationDrawerProps) {
    const { data: transactions = [] } = useTransactions();
    const { data: categories = [] } = useCategories();
    const updateMutation = useUpdateTransaction();
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const uncategorizedTransactions = transactions.filter(
        (tx) => !tx.categoryId || !tx.category
    );

    // Detect mouse movement near right edge to trigger open
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const triggerZone = 50; // pixels from right edge
            const isInTriggerZone = window.innerWidth - e.clientX < triggerZone;
            
            if (isInTriggerZone && uncategorizedTransactions.length > 0 && !isOpen) {
                setIsOpen(true);
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [uncategorizedTransactions.length, isOpen]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

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

    if (uncategorizedTransactions.length === 0) return null;

    return (
        <div
            className="fixed inset-x-0 bottom-0 z-20 pointer-events-none transition-all duration-300 ease-in-out"
            style={{ top: `${headerHeight}px` }}
        >
            {/* Sliding Sidebar Panel - No backdrop */}
            <aside
                className={`absolute right-0 top-0 bottom-0 w-full max-w-sm sm:max-w-md bg-[#e0e0e0] shadow-[-12px_0_30px_rgba(0,0,0,0.25)] border-l-2 border-gray-300/80 flex flex-col transform transition-transform duration-300 ease-out overflow-y-auto custom-scrollbar ${
                    isOpen ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"
                }`}
            >
                {/* Header */}
                <div className="flex justify-between items-start pt-8 px-6 pb-4 border-b-2 border-gray-300 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] flex items-center justify-center text-xl">
                            📋
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-800 tracking-tight">
                                Pending categorizations
                            </h3>
                            <p className="text-xs font-semibold text-gray-600 mt-0.5">
                                {uncategorizedTransactions.length} {uncategorizedTransactions.length === 1 ? 'transaction' : 'transactions'} to review
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsOpen(false)}
                        className="w-10 h-10 rounded-xl bg-[#e0e0e0] shadow-[4px_4px_8px_#bebebe,_-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] text-gray-600 font-bold active:scale-95 transition-all flex items-center justify-center text-lg"
                        title="Close (Esc)"
                    >
                        ✕
                    </button>
                </div>

                {/* Transaction List - Scrollable */}
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto p-6 custom-scrollbar">
                    {uncategorizedTransactions.map((tx) => (
                        <TransactionCard
                            key={tx.id}
                            transaction={tx}
                            categories={categories}
                            onAssignCategory={handleAssignCategory}
                            isUpdatingCategory={updatingId === tx.id}
                            variant="raised"
                        />
                    ))}
                </div>

                {/* Footer hint */}
                <div className="p-6 pt-4 border-t border-gray-300/60 shrink-0">
                    <p className="text-xs text-gray-500 font-semibold text-center">
                        Move mouse to right edge to open • Press <kbd className="px-1.5 py-0.5 bg-gray-300/60 rounded font-mono">Esc</kbd> to close
                    </p>
                </div>
            </aside>

            {/* Hover trigger indicator - shows when drawer is closed */}
            {!isOpen && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-12 h-24 bg-gradient-to-l from-red-500/20 to-transparent rounded-l-full flex items-center justify-start pl-2 animate-pulse">
                        <div className="w-6 h-6 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center shadow-lg">
                            {uncategorizedTransactions.length}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
