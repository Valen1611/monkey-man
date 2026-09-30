"use client";

import React, { useState } from "react";
import { useBudgetHistory } from "@/src/hooks/useStats";
import { moneyFormat } from "@/src/utils/utils";

export default function BudgetHistoryView() {
  const { data: history = [], isLoading } = useBudgetHistory();
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");

  if (isLoading) {
    return (
      <div className="w-full p-8 rounded-[20px] bg-[#e0e0e0] shadow-[inset_11px_11px_16px_#a4a4a4,_inset_-11px_-11px_10px_#ffffff] text-center text-gray-500 font-bold">
        Loading historical budget performance...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="w-full p-8 rounded-[20px] bg-[#e0e0e0] shadow-[inset_11px_11px_16px_#a4a4a4,_inset_-11px_-11px_10px_#ffffff] text-center text-gray-500 font-bold">
        No budget history data available.
      </div>
    );
  }

  // Calculate overall metrics
  const budgetedMonths = history.filter((m) => m.totalExpenseLimit > 0);
  const avgAdherence =
    budgetedMonths.length > 0
      ? Math.round(
          budgetedMonths.reduce((acc, m) => acc + m.adherencePct, 0) /
            budgetedMonths.length
        )
      : 0;

  const underBudgetCount = budgetedMonths.filter(
    (m) => m.status === "under" || m.status === "warning"
  ).length;

  const totalExpenseLimitSum = budgetedMonths.reduce(
    (acc, m) => acc + m.totalExpenseLimit,
    0
  );
  const totalExpenseActualSum = budgetedMonths.reduce(
    (acc, m) => acc + m.totalExpenseActual,
    0
  );
  const netSavingsDelta = totalExpenseLimitSum - totalExpenseActualSum;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Average Adherence */}
        <div className="p-5 rounded-[20px] bg-[#e0e0e0] shadow-[6px_6px_12px_#bebebe,_-6px_-6px_12px_#ffffff] flex flex-col gap-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
            Average Adherence
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-black ${
                avgAdherence <= 100 ? "text-green-600" : "text-red-500"
              }`}
            >
              {avgAdherence}%
            </span>
            <span className="text-xs font-semibold text-gray-500">of limit</span>
          </div>
          <span className="text-[11px] text-gray-500 font-bold">
            Across {budgetedMonths.length} active budget months
          </span>
        </div>

        {/* Metric 2: Compliance Score */}
        <div className="p-5 rounded-[20px] bg-[#e0e0e0] shadow-[6px_6px_12px_#bebebe,_-6px_-6px_12px_#ffffff] flex flex-col gap-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
            Discipline Score
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-600">
              {underBudgetCount}/{budgetedMonths.length || 1}
            </span>
            <span className="text-xs font-semibold text-gray-500">
              months on track
            </span>
          </div>
          <span className="text-[11px] text-gray-500 font-bold">
            Kept within spending boundaries
          </span>
        </div>

        {/* Metric 3: Net Cumulative Variance */}
        <div className="p-5 rounded-[20px] bg-[#e0e0e0] shadow-[6px_6px_12px_#bebebe,_-6px_-6px_12px_#ffffff] flex flex-col gap-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
            Cumulative Savings Surplus
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-black ${
                netSavingsDelta >= 0 ? "text-green-600" : "text-red-500"
              }`}
            >
              {netSavingsDelta >= 0 ? "+" : ""}
              {moneyFormat(netSavingsDelta)}
            </span>
          </div>
          <span className="text-[11px] text-gray-500 font-bold">
            Total unspent budget allowance
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[20px] bg-[#e0e0e0] shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-gray-500 px-2">
            View Group:
          </span>
          {["ALL", "VARIABLE", "FIXED", "SAVINGS"].map((grp) => (
            <button
              key={grp}
              onClick={() => setSelectedGroup(grp)}
              className={`px-3 py-1.5 text-xs font-black uppercase rounded-xl transition-all ${
                selectedGroup === grp
                  ? "bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] text-blue-600 scale-95"
                  : "bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] text-gray-600 hover:text-gray-800"
              }`}
            >
              {grp}
            </button>
          ))}
        </div>
        <span className="text-xs font-bold text-gray-400">
          Showing last 6 calendar months
        </span>
      </div>

      {/* Monthly Breakdown Cards Grid */}
      <div className="flex flex-col gap-4">
        {history.map((m) => {
          const [year, monthNum] = m.month.split("-");
          const dateObj = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
          const monthLabel = dateObj.toLocaleDateString("es-AR", {
            month: "long",
            year: "numeric",
          });

          // Determine limit and actual based on group filter
          let limit = m.totalExpenseLimit;
          let actual = m.totalExpenseActual;

          if (selectedGroup !== "ALL") {
            const grpData = m.byGroup[selectedGroup] || { limit: 0, actual: 0 };
            limit = grpData.limit;
            actual = grpData.actual;
          }

          const adherence =
            limit > 0 ? Math.min(Math.round((actual / limit) * 100), 100) : 0;
          const isOver = limit > 0 && actual > limit;
          const remaining = limit - actual;

          let statusBadgeClass =
            "bg-green-100 text-green-700 border border-green-300";
          let statusText = "ON TRACK";
          if (limit === 0) {
            statusBadgeClass =
              "bg-gray-200 text-gray-600 border border-gray-300";
            statusText = "NO LIMITS";
          } else if (isOver) {
            statusBadgeClass = "bg-red-100 text-red-600 border border-red-300";
            statusText = "OVER BUDGET";
          } else if (actual >= limit * 0.9) {
            statusBadgeClass =
              "bg-amber-100 text-amber-700 border border-amber-300";
            statusText = "WARNING (>90%)";
          }

          return (
            <div
              key={m.month}
              className="p-5 rounded-[22px] bg-[#e0e0e0] shadow-[6px_6px_12px_#bebebe,_-6px_-6px_12px_#ffffff] flex flex-col gap-4 transition-all"
            >
              {/* Row Header */}
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-3">
                  <h4 className="text-base font-black text-gray-800 capitalize">
                    {monthLabel}
                  </h4>
                  <span
                    className={`text-[10px] font-black tracking-wider px-2.5 py-0.5 rounded-full ${statusBadgeClass}`}
                  >
                    {statusText}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="text-gray-500">
                    Spent:{" "}
                    <strong className="text-gray-800">{moneyFormat(actual)}</strong>
                  </span>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-500">
                    Limit:{" "}
                    <strong className="text-blue-600">{moneyFormat(limit)}</strong>
                  </span>
                  <span
                    className={`font-black ${
                      remaining >= 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    ({remaining >= 0 ? "+" : ""}
                    {moneyFormat(remaining)})
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-[#e0e0e0] shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOver
                      ? "bg-red-500"
                      : actual >= limit * 0.9
                      ? "bg-amber-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min((actual / (limit || 1)) * 100, 100)}%` }}
                />
              </div>

              {/* Overspent categories warnings (if any) */}
              {m.overspentCategories.length > 0 && selectedGroup === "ALL" && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-extrabold text-red-500">
                    Exceeded categories:
                  </span>
                  {m.overspentCategories.map((cat) => (
                    <span
                      key={cat.id}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#e0e0e0] shadow-[inset_1px_1px_3px_#bebebe,_inset_-1px_-1px_3px_#ffffff] text-red-600 flex items-center gap-1.5"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span>{cat.name}</span>
                      <span className="font-mono text-red-500">
                        (+{moneyFormat(cat.diff)})
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
