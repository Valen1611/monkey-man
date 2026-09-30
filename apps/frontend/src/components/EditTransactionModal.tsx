"use client";

import React, { useState, useEffect } from "react";
import { useCategories } from "@/src/hooks/useCategories";
import { useWallets } from "@/src/hooks/useWallets";
import { useUpdateTransaction } from "@/src/hooks/useTransactions";
import { Transaction } from "@/src/services/transactionService";

interface EditTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditTransactionModal({
  transaction,
  isOpen,
  onClose,
}: EditTransactionModalProps) {
  const { data: categories = [] } = useCategories();
  const { data: wallets = [] } = useWallets();
  const updateMutation = useUpdateTransaction();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [walletId, setWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");

  useEffect(() => {
    if (transaction) {
      setAmount(String(transaction.amount));
      setDescription(transaction.description || "");
      setDate(transaction.date ? transaction.date.slice(0, 10) : "");
      setCategoryId(transaction.categoryId || "");
      setWalletId(transaction.walletId || "");
      setToWalletId(transaction.toWalletId || "");
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isTransfer = selectedCategory?.group === "TRANSFER";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    updateMutation.mutate(
      {
        id: transaction.id,
        updates: {
          amount: parsedAmount,
          description: description.trim() || undefined,
          date: date || undefined,
          categoryId: categoryId || undefined,
          walletId: walletId || undefined,
          toWalletId: isTransfer ? toWalletId || undefined : null as any,
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-[28px] bg-[#e0e0e0] shadow-[15px_15px_30px_#bebebe,_-15px_-15px_30px_#ffffff] flex flex-col gap-6 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Modal Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-gray-800 tracking-tight">
              Edit Transaction
            </h2>
            <p className="text-xs font-semibold text-gray-500">
              Update amount, category or details
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-[#e0e0e0] shadow-[4px_4px_8px_#bebebe,_-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] text-gray-600 font-bold active:scale-95 transition-all flex items-center justify-center text-lg"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Amount */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 ml-1">
              Amount ($)
            </label>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full p-3.5 text-xl font-black text-gray-800 rounded-xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] outline-none"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 ml-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="w-full p-3 rounded-xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] outline-none text-sm font-semibold text-gray-700"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 ml-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] outline-none text-sm font-bold text-gray-700"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.group})
                </option>
              ))}
            </select>
          </div>

          {/* Wallet */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 ml-1">
              {isTransfer ? "Source Wallet" : "Wallet"}
            </label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] outline-none text-sm font-bold text-gray-700"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Wallet (if Transfer) */}
          {isTransfer && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 ml-1">
                Destination Wallet
              </label>
              <select
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] outline-none text-sm font-bold text-gray-700"
              >
                <option value="">Select destination...</option>
                {wallets
                  .filter((w) => w.id !== walletId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 ml-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] outline-none text-sm font-bold text-gray-700"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] hover:shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] text-sm font-extrabold text-gray-600 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending || !amount}
              className="flex-1 py-3.5 rounded-xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] hover:shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] text-sm font-extrabold text-blue-600 disabled:opacity-50 active:scale-95 transition-all"
            >
              {updateMutation.isPending ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
