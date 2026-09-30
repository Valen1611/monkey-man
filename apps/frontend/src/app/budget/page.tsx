"use client";

import { useState } from "react";
import { useCategories } from "@/src/hooks/useCategories";
import { useBudgets, useRolloverBudgets } from "@/src/hooks/useBudgets";
import BudgetTile from "@/src/components/BudgetTile";
import BudgetCharts from "@/src/components/BudgetCharts";
import BudgetHistoryView from "@/src/components/Budget/BudgetHistoryView";
import { moneyFormat } from "@/src/utils/utils";

export default function BudgetPage() {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonthStr);
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [rolloverFeedback, setRolloverFeedback] = useState<string | null>(null);

  const { data: categories = [], isLoading: loadingCats } = useCategories();
  const { data: budgets = [], isLoading: loadingBudgets } = useBudgets(month);
  const rolloverMutation = useRolloverBudgets();

  const isLoading = loadingCats || loadingBudgets;

  const getTotalLimit = (groupName: string) => {
    return categories
      .filter((c) => c.group === groupName)
      .reduce((sum, c) => {
        const b = budgets.find((b) => b.categoryId === c.id);
        return sum + (b?.limit || 0);
      }, 0);
  };

  const incomeTotal = getTotalLimit("INCOME");
  const fixedTotal = getTotalLimit("FIXED");
  const savingsTotal = getTotalLimit("SAVINGS");
  const variableTotal = getTotalLimit("VARIABLE");
  const disposableTotal =
    incomeTotal - fixedTotal - savingsTotal - variableTotal;

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

            {/* Budgets List */}
            <div className="p-6 rounded-[20px] bg-[#e0e0e0] shadow-[inset_11px_11px_16px_#a4a4a4,_inset_-11px_-11px_10px_#ffffff]">
              {isLoading ? (
                <div className="text-center text-gray-500 py-4 font-bold">
                  Loading budgets...
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {["INCOME", "FIXED", "SAVINGS", "VARIABLE"].map(
                    (groupName) => {
                      const groupCategories = categories.filter(
                        (c) => c.group === groupName
                      );
                      if (groupCategories.length === 0) return null;

                      let headerExtra = "";
                      let headerColor = "text-gray-500";
                      if (groupName === "INCOME") {
                        headerExtra = `Total: ${moneyFormat(incomeTotal)}`;
                        headerColor = "text-green-600";
                      } else if (groupName === "FIXED") {
                        headerExtra = `Available: ${moneyFormat(incomeTotal)}`;
                        headerColor = "text-blue-600";
                      } else if (groupName === "SAVINGS") {
                        const avail = incomeTotal - fixedTotal;
                        headerExtra = `Available: ${moneyFormat(avail)}`;
                        headerColor =
                          avail >= 0 ? "text-blue-600" : "text-red-500";
                      } else if (groupName === "VARIABLE") {
                        const avail = incomeTotal - fixedTotal - savingsTotal;
                        headerExtra = `Available: ${moneyFormat(avail)}`;
                        headerColor =
                          avail >= 0 ? "text-blue-600" : "text-red-500";
                      }

                      return (
                        <div key={groupName} className="flex flex-col gap-2">
                          <div className="flex justify-between items-end ml-2 mb-1">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                              {groupName}
                            </h3>
                            <span
                              className={`text-xs font-bold uppercase tracking-wider ${headerColor}`}
                            >
                              {headerExtra}
                            </span>
                          </div>
                          {groupCategories.map((category) => {
                            const budget = budgets.find(
                              (b) => b.categoryId === category.id
                            );
                            return (
                              <BudgetTile
                                key={category.id}
                                category={category}
                                budget={budget}
                                yearMonth={month}
                              />
                            );
                          })}
                        </div>
                      );
                    }
                  )}

                  {categories.filter((c) => c.group !== "TRANSFER").length >
                  0 ? (
                    <div className="mt-2 p-4 rounded-[15px] bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] flex justify-between items-center border border-[#d1d1d1]">
                      <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">
                        Disposable
                      </h3>
                      <span
                        className={`text-lg font-bold tracking-wider ${
                          disposableTotal >= 0
                            ? "text-green-600"
                            : "text-red-500"
                        }`}
                      >
                        {moneyFormat(disposableTotal)}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-4 font-bold">
                      No categories found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Charts Section */}
          {!isLoading && categories.length > 0 && (
            <div className="xl:w-[400px] shrink-0">
              <BudgetCharts categories={categories} budgets={budgets} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
