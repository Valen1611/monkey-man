"use client"

import { useState } from "react";
import { useRules, useCreateRule, useUpdateRule, useDeleteRule, useRuleKeyTypes, ParserRule } from "@/src/hooks/useRules";
import { useCategories } from "@/src/hooks/useCategories";
import { useWallets } from "@/src/hooks/useWallets";
import ConfirmModal from "@/src/components/ConfirmModal";

export default function RulesPage() {
    const { data: rules = [], isLoading: isLoadingRules } = useRules();
    const { data: categories = [], isLoading: isLoadingCategories } = useCategories();
    const { data: wallets = [], isLoading: isLoadingWallets } = useWallets();
    const { data: keyTypes = [] } = useRuleKeyTypes();

    const createMutation = useCreateRule();
    const updateMutation = useUpdateRule();
    const deleteMutation = useDeleteRule();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingRule, setDeletingRule] = useState<ParserRule | null>(null);

    // Form state
    const [keyType, setKeyType] = useState("");
    const [keyValue, setKeyValue] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [walletId, setWalletId] = useState("");
    const [isMine, setIsMine] = useState(false);

    const resetForm = () => {
        setKeyType("");
        setKeyValue("");
        setCategoryId("");
        setWalletId("");
        setIsMine(false);
        setEditingId(null);
        setIsFormOpen(false);
    };

    const openCreateForm = () => {
        resetForm();
        setIsFormOpen(true);
    };

    const openEditForm = (rule: ParserRule) => {
        setKeyType(rule.keyType);
        setKeyValue(rule.keyValue);
        setCategoryId(rule.categoryId ?? "");
        setWalletId(rule.walletId ?? "");
        setIsMine(rule.isMine);
        setEditingId(rule.id);
        setIsFormOpen(true);
    };

    const isEditing = editingId !== null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!keyType || !keyValue.trim()) return;

        // Having no category or wallet is valid: a rule may assign only
        // category, only wallet, or only mark isMine. Send explicit nulls when editing.
        const payload = {
            keyType,
            keyValue,
            categoryId: categoryId || null,
            walletId: walletId || null,
            isMine,
        };

        if (isEditing) {
            updateMutation.mutate({ id: editingId, ...payload }, { onSuccess: resetForm });
        } else {
            createMutation.mutate(payload, { onSuccess: resetForm });
        }
    };

    const handleDelete = (rule: ParserRule) => {
        setDeletingRule(rule);
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;
    const error = createMutation.error || updateMutation.error || deleteMutation.error;

    if (isLoadingRules || isLoadingCategories || isLoadingWallets) {
        return <div className="text-center mt-10">Loading...</div>;
    }

    return (
        <div className="flex-1 p-4 mt-8 w-full max-w-lg mx-auto">
            {/* Header / Add Button */}
            <div className="mb-8 p-6 rounded-[20px] bg-[#e0e0e0] shadow-[inset_11px_11px_16px_#a4a4a4,_inset_-11px_-11px_10px_#ffffff] flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-700">Parser Rules</h2>
                <button
                    onClick={() => {
                        if (isFormOpen) resetForm();
                        else openCreateForm();
                    }}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl bg-[#e0e0e0] transition-all duration-300 ${isFormOpen ? 'shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff] text-blue-500 scale-95' : 'shadow-[4px_4px_8px_#bebebe,_-4px_-4px_8px_#ffffff] text-gray-700 hover:shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff] hover:scale-95'} text-2xl font-light outline-none`}
                >
                    {isFormOpen ? '×' : '+'}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-xl text-sm text-red-600 bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff]">
                    {error.message}
                </div>
            )}

            {/* Form */}
            {isFormOpen && (
                <form onSubmit={handleSubmit} className="mb-8 p-6 rounded-[20px] bg-[#e0e0e0] shadow-[inset_11px_11px_16px_#a4a4a4,_inset_-11px_-11px_10px_#ffffff] flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-gray-600 mb-2">
                        {isEditing ? "Edit Rule" : "New Rule"}
                    </h3>
                    <select
                        value={keyType}
                        onChange={(e) => setKeyType(e.target.value)}
                        className="w-full p-3 text-sm rounded-xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] outline-none text-gray-700 font-semibold appearance-none"
                        required
                        disabled={isEditing}
                    >
                        <option value="" disabled>Select Key Type</option>
                        {keyTypes.map((kt) => (
                            <option key={kt.value} value={kt.value}>{kt.value}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="Key value (e.g. CBU or sender email/domain)"
                        value={keyValue}
                        onChange={(e) => setKeyValue(e.target.value)}
                        className="w-full p-3 text-sm rounded-xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] outline-none text-gray-700"
                        required
                    />
                    <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full p-3 text-sm rounded-xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] outline-none text-gray-700 font-semibold appearance-none"
                    >
                        <option value="">No category</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name} ({cat.group})</option>
                        ))}
                    </select>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 font-semibold px-2">
                            {isMine 
                                ? (keyType === 'FROM' ? "Source Wallet (where money comes from)" : "Target Wallet (where money goes to)")
                                : "Map to Wallet"}
                        </label>
                        <select
                            value={walletId}
                            onChange={(e) => setWalletId(e.target.value)}
                            className="w-full p-3 text-sm rounded-xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] outline-none text-gray-700 font-semibold appearance-none"
                        >
                            <option value="">No wallet</option>
                            {wallets.map(wallet => (
                                <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                            ))}
                        </select>
                    </div>
                    <label className="flex items-center gap-3 text-sm text-gray-600 select-none">
                        <input
                            type="checkbox"
                            checked={isMine}
                            onChange={(e) => setIsMine(e.target.checked)}
                            className="w-4 h-4 accent-blue-500 outline-none"
                        />
                        This account is mine (marks internal transfers)
                    </label>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-2 w-full p-4 rounded-xl font-bold text-white bg-blue-500 shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] hover:bg-blue-600 transition-colors active:scale-95 disabled:opacity-50"
                    >
                        {isEditing ? "Save Changes" : "Create Rule"}
                    </button>
                </form>
            )}

            {/* List */}
            <div className="p-6 rounded-[20px] bg-[#e0e0e0] shadow-[inset_11px_11px_16px_#a4a4a4,_inset_-11px_-11px_10px_#ffffff] flex flex-col gap-4">
                {rules.length === 0 ? (
                    <p className="text-gray-500 text-center text-sm">No rules defined yet.</p>
                ) : (
                    rules.map(rule => (
                        <div key={rule.id} className="flex justify-between items-center p-4 rounded-2xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff]">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-[#d8d8d8] text-gray-600 shadow-[inset_1px_1px_2px_#bebebe,_inset_-1px_-1px_2px_#ffffff]">
                                        IF {rule.keyType}
                                    </span>
                                    <span className="font-semibold text-gray-800 text-sm font-mono break-all">
                                        {rule.keyValue}
                                    </span>
                                    {rule.isMine && (
                                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide rounded bg-blue-100 text-blue-600">
                                            Internal Transfer
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1 pl-1 text-xs">
                                    {rule.category && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-gray-400 font-medium">Category ➜</span>
                                            <div className="w-2.5 h-2.5 rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]" style={{ backgroundColor: rule.category.color }} />
                                            <span className="font-semibold text-gray-700">{rule.category.name}</span>
                                        </div>
                                    )}
                                    {rule.wallet && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-gray-400 font-medium">
                                                {rule.isMine 
                                                    ? (rule.keyType === 'FROM' ? "Source Wallet ➜" : "Target Wallet ➜")
                                                    : "Wallet ➜"}
                                            </span>
                                            <span className="font-semibold text-gray-700">{rule.wallet.name}</span>
                                        </div>
                                    )}
                                    {!rule.category && !rule.wallet && (
                                        <span className="text-gray-400 italic">No category or wallet mapped</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => openEditForm(rule)}
                                    className="px-3 py-1 text-xs text-blue-500 font-medium rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] active:scale-95 transition-all"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(rule)}
                                    disabled={deleteMutation.isPending}
                                    className="px-3 py-1 text-xs text-red-500 font-medium rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ConfirmModal
                isOpen={deletingRule !== null}
                title="Delete Rule"
                message={`Are you sure you want to delete the rule for ${deletingRule?.keyType}: "${deletingRule?.keyValue}"?`}
                confirmLabel="Delete"
                isPending={deleteMutation.isPending}
                onCancel={() => setDeletingRule(null)}
                onConfirm={() => {
                    if (deletingRule) {
                        deleteMutation.mutate(deletingRule.id, {
                            onSettled: () => setDeletingRule(null),
                        });
                    }
                }}
            />
        </div>
    );
}
