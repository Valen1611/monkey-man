"use client"

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm p-6 rounded-[24px] bg-[#e0e0e0] shadow-[16px_16px_32px_#a4a4a4,_-16px_-16px_32px_#ffffff] flex flex-col gap-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-gray-700">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 py-3 text-sm font-semibold rounded-xl bg-[#e0e0e0] text-gray-600 shadow-[4px_4px_8px_#bebebe,_-4px_-4px_8px_#ffffff] hover:shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] active:scale-95 transition-all outline-none"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-3 text-sm font-semibold rounded-xl bg-red-500 text-white shadow-[4px_4px_8px_#bebebe,_-4px_-4px_8px_#ffffff] hover:bg-red-600 active:scale-95 transition-all outline-none disabled:opacity-50"
          >
            {isPending ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
