"use client"

import { useState } from "react";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, Category } from "@/src/hooks/useCategories";
import ConfirmModal from "@/src/components/ConfirmModal";

export default function CategoriesPage() {
    const { data: categories = [], isLoading } = useCategories();
    const createMutation = useCreateCategory();
    const updateMutation = useUpdateCategory();
    const deleteMutation = useDeleteCategory();

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [color, setColor] = useState("#808080");
    const [group, setGroup] = useState("VARIABLE");

    const resetForm = () => {
        setName("");
        setColor("#808080");
        setGroup("VARIABLE");
        setIsAdding(false);
        setEditingId(null);
    };

    const handleEdit = (category: Category) => {
        setEditingId(category.id);
        setName(category.name);
        setColor(category.color);
        setGroup(category.group);
        setIsAdding(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        if (editingId) {
            updateMutation.mutate({
                id: editingId,
                name,
                color,
                group
            }, {
                onSuccess: resetForm
            });
        } else {
            createMutation.mutate({
                name,
                color,
                group
            }, {
                onSuccess: resetForm
            });
        }
    };

    const handleDelete = (category: Category) => {
        setDeletingCategory(category);
    };

    const error = createMutation.error || updateMutation.error || deleteMutation.error;

    if (isLoading) {
        return <div className="text-center mt-10">Loading...</div>;
    }

    return (
        <div className="flex-1 p-4 mt-8 w-full max-w-lg mx-auto">
            {/* Header / Add Button */}
            <div className="mb-8 p-6 rounded-[20px] bg-[#e0e0e0] shadow-[inset_11px_11px_16px_#a4a4a4,_inset_-11px_-11px_10px_#ffffff] flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-700">Categories</h2>
                <button 
                    onClick={() => {
                        if (isAdding) resetForm();
                        else {
                            resetForm();
                            setIsAdding(true);
                        }
                    }}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl bg-[#e0e0e0] transition-all duration-300 ${isAdding ? 'shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff] text-blue-500 scale-95' : 'shadow-[4px_4px_8px_#bebebe,_-4px_-4px_8px_#ffffff] text-gray-700 hover:shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff] hover:scale-95'} text-2xl font-light outline-none`}
                >
                    {isAdding ? '×' : '+'}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-xl text-sm text-red-600 bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff]">
                    {error.message}
                </div>
            )}

            {/* Form */}
            {isAdding && (
                <form onSubmit={handleSubmit} className="mb-8 p-6 rounded-[20px] bg-[#e0e0e0] shadow-[inset_11px_11px_16px_#a4a4a4,_inset_-11px_-11px_10px_#ffffff] flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-gray-600 mb-2">{editingId ? 'Edit Category' : 'New Category'}</h3>
                    <div className="flex gap-4">
                        <input 
                            type="text" 
                            placeholder="Category Name" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="flex-1 p-3 text-sm rounded-xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] outline-none text-gray-700"
                            required
                        />
                        <input 
                            type="color" 
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="w-12 h-12 p-1 rounded-xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] outline-none cursor-pointer"
                        />
                    </div>
                    <select 
                        value={group} 
                        onChange={(e) => setGroup(e.target.value)}
                        className="w-full p-3 text-sm rounded-xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] outline-none text-gray-700 font-semibold appearance-none"
                    >
                        <option value="INCOME">Income</option>
                        <option value="FIXED">Fixed Expense</option>
                        <option value="VARIABLE">Variable Expense</option>
                        <option value="SAVINGS">Savings</option>
                    </select>
                    <button 
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="mt-2 w-full p-4 rounded-xl font-bold text-white bg-blue-500 shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] hover:bg-blue-600 transition-colors active:scale-95 disabled:opacity-50"
                    >
                        {editingId ? 'Save Changes' : 'Create Category'}
                    </button>
                </form>
            )}

            {/* List */}
            <div className="p-6 rounded-[20px] bg-[#e0e0e0] shadow-[inset_11px_11px_16px_#a4a4a4,_inset_-11px_-11px_10px_#ffffff] flex flex-col gap-6">
                {['INCOME', 'FIXED', 'VARIABLE', 'SAVINGS'].map(groupName => {
                    const groupCategories = categories.filter(c => c.group === groupName && c.name.toLowerCase() !== 'internal transfer');
                    if (groupCategories.length === 0) return null;

                    return (
                        <div key={groupName} className="flex flex-col gap-3">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-2">{groupName}</h3>
                            {groupCategories.map(category => (
                                <div key={category.id} className="flex justify-between items-center p-4 rounded-2xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] group-item">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]" style={{ backgroundColor: category.color }} />
                                        <span className="font-semibold text-gray-700">{category.name}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleEdit(category)}
                                            className="px-3 py-1 text-xs text-blue-500 font-medium rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] active:scale-95 transition-all"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(category)}
                                            disabled={deleteMutation.isPending}
                                            className="px-3 py-1 text-xs text-red-500 font-medium rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            <ConfirmModal
                isOpen={deletingCategory !== null}
                title="Delete Category"
                message={`Are you sure you want to delete "${deletingCategory?.name}"? Transactions using this category will no longer be categorized.`}
                confirmLabel="Delete"
                isPending={deleteMutation.isPending}
                onCancel={() => setDeletingCategory(null)}
                onConfirm={() => {
                    if (deletingCategory) {
                        deleteMutation.mutate(deletingCategory.id, {
                            onSettled: () => setDeletingCategory(null),
                        });
                    }
                }}
            />
        </div>
    );
}
