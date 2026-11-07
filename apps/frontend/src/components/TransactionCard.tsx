"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
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

// ─── Category Combobox ────────────────────────────────────────────────────────

interface CategoryComboboxProps {
  categories: Category[];
  groups: string[];
  onSelect: (categoryId: string) => void;
  disabled?: boolean;
}

function CategoryCombobox({ categories, groups, onSelect, disabled }: CategoryComboboxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter categories by query
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .map((grp) => ({
        grp,
        items: categories.filter(
          (c) => c.group === grp && (q === "" || c.name.toLowerCase().includes(q))
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [categories, groups, query]);

  // Flat list of visible items for keyboard nav
  const flatItems = useMemo(
    () => filteredGroups.flatMap((g) => g.items),
    [filteredGroups]
  );

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlighted(flatItems[0]?.id ?? null);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!highlighted || !dropdownRef.current) return;
    const el = dropdownRef.current.querySelector(`[data-id="${highlighted}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter") setIsOpen(true);
        return;
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const idx = flatItems.findIndex((c) => c.id === highlighted);
        const next =
          e.key === "ArrowDown"
            ? flatItems[(idx + 1) % flatItems.length]
            : flatItems[(idx - 1 + flatItems.length) % flatItems.length];
        setHighlighted(next?.id ?? null);
        return;
      }
      if (e.key === "Enter" && highlighted) {
        onSelect(highlighted);
        setIsOpen(false);
        setQuery("");
      }
    },
    [isOpen, flatItems, highlighted, onSelect]
  );

  const handleSelect = (id: string) => {
    onSelect(id);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div
        className={`flex items-center gap-2 w-full py-1.5 px-2.5 rounded-lg bg-[#e0e0e0] transition-all ${
          isOpen
            ? "shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] ring-1 ring-amber-400/60"
            : "shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff]"
        }`}
      >
        <span className="text-gray-400 text-xs shrink-0">⚡</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          placeholder={disabled ? "Assigning category..." : "Search category..."}
          className="flex-1 bg-transparent outline-none text-xs font-bold text-gray-700 placeholder-gray-400 disabled:opacity-50 min-w-0"
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            setIsOpen((v) => !v);
            if (!isOpen) inputRef.current?.focus();
          }}
          className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          aria-label="Toggle category list"
        >
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="2,4 6,8 10,4" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl bg-[#e0e0e0] shadow-[6px_6px_14px_#bebebe,_-6px_-6px_14px_#ffffff] border border-gray-200/60 max-h-56 overflow-y-auto custom-scrollbar"
        >
          {filteredGroups.length === 0 ? (
            <div className="px-3 py-3 text-xs font-bold text-gray-400 text-center">
              No categories found
            </div>
          ) : (
            filteredGroups.map(({ grp, items }) => (
              <div key={grp}>
                {/* Group label */}
                <div className="px-3 pt-2.5 pb-1 text-[10px] font-black uppercase tracking-widest text-gray-400 select-none">
                  {grp}
                </div>
                {items.map((c) => (
                  <button
                    key={c.id}
                    data-id={c.id}
                    type="button"
                    onMouseDown={(e) => {
                      // prevent input blur before click fires
                      e.preventDefault();
                      handleSelect(c.id);
                    }}
                    onMouseEnter={() => setHighlighted(c.id)}
                    className={`w-full text-left px-3 py-1.5 text-xs font-bold flex items-center gap-2 transition-all rounded-lg mx-auto ${
                      highlighted === c.id
                        ? "bg-[#d8d8d8] shadow-[inset_1px_1px_3px_#bebebe]"
                        : "hover:bg-[#e8e8e8]"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: c.color ?? "#9ca3af" }}
                    />
                    <span style={{ color: c.color ?? "#374151" }}>{c.name}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── TransactionCard ──────────────────────────────────────────────────────────

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

      {/* Search+Dropdown Combobox when Uncategorized */}
      {isUncategorized && onAssignCategory && categories && categories.length > 0 && (
        <div className="mt-1 pt-2 border-t border-gray-300/60">
          <CategoryCombobox
            categories={categories}
            groups={groups}
            onSelect={(categoryId) => onAssignCategory(transaction.id, categoryId)}
            disabled={isUpdatingCategory}
          />
        </div>
      )}
    </div>
  );
}
