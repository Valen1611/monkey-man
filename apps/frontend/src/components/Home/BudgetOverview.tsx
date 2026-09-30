"use client";

import { useState } from "react";
import { useBudgets } from "@/src/hooks/useBudgets";
import { moneyFormat } from "@/src/utils/utils";
import Link from "next/link";

interface GroupConfig {
  key: string;
  label: string;
  barColor: string;
  isIncome?: boolean;
}

const GROUPS: GroupConfig[] = [
  { key: "INCOME", label: "Incomes", barColor: "#22c55e", isIncome: true },
  { key: "FIXED", label: "Fixed", barColor: "#ef4444" },
  { key: "VARIABLE", label: "Variable", barColor: "#eab308" },
  { key: "SAVINGS", label: "Savings", barColor: "#14b8a6" },
];

export default function BudgetOverview() {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const { data: budgets = [], isLoading } = useBudgets(currentMonthStr);
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");

  const visibleGroups = selectedGroup === "ALL" 
    ? GROUPS 
    : GROUPS.filter((g) => g.key === selectedGroup);

  return (
    <div className="w-full p-6 lg:p-8 rounded-[24px] bg-[#e0e0e0] shadow-[10px_10px_20px_#bebebe,_-10px_-10px_20px_#ffffff] flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-black text-gray-800 tracking-tight">Monthly Budget</h3>
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-[#e0e0e0] shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] text-gray-600">
            {currentMonthStr}
          </span>
        </div>
        <Link
          href="/budget"
          className="text-xs font-extrabold text-blue-600 px-4 py-2 rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 transition-all"
        >
          Manage Limits →
        </Link>
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
          All Groups
        </button>
        {GROUPS.map((group) => {
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
              <span>{group.label}</span>
              {totalUsage > 0 && (
                <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: group.barColor }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-gray-500 text-center py-12 text-sm font-semibold">Loading budget data...</div>
      ) : (
        <div className={`grid gap-6 ${selectedGroup === "ALL" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
          {visibleGroups.map((group) => {
            const groupBudgets = budgets.filter((b) => b.category?.group === group.key);
            const totalLimit = groupBudgets.reduce((sum, b) => sum + (b.limit || 0), 0);
            const totalUsage = groupBudgets.reduce((sum, b) => sum + (b.usage || 0), 0);

            let groupPercent = 0;
            if (totalLimit > 0) {
              groupPercent = Math.min((totalUsage / totalLimit) * 100, 100);
            } else if (totalUsage > 0) {
              groupPercent = 100;
            }

            const isOver = !group.isIncome && totalLimit > 0 && totalUsage > totalLimit;

            return (
              <div
                key={group.key}
                className="p-5 lg:p-6 rounded-2xl bg-[#e0e0e0] shadow-[inset_4px_4px_8px_#c2c2c2,_inset_-4px_-4px_8px_#ffffff] flex flex-col gap-4"
              >
                {/* Group Summary Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black tracking-wider uppercase text-gray-500">
                      {group.label}
                    </span>
                    <div className="text-sm font-semibold text-gray-600 mt-1">
                      {group.isIncome ? "Received" : "Spent"}:{" "}
                      <span className="font-black text-gray-900 text-base">{moneyFormat(totalUsage)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      {group.isIncome ? "Target" : "Limit"}
                    </span>
                    <div className="text-sm font-extrabold text-gray-800 mt-0.5">
                      {moneyFormat(totalLimit)}
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
                      const isCatOver = !group.isIncome && limit > 0 && usage > limit;

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
      )}
    </div>
  );
}
