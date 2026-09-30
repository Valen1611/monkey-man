"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  headerHeight?: number;
}

const CONFIG_LINKS = [
  {
    name: "Categories",
    href: "/categories",
    icon: "🏷️",
    description: "Manage groups (Fixed, Variable, Savings), colors and limits",
  },
  {
    name: "Automation Rules",
    href: "/rules",
    icon: "⚡",
    description: "Email parser routing, CBU matches and transfer auto-tagging",
  },
  {
    name: "Wallets & Accounts",
    href: "/wallets",
    icon: "💳",
    description: "Add new bank accounts, card logos, colors and initial balances",
  },
];

export default function ConfigDrawer({
  isOpen,
  onClose,
  headerHeight = 84,
}: ConfigDrawerProps) {
  const pathname = usePathname();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 pointer-events-none transition-all duration-300 ease-in-out"
      style={{ top: `${headerHeight}px` }}
    >
      {/* Dimmed Backdrop (sits below header, covers page content) */}
      <div
        className={`absolute inset-0 bg-black/25 backdrop-blur-[2px] transition-opacity duration-300 ease-in-out ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sliding Sidebar Panel */}
      <aside
        className={`absolute right-0 top-0 bottom-0 w-full max-w-sm sm:max-w-md bg-[#e0e0e0] shadow-[-12px_0_30px_rgba(0,0,0,0.12)] border-l border-gray-300/60 flex flex-col justify-between p-6 sm:p-8 transform transition-transform duration-300 ease-out overflow-y-auto custom-scrollbar ${
          isOpen ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-gray-300/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] flex items-center justify-center text-lg">
                ⚙️
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-800 tracking-tight">
                  Configuration
                </h3>
                <p className="text-xs font-semibold text-gray-500">
                  Settings & system master data
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-[#e0e0e0] shadow-[4px_4px_8px_#bebebe,_-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] text-gray-600 font-bold active:scale-95 transition-all flex items-center justify-center text-lg"
              title="Close menu"
            >
              ✕
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 px-1">
              Management Modules
            </span>

            {CONFIG_LINKS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`p-4 rounded-2xl flex items-start gap-4 transition-all ${
                    isActive
                      ? "bg-[#e0e0e0] shadow-[inset_4px_4px_8px_#bebebe,_inset_-4px_-4px_8px_#ffffff] scale-98"
                      : "bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] hover:scale-98 hover:shadow-[inset_2px_2px_5px_#bebebe,_inset_-2px_-2px_5px_#ffffff]"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] flex items-center justify-center text-2xl shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className={`text-sm font-black tracking-tight ${
                        isActive ? "text-blue-600" : "text-gray-800"
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 leading-snug">
                      {item.description}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer shortcuts info */}
        <div className="pt-6 border-t border-gray-300/60 flex flex-col gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
            Keyboard Shortcuts
          </span>
          <div className="flex justify-between items-center text-xs font-semibold text-gray-600">
            <span>Quick Transaction</span>
            <kbd className="px-2 py-0.5 rounded bg-gray-300/60 font-mono font-bold text-gray-700">
              N
            </kbd>
          </div>
          <div className="flex justify-between items-center text-xs font-semibold text-gray-600">
            <span>Close Modals / Sidebar</span>
            <kbd className="px-2 py-0.5 rounded bg-gray-300/60 font-mono font-bold text-gray-700">
              Esc
            </kbd>
          </div>
        </div>
      </aside>
    </div>
  );
}
