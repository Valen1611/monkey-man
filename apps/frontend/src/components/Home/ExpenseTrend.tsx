"use client";

import { useState, useEffect } from "react";
import { useMonthlyExpenses } from "@/src/hooks/useStats";
import { moneyFormat } from "@/src/utils/utils";

type ExpenseGroup = "FIXED" | "VARIABLE" | "SAVINGS";

interface GroupOption {
  key: ExpenseGroup;
  label: string;
  color: string;
}

const AVAILABLE_GROUPS: GroupOption[] = [
  { key: "FIXED", label: "Fixed", color: "#ef4444" },
  { key: "VARIABLE", label: "Variable", color: "#eab308" },
  { key: "SAVINGS", label: "Savings", color: "#14b8a6" },
];

const STORAGE_KEY = "monkey_man_trend_groups";

export default function ExpenseTrend() {
  const { data: expenses = [], isLoading } = useMonthlyExpenses();
  const [selectedGroups, setSelectedGroups] = useState<ExpenseGroup[]>([
    "FIXED",
    "VARIABLE",
    "SAVINGS",
  ]);

  // Load user group selection preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedGroups(parsed);
        }
      }
    } catch {
      // LocalStorage read error fallback
    }
  }, []);

  const toggleGroup = (groupKey: ExpenseGroup) => {
    setSelectedGroups((prev) => {
      let updated: ExpenseGroup[];
      if (prev.includes(groupKey)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        updated = prev.filter((k) => k !== groupKey);
      } else {
        updated = [...prev, groupKey];
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // LocalStorage write error fallback
      }
      return updated;
    });
  };

  // Calculate monthly totals based on currently selected groups
  const monthData = expenses.map((expense) => {
    const total = selectedGroups.reduce(
      (acc, g) => acc + (expense.byGroup?.[g] || 0),
      0
    );
    const [year, month] = expense.month.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = date.toLocaleString("es-AR", { month: "short" });

    return {
      monthKey: expense.month,
      monthName,
      year,
      total,
      byGroup: expense.byGroup || {},
    };
  });

  const maxTotal = Math.max(...monthData.map((m) => m.total), 1);

  return (
    <div className="w-full p-6 lg:p-8 rounded-[24px] bg-[#e0e0e0] shadow-[10px_10px_20px_#bebebe,_-10px_-10px_20px_#ffffff] flex flex-col gap-6">
      {/* Header and Group Selector */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="text-2xl font-black text-gray-800 tracking-tight">6-Month Trend</h3>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">
            Spending trajectory across selected expense groups
          </p>
        </div>

        {/* Group Selector Pills */}
        <div className="flex items-center gap-2 bg-[#e0e0e0] p-1.5 rounded-2xl shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff]">
          <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider px-2">
            Filter:
          </span>
          {AVAILABLE_GROUPS.map((group) => {
            const isSelected = selectedGroups.includes(group.key);
            return (
              <button
                key={group.key}
                type="button"
                onClick={() => toggleGroup(group.key)}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all active:scale-95 ${
                  isSelected
                    ? "bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] text-gray-800"
                    : "text-gray-400 opacity-60 hover:opacity-100 hover:text-gray-600"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: isSelected ? group.color : "#9ca3af",
                  }}
                />
                <span>{group.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Section */}
      {isLoading ? (
        <div className="text-gray-500 text-center py-16 text-sm font-semibold">
          Loading trend data...
        </div>
      ) : monthData.length === 0 ? (
        <div className="text-gray-500 text-center py-16 text-sm font-semibold">
          No data available
        </div>
      ) : (
        <div className="w-full flex items-end justify-between gap-3 md:gap-6 pt-8 pb-2">
          {monthData.map((item) => {
            const percentage = (item.total / maxTotal) * 100;
            const isCurrentMonth = item.monthKey === new Date().toISOString().slice(0, 7);

            return (
              <div
                key={item.monthKey}
                className="flex-1 flex flex-col items-center gap-3 group relative"
              >
                {/* Visible Amount on top of each bar */}
                <div className="text-xs font-extrabold text-gray-700 transition-transform group-hover:scale-105 text-center">
                  <span className={item.total > 0 ? "text-gray-900 font-black" : "text-gray-400"}>
                    {moneyFormat(item.total)}
                  </span>
                </div>

                {/* Neumorphic Vertical Bar Track with Stacked Group Colors */}
                <div className="w-full max-w-[80px] h-48 bg-[#d6d6d6] rounded-2xl relative flex items-end p-1.5 shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff]">
                  {item.total > 0 ? (
                    <div
                      className="w-full rounded-xl overflow-hidden flex flex-col-reverse transition-all duration-700 ease-out shadow-sm"
                      style={{
                        height: `${Math.max(percentage, 6)}%`,
                      }}
                    >
                      {AVAILABLE_GROUPS.map((group) => {
                        if (!selectedGroups.includes(group.key)) return null;
                        const groupAmount = item.byGroup[group.key] || 0;
                        if (groupAmount <= 0) return null;
                        const segmentPercent = (groupAmount / item.total) * 100;

                        return (
                          <div
                            key={group.key}
                            className="w-full transition-all duration-500"
                            style={{
                              height: `${segmentPercent}%`,
                              backgroundColor: group.color,
                            }}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="w-full h-1 rounded-full bg-gray-300/80 mx-auto mb-1" />
                  )}
                </div>

                {/* Month Name & Year */}
                <div className="flex flex-col items-center">
                  <span
                    className={`text-xs font-extrabold capitalize ${
                      isCurrentMonth ? "text-blue-600 font-black" : "text-gray-600"
                    }`}
                  >
                    {item.monthName}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">
                    {item.year}
                  </span>
                </div>

                {/* Hover Breakdown Tooltip */}
                {item.total > 0 && (
                  <div className="absolute bottom-full mb-3 hidden group-hover:flex flex-col gap-1 p-3 rounded-xl bg-gray-900/90 backdrop-blur-md text-white shadow-xl z-30 pointer-events-none min-w-[140px] text-xs">
                    <span className="font-bold text-gray-300 pb-1 border-b border-gray-700">
                      {item.monthName} {item.year}
                    </span>
                    {selectedGroups.map((g) => {
                      const amount = item.byGroup[g] || 0;
                      if (amount === 0) return null;
                      const opt = AVAILABLE_GROUPS.find((o) => o.key === g);
                      return (
                        <div key={g} className="flex justify-between items-center gap-2 pt-0.5">
                          <span className="text-gray-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: opt?.color }} />
                            {opt?.label}:
                          </span>
                          <span className="font-semibold text-gray-200">
                            {moneyFormat(amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
