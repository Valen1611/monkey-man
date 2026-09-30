import { moneyFormat } from "../utils/utils";
import { useDeleteTransaction } from "../hooks/useTransactions";
import { Transaction } from "../services/transactionService";

export default function TransactionTile({ 
    transaction, 
    onEdit 
}: { 
    transaction: Transaction; 
    onEdit?: (transaction: Transaction) => void;
}) {
    const deleteMutation = useDeleteTransaction();

    const group = transaction.category?.group;
    const isExpense = group === 'FIXED' || group === 'VARIABLE' || group === 'SAVINGS';
    const isIncome = group === 'INCOME';
    const isTransfer = group === 'TRANSFER';

    return (
        <div className="mb-4 last:mb-0 rounded-2xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] group">
            <div className="flex justify-between items-start p-4">
                <div className="flex-1">
                    <div className="font-semibold text-gray-700">{transaction.description || transaction.category?.name || "Transaction"}</div>
                    <div className="text-sm text-gray-500 mb-2">{transaction.date}</div>
                    <div className="flex gap-3">
                        {transaction.wallet && (
                            <div className="px-3 py-1 w-fit text-xs font-bold rounded-md bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] transition-shadow duration-300 hover:shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] cursor-default">
                                <span className="transition-transform duration-300 hover:scale-95 inline-block uppercase tracking-wider" style={{ color: transaction.wallet.color }}>{transaction.wallet.name}</span>
                            </div>
                        )}
                        {isTransfer && transaction.toWallet && (
                            <>
                                <span className="text-gray-400 text-xs self-center">➡️</span>
                                <div className="px-3 py-1 w-fit text-xs font-bold rounded-md bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] transition-shadow duration-300 hover:shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] cursor-default">
                                    <span className="transition-transform duration-300 hover:scale-95 inline-block uppercase tracking-wider" style={{ color: transaction.toWallet.color }}>{transaction.toWallet.name}</span>
                                </div>
                            </>
                        )}
                        {!isTransfer && transaction.category && (
                            <div className="px-3 py-1 w-fit text-xs font-bold rounded-full bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] transition-shadow duration-300 hover:shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] cursor-default">
                                <span className="transition-transform duration-300 scale-95 hover:scale-100 inline-block" style={{ color: transaction.category.color }}>{transaction.category.name}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <div className={`font-semibold ${isExpense ? 'text-red-500' : isTransfer ? 'text-gray-500' : 'text-green-500'}`}>
                        {isExpense ? '-' : isIncome ? '+' : ''}{moneyFormat(transaction.amount)}
                    </div>
                    <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                            <button
                                onClick={() => onEdit(transaction)}
                                className="px-3 py-1 text-xs text-blue-500 font-medium rounded-full bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] active:scale-95 cursor-pointer"
                            >
                                Edit
                            </button>
                        )}
                        <button 
                            onClick={() => deleteMutation.mutate(transaction.id)}
                            disabled={deleteMutation.isPending}
                            className="px-3 py-1 text-xs text-red-400 font-medium rounded-full bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                            {deleteMutation.isPending ? '...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}