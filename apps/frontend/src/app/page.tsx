"use client";

import { useState, useEffect } from "react";
import SkeuomorphicWalletDeck from "../components/Wallet/SkeuomorphicCard";
import BudgetOverview from "../components/Home/BudgetOverview";
import ExpenseTrend from "../components/Home/ExpenseTrend";
import LiveTransactionFeed from "../components/Home/LiveTransactionFeed";
import QuickAddTransactionModal from "../components/Home/QuickAddTransactionModal";

export default function Home() {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Global hotkey: 'N' or '+' opens Quick Add when not in form input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return;
      }
      if (e.key === "n" || e.key === "N" || e.key === "+") {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Listen for open-quick-add custom event (e.g. from monkey logo click on Home)
  useEffect(() => {
    const handleOpenQuickAdd = () => setIsQuickAddOpen(true);
    window.addEventListener("open-quick-add", handleOpenQuickAdd);
    return () => window.removeEventListener("open-quick-add", handleOpenQuickAdd);
  }, []);

  return (
    <div className="flex-1 p-4 md:p-6 w-full max-w-[1720px] mx-auto pt-6 relative">
      {/* 2-Column Master Layout: Left side for Wallets, Right side for Main Dashboard */}
      <div className="w-full flex flex-col xl:flex-row gap-8 items-start">
        {/* Left Column: All Wallets stacked vertically */}
        <div className="shrink-0 w-full xl:w-[350px] flex flex-col items-center xl:items-start">
          <SkeuomorphicWalletDeck />
        </div>

        {/* Right Main Dashboard Area */}
        <div className="flex-1 w-full min-w-0 flex flex-col gap-8">
          {/* Top Row: Expanded Monthly Budget + Live Transaction Feed beside it when space allows */}
          <div className="w-full flex flex-col 2xl:flex-row gap-8 items-stretch">
            <div className="flex-1 w-full min-w-0">
              <BudgetOverview />
            </div>
            <div className="w-full 2xl:w-[390px] shrink-0 flex flex-col">
              <LiveTransactionFeed onAddTransaction={() => setIsQuickAddOpen(true)} />
            </div>
          </div>

          {/* Bottom Row: 6-Month Expense Trend across the width */}
          <div className="w-full">
            <ExpenseTrend />
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) for Quick Add Transaction */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="group flex items-center gap-3 px-5 py-3.5 rounded-full bg-[#e0e0e0] shadow-[8px_8px_16px_#bebebe,_-8px_-8px_16px_#ffffff] hover:shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff] active:scale-95 transition-all"
          title="Quick Transaction (Press 'N')"
        >
          <span className="w-8 h-8 rounded-full bg-[#e0e0e0] shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] flex items-center justify-center text-blue-600 font-black text-xl group-hover:rotate-90 transition-transform">
            +
          </span>
          <span className="text-sm font-black text-gray-700 tracking-tight pr-1">
            Quick Add
          </span>
          <kbd className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-gray-300/60 text-gray-500 font-bold">
            N
          </kbd>
        </button>
      </div>

      {/* Quick Add Modal */}
      <QuickAddTransactionModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />
    </div>
  );
}
