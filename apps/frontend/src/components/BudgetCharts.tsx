import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { Category } from '@/src/hooks/useCategories';
import { Budget } from '@/src/services/budgetService';
import { moneyFormat } from '@/src/utils/utils';

interface BudgetChartsProps {
    categories: Category[];
    budgets: Budget[];
}

export default function BudgetCharts({ categories, budgets }: BudgetChartsProps) {
    // 1. Group Data
    const getGroupTotal = (groupName: string) => {
        return categories
            .filter(c => c.group === groupName)
            .reduce((sum, c) => {
                const b = budgets.find(b => b.categoryId === c.id);
                return sum + (b?.limit || 0);
            }, 0);
    };

    const groupData = [
        { name: 'Fixed', value: getGroupTotal('FIXED'), color: '#3b82f6', groupId: 'FIXED' },
        { name: 'Variable', value: getGroupTotal('VARIABLE'), color: '#f59e0b', groupId: 'VARIABLE' },
    ].filter(d => d.value > 0);

    // 2. Category Data (aligned with groups)
    const groupOrder: Record<string, number> = { 'FIXED': 1, 'VARIABLE': 2 };
    const categoryData = categories
        .filter(c => ['FIXED', 'VARIABLE'].includes(c.group))
        .map(c => {
            const b = budgets.find(b => b.categoryId === c.id);
            return {
                name: c.name,
                value: b?.limit || 0,
                color: c.color,
                group: c.group
            };
        })
        .filter(d => d.value > 0)
        .sort((a, b) => {
            if (groupOrder[a.group] !== groupOrder[b.group]) {
                return groupOrder[a.group] - groupOrder[b.group];
            }
            return b.value - a.value;
        });

    // Custom Tooltip
    const renderTooltip = ({ active, payload }: TooltipContentProps) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload as { name: string; value: number; color?: string } | undefined;
            if (!data) return null;
            const entry = payload[0] as unknown as { percent?: number };
            const percent = typeof entry.percent === 'number' ? (entry.percent * 100).toFixed(1) + '%' : '';
            return (
                <div className="bg-[#e0e0e0] px-4 py-2 rounded-xl shadow-[5px_5px_10px_#bebebe,_-5px_-5px_10px_#ffffff] text-sm border-none outline-none">
                    <p className="font-bold text-gray-700" style={{ color: data.color }}>{data.name}</p>
                    <p className="font-semibold text-gray-600">
                        {moneyFormat(data.value)} {percent && <span className="text-gray-400 font-normal ml-1">({percent})</span>}
                    </p>
                </div>
            );
        }
        return null;
    };

    if (groupData.length === 0 && categoryData.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-8 w-full max-w-lg mx-auto xl:max-w-none">
            <div className="p-6 rounded-[20px] bg-[#e0e0e0] shadow-[inset_11px_11px_16px_#a4a4a4,_inset_-11px_-11px_10px_#ffffff] flex flex-col items-center">
                <h3 className="text-lg font-bold text-gray-600 mb-8">Budget Distribution</h3>
                <div className="relative w-[300px] h-[300px] rounded-full bg-[#e0e0e0] shadow-[5px_5px_15px_#bebebe,_-5px_-5px_15px_#ffffff] flex items-center justify-center">
                    {/* Inner Neumorphic Cutout (creates the doughnut hole, placed behind the chart so tooltips float above) */}
                    <div className="absolute w-[100px] h-[100px] rounded-full bg-[#e0e0e0] shadow-[inset_5px_5px_10px_#bebebe,_inset_-5px_-5px_10px_#ffffff]" />

                    {/* The Multi-Level Pie Chart */}
                    <div className="absolute inset-0 z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                {/* Outer Ring: Groups */}
                                <Pie
                                    data={groupData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={105}
                                    outerRadius={150}
                                    paddingAngle={0}
                                    dataKey="value"
                                    stroke="#e0e0e0"
                                    strokeWidth={3}
                                >
                                    {groupData.map((entry, index) => (
                                        <Cell key={`cell-grp-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>

                                {/* Inner Ring: Categories */}
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={105}
                                    paddingAngle={0}
                                    dataKey="value"
                                    stroke="#e0e0e0"
                                    strokeWidth={3}
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-cat-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                
                                <Tooltip content={renderTooltip} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Legends */}
                <div className="mt-8 flex flex-col gap-6 w-full">
                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-3">Groups</h4>
                        <div className="flex flex-wrap justify-center gap-4">
                            {groupData.map(entry => (
                                <div key={entry.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full shadow-[inset_1px_1px_3px_rgba(0,0,0,0.3)]" style={{ backgroundColor: entry.color }} />
                                    <span className="text-xs font-bold text-gray-600 uppercase">{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-3">Categories</h4>
                        <div className="flex flex-wrap justify-center gap-4">
                            {categoryData.map(entry => (
                                <div key={entry.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full shadow-[inset_1px_1px_3px_rgba(0,0,0,0.3)]" style={{ backgroundColor: entry.color }} />
                                    <span className="text-xs font-bold text-gray-600 uppercase">{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
