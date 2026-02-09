import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, TrendingUp } from 'lucide-react';

const AnalyticsWidget = ({ incidents }) => {
    const chartData = useMemo(() => {
        // Initialize 24H buckets (00:00 to 23:00)
        const hours = Array.from({ length: 12 }, (_, i) => {
            const h = i * 2; // 0, 2, 4... 22
            return {
                hour: `${h.toString().padStart(2, '0')}:00`,
                count: 0
            };
        });

        incidents.forEach(inc => {
            let date;
            // Robust Date Parsing (Dashboard sends serialized dates or Timestamp objects)
            if (inc.timestamp?.toDate) {
                date = inc.timestamp.toDate();
            } else if (inc.timestamp instanceof Date) {
                date = inc.timestamp;
            } else {
                date = new Date(inc.timestamp || Date.now()); // Fallback to now if missing
            }

            const h = date.getHours();
            // Map 0-23 hour to one of our 12 buckets (0=0,1; 2=2,3; etc.)
            const bucketIndex = Math.floor(h / 2);
            if (bucketIndex >= 0 && bucketIndex < 12) {
                hours[bucketIndex].count += 1;
            }
        });

        return hours;
    }, [incidents]);

    return (
        <div className="glass-card p-6 mt-6 border-white/5">
            <header className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <TrendingUp size={16} className="text-brand-accent shadow-neon-blue" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Incident Distribution</h3>
                </div>
                <span className="text-[9px] font-mono text-gray-600 uppercase">Cycle: 24H</span>
            </header>

            <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <XAxis
                            dataKey="hour"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 8, fontFamily: 'JetBrains Mono' }}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{
                                backgroundColor: '#111112',
                                border: '1px solid #27272A',
                                borderRadius: '8px',
                                fontSize: '10px',
                                fontFamily: 'JetBrains Mono'
                            }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={index}
                                    fill={entry.count > 5 ? '#F87171' : '#3B82F6'}
                                    fillOpacity={0.6}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-gray-600 uppercase">Alert Rate</span>
                    <span className="text-xs font-black text-brand-secondary font-mono">{(incidents.length / 24).toFixed(2)} /HR</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[8px] font-bold text-gray-600 uppercase">Active Load</span>
                    <span className="text-xs font-black text-police-red font-mono">{incidents.length} EVENTS</span>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsWidget;
