"use client";

import { useTransactions } from "@/src/hooks/useTransactions";
import TransactionCard from "@/src/components/TransactionCard";

export default function LiveTransactionFeed({ onAddTransaction }: { onAddTransaction?: () => void }) {
    const { data: transactions = [], isLoading } = useTransactions({
        refetchInterval: 3000 // Poll every 3 seconds
    });

    const recentTransactions = transactions.slice(0, 10);

    return (
        <div className="w-full p-6 rounded-[20px] bg-[#e0e0e0] shadow-[10px_10px_20px_#bebebe,_-10px_-10px_20px_#ffffff] flex flex-col h-full min-h-[420px]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    Live Feed
                </h3>
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
                <div className="flex flex-col gap-3.5 flex-1 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
                    {recentTransactions.length === 0 ? (
                        <div className="text-center text-sm text-gray-400 font-bold py-6">
                            No transactions yet.
                        </div>
                    ) : (
                        recentTransactions.map((tx) => (
                            <TransactionCard
                                key={tx.id}
                                transaction={tx}
                                variant="inset"
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
