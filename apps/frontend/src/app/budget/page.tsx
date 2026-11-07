"use client";

import { useState } from "react";
import { useCategories } from "@/src/hooks/useCategories";
import { useBudgets, useRolloverBudgets } from "@/src/hooks/useBudgets";
import BudgetGroupCard from "@/src/components/Budget/BudgetGroupCard";
import AddCategoryModal from "@/src/components/Budget/AddCategoryModal";
import InteractiveBudgetModal from "@/src/components/Budget/InteractiveBudgetModal";
import BudgetCharts from "@/src/components/BudgetCharts";
import BudgetHistoryView from "@/src/components/Budget/BudgetHistoryView";
import { moneyFormat } from "@/src/utils/utils";

const BUDGET_GROUPS = [
  { key: "INCOME", label: "Income", emoji: "💰", color: "#22c55e" },
  { key: "FIXED", label: "Fixed Expenses", emoji: "🏠", color: "#ef4444" },
  { key: "SAVINGS", label: "Savings", emoji: "🏦", color: "#3b82f6" },
  { key: "VARIABLE", label: "Variable Expenses", emoji: "🛒", color: "#eab308" },
];

export default function BudgetPage() {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonthStr);
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [rolloverFeedback, setRolloverFeedback] = useState<string | null>(null);
  const [addCategoryModal, setAddCategoryModal] = useState<{ isOpen: boolean; groupName: string; groupLabel: string }>({
    isOpen: false,
    groupName: "",
    groupLabel: "",
  });
  const [interactiveModal, setInteractiveModal] = useState<{ 
    isOpen: boolean; 
    groupName: string; 
    groupLabel: string;
    groupColor: string;
  }>({
    isOpen: false,
    groupName: "",
    groupLabel: "",
    groupColor: "",
  });

  const { data: categories = [], isLoading: loadingCats } = useCategories();
  const { data: budgets = [], isLoading: loadingBudgets } = useBudgets(month);
  const rolloverMutation = useRolloverBudgets();

  const isLoading = loadingCats || loadingBudgets;

  const getGroupData = (groupName: string) => {
    const groupCategories = categories.filter((c) => c.group === groupName);
    const totalLimit = groupCategories.reduce((sum, c) => {
      const b = budgets.find((b) => b.categoryId === c.id);
      return sum + (b?.limit || 0);
    }, 0);
    const totalUsage = groupCategories.reduce((sum, c) => {
      const b = budgets.find((b) => b.categoryId === c.id);
      return sum + (b?.usage || 0);
    }, 0);
    return { groupCategories, totalLimit, totalUsage };
  };

  const handleRollover = () => {
    rolloverMutation.mutate(
      { toMonth: month },
      {
        onSuccess: (data) => {
          setRolloverFeedback(`Copied ${data.count} limits from previous month!`);
          setTimeout(() => setRolloverFeedback(null), 4000);
        },
        onError: (err: any) => {
          setRolloverFeedback(err.message || "Failed to copy limits");
          setTimeout(() => setRolloverFeedback(null), 4000);
        },
      }
    );
  };

  const incomeData = getGroupData("INCOME");
  const fixedData = getGroupData("FIXED");
  const savingsData = getGroupData("SAVINGS");
  const variableData = getGroupData("VARIABLE");
  const disposableTotal = incomeData.totalLimit - fixedData.totalLimit - savingsData.totalLimit - variableData.totalLimit;

  return (
    <div className="flex-1 p-4 mt-8 w-full max-w-lg xl:max-w-6xl mx-auto flex flex-col gap-8">
      {/* Top View Mode Switcher */}
      <div className="flex justify-center">
        <div className="p-1.5 rounded-2xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] flex gap-2">
          <button
            onClick={() => setActiveTab("current")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "current"
                ? "bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] text-blue-600 scale-95"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Monthly Targets
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "history"
                ? "bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] text-blue-600 scale-95"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Historical Compliance
          </button>
        </div>
      </div>

      {activeTab === "history" ? (
        <BudgetHistoryView />
      ) : (
        <div className="flex flex-col xl:flex-row gap-8">
          <div className="flex-1 flex flex-col gap-8">
            {/* Header / Month Selector + Rollover Action */}
            <div className="p-6 rounded-[20px] bg-[#e0e0e0] shadow-[inset_11px_11px_16px_#a4a4a4,_inset_-11px_-11px_10px_#ffffff]">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-700">
                    Monthly Budget Limits
                  </h2>
                  <p className="text-xs font-semibold text-gray-500">
                    Set spending limits per category
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="p-3 rounded-xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] outline-none text-gray-700 font-bold text-sm"
                  />
                  <button
                    onClick={handleRollover}
                    disabled={rolloverMutation.isPending}
                    className="px-4 py-3 rounded-xl bg-[#e0e0e0] shadow-[4px_4px_8px_#bebebe,_-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 text-xs font-black text-gray-700 hover:text-blue-600 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    title="Copy budget limits from previous month"
                  >
                    <span>🔄</span>
                    <span className="hidden sm:inline">
                      {rolloverMutation.isPending ? "Copying..." : "Rollover"}
                    </span>
                  </button>
                </div>
              </div>

              {rolloverFeedback && (
                <div className="mt-3 text-xs font-bold text-blue-600 text-center animate-in fade-in duration-200">
                  {rolloverFeedback}
                </div>
              )}
            </div>

            {/* Budget Groups - Accordion Style */}
            {isLoading ? (
              <div className="text-center text-gray-500 py-8 font-bold">
                Loading budgets...
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {BUDGET_GROUPS.map((group) => {
                  const data = getGroupData(group.key);

                  // Available income context per group (only for expense/savings groups)
                  let availableIncome: number | undefined;
                  if (group.key === "FIXED") {
                    availableIncome = incomeData.totalLimit;
                  } else if (group.key === "SAVINGS") {
                    availableIncome = incomeData.totalLimit - fixedData.totalLimit;
                  } else if (group.key === "VARIABLE") {
                    availableIncome = incomeData.totalLimit - fixedData.totalLimit - savingsData.totalLimit;
                  }

                  return (
                    <BudgetGroupCard
                      key={group.key}
                      groupName={group.key}
                      groupLabel={group.label}
                      groupEmoji={group.emoji}
                      groupColor={group.color}
                      categories={data.groupCategories}
                      budgets={budgets}
                      yearMonth={month}
                      totalLimit={data.totalLimit}
                      totalUsage={data.totalUsage}
                      availableIncome={availableIncome}
                      onAddCategory={() =>
                        setAddCategoryModal({
                          isOpen: true,
                          groupName: group.key,
                          groupLabel: group.label,
                        })
                      }
                      onOpenInteractive={() =>
                        setInteractiveModal({
                          isOpen: true,
                          groupName: group.key,
                          groupLabel: group.label,
                          groupColor: group.color,
                        })
                      }
                    />
                  );
                })}

                {/* Disposable Income Summary */}
                <div className="p-5 rounded-[20px] bg-gradient-to-br from-[#e0e0e0] to-[#d8d8d8] shadow-[8px_8px_16px_#bebebe,_-8px_-8px_16px_#ffffff] flex justify-between items-center border-2 border-gray-300/50">
                  <div>
                    <h3 className="text-sm font-black text-gray-600 uppercase tracking-wider">
                      Disposable Income
                    </h3>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">
                      After fixed, savings & variable expenses
                    </p>
                  </div>
                  <span
                    className={`text-2xl font-black tracking-tight ${
                      disposableTotal >= 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {moneyFormat(disposableTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Charts Section */}
          {!isLoading && categories.length > 0 && (
            <div className="xl:w-[400px] shrink-0">
              <BudgetCharts categories={categories} budgets={budgets} />
            </div>
          )}
        </div>
      )}

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={addCategoryModal.isOpen}
        onClose={() => setAddCategoryModal({ isOpen: false, groupName: "", groupLabel: "" })}
        groupName={addCategoryModal.groupName}
        groupLabel={addCategoryModal.groupLabel}
        yearMonth={month}
        budgets={budgets}
      />

      {/* Interactive Budget Modal */}
      <InteractiveBudgetModal
        isOpen={interactiveModal.isOpen}
        onClose={() => setInteractiveModal({ isOpen: false, groupName: "", groupLabel: "", groupColor: "" })}
        groupName={interactiveModal.groupName}
        groupLabel={interactiveModal.groupLabel}
        groupColor={interactiveModal.groupColor}
        categories={categories.filter((c) => c.group === interactiveModal.groupName)}
        budgets={budgets}
        yearMonth={month}
        totalLimit={getGroupData(interactiveModal.groupName).totalLimit}
        onAddCategory={() => {
          setAddCategoryModal({
            isOpen: true,
            groupName: interactiveModal.groupName,
            groupLabel: interactiveModal.groupLabel,
          });
        }}
      />
    </div>
  );
}
