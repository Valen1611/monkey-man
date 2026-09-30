"use client"

import { useState } from "react";
import { Category } from "@/src/hooks/useCategories";
import { Budget } from "@/src/services/budgetService";
import { useUpdateBudget } from "@/src/hooks/useBudgets";
import { moneyFormat } from "@/src/utils/utils";

interface BudgetTileProps {
    category: Category;
    budget?: Budget;
    yearMonth: string;
}

export default function BudgetTile({ category, budget, yearMonth }: BudgetTileProps) {
    const updateMutation = useUpdateBudget();
    const [isEditing, setIsEditing] = useState(false);
    const [editLimit, setEditLimit] = useState(budget?.limit?.toString() || "");

    const limit = budget?.limit || 0;
    const usage = budget?.usage || 0;
    const isOverBudget = limit > 0 && usage > limit;
    
    // Calculate percentage for the progress bar
    let percentage = 0;
    if (limit > 0) {
        percentage = Math.min((usage / limit) * 100, 100);
    } else if (usage > 0) {
        percentage = 100; // No limit set but there is usage, so it's technically over
    }

    const handleSave = () => {
        const numLimit = parseFloat(editLimit);
        if (!isNaN(numLimit)) {
            updateMutation.mutate({ yearMonth, categoryId: category.id, limit: numLimit }, {
                onSuccess: () => setIsEditing(false)
            });
        }
    };

    return (
        <div className="mb-4 last:mb-0 rounded-2xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] p-5">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                    <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                    />
                    <h3 className="font-bold text-gray-700 text-lg">{category.name}</h3>
                </div>
                <div className="text-right">
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-bold">$</span>
                            <input 
                                type="number" 
                                value={editLimit}
                                onChange={(e) => setEditLimit(e.target.value)}
                                className="w-24 p-2 text-sm rounded-lg bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] outline-none text-gray-700 font-bold"
                                autoFocus
                            />
                            <button 
                                onClick={handleSave}
                                disabled={updateMutation.isPending}
                                className="px-3 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:scale-95 transition-transform"
                            >
                                Save
                            </button>
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="px-3 py-2 bg-gray-400 text-white text-xs font-bold rounded-lg shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:scale-95 transition-transform"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <div 
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => {
                                setEditLimit(limit.toString());
                                setIsEditing(true);
                            }}
                        >
                            <div className="flex flex-col items-end">
                                <span className={`font-bold ${isOverBudget ? 'text-red-500' : 'text-gray-700'}`}>
                                    {moneyFormat(usage)} <span className="text-gray-400 text-sm font-normal">/ {moneyFormat(limit)}</span>
                                </span>
                                {limit === 0 && <span className="text-xs text-orange-400">No limit set</span>}
                            </div>
                            <span className="opacity-0 group-hover:opacity-100 text-blue-500 text-sm transition-opacity">✏️</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar Container */}
            <div className="h-3 w-full bg-[#d1d1d1] rounded-full overflow-hidden shadow-[inset_2px_2px_5px_#bebebe,_inset_-2px_-2px_5px_#ffffff]">
                <div 
                    className={`h-full transition-all duration-500 ease-out ${isOverBudget ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${percentage}%`, backgroundColor: isOverBudget ? '#ef4444' : category.color }}
                />
            </div>
            
            {isOverBudget && (
                <div className="mt-2 text-xs text-red-500 font-semibold text-right">
                    Over budget by {moneyFormat(usage - limit)}!
                </div>
            )}
            {!isOverBudget && limit > 0 && (
                <div className="mt-2 text-xs text-gray-500 font-medium text-right">
                    {moneyFormat(limit - usage)} remaining
                </div>
            )}
        </div>
    );
}
