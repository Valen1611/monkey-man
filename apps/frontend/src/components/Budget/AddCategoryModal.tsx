"use client";

import { useState } from "react";
import { useCreateCategory } from "@/src/hooks/useCategories";

interface AddCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupName: string;
    groupLabel: string;
}

const PRESET_COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", 
    "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
    "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
    "#ec4899", "#f43f5e"
];

export default function AddCategoryModal({ isOpen, onClose, groupName, groupLabel }: AddCategoryModalProps) {
    const createMutation = useCreateCategory();
    const [categoryName, setCategoryName] = useState("");
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryName.trim()) return;

        createMutation.mutate(
            { name: categoryName.trim(), color: selectedColor, group: groupName },
            {
                onSuccess: () => {
                    setCategoryName("");
                    setSelectedColor(PRESET_COLORS[0]);
                    onClose();
                }
            }
        );
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div 
                    className="w-full max-w-md bg-[#e0e0e0] rounded-[24px] shadow-[10px_10px_30px_#bebebe,_-10px_-10px_30px_#ffffff] p-6 pointer-events-auto animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <h3 className="text-xl font-black text-gray-800">Add Category</h3>
                            <p className="text-xs text-gray-600 font-semibold mt-1">
                                Creating in <span className="font-black text-blue-600">{groupLabel}</span> group
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 transition-all flex items-center justify-center text-gray-600 font-bold text-lg"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {/* Category Name */}
                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-gray-600 mb-2">
                                Category Name
                            </label>
                            <input
                                type="text"
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                placeholder="e.g., Groceries, Netflix, Gas"
                                className="w-full px-4 py-3 rounded-xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] outline-none text-gray-800 font-semibold placeholder:text-gray-400"
                                autoFocus
                            />
                        </div>

                        {/* Color Picker */}
                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-gray-600 mb-3">
                                Pick a Color
                            </label>
                            <div className="grid grid-cols-9 gap-2">
                                {PRESET_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setSelectedColor(color)}
                                        className={`w-9 h-9 rounded-full transition-all ${
                                            selectedColor === color
                                                ? "ring-4 ring-blue-500 ring-offset-2 ring-offset-[#e0e0e0] scale-110"
                                                : "hover:scale-110 shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff]"
                                        }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-5 py-3 rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 transition-all text-sm font-black text-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!categoryName.trim() || createMutation.isPending}
                                className="flex-1 px-5 py-3 rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 transition-all text-sm font-black text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {createMutation.isPending ? "Creating..." : "Create Category"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
