"use client";

import { useState } from "react";
import { Category } from "@/src/hooks/useCategories";
import { Budget } from "@/src/services/budgetService";
import BudgetTile from "@/src/components/BudgetTile";
import { moneyFormat } from "@/src/utils/utils";

interface BudgetGroupCardProps {
    groupName: string;
    groupLabel: string;
    groupEmoji: string;
    groupColor: string;
    categories: Category[];
    budgets: Budget[];
    yearMonth: string;
    totalLimit: number;
    totalUsage: number;
    availableIncome?: number;
    onAddCategory: () => void;
    onOpenInteractive: () => void;
}

export default function BudgetGroupCard({
    groupName,
    groupLabel,
    groupEmoji,
    groupColor,
    categories,
    budgets,
    yearMonth,
    totalLimit,
    totalUsage,
    availableIncome,
    onAddCategory,
    onOpenInteractive,
}: BudgetGroupCardProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const percentage = totalLimit > 0 ? Math.min((totalUsage / totalLimit) * 100, 100) : 0;
    const isOver = totalLimit > 0 && totalUsage > totalLimit;

    // How much of the available income is already allocated to this group's limits
    const allocated = totalLimit;
    const unallocated = availableIncome !== undefined ? availableIncome - allocated : undefined;
    const isOverAllocated = unallocated !== undefined && unallocated < 0;

    return (
        <div className="rounded-[20px] bg-[#e0e0e0] shadow-[8px_8px_16px_#bebebe,_-8px_-8px_16px_#ffffff] overflow-hidden">
            {/* Group Header - Clickable to expand/collapse */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-5 cursor-pointer hover:bg-[#d8d8d8] transition-colors flex items-center justify-between"
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Expand/Collapse Icon */}
                    <span className={`text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                        ▶
                    </span>

                    {/* Group Info */}
                    <span className="text-2xl">{groupEmoji}</span>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-black text-gray-800 uppercase tracking-wider">
                            {groupLabel}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-sm font-bold ${isOver ? 'text-red-600' : 'text-gray-700'}`}>
                                {moneyFormat(totalUsage)}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">
                                / {moneyFormat(totalLimit)}
                            </span>
                            {percentage > 0 && (
                                <span className={`text-xs font-bold ${isOver ? 'text-red-500' : 'text-gray-500'}`}>
                                    ({Math.round(percentage)}%)
                                </span>
                            )}
                        </div>
                        {availableIncome !== undefined && (
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">available</span>
                                <span className={`text-[11px] font-black ${isOverAllocated ? 'text-red-500' : 'text-gray-500'}`}>
                                    {moneyFormat(availableIncome)}
                                </span>
                                {unallocated !== undefined && (
                                    <span className={`text-[10px] font-semibold ${isOverAllocated ? 'text-red-400' : 'text-green-600'}`}>
                                        ({isOverAllocated ? '-' : ''}{moneyFormat(Math.abs(unallocated))} {isOverAllocated ? 'over' : 'free'})
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Interactive Slider Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenInteractive();
                        }}
                        className="w-9 h-9 rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 transition-all flex items-center justify-center text-purple-600 font-black text-lg"
                        title={`Interactive budget for ${groupLabel}`}
                    >
                        🎚️
                    </button>

                    {/* Add Category Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddCategory();
                        }}
                        className="w-9 h-9 rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 transition-all flex items-center justify-center text-blue-600 font-black text-lg"
                        title={`Add category to ${groupLabel}`}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Group Progress Bar */}
            <div className="px-5 pb-3">
                <div className="h-2.5 w-full bg-[#d2d2d2] rounded-full overflow-hidden shadow-[inset_1px_1px_3px_#bebebe,_inset_-1px_-1px_3px_#ffffff]">
                    <div
                        className="h-full transition-all duration-500 rounded-full"
                        style={{
                            width: `${percentage}%`,
                            backgroundColor: isOver ? '#ef4444' : groupColor,
                        }}
                    />
                </div>
            </div>

            {/* Expanded Content - Categories List */}
            {isExpanded && (
                <div className="px-5 pb-5">
                    <div className="p-3 rounded-[16px] bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#c2c2c2,_inset_-3px_-3px_6px_#ffffff] flex flex-col divide-y divide-gray-300/50">
                        {categories.length === 0 ? (
                            <div className="text-center py-6 text-sm text-gray-400 font-semibold">
                                No categories in this group yet.
                                <br />
                                <button
                                    onClick={onAddCategory}
                                    className="mt-2 text-blue-600 hover:underline font-bold"
                                >
                                    Add your first category
                                </button>
                            </div>
                        ) : (
                            categories.map((category) => {
                                const budget = budgets.find((b) => b.categoryId === category.id);
                                return (
                                    <BudgetTile
                                        key={category.id}
                                        category={category}
                                        budget={budget}
                                        yearMonth={yearMonth}
                                    />
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
