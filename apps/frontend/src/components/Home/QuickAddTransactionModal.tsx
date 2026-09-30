"use client";

import React, { useState, useEffect } from "react";
import { useCategories, Category } from "@/src/hooks/useCategories";
import { useWallets, Wallet } from "@/src/hooks/useWallets";
import { useCreateTransaction } from "@/src/hooks/useTransactions";
import { moneyFormat } from "@/src/utils/utils";

interface QuickAddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickAddTransactionModal({
  isOpen,
  onClose,
}: QuickAddTransactionModalProps) {
  const { data: categories = [] } = useCategories();
  const { data: wallets = [] } = useWallets();
  const createMutation = useCreateTransaction();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [selectedToWalletId, setSelectedToWalletId] = useState("");
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>("VARIABLE");

  // Default selection when data loads
  useEffect(() => {
    if (wallets.length > 0 && !selectedWalletId) {
      // Pick highest balance wallet by default
      const sorted = [...wallets].sort((a, b) => b.balance - a.balance);
      setSelectedWalletId(sorted[0].id);
    }
  }, [wallets, selectedWalletId]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      const defaultCat =
        categories.find((c) => c.group === "VARIABLE") || categories[0];
      if (defaultCat) {
        setSelectedCategoryId(defaultCat.id);
        setActiveGroupFilter(defaultCat.group);
      }
    }
  }, [categories, selectedCategoryId]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentCategory = categories.find((c) => c.id === selectedCategoryId);
  const isTransfer = currentCategory?.group === "TRANSFER";
  const filteredCategories = categories.filter(
    (c) => c.group === activeGroupFilter
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (!selectedWalletId || !selectedCategoryId) return;

    createMutation.mutate(
      {
        amount: parsedAmount,
        description: description.trim() || undefined,
        date: date || new Date().toISOString().split("T")[0],
        categoryId: selectedCategoryId,
        walletId: selectedWalletId,
        toWalletId: isTransfer ? selectedToWalletId : undefined,
      },
      {
        onSuccess: () => {
          setAmount("");
          setDescription("");
          onClose();
        },
      }
    );
  };

  const addAmountChip = (extra: number) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(current + extra));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-[28px] bg-[#e0e0e0] shadow-[15px_15px_30px_#bebebe,_-15px_-15px_30px_#ffffff] flex flex-col gap-6 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Modal Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] flex items-center justify-center text-blue-600 font-black text-xl">
              ⚡
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-800 tracking-tight">
                Quick Transaction
              </h2>
              <p className="text-xs font-semibold text-gray-500">
                Record spending or income instantly
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-[#e0e0e0] shadow-[4px_4px_8px_#bebebe,_-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] text-gray-600 font-bold active:scale-95 transition-all flex items-center justify-center text-lg"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Amount Input & Quick Chips */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 ml-1">
              Amount ($)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-400">
                $
              </span>
              <input
                type="number"
                step="any"
                autoFocus
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-4 text-3xl font-black text-gray-800 rounded-2xl bg-[#e0e0e0] shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff] outline-none tracking-tight"
              />
            </div>
            {/* Quick Increment Chips */}
            <div className="flex flex-wrap gap-2 mt-1">
              {[1000, 2000, 5000, 10000, 20000].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => addAmountChip(step)}
                  className="px-3 py-1.5 text-xs font-extrabold rounded-xl bg-[#e0e0e0] shadow-[2px_2px_5px_#bebebe,_-2px_-2px_5px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 text-gray-700 transition-all"
                >
                  +{moneyFormat(step)}
                </button>
              ))}
            </div>
          </div>

          {/* Group Filter Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 ml-1">
              Group Type
            </label>
            <div className="flex flex-wrap gap-2 bg-[#e0e0e0] p-1.5 rounded-2xl shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff]">
              {["VARIABLE", "FIXED", "SAVINGS", "INCOME", "TRANSFER"].map(
                (grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => {
                      setActiveGroupFilter(grp);
                      const firstCat = categories.find((c) => c.group === grp);
                      if (firstCat) setSelectedCategoryId(firstCat.id);
                    }}
                    className={`flex-1 min-w-[70px] py-1.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all ${
                      activeGroupFilter === grp
                        ? "bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] text-blue-600 scale-95"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    {grp}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 ml-1">
              Category
            </label>
            <div className="flex flex-wrap gap-2.5 max-h-[140px] overflow-y-auto p-1 custom-scrollbar">
              {filteredCategories.length === 0 ? (
                <span className="text-xs text-gray-400 font-semibold italic p-2">
                  No categories found in this group.
                </span>
              ) : (
                filteredCategories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                        isSelected
                          ? "bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] scale-95"
                          : "bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:scale-95"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shadow-inner"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span
                        className={
                          isSelected ? "text-blue-600" : "text-gray-700"
                        }
                      >
                        {cat.name}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Wallet Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 ml-1">
              {isTransfer ? "Source Wallet" : "Wallet"}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {wallets.map((wallet) => {
                const isSelected = selectedWalletId === wallet.id;
                return (
                  <button
                    key={wallet.id}
                    type="button"
                    onClick={() => setSelectedWalletId(wallet.id)}
                    className={`p-3 rounded-2xl flex flex-col items-start gap-1 transition-all ${
                      isSelected
                        ? "bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] border border-blue-400/30 scale-95"
                        : "bg-[#e0e0e0] shadow-[4px_4px_8px_#bebebe,_-4px_-4px_8px_#ffffff] hover:scale-95"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: wallet.color }}
                      />
                      <span className="text-xs font-bold text-gray-800 truncate">
                        {wallet.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-black text-gray-500">
                      {moneyFormat(wallet.balance)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destination Wallet (if Transfer) */}
          {isTransfer && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 ml-1">
                Destination Wallet
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {wallets
                  .filter((w) => w.id !== selectedWalletId)
                  .map((wallet) => {
                    const isSelected = selectedToWalletId === wallet.id;
                    return (
                      <button
                        key={wallet.id}
                        type="button"
                        onClick={() => setSelectedToWalletId(wallet.id)}
                        className={`p-3 rounded-2xl flex flex-col items-start gap-1 transition-all ${
                          isSelected
                            ? "bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] border border-green-500/30 scale-95"
                            : "bg-[#e0e0e0] shadow-[4px_4px_8px_#bebebe,_-4px_-4px_8px_#ffffff] hover:scale-95"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: wallet.color }}
                          />
                          <span className="text-xs font-bold text-gray-800 truncate">
                            {wallet.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-black text-gray-500">
                          {moneyFormat(wallet.balance)}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Date & Note in one row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 ml-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] outline-none text-xs font-bold text-gray-700"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 ml-1">
                Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Almuerzo con amigos"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] outline-none text-xs font-semibold text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] hover:shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] text-sm font-extrabold text-gray-600 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !amount}
              className="flex-1 py-3.5 rounded-xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] hover:shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] text-sm font-extrabold text-blue-600 disabled:opacity-50 active:scale-95 transition-all"
            >
              {createMutation.isPending ? "Saving..." : "Record Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
