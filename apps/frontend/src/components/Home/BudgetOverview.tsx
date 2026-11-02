"use client";

import { useState } from "react";
import { useBudgets } from "@/src/hooks/useBudgets";
import { useMonthlySummary } from "@/src/hooks/useMonthlySummary";
import { moneyFormat } from "@/src/utils/utils";
import Link from "next/link";

interface GroupConfig {
  key: string;
  label: string;
  barColor: string;
  emoji: string;
}

const EXPENSE_GROUPS: GroupConfig[] = [
  { key: "FIXED", label: "Fixed Expenses", barColor: "#ef4444", emoji: "🏠" },
  { key: "VARIABLE", label: "Variable Expenses", barColor: "#eab308", emoji: "🛒" },
];

export default function BudgetOverview() {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets(currentMonthStr);
  const { data: summary, isLoading: summaryLoading } = useMonthlySummary(currentMonthStr);
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");

  const isLoading = budgetsLoading || summaryLoading;

  const visibleGroups = selectedGroup === "ALL" 
    ? EXPENSE_GROUPS 
    : EXPENSE_GROUPS.filter((g) => g.key === selectedGroup);

  // Format month for display
  const monthDate = new Date(currentMonthStr + "-01");
  const monthName = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="w-full p-6 lg:p-8 rounded-[24px] bg-[#e0e0e0] shadow-[10px_10px_20px_#bebebe,_-10px_-10px_20px_#ffffff] flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-black text-gray-800 tracking-tight">Monthly Overview</h3>
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-[#e0e0e0] shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] text-gray-600">
            {monthName}
          </span>
        </div>
        <Link
          href="/budget"
          className="text-xs font-extrabold text-blue-600 px-4 py-2 rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 transition-all"
        >
          Manage Limits →
        </Link>
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-center py-12 text-sm font-semibold">Loading data...</div>
      ) : (
        <>
          {/* Cash Flow Summary Card */}
          <div className="p-6 rounded-2xl bg-[#e0e0e0] shadow-[inset_4px_4px_8px_#c2c2c2,_inset_-4px_-4px_8px_#ffffff]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-5">
              {/* Income */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-black tracking-wider uppercase text-gray-500">Income</span>
                <span className="text-2xl font-black text-green-600">{moneyFormat(summary?.income || 0)}</span>
              </div>

              {/* Spent */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-black tracking-wider uppercase text-gray-500">Spent</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-red-600">{moneyFormat(summary?.expenses.total || 0)}</span>
                  <span className="text-sm font-bold text-gray-500">({summary?.spentPercentage || 0}%)</span>
                </div>
              </div>

              {/* Remaining */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-black tracking-wider uppercase text-gray-500">Remaining</span>
                <span className={`text-2xl font-black ${(summary?.remaining || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {moneyFormat(summary?.remaining || 0)}
                </span>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="h-4 w-full bg-[#d2d2d2] rounded-full overflow-hidden shadow-[inset_1px_1px_3px_#bebebe,_inset_-1px_-1px_3px_#ffffff] relative">
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${Math.min(summary?.spentPercentage || 0, 100)}%`,
                  backgroundColor: (summary?.spentPercentage || 0) > 100 ? "#ef4444" : "#3b82f6",
                }}
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setSelectedGroup("ALL")}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                selectedGroup === "ALL"
                  ? "bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] text-blue-600"
                  : "bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] text-gray-600 hover:text-gray-800"
              }`}
            >
              All Budgets
            </button>
            {EXPENSE_GROUPS.map((group) => {
              const groupBudgets = budgets.filter((b) => b.category?.group === group.key);
              const totalUsage = groupBudgets.reduce((acc, b) => acc + (b.usage || 0), 0);

              return (
                <button
                  key={group.key}
                  onClick={() => setSelectedGroup(group.key)}
                  className={`px-4 py-2 text-xs font-extrabold rounded-xl flex items-center gap-2 transition-all ${
                    selectedGroup === group.key
                      ? "bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] text-blue-600"
                      : "bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <span>{group.emoji} {group.label}</span>
                  {totalUsage > 0 && (
                    <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: group.barColor }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Budget Breakdown */}
          <div className={`grid gap-6 ${selectedGroup === "ALL" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
            {visibleGroups.map((group) => {
              const groupBudgets = budgets.filter((b) => b.category?.group === group.key);
              const totalLimit = groupBudgets.reduce((sum, b) => sum + (b.limit || 0), 0);
              const totalUsage = groupBudgets.reduce((sum, b) => sum + (b.usage || 0), 0);
              const remaining = totalLimit - totalUsage;

              let groupPercent = 0;
              if (totalLimit > 0) {
                groupPercent = Math.min((totalUsage / totalLimit) * 100, 100);
              } else if (totalUsage > 0) {
                groupPercent = 100;
              }

              const isOver = totalLimit > 0 && totalUsage > totalLimit;

              return (
                <div
                  key={group.key}
                  className="p-5 lg:p-6 rounded-2xl bg-[#e0e0e0] shadow-[inset_4px_4px_8px_#c2c2c2,_inset_-4px_-4px_8px_#ffffff] flex flex-col gap-4"
                >
                  {/* Group Summary Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{group.emoji}</span>
                        <span className="text-sm font-black tracking-wider text-gray-700">
                          {group.label}
                        </span>
                      </div>
                      <div className="text-lg font-black text-gray-900 mt-1.5">
                        {moneyFormat(totalUsage)} <span className="text-gray-400 font-medium text-sm">/ {moneyFormat(totalLimit)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        {remaining >= 0 ? "Left" : "Over"}
                      </span>
                      <div className={`text-base font-extrabold mt-0.5 ${remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {moneyFormat(Math.abs(remaining))}
                      </div>
                    </div>
                  </div>

                  {/* Group Main Progress Bar */}
                  <div className="h-3.5 w-full bg-[#d2d2d2] rounded-full overflow-hidden shadow-[inset_1px_1px_3px_#bebebe,_inset_-1px_-1px_3px_#ffffff]">
                    <div
                      className="h-full transition-all duration-500 rounded-full"
                      style={{
                        width: `${groupPercent}%`,
                        backgroundColor: isOver ? "#ef4444" : group.barColor,
                      }}
                    />
                  </div>

                  {/* Category List */}
                  <div className="flex flex-col gap-3.5 mt-2 pt-3 border-t border-[#d4d4d4]">
                    {groupBudgets.length === 0 ? (
                      <div className="text-xs text-gray-400 italic py-1">No categories in this group</div>
                    ) : (
                      groupBudgets.map((item) => {
                        const limit = item.limit || 0;
                        const usage = item.usage || 0;
                        const isCatOver = limit > 0 && usage > limit;

                        let catPercent = 0;
                        if (limit > 0) {
                          catPercent = Math.min((usage / limit) * 100, 100);
                        } else if (usage > 0) {
                          catPercent = 100;
                        }

                        return (
                          <div key={item.categoryId} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                  style={{ backgroundColor: item.category?.color || "#9ca3af" }}
                                />
                                <span className="font-bold text-gray-800 text-[13px] truncate">
                                  {item.category?.name}
                                </span>
                              </div>
                              <span className="font-extrabold text-gray-700 shrink-0 ml-2">
                                <span className={isCatOver ? "text-red-500 font-black" : "text-gray-900"}>
                                  {moneyFormat(usage)}
                                </span>
                                <span className="text-gray-400 font-medium"> / {moneyFormat(limit)}</span>
                              </span>
                            </div>

                            {/* Mini Progress Bar */}
                            <div className="h-2 w-full bg-[#d2d2d2] rounded-full overflow-hidden shadow-[inset_1px_1px_2px_#bebebe,_inset_-1px_-1px_2px_#ffffff]">
                              <div
                                className="h-full transition-all duration-500 rounded-full"
                                style={{
                                  width: `${catPercent}%`,
                                  backgroundColor: isCatOver ? "#ef4444" : (item.category?.color || group.barColor),
                                }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
