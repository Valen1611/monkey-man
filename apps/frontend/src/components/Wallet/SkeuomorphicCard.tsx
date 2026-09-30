"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useWallets, Wallet } from "@/src/hooks/useWallets";
import { moneyFormat } from "@/src/utils/utils";

interface PlasticCardProps {
  wallet: Wallet;
  index?: number;
}

export function PlasticCard({ wallet, index = 0 }: PlasticCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Generate rich plastic gradients based on the wallet base color
  const baseColor = wallet.color || "#1e3a8a";

  return (
    <div
      className="relative w-[340px] h-[215px] select-none cursor-pointer group"
      style={{
        perspective: "1000px",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 3D Card Container */}
      <div
        className="w-full h-full rounded-2xl relative overflow-hidden transition-transform duration-500 ease-out flex flex-col justify-between p-6"
        style={{
          transformStyle: "preserve-3d",
          transform: isHovered
            ? "rotateY(-10deg) rotateX(7deg) translateY(-8px) scale(1.03)"
            : "rotateY(0deg) rotateX(0deg) translateY(0px) scale(1)",
          boxShadow: isHovered
            ? "0 25px 35px -5px rgba(0, 0, 0, 0.45), 0 15px 15px -7px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.6), inset 0 -2px 4px rgba(0, 0, 0, 0.4)"
            : "0 14px 24px -4px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.5), inset 0 -2px 3px rgba(0, 0, 0, 0.35)",
          background: `linear-gradient(135deg, ${baseColor} 0%, #111827 100%)`,
        }}
      >
        {/* Plastic Gloss & Texture Layers */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{
            background:
              "radial-gradient(circle at 20% 15%, rgba(255, 255, 255, 0.35) 0%, transparent 60%), linear-gradient(125deg, rgba(255,255,255,0.4) 0%, transparent 40%, rgba(255,255,255,0.1) 60%, transparent 100%)",
            opacity: isHovered ? 0.95 : 0.7,
          }}
        />

        {/* Micro-ridge plastic border reflection */}
        <div className="absolute inset-0 rounded-2xl border border-white/25 pointer-events-none" />

        {/* Top Header: Logo / Bank Name + Contactless Wave */}
        <div className="relative z-10 flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            {wallet.imageUrl ? (
              <div className="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-md p-1 shadow-md flex items-center justify-center border border-white/40 overflow-hidden">
                <img
                  src={wallet.imageUrl}
                  alt={wallet.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div
                className="w-7 h-7 rounded-lg shadow-inner flex items-center justify-center font-black text-xs text-white uppercase border border-white/30"
                style={{ backgroundColor: baseColor }}
              >
                {wallet.name.slice(0, 2)}
              </div>
            )}
            <span
              className="text-sm font-black tracking-wider text-white uppercase"
              style={{
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.8), 0 0 1px rgba(255, 255, 255, 0.3)",
              }}
            >
              {wallet.name}
            </span>
          </div>

          {/* Contactless Waves Icon */}
          <div className="text-white/70 flex items-center gap-0.5 pt-1">
            <svg
              className="w-5 h-5 text-white/80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 9c3.87 0 7 3.13 7 7" />
              <path d="M5 5c6.08 0 11 4.92 11 11" />
              <path d="M5 1c8.28 0 15 6.72 15 15" />
            </svg>
          </div>
        </div>

        {/* Center: Gold EMV Chip */}
        <div className="relative z-10 flex items-center gap-3 my-auto">
          {/* Metallic Smart Chip */}
          <div
            className="w-11 h-8 rounded-md relative overflow-hidden shadow-inner border border-amber-300/40"
            style={{
              background:
                "linear-gradient(135deg, #fef08a 0%, #ca8a04 50%, #eab308 85%, #fef9c3 100%)",
              boxShadow:
                "inset 0 1px 1px rgba(255, 255, 255, 0.8), inset 0 -1px 2px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            {/* Chip Circuit Etchings */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-amber-950/40" />
            <div className="absolute inset-y-0 left-1/3 w-[1px] bg-amber-950/40" />
            <div className="absolute inset-y-0 right-1/3 w-[1px] bg-amber-950/40" />
            <div className="absolute left-1/3 right-1/3 top-1.5 bottom-1.5 border border-amber-950/40 rounded-sm" />
          </div>
          <span className="text-[10px] font-mono text-white/50 tracking-widest uppercase">
            Debit / Smart
          </span>
        </div>

        {/* Bottom Section: Balance + Embossed Name */}
        <div className="relative z-10 flex justify-between items-end">
          <div>
            <span
              className="text-[9px] uppercase tracking-widest text-white/60 font-bold block mb-0.5"
              style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)" }}
            >
              Available Balance
            </span>
            <span
              className="text-2xl font-black tracking-tight text-white block"
              style={{
                textShadow:
                  "0 2px 4px rgba(0, 0, 0, 0.9), 0 0 2px rgba(255, 255, 255, 0.3)",
                letterSpacing: "0.5px",
              }}
            >
              {moneyFormat(wallet.balance)}
            </span>
          </div>

          <div className="text-right">
            <span
              className="text-[10px] font-mono text-white/70 tracking-widest block"
              style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.9)" }}
            >
              •••• 4028
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SkeuomorphicWalletDeck() {
  const { data: wallets = [], isLoading } = useWallets({
    refetchInterval: 3000,
  });

  const totalBalance = wallets.reduce((acc, w) => acc + (w.balance || 0), 0);

  if (isLoading) {
    return (
      <div className="w-full p-6 rounded-[20px] bg-[#e0e0e0] shadow-[10px_10px_20px_#bebebe,_-10px_-10px_20px_#ffffff] text-center text-gray-500">
        Loading cards...
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Total Balance Header pill */}
      <div className="flex items-center justify-between px-2 w-[340px]">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-gray-500">
            Total Liquid Balance
          </span>
          <h2 className="text-2xl font-black text-gray-800">
            {moneyFormat(totalBalance)}
          </h2>
        </div>
        <Link
          href="/wallets"
          className="text-xs font-black text-gray-700 hover:text-blue-600 px-3 py-1.5 rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 transition-all flex items-center gap-1.5"
          title="Configure and manage wallets"
        >
          <span>⚙️</span>
          <span>Manage</span>
        </Link>
      </div>

      {/* Cards Column (Vertical) */}
      <div className="flex flex-col gap-6 items-center xl:items-start w-full">
        {wallets.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] text-gray-500 text-sm">
            No active wallets found.
          </div>
        ) : (
          wallets.map((wallet, index) => (
            <PlasticCard key={wallet.id} wallet={wallet} index={index} />
          ))
        )}

        {/* Action button to view all details / configure wallets */}
        <Link
          href="/wallets"
          className="w-[340px] py-3.5 rounded-2xl bg-[#e0e0e0] shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] hover:shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] active:scale-95 text-xs font-black text-gray-700 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
        >
          <span>💳</span>
          <span>Configure & Add Wallets →</span>
        </Link>
      </div>
    </div>
  );
}
