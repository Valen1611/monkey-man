"use client";

import { useState, useEffect, useMemo } from "react";
import TransactionTile from "@/src/components/TransactionTile";
import EditTransactionModal from "@/src/components/EditTransactionModal";
import QuickAddTransactionModal from "@/src/components/Home/QuickAddTransactionModal";
import { useTransactions } from "@/src/hooks/useTransactions";
import { useWallets } from "@/src/hooks/useWallets";
import { Transaction } from "@/src/services/transactionService";
import { moneyFormat } from "@/src/utils/utils";

export default function LogPage() {
  const { data: transactions = [], isLoading, isError } = useTransactions();
  const { data: wallets = [] } = useWallets();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [filterWalletId, setFilterWalletId] = useState<string>("ALL");

  // Modals state
  const [isAdding, setIsAdding] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Collapsed dates state
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  const toggleDate = (dateStr: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  // Global hotkey: 'N' or '+' opens Quick Add when not in form input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return;
      }
      if (e.key === "n" || e.key === "N" || e.key === "+") {
        e.preventDefault();
        setIsAdding(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const descMatch = tx.description?.toLowerCase().includes(q);
      const catMatch = tx.category?.name.toLowerCase().includes(q);
      const walletMatch = tx.wallet?.name.toLowerCase().includes(q);
      if (!descMatch && !catMatch && !walletMatch) return false;
    }

    if (selectedGroup !== "ALL") {
      if (tx.category?.group !== selectedGroup) return false;
    }

    if (filterWalletId !== "ALL") {
      if (tx.walletId !== filterWalletId && tx.toWalletId !== filterWalletId) return false;
    }

    return true;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const groupedTransactions = useMemo(() => {
    return sortedTransactions.reduce((acc, tx) => {
      const dateObj = new Date(tx.date);
      const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(tx);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [sortedTransactions]);

  const filteredTotal = filteredTransactions.reduce((acc, tx) => {
    const isIncome = tx.category?.group === "INCOME";
    const isExpense = tx.category?.group && ["FIXED", "VARIABLE", "SAVINGS"].includes(tx.category.group);
    if (isIncome) return acc + tx.amount;
    if (isExpense) return acc - tx.amount;
    return acc;
  }, 0);

  return (
    <div className="flex-1 p-4 mt-8 w-full max-w-2xl mx-auto flex flex-col gap-6">
      {/* Top Search & Filter Card */}
      <div className="p-6 rounded-[24px] bg-[#e0e0e0] shadow-[10px_10px_20px_#bebebe,_-10px_-10px_20px_#ffffff] flex flex-col gap-4">
        {/* Search bar + Add button */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by note, category or wallet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] border-none outline-none text-sm font-semibold text-gray-700 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 h-12 shrink-0 flex items-center gap-2 rounded-2xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] hover:shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] text-blue-600 font-black text-sm active:scale-95 transition-all outline-none"
            title="Add transaction (Hotkey: N)"
          >
            <span className="text-xl leading-none">+</span>
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Group Filter Pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 px-1">
            Group:
          </span>
          {["ALL", "VARIABLE", "FIXED", "SAVINGS", "INCOME", "TRANSFER"].map((grp) => (
            <button
              key={grp}
              onClick={() => setSelectedGroup(grp)}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                selectedGroup === grp
                  ? "bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] text-blue-600 scale-95"
                  : "bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] text-gray-600 hover:text-gray-800"
              }`}
            >
              {grp}
            </button>
          ))}
        </div>

        {/* Wallet Filter Row */}
        {wallets.length > 1 && (
          <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-gray-300/40">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 px-1">
              Wallet:
            </span>
            <button
              onClick={() => setFilterWalletId("ALL")}
              className={`px-3 py-1 text-xs font-extrabold rounded-xl transition-all ${
                filterWalletId === "ALL"
                  ? "bg-[#e0e0e0] shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] text-blue-600 scale-95"
                  : "bg-[#e0e0e0] shadow-[2px_2px_4px_#bebebe,_-2px_-2px_4px_#ffffff] text-gray-600 hover:text-gray-800"
              }`}
            >
              All
            </button>
            {wallets.map((w) => (
              <button
                key={w.id}
                onClick={() => setFilterWalletId(w.id)}
                className={`px-3 py-1 text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all ${
                  filterWalletId === w.id
                    ? "bg-[#e0e0e0] shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] text-blue-600 scale-95"
                    : "bg-[#e0e0e0] shadow-[2px_2px_4px_#bebebe,_-2px_-2px_4px_#ffffff] text-gray-600 hover:text-gray-800"
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: w.color }} />
                <span>{w.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex justify-between items-center px-3">
        <span className="text-xs font-black uppercase tracking-wider text-gray-500">
          {filteredTransactions.length} {filteredTransactions.length === 1 ? "Transaction" : "Transactions"} Found
        </span>
        {filteredTransactions.length > 0 && (
          <span className="text-xs font-bold text-gray-600">
            Net:{" "}
            <span
              className={`font-black ${
                filteredTotal >= 0 ? "text-green-600" : "text-gray-800"
              }`}
            >
              {moneyFormat(filteredTotal)}
            </span>
          </span>
        )}
      </div>

      {/* Transaction List Container */}
      <div className="p-6 rounded-[24px] bg-[#e0e0e0] shadow-[inset_10px_10px_20px_#bebebe,_inset_-10px_-10px_20px_#ffffff]">
        {isLoading ? (
          <div className="text-center text-gray-500 py-10 font-bold">Loading transactions...</div>
        ) : isError ? (
          <div className="text-center text-red-500 py-10 font-bold">Error loading transactions</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center text-gray-500 py-12 flex flex-col gap-2 items-center">
            <span className="text-3xl">📭</span>
            <span className="text-sm font-bold">No transactions match your search or filters.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {Object.entries(groupedTransactions).map(([dateStr, txs]) => (
              <div key={dateStr} className="flex flex-col gap-2">
                <button
                  onClick={() => toggleDate(dateStr)}
                  className="flex justify-between items-center px-2 py-1 text-gray-500 font-bold text-xs uppercase tracking-wider hover:text-gray-700 transition-colors cursor-pointer border-b border-gray-300/40 pb-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-4 flex justify-center text-[10px]">
                      {collapsedDates.has(dateStr) ? '▶' : '▼'}
                    </span>
                    <span>{dateStr}</span>
                  </div>
                  <span>{txs.length} {txs.length === 1 ? 'tx' : 'txs'}</span>
                </button>
                
                {!collapsedDates.has(dateStr) && (
                  <div className="flex flex-col">
                    {txs.map((tx) => (
                      <TransactionTile
                        key={tx.id}
                        transaction={tx}
                        onEdit={(targetTx) => setEditingTransaction(targetTx)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Add Modal (same slick experience as Home) */}
      <QuickAddTransactionModal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
      />

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        transaction={editingTransaction}
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
      />
    </div>
  );
}