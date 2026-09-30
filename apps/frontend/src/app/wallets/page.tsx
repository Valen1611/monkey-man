"use client"

import { useState } from "react";
import { useWallets, useCreateWallet, useUpdateWallet, useDeleteWallet, Wallet } from "@/src/hooks/useWallets";
import ConfirmModal from "@/src/components/ConfirmModal";
import { moneyFormat } from "@/src/utils/utils";

export default function WalletsPage() {
    const { data: wallets = [], isLoading } = useWallets();
    const createMutation = useCreateWallet();
    const updateMutation = useUpdateWallet();
    const deleteMutation = useDeleteWallet();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingWallet, setDeletingWallet] = useState<Wallet | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [color, setColor] = useState("#3b82f6");
    const [balance, setBalance] = useState("0");
    const [imageUrl, setImageUrl] = useState("");

    const resetForm = () => {
        setName("");
        setColor("#3b82f6");
        setBalance("0");
        setImageUrl("");
        setEditingId(null);
        setIsFormOpen(false);
    };

    const openCreateForm = () => {
        resetForm();
        setIsFormOpen(true);
    };

    const openEditForm = (wallet: Wallet) => {
        setEditingId(wallet.id);
        setName(wallet.name);
        setColor(wallet.color);
        setBalance(String(wallet.balance));
        setImageUrl(wallet.imageUrl || "");
        setIsFormOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const parsedBalance = parseFloat(balance) || 0;
        const payload = {
            name: name.trim(),
            color,
            balance: parsedBalance,
            imageUrl: imageUrl.trim() || null
        };

        if (editingId) {
            updateMutation.mutate(
                { id: editingId, ...payload },
                { onSuccess: resetForm }
            );
        } else {
            createMutation.mutate(
                payload,
                { onSuccess: resetForm }
            );
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;
    const error = createMutation.error || updateMutation.error || deleteMutation.error;

    if (isLoading) {
        return <div className="text-center mt-10">Loading...</div>;
    }

    return (
        <div className="flex-1 p-4 mt-8 w-full max-w-lg mx-auto">
            {/* Header / Add Button */}
            <div className="mb-8 p-6 rounded-[20px] bg-[#e0e0e0] shadow-[inset_11px_11px_16px_#a4a4a4,_inset_-11px_-11px_10px_#ffffff] flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-700">Wallets</h2>
                <button
                    onClick={() => {
                        if (isFormOpen) resetForm();
                        else openCreateForm();
                    }}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl bg-[#e0e0e0] transition-all duration-300 ${
                        isFormOpen
                            ? "shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff] text-blue-500 scale-95"
                            : "shadow-[4px_4px_8px_#bebebe,_-4px_-4px_8px_#ffffff] text-gray-700 hover:shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff] hover:scale-95"
                    } text-2xl font-light outline-none`}
                >
                    {isFormOpen ? "×" : "+"}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-xl text-sm text-red-600 bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff]">
                    {error.message}
                </div>
            )}

            {/* Form */}
            {isFormOpen && (
                <form
                    onSubmit={handleSubmit}
                    className="mb-8 p-6 rounded-[20px] bg-[#e0e0e0] shadow-[inset_11px_11px_16px_#a4a4a4,_inset_-11px_-11px_10px_#ffffff] flex flex-col gap-4"
                >
                    <h3 className="text-lg font-bold text-gray-600 mb-2">
                        {editingId ? "Edit Wallet" : "New Wallet"}
                    </h3>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Wallet Name (e.g. Santander, Mercado Pago)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="flex-1 p-3 text-sm rounded-xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] outline-none text-gray-700 font-semibold"
                            required
                        />
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="w-12 h-12 p-1 rounded-xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] outline-none cursor-pointer"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">
                            Balance
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={balance}
                            onChange={(e) => setBalance(e.target.value)}
                            className="w-full p-3 text-sm rounded-xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] outline-none text-gray-700 font-semibold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">
                            Bank Logo / Icon (Optional)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                accept="image/*"
                                id="wallet-logo-file"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                        if (typeof reader.result === 'string') {
                                            setImageUrl(reader.result);
                                        }
                                    };
                                    reader.readAsDataURL(file);
                                }}
                            />
                            <label
                                htmlFor="wallet-logo-file"
                                className="px-3 py-2.5 text-xs font-bold rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] text-gray-700 hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] cursor-pointer transition-all active:scale-95 shrink-0"
                            >
                                Upload Logo
                            </label>
                            <input
                                type="text"
                                placeholder="Or image URL"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                className="flex-1 p-2.5 text-xs rounded-xl bg-[#e0e0e0] shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] outline-none text-gray-700 font-medium"
                            />
                            {imageUrl && (
                                <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-white shadow-md shrink-0 flex items-center justify-center p-1">
                                    <img src={imageUrl} alt="Logo preview" className="w-full h-full object-contain" />
                                    <button
                                        type="button"
                                        onClick={() => setImageUrl("")}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center leading-none"
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-2 w-full p-4 rounded-xl font-bold text-white bg-blue-500 shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] hover:bg-blue-600 transition-colors active:scale-95 disabled:opacity-50"
                    >
                        {editingId ? "Save Changes" : "Create Wallet"}
                    </button>
                </form>
            )}

            {/* List */}
            <div className="p-6 rounded-[20px] bg-[#e0e0e0] shadow-[inset_11px_11px_16px_#a4a4a4,_inset_-11px_-11px_10px_#ffffff] flex flex-col gap-4">
                {wallets.length === 0 ? (
                    <p className="text-gray-500 text-center text-sm">No wallets defined yet.</p>
                ) : (
                    wallets.map((wallet) => (
                        <div
                            key={wallet.id}
                            className="flex justify-between items-center p-4 rounded-2xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff]"
                        >
                            <div className="flex items-center gap-3">
                                {wallet.imageUrl ? (
                                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm overflow-hidden p-1 flex items-center justify-center">
                                        <img src={wallet.imageUrl} alt={wallet.name} className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <div
                                        className="w-4 h-4 rounded-full shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)]"
                                        style={{ backgroundColor: wallet.color }}
                                    />
                                )}
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-700 text-base">{wallet.name}</span>
                                    <span className="text-xs font-extrabold" style={{ color: wallet.color }}>
                                        {moneyFormat(wallet.balance)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => openEditForm(wallet)}
                                    className="px-3 py-1 text-xs text-blue-500 font-medium rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] active:scale-95 transition-all"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => setDeletingWallet(wallet)}
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
                isOpen={deletingWallet !== null}
                title="Delete Wallet"
                message={`Are you sure you want to delete the wallet "${deletingWallet?.name}"? Old transactions will be preserved, but this wallet will no longer be available for new transactions.`}
                confirmLabel="Delete"
                isPending={deleteMutation.isPending}
                onCancel={() => setDeletingWallet(null)}
                onConfirm={() => {
                    if (deletingWallet) {
                        deleteMutation.mutate(deletingWallet.id, {
                            onSettled: () => setDeletingWallet(null)
                        });
                    }
                }}
            />
        </div>
    );
}
