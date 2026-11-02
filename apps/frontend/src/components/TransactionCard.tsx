"use client";

import { useMemo } from "react";
import { moneyFormat } from "@/src/utils/utils";
import { Transaction } from "@/src/services/transactionService";
import { Category } from "@/src/hooks/useCategories";
import { useDeleteTransaction } from "@/src/hooks/useTransactions";

const CATEGORY_GROUP_ORDER = ['VARIABLE', 'FIXED', 'TRANSFER', 'SAVINGS', 'INCOME'];

export interface TransactionCardProps {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  categories?: Category[];
  onAssignCategory?: (transactionId: string, categoryId: string) => void;
  isUpdatingCategory?: boolean;
  variant?: "raised" | "inset";
  className?: string;
}

export default function TransactionCard({
  transaction,
  onEdit,
  onDelete,
  categories,
  onAssignCategory,
  isUpdatingCategory = false,
  variant = "raised",
  className = "",
}: TransactionCardProps) {
  const deleteMutation = useDeleteTransaction();

  const group = transaction.category?.group;
  const isExpense = group === "FIXED" || group === "VARIABLE" || group === "SAVINGS" || (!transaction.category && !transaction.toWalletId);
  const isIncome = group === "INCOME";
  const isTransfer = group === "TRANSFER" || Boolean(transaction.toWalletId);
  const isUncategorized = !transaction.categoryId || !transaction.category;

  const dateStr = useMemo(() => {
    if (!transaction.date) return "";
    const d = new Date(transaction.date);
    if (isNaN(d.getTime())) return transaction.date;
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [transaction.date]);

  const groups = useMemo(() => {
    if (!categories) return [];
    return Array.from(new Set(categories.map((c) => c.group))).sort((a, b) => {
      const idxA = CATEGORY_GROUP_ORDER.indexOf(a);
      const idxB = CATEGORY_GROUP_ORDER.indexOf(b);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });
  }, [categories]);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(transaction.id);
    } else {
      deleteMutation.mutate(transaction.id);
    }
  };

  const shadowClass =
    variant === "inset"
      ? "shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff]"
      : "shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff]";

  return (
    <div
      className={`p-4 rounded-2xl bg-[#e0e0e0] ${shadowClass} transition-all group flex flex-col gap-2.5 ${
        isUncategorized ? "border border-amber-400/50" : ""
      } ${className}`}
    >
      <div className="flex justify-between items-start gap-3">
        {/* Left side: Description & Date */}
        <div className="flex-1 min-w-0">
          <div
            className="font-bold text-gray-800 text-sm truncate"
            title={transaction.description || transaction.category?.name || "Transaction"}
          >
            {transaction.description || transaction.category?.name || "Transaction"}
          </div>
          <div className="text-xs text-gray-500 font-semibold mt-0.5">{dateStr}</div>
        </div>

        {/* Right side: Amount & Action buttons */}
        <div className="flex flex-col items-end shrink-0">
          <div
            className={`font-black text-sm ${
              isExpense ? "text-red-500" : isIncome ? "text-green-500" : "text-gray-700"
            }`}
          >
            {isExpense ? "-" : isIncome ? "+" : ""}{moneyFormat(transaction.amount)}
          </div>

          {(onEdit || onDelete || (!onDelete && onEdit !== undefined)) && (
            <div className="flex items-center gap-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  onClick={() => onEdit(transaction)}
                  className="px-2 py-0.5 text-[10px] text-blue-600 font-bold rounded-full bg-[#e0e0e0] shadow-[2px_2px_4px_#bebebe,_-2px_-2px_4px_#ffffff] hover:shadow-[inset_1px_1px_2px_#bebebe,_inset_-1px_-1px_2px_#ffffff] active:scale-95 transition-all"
                >
                  Edit
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-2 py-0.5 text-[10px] text-red-500 font-bold rounded-full bg-[#e0e0e0] shadow-[2px_2px_4px_#bebebe,_-2px_-2px_4px_#ffffff] hover:shadow-[inset_1px_1px_2px_#bebebe,_inset_-1px_-1px_2px_#ffffff] active:scale-95 transition-all disabled:opacity-50"
              >
                {deleteMutation.isPending ? "..." : "Delete"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Badges Row */}
      <div className="flex gap-2 items-center flex-wrap pt-0.5">
        {/* Origin Badge */}
        <div
          className={`px-2.5 py-1 text-[11px] font-black rounded-lg flex items-center gap-1.5 cursor-default transition-all ${
            transaction.isAutomatic
              ? "bg-indigo-500/15 text-indigo-700 border border-indigo-500/30 shadow-[inset_1px_1px_2px_rgba(99,102,241,0.2)]"
              : "bg-gray-500/15 text-gray-700 border border-gray-400/30 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]"
          }`}
          title={transaction.isAutomatic ? "Automatically ingested from email/sync" : "Manually entered"}
        >
          {transaction.isAutomatic ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>⚡ Auto</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              <span>✍️ Manual</span>
            </>
          )}
        </div>

        {/* Source Wallet Badge */}
        {transaction.wallet && (
          <div className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-[#e0e0e0] shadow-[2px_2px_4px_#bebebe,_-2px_-2px_4px_#ffffff] transition-shadow duration-300 hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] cursor-default">
            <span
              className="uppercase tracking-wider"
              style={{ color: transaction.wallet.color }}
            >
              {transaction.wallet.name}
            </span>
          </div>
        )}

        {/* Transfer Destination Wallet Badge */}
        {isTransfer && transaction.toWallet && (
          <>
            <span className="text-gray-400 text-xs">➡️</span>
            <div className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-[#e0e0e0] shadow-[2px_2px_4px_#bebebe,_-2px_-2px_4px_#ffffff] transition-shadow duration-300 hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] cursor-default">
              <span
                className="uppercase tracking-wider"
                style={{ color: transaction.toWallet.color }}
              >
                {transaction.toWallet.name}
              </span>
            </div>
          </>
        )}

        {/* Category Badge if Categorized */}
        {!isTransfer && transaction.category && (
          <div className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-[#e0e0e0] shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] cursor-default">
            <span style={{ color: transaction.category.color }}>
              {transaction.category.name}
            </span>
          </div>
        )}

        {/* Uncategorized Warning Indicator if no dropdown */}
        {isUncategorized && !onAssignCategory && (
          <div className="px-2.5 py-0.5 text-[10px] font-black rounded-md bg-amber-500/20 text-amber-700 border border-amber-500/30">
            Pending Category
          </div>
        )}
      </div>

      {/* Accessible Inline Category Dropdown when Uncategorized */}
      {isUncategorized && onAssignCategory && categories && categories.length > 0 && (
        <div className="mt-1 pt-2 border-t border-gray-300/60">
          <select
            value=""
            onChange={(e) => onAssignCategory(transaction.id, e.target.value)}
            disabled={isUpdatingCategory}
            className="w-full py-1.5 px-2.5 rounded-lg bg-[#e0e0e0] shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] focus:ring-1 focus:ring-amber-500 outline-none text-xs font-bold text-gray-700 cursor-pointer disabled:opacity-50 transition-all"
          >
            <option value="" disabled>
              {isUpdatingCategory ? "Assigning category..." : "⚡ Select category..."}
            </option>
            {groups.map((grp) => (
              <optgroup key={grp} label={grp}>
                {categories
                  .filter((c) => c.group === grp)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
