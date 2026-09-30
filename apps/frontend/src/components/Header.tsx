"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallets } from "../hooks/useWallets";
import { useBudgets } from "../hooks/useBudgets";
import { moneyFormat } from "../utils/utils";
import ConfigDrawer from "./ConfigDrawer";

import { Michroma } from "next/font/google";

const fuenteHeader = Michroma({ 
    subsets: ["latin"], 
    weight: ["400"] 
});

export default function Header() {
    const pathname = usePathname();
    const { data: wallets = [] } = useWallets();
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [headerHeight, setHeaderHeight] = useState(88);
    const headerRef = useRef<HTMLElement>(null);

    // Measure header height on mount and resize
    useEffect(() => {
        const updateHeight = () => {
            if (headerRef.current) {
                setHeaderHeight(headerRef.current.offsetHeight);
            }
        };
        updateHeight();
        window.addEventListener("resize", updateHeight);
        return () => window.removeEventListener("resize", updateHeight);
    }, []);

    // Current month budget stats
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const { data: budgets = [] } = useBudgets(currentMonthStr);

    const expenseBudgets = budgets.filter(
        (b) => b.category?.group && ["FIXED", "VARIABLE", "SAVINGS"].includes(b.category.group)
    );
    const totalBudget = expenseBudgets.reduce((acc, b) => acc + (b.limit || 0), 0);
    const spentBudget = expenseBudgets.reduce((acc, b) => acc + (b.usage || 0), 0);

    return (
        <>
            <header 
                ref={headerRef}
                className={`sticky w-full top-0 z-40 px-4 sm:px-6 py-3 bg-[#e0e0e0] shadow-[5px_5px_15px_#bebebe,_-5px_-5px_15px_#ffffff] ${fuenteHeader.className}`}
            >
                <div className="w-full max-w-[1720px] mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6">
                    {/* LEFT COLUMN: Total / Spent (far left) + Budget button (next to center logo) */}
                    <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                        {/* Current Month Budget: Spent / Total */}
                        <div className="flex flex-col items-start px-3 sm:px-4 py-1.5 rounded-xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] shrink-0">
                            <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                                Spent / Limit
                            </span>
                            <div className="flex items-baseline gap-1 text-xs sm:text-sm font-black">
                                <span className={spentBudget > totalBudget && totalBudget > 0 ? "text-red-500" : "text-gray-800"}>
                                    {moneyFormat(spentBudget)}
                                </span>
                                <span className="text-gray-400 font-bold">/</span>
                                <span className="text-blue-600">
                                    {moneyFormat(totalBudget)}
                                </span>
                            </div>
                        </div>

                        {/* Budget Link */}
                        <Link
                            href="/budget"
                            className={`ml-auto rounded-xl px-3 sm:px-5 py-2 text-base sm:text-xl font-bold transition-all duration-300 ${
                                pathname === "/budget"
                                    ? "shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff] text-blue-500 scale-95"
                                    : "shadow-[4px_4px_8px_#bebebe,_-4px_-4px_8px_#ffffff] text-gray-500 hover:shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff] hover:scale-95"
                            }`}
                        >
                            Budget
                        </Link>
                    </div>

                    {/* CENTER COLUMN: Monkey Logo */}
                    <div className="flex items-center justify-center shrink-0 px-1 sm:px-4">
                        <Link 
                            href="/" 
                            onClick={(e) => {
                                if (pathname === "/") {
                                    e.preventDefault();
                                    window.dispatchEvent(new CustomEvent("open-quick-add"));
                                }
                            }}
                            className="rounded-[50px] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] hover:shadow-[inset_5px_5px_10px_#bebebe,_inset_-5px_-5px_10px_#ffffff] active:scale-95 transition-all flex items-center justify-center p-1 cursor-pointer"
                            title={pathname === "/" ? "Quick Transaction (Add)" : "Go to Home"}
                        >
                            <Image
                                className="w-[65px] sm:w-[80px]"
                                src="/monkey-logo.png"
                                alt="Monkey logo"
                                width={85}
                                height={85}
                                priority
                            />
                        </Link>
                    </div>

                    {/* RIGHT COLUMN: Log button (next to center logo) + Wallets & Config button (far right) */}
                    <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                        {/* Log Link */}
                        <Link
                            href="/log"
                            className={`rounded-xl px-3 sm:px-5 py-2 text-base sm:text-xl font-bold transition-all duration-300 ${
                                pathname === "/log"
                                    ? "shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff] text-blue-500 scale-95"
                                    : "shadow-[4px_4px_8px_#bebebe,_-4px_-4px_8px_#ffffff] text-gray-500 hover:shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff] hover:scale-95"
                            }`}
                        >
                            Log
                        </Link>

                        <div className="ml-auto flex items-center gap-3 sm:gap-4 shrink-0">
                            {/* Compact Wallet Balance Badges (desktop) */}
                            <div className="hidden xl:flex gap-3 items-center">
                                {wallets.map((wallet) => (
                                    <div 
                                        key={wallet.id} 
                                        className="flex flex-col items-end px-3 py-1.5 rounded-xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff]"
                                    >
                                        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">{wallet.name}</span>
                                        <span className="text-xs font-black" style={{ color: wallet.color }}>
                                            {moneyFormat(wallet.balance)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Settings / Config Sidebar Trigger (Toggles open/close) */}
                            <button
                                onClick={() => setIsConfigOpen((prev) => !prev)}
                                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#e0e0e0] flex items-center justify-center text-lg sm:text-xl transition-all duration-300 ${
                                    isConfigOpen
                                        ? "shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff] scale-95 text-blue-600"
                                        : "shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] hover:shadow-[inset_2px_2px_5px_#bebebe,_inset_-2px_-2px_5px_#ffffff] text-gray-700 hover:scale-95"
                                } outline-none`}
                                title="Configuration & Settings"
                                aria-label="Configuration & Settings"
                            >
                                ⚙️
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Right-Hand Config Sidebar Drawer */}
            <ConfigDrawer
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
                headerHeight={headerHeight}
            />
        </>
    );
}
