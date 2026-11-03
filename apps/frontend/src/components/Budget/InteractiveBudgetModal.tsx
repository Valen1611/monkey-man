"use client";

import { useState, useEffect, useRef } from "react";
import { Category, useDeleteCategory } from "@/src/hooks/useCategories";
import { Budget } from "@/src/services/budgetService";
import { useUpdateBudget } from "@/src/hooks/useBudgets";
import { moneyFormat } from "@/src/utils/utils";

interface InteractiveBudgetModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupName: string;
    groupLabel: string;
    groupColor: string;
    categories: Category[];
    budgets: Budget[];
    yearMonth: string;
    totalLimit: number;
    onAddCategory: () => void;
}

interface CategoryAllocation {
    id: string;
    name: string;
    color: string;
    limit: number;
    usage: number;
    percentage: number;
    startAngle: number;
    endAngle: number;
}

export default function InteractiveBudgetModal({
    isOpen,
    onClose,
    groupName,
    groupLabel,
    groupColor,
    categories,
    budgets,
    yearMonth,
    totalLimit,
    onAddCategory,
}: InteractiveBudgetModalProps) {
    const updateMutation = useUpdateBudget();
    const deleteMutation = useDeleteCategory();
    const svgRef = useRef<SVGSVGElement>(null);
    const [allocations, setAllocations] = useState<CategoryAllocation[]>([]);
    const [totalBudget, setTotalBudget] = useState(0);
    const [draggingSlice, setDraggingSlice] = useState<number | null>(null);
    const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [incrementAmount, setIncrementAmount] = useState(1000);

    const centerX = 250;
    const centerY = 250;
    const radius = 150;
    const expandedRadius = 170;

    const INCREMENT_OPTIONS = [500, 1000, 5000, 10000];

    // Initialize allocations
    useEffect(() => {
        if (isOpen) {
            const initialAllocations = categories.map((cat) => {
                const budget = budgets.find((b) => b.categoryId === cat.id);
                return {
                    id: cat.id,
                    name: cat.name,
                    color: cat.color,
                    limit: budget?.limit || 0,
                    usage: budget?.usage || 0,
                    percentage: 0,
                    startAngle: 0,
                    endAngle: 0,
                };
            });
            const total = initialAllocations.reduce((sum, a) => sum + a.limit, 0);
            setTotalBudget(total || 1000); // Default to 1000 if no budgets set
            calculateAngles(initialAllocations, total || 1000);
            setHasChanges(false);
        }
    }, [isOpen, categories, budgets]);

    const calculateAngles = (allocs: CategoryAllocation[], total: number) => {
        let currentAngle = -90; // Start at top
        const updated = allocs.map((alloc) => {
            const percentage = total > 0 ? (alloc.limit / total) * 100 : 0;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;
            return { ...alloc, percentage, startAngle, endAngle };
        });
        setAllocations(updated);
    };

    const polarToCartesian = (angle: number, r: number) => {
        const rad = (angle * Math.PI) / 180;
        return {
            x: centerX + r * Math.cos(rad),
            y: centerY + r * Math.sin(rad),
        };
    };

    const getArcPath = (startAngle: number, endAngle: number, r: number) => {
        const start = polarToCartesian(startAngle, r);
        const end = polarToCartesian(endAngle, r);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;

        return `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
    };

    const handleSliceMouseDown = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setDraggingSlice(index);
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (draggingSlice === null || !svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - centerX;
        const y = e.clientY - rect.top - centerY;
        let angle = (Math.atan2(y, x) * 180) / Math.PI;

        // Normalize angle to -90 to 270 range
        if (angle < -90) angle += 360;

        const slice = allocations[draggingSlice];
        const prevSlice = draggingSlice > 0 ? allocations[draggingSlice - 1] : null;
        const nextSlice = draggingSlice < allocations.length - 1 ? allocations[draggingSlice + 1] : null;

        // Calculate the sum of all OTHER slices
        const otherSlicesTotal = allocations.reduce((sum, alloc, idx) => 
            idx === draggingSlice ? sum : sum + alloc.limit, 0
        );

        // Maximum this slice can be is total budget minus other slices
        const maxAllowedLimit = totalBudget - otherSlicesTotal;

        // Constrain angle between previous slice end and next slice start (or end of circle)
        const minAngle = prevSlice ? prevSlice.endAngle + 5 : -90; // 5 degree minimum
        
        // Calculate max angle based on available budget
        const maxPercentage = maxAllowedLimit / totalBudget * 100;
        const maxAngleRange = (maxPercentage / 100) * 360;
        const maxAngle = minAngle + maxAngleRange;

        const constrainedAngle = Math.max(minAngle, Math.min(maxAngle, angle));

        // Calculate new limit based on angle change
        const newStartAngle = prevSlice ? prevSlice.endAngle : -90;
        const newAngle = constrainedAngle - newStartAngle;
        const newPercentage = (newAngle / 360) * 100;
        const newLimit = (newPercentage / 100) * totalBudget;
        
        // Snap to nearest 1000 and ensure we don't exceed available budget
        const snappedLimit = Math.round(newLimit / 1000) * 1000;
        const finalLimit = Math.min(snappedLimit, maxAllowedLimit);

        // Update this slice
        const newAllocations = [...allocations];
        newAllocations[draggingSlice] = {
            ...slice,
            limit: Math.max(0, finalLimit),
        };

        // Recalculate from this point forward
        calculateAngles(newAllocations, totalBudget);
        setHasChanges(true);
    };

    const handleMouseUp = () => {
        setDraggingSlice(null);
    };

    const handleTotalBudgetChange = (delta: number) => {
        const newTotal = Math.max(100, totalBudget + delta);
        setTotalBudget(newTotal);
        calculateAngles(allocations, newTotal);
        setHasChanges(true);
    };

    const handleDeleteCategory = (categoryId: string) => {
        if (confirm("Are you sure you want to delete this category? This will remove all associated transactions.")) {
            deleteMutation.mutate(categoryId, {
                onSuccess: () => {
                    // Remove from local state
                    const newAllocations = allocations.filter((a) => a.id !== categoryId);
                    setAllocations(newAllocations);
                    const newTotal = newAllocations.reduce((sum, a) => sum + a.limit, 0);
                    setTotalBudget(newTotal || 1000);
                    calculateAngles(newAllocations, newTotal || 1000);
                }
            });
        }
    };

    const handleGiveBudget = (categoryId: string) => {
        const allocation = allocations.find((a) => a.id === categoryId);
        if (!allocation) return;
        
        // Give it 5% of total budget or minimum $1000
        const newLimit = Math.max(1000, Math.round(totalBudget * 0.05 / 1000) * 1000);
        const newAllocations = allocations.map((a) => 
            a.id === categoryId ? { ...a, limit: newLimit } : a
        );
        setAllocations(newAllocations);
        calculateAngles(newAllocations, totalBudget);
        setHasChanges(true);
    };

    const handleSaveAll = async () => {
        try {
            for (const allocation of allocations) {
                await updateMutation.mutateAsync({
                    yearMonth,
                    categoryId: allocation.id,
                    limit: allocation.limit,
                });
            }
            setHasChanges(false);
            onClose();
        } catch (error) {
            console.error("Failed to save allocations", error);
        }
    };

    if (!isOpen) return null;

    const totalUsed = allocations.reduce((sum, a) => sum + a.usage, 0);
    const usedPercentage = totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div 
                    className="w-full max-w-4xl bg-[#e0e0e0] rounded-[24px] shadow-[10px_10px_30px_#bebebe,_-10px_-10px_30px_#ffffff] p-8 pointer-events-auto animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <div>
                            <h3 className="text-2xl font-black text-gray-800">Interactive Budget Pie</h3>
                            <p className="text-sm text-gray-600 font-semibold mt-1">
                                Drag slices to adjust • Expand/shrink total from outside
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 transition-all flex items-center justify-center text-gray-600 font-bold text-xl"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Main Content: Pie Chart + Controls */}
                    <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
                        {/* Pie Chart */}
                        <div className="flex-1 flex items-center justify-center">
                            <div className="relative">
                                <svg
                                    ref={svgRef}
                                    width="500"
                                    height="500"
                                    className="select-none"
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                >
                                    {/* Outer circle for total budget adjustment */}
                                    <circle
                                        cx={centerX}
                                        cy={centerY}
                                        r={expandedRadius + 30}
                                        fill="none"
                                        stroke="#d0d0d0"
                                        strokeWidth="40"
                                        strokeDasharray="5,5"
                                        opacity="0.3"
                                    />

                                    {/* Budget expansion controls */}
                                    <g>
                                        {/* Increase budget button (top) */}
                                        <circle
                                            cx={centerX}
                                            cy={centerY - expandedRadius - 50}
                                            r="20"
                                            fill="#22c55e"
                                            className="cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => handleTotalBudgetChange(incrementAmount)}
                                        />
                                        <text
                                            x={centerX}
                                            y={centerY - expandedRadius - 45}
                                            textAnchor="middle"
                                            fill="white"
                                            fontSize="24"
                                            fontWeight="bold"
                                            className="pointer-events-none"
                                        >
                                            +
                                        </text>

                                        {/* Increment amount label (top) */}
                                        <text
                                            x={centerX}
                                            y={centerY - expandedRadius - 75}
                                            textAnchor="middle"
                                            fill="#22c55e"
                                            fontSize="11"
                                            fontWeight="bold"
                                            className="pointer-events-none"
                                        >
                                            +{moneyFormat(incrementAmount)}
                                        </text>

                                        {/* Decrease budget button (bottom) */}
                                        <circle
                                            cx={centerX}
                                            cy={centerY + expandedRadius + 50}
                                            r="20"
                                            fill="#ef4444"
                                            className="cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => handleTotalBudgetChange(-incrementAmount)}
                                        />
                                        <text
                                            x={centerX}
                                            y={centerY + expandedRadius + 56}
                                            textAnchor="middle"
                                            fill="white"
                                            fontSize="24"
                                            fontWeight="bold"
                                            className="pointer-events-none"
                                        >
                                            −
                                        </text>

                                        {/* Increment amount label (bottom) */}
                                        <text
                                            x={centerX}
                                            y={centerY + expandedRadius + 77}
                                            textAnchor="middle"
                                            fill="#ef4444"
                                            fontSize="11"
                                            fontWeight="bold"
                                            className="pointer-events-none"
                                        >
                                            -{moneyFormat(incrementAmount)}
                                        </text>
                                    </g>

                                    {/* Pie slices */}
                                    {allocations.map((alloc, index) => {
                                        const isHovered = hoveredSlice === index;
                                        const isDragging = draggingSlice === index;
                                        const r = isHovered || isDragging ? expandedRadius : radius;

                                        return (
                                            <g key={alloc.id}>
                                                {/* Main slice */}
                                                <path
                                                    d={getArcPath(alloc.startAngle, alloc.endAngle, r)}
                                                    fill={alloc.color}
                                                    stroke="white"
                                                    strokeWidth="3"
                                                    opacity={isDragging ? 0.8 : 1}
                                                    className="cursor-move transition-all duration-200"
                                                    onMouseDown={(e) => handleSliceMouseDown(index, e)}
                                                    onMouseEnter={() => setHoveredSlice(index)}
                                                    onMouseLeave={() => setHoveredSlice(null)}
                                                />

                                                {/* Usage overlay */}
                                                {alloc.limit > 0 && alloc.usage > 0 && (
                                                    <path
                                                        d={getArcPath(
                                                            alloc.startAngle,
                                                            alloc.startAngle + ((alloc.endAngle - alloc.startAngle) * Math.min(alloc.usage / alloc.limit, 1)),
                                                            r
                                                        )}
                                                        fill="black"
                                                        opacity="0.25"
                                                        className="pointer-events-none"
                                                    />
                                                )}

                                                {/* Label */}
                                                {alloc.percentage > 5 && (
                                                    <text
                                                        x={polarToCartesian((alloc.startAngle + alloc.endAngle) / 2, r * 0.65).x}
                                                        y={polarToCartesian((alloc.startAngle + alloc.endAngle) / 2, r * 0.65).y}
                                                        textAnchor="middle"
                                                        dominantBaseline="middle"
                                                        fill="white"
                                                        fontSize="12"
                                                        fontWeight="bold"
                                                        className="pointer-events-none drop-shadow-lg"
                                                    >
                                                        {alloc.percentage.toFixed(0)}%
                                                    </text>
                                                )}
                                            </g>
                                        );
                                    })}

                                    {/* Center circle with total */}
                                    <circle cx={centerX} cy={centerY} r="80" fill="#e0e0e0" stroke="#c0c0c0" strokeWidth="2" />
                                    <text
                                        x={centerX}
                                        y={centerY - 10}
                                        textAnchor="middle"
                                        fill="#666"
                                        fontSize="12"
                                        fontWeight="bold"
                                    >
                                        Total Budget
                                    </text>
                                    <text
                                        x={centerX}
                                        y={centerY + 12}
                                        textAnchor="middle"
                                        fill="#333"
                                        fontSize="18"
                                        fontWeight="black"
                                    >
                                        {moneyFormat(totalBudget)}
                                    </text>
                                    <text
                                        x={centerX}
                                        y={centerY + 30}
                                        textAnchor="middle"
                                        fill={usedPercentage > 100 ? "#ef4444" : "#22c55e"}
                                        fontSize="11"
                                        fontWeight="bold"
                                    >
                                        {usedPercentage.toFixed(0)}% used
                                    </text>
                                </svg>
                            </div>
                        </div>

                        {/* Legend & Details */}
                        <div className="w-full lg:w-80 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                            {/* Increment Selector */}
                            <div className="p-4 rounded-xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff]">
                                <h4 className="text-xs font-black uppercase text-gray-600 mb-3">Adjust Increment</h4>
                                <div className="grid grid-cols-4 gap-2">
                                    {INCREMENT_OPTIONS.map((amount) => (
                                        <button
                                            key={amount}
                                            onClick={() => setIncrementAmount(amount)}
                                            className={`px-3 py-2 rounded-lg text-xs font-black transition-all ${
                                                incrementAmount === amount
                                                    ? "bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff] text-blue-600 scale-95"
                                                    : "bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] text-gray-700 hover:text-gray-900"
                                            }`}
                                        >
                                            {amount >= 1000 ? `$${amount / 1000}k` : `$${amount}`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-[#e0e0e0] shadow-[inset_3px_3px_6px_#bebebe,_inset_-3px_-3px_6px_#ffffff]">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-black uppercase text-gray-600">Category Breakdown</h4>
                                    <button
                                        onClick={onAddCategory}
                                        className="px-2 py-1 rounded-lg bg-[#e0e0e0] shadow-[2px_2px_4px_#bebebe,_-2px_-2px_4px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 transition-all text-xs font-black text-blue-600"
                                    >
                                        + New
                                    </button>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {allocations.map((alloc) => (
                                        <div key={alloc.id} className="group relative">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div
                                                        className="w-4 h-4 rounded-full shrink-0"
                                                        style={{ backgroundColor: alloc.color }}
                                                    />
                                                    <span className="font-bold text-gray-800 truncate">{alloc.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-right">
                                                        {alloc.limit === 0 ? (
                                                            <div className="text-xs text-gray-400 font-semibold">No budget</div>
                                                        ) : (
                                                            <>
                                                                <div className="font-black text-gray-900">{moneyFormat(alloc.limit)}</div>
                                                                <div className="text-xs text-gray-500">
                                                                    {moneyFormat(alloc.usage)} used
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    {/* Action buttons - show on hover */}
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-1">
                                                        {alloc.limit === 0 && (
                                                            <button
                                                                onClick={() => handleGiveBudget(alloc.id)}
                                                                className="w-6 h-6 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-black flex items-center justify-center transition-colors"
                                                                title="Allocate budget"
                                                            >
                                                                +
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteCategory(alloc.id)}
                                                            className="w-6 h-6 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-black flex items-center justify-center transition-colors"
                                                            title="Delete category"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-100/50 to-purple-100/50 border border-blue-200">
                                <h4 className="text-xs font-black uppercase text-gray-700 mb-2">💡 How to Use</h4>
                                <ul className="text-xs text-gray-700 space-y-1 font-semibold">
                                    <li>• Select increment size above ($500 - $10k)</li>
                                    <li>• Click <span className="text-green-600 font-black">+</span> to increase total budget</li>
                                    <li>• Click <span className="text-red-600 font-black">−</span> to decrease total budget</li>
                                    <li>• Drag pie slices to adjust (snaps to $1k)</li>
                                    <li>• Hover over categories for actions</li>
                                    <li>• <span className="text-green-600 font-black">+</span> on zero-budget items to allocate</li>
                                    <li>• Dark overlay shows spending</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-3 mt-6 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 transition-all text-sm font-black text-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveAll}
                            disabled={!hasChanges || updateMutation.isPending}
                            className="flex-1 px-6 py-3 rounded-xl bg-[#e0e0e0] shadow-[3px_3px_6px_#bebebe,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bebebe,_inset_-2px_-2px_4px_#ffffff] active:scale-95 transition-all text-sm font-black text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {updateMutation.isPending ? "Saving..." : hasChanges ? "Save All Changes" : "No Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
