"use client"

import { useState, useRef, useEffect } from "react";
import { Category } from "@/src/hooks/useCategories";
import { Budget } from "@/src/services/budgetService";
import { useUpdateBudget, useRemoveBudget } from "@/src/hooks/useBudgets";
import { moneyFormat } from "@/src/utils/utils";

interface BudgetTileProps {
    category: Category;
    budget?: Budget;
    yearMonth: string;
}

export default function BudgetTile({ category, budget, yearMonth }: BudgetTileProps) {
    const updateMutation = useUpdateBudget();
    const removeMutation = useRemoveBudget();
    const [isEditing, setIsEditing] = useState(false);
    const [editLimit, setEditLimit] = useState(budget?.limit?.toString() || "");
    const inputRef = useRef<HTMLInputElement>(null);

    const limit = budget?.limit || 0;
    const usage = budget?.usage || 0;
    const isOverBudget = limit > 0 && usage > limit;
    const isVirtual = !budget || budget.id.startsWith("virtual-");

    const percentage =
        limit > 0 ? Math.min((usage / limit) * 100, 100) : usage > 0 ? 100 : 0;

    const remaining = limit - usage;

    useEffect(() => {
        if (isEditing) inputRef.current?.focus();
    }, [isEditing]);

    const openEdit = () => {
        setEditLimit(limit > 0 ? limit.toString() : "");
        setIsEditing(true);
    };

    const handleSave = () => {
        const numLimit = parseFloat(editLimit);
        if (!isNaN(numLimit) && numLimit >= 0) {
            updateMutation.mutate(
                { yearMonth, categoryId: category.id, limit: numLimit },
                { onSuccess: () => setIsEditing(false) }
            );
        } else {
            setIsEditing(false);
        }
    };

    const handleRemove = () => {
        if (!budget) return;
        removeMutation.mutate({ id: budget.id, yearMonth, categoryId: category.id });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") setIsEditing(false);
    };

    return (
        <div className="flex items-center gap-3 py-2 px-1 group/tile">
            {/* Color dot */}
            <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: category.color }}
            />

            {/* Name */}
            <span className="text-xs font-bold text-gray-700 w-28 shrink-0 truncate" title={category.name}>
                {category.name}
            </span>

            {/* Progress bar */}
            <div className="flex-1 h-2 bg-[#d2d2d2] rounded-full overflow-hidden shadow-[inset_1px_1px_2px_#c0c0c0,_inset_-1px_-1px_2px_#f8f8f8]">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: isOverBudget ? "#ef4444" : category.color,
                    }}
                />
            </div>

            {/* Usage / limit */}
            <div className="shrink-0 flex items-center gap-1.5">
                {isEditing ? (
                    <>
                        <input
                            ref={inputRef}
                            type="number"
                            value={editLimit}
                            onChange={(e) => setEditLimit(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSave}
                            className="w-20 py-0.5 px-2 text-xs rounded-lg bg-[#e0e0e0] shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] outline-none text-gray-700 font-bold ring-1 ring-amber-400/60"
                            placeholder="Limit"
                        />
                        <button
                            onMouseDown={(e) => { e.preventDefault(); handleSave(); }}
                            disabled={updateMutation.isPending}
                            className="text-[10px] font-black text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                        >
                            {updateMutation.isPending ? "…" : "✓"}
                        </button>
                    </>
                ) : (
                    <button
                        onClick={openEdit}
                        className="text-right group/amounts"
                        title="Click to set limit"
                    >
                        <span className={`text-xs font-black ${isOverBudget ? "text-red-500" : "text-gray-700"}`}>
                            {moneyFormat(usage)}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400 mx-0.5">/</span>
                        {limit > 0 ? (
                            <span className={`text-[10px] font-semibold ${isOverBudget ? "text-red-400" : remaining < limit * 0.1 ? "text-amber-500" : "text-gray-500"}`}>
                                {moneyFormat(limit)}
                            </span>
                        ) : (
                            <span className="text-[10px] font-semibold text-amber-500 group-hover/amounts:underline">
                                set limit
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* Remove button — only for real (non-virtual) rows */}
            {!isVirtual && !isEditing && (
                <button
                    onClick={handleRemove}
                    disabled={removeMutation.isPending}
                    title="Remove from this month"
                    className="opacity-0 group-hover/tile:opacity-100 transition-opacity shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-500/10 disabled:opacity-30"
                >
                    {removeMutation.isPending ? (
                        <span className="text-[9px]">…</span>
                    ) : (
                        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="2" y1="2" x2="10" y2="10" />
                            <line x1="10" y1="2" x2="2" y2="10" />
                        </svg>
                    )}
                </button>
            )}

            {/* Spacer to keep layout stable when remove button is hidden */}
            {(isVirtual || isEditing) && <div className="w-5 shrink-0" />}
        </div>
    );
}
