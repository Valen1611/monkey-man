"use client";

import { useState, useMemo } from "react";
import { useCreateCategory, useCategories } from "@/src/hooks/useCategories";
import { useUpdateBudget } from "@/src/hooks/useBudgets";
import { Budget } from "@/src/services/budgetService";

interface AddCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupName: string;
    groupLabel: string;
    yearMonth: string;
    budgets: Budget[];
}

const PRESET_COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
    "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
    "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
    "#ec4899", "#f43f5e"
];

export default function AddCategoryModal({
    isOpen,
    onClose,
    groupName,
    groupLabel,
    yearMonth,
    budgets,
}: AddCategoryModalProps) {
    const createMutation = useCreateCategory();
    const addExistingMutation = useUpdateBudget();
    const { data: allCategories = [] } = useCategories();

    const [tab, setTab] = useState<"create" | "existing">("create");

    // Create tab state
    const [categoryName, setCategoryName] = useState("");
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

    // Existing tab state
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Categories of this group that are NOT already in this month's budget (real rows only)
    const presentCategoryIds = useMemo(
        () => new Set(budgets.filter(b => !b.id.startsWith("virtual-")).map(b => b.categoryId)),
        [budgets]
    );

    const addableCategories = useMemo(() => {
        const q = search.trim().toLowerCase();
        return allCategories.filter(
            c =>
                c.group === groupName &&
                !presentCategoryIds.has(c.id) &&
                (q === "" || c.name.toLowerCase().includes(q))
        );
    }, [allCategories, groupName, presentCategoryIds, search]);

    const reset = () => {
        setCategoryName("");
        setSelectedColor(PRESET_COLORS[0]);
        setSearch("");
        setSelectedId(null);
        setTab("create");
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryName.trim()) return;
        createMutation.mutate(
            { name: categoryName.trim(), color: selectedColor, group: groupName },
            { onSuccess: handleClose }
        );
    };

    const handleAddExisting = () => {
        if (!selectedId) return;
        addExistingMutation.mutate(
            { yearMonth, categoryId: selectedId, limit: 0 },
            { onSuccess: handleClose }
        );
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                onClick={handleClose}
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
                                Group: <span className="font-black text-blue-600">{groupLabel}</span>
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-9 h-9 rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 transition-all flex items-center justify-center text-gray-600 font-bold text-lg"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Tab switcher */}
                    <div className="flex mb-5 p-1 rounded-xl bg-[#e0e0e0] shadow-[inset_2px_2px_5px_#bebebe,_inset_-2px_-2px_5px_#ffffff]">
                        {(["create", "existing"] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                    tab === t
                                        ? "bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] text-blue-600"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                {t === "create" ? "✨ Create New" : "📂 Add Existing"}
                            </button>
                        ))}
                    </div>

                    {/* ── CREATE NEW TAB ─────────────────────────────── */}
                    {tab === "create" && (
                        <form onSubmit={handleCreate} className="flex flex-col gap-5">
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

                            <div className="flex gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
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
                    )}

                    {/* ── ADD EXISTING TAB ───────────────────────────── */}
                    {tab === "existing" && (
                        <div className="flex flex-col gap-4">
                            {/* Search */}
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#e0e0e0] shadow-[inset_2px_2px_5px_#bebebe,_inset_-2px_-2px_5px_#ffffff]">
                                <span className="text-gray-400 text-sm">🔍</span>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search categories..."
                                    className="flex-1 bg-transparent outline-none text-sm font-semibold text-gray-700 placeholder:text-gray-400"
                                    autoFocus
                                />
                            </div>

                            {/* List */}
                            <div className="max-h-52 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar rounded-xl bg-[#e0e0e0] shadow-[inset_2px_2px_5px_#bebebe,_inset_-2px_-2px_5px_#ffffff] p-2">
                                {addableCategories.length === 0 ? (
                                    <p className="text-center text-xs text-gray-400 font-semibold py-6">
                                        {allCategories.filter(c => c.group === groupName).length === 0
                                            ? "No categories in this group yet."
                                            : "All categories are already in this month's budget."}
                                    </p>
                                ) : (
                                    addableCategories.map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-left transition-all ${
                                                selectedId === c.id
                                                    ? "bg-[#e0e0e0] shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] text-blue-600"
                                                    : "hover:bg-[#d8d8d8] text-gray-700"
                                            }`}
                                        >
                                            <span
                                                className="w-3 h-3 rounded-full shrink-0"
                                                style={{ backgroundColor: c.color }}
                                            />
                                            <span className="flex-1 truncate">{c.name}</span>
                                            {selectedId === c.id && (
                                                <span className="text-blue-500 text-xs font-black">✓</span>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-5 py-3 rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 transition-all text-sm font-black text-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddExisting}
                                    disabled={!selectedId || addExistingMutation.isPending}
                                    className="flex-1 px-5 py-3 rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 transition-all text-sm font-black text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {addExistingMutation.isPending ? "Adding..." : "Add to Budget"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
