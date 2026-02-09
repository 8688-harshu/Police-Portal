import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Activity, TrendingUp, AlertTriangle, ShieldCheck, Map as MapIcon, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const AnalyticsDashboard = ({ incidents, sosAlerts, riskZones }) => {
    // Process Data for Incident Trends
    const trendData = useMemo(() => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return days.map(day => ({
            name: day,
            incidents: Math.floor(Math.random() * 20) + 5,
            sos: Math.floor(Math.random() * 10) + 2
        }));
    }, []);

    // Process Data for Incident Types
    const typeData = [
        { name: 'Civil Unrest', value: 400, color: '#F87171' },
        { name: 'Theft', value: 300, color: '#3B82F6' },
        { name: 'Medical', value: 200, color: '#34D399' },
        { name: 'Assault', value: 100, color: '#FBBF24' },
    ];

    const stats = [
        { label: 'Total Incidents', value: incidents.length, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Active SOS', value: sosAlerts.filter(a => a.status === 'pending').length, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
        { label: 'Risk Zones', value: riskZones.length, icon: MapIcon, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
        { label: 'Clearance Rate', value: '94%', icon: ShieldCheck, color: 'text-green-500', bg: 'bg-green-500/10' },
    ];

    return (
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            <header className="mb-10">
                <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-2">Operational Intelligence</h1>
                <p className="text-gray-500 font-medium">Real-time analytical breakdown of city-wide security metrics</p>
            </header>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {stats.map((stat, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label}
                        className="glass-card p-6 border-white/5"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{stat.label}</p>
                                <p className="text-2xl font-black text-white leading-none">{stat.value}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-green-500 font-bold">
                            <TrendingUp size={12} />
                            <span>+12.5% FROM LAST CYCLE</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Trend Chart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-2 glass-card p-8 border-white/5"
                >
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-3">
                            <Activity size={20} className="text-brand-primary" />
                            <h3 className="text-sm font-black uppercase tracking-wider">Incident Response Trends</h3>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-brand-primary" />
                                <span className="text-[10px] font-bold text-gray-400">INCIDENTS</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-[10px] font-bold text-gray-400">SOS ALERTS</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1A73E8" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#1A73E8" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorSos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F87171" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#F87171" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#4B5563', fontSize: 10, fontWeight: 'bold' }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#4B5563', fontSize: 10, fontWeight: 'bold' }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111112', border: '1px solid #27272A', borderRadius: '12px' }}
                                />
                                <Area type="monotone" dataKey="incidents" stroke="#1A73E8" fillOpacity={1} fill="url(#colorInc)" strokeWidth={3} />
                                <Area type="monotone" dataKey="sos" stroke="#F87171" fillOpacity={1} fill="url(#colorSos)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Classification Pie */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-8 border-white/5"
                >
                    <div className="flex items-center gap-3 mb-10">
                        <TrendingUp size={20} className="text-brand-accent" />
                        <h3 className="text-sm font-black uppercase tracking-wider">Type Distribution</h3>
                    </div>
                    <div className="h-64 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={typeData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {typeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-white font-mono">1.2k</span>
                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">Total Events</span>
                        </div>
                    </div>
                    <div className="space-y-4 mt-6">
                        {typeData.map(item => (
                            <div key={item.name} className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{item.name}</span>
                                </div>
                                <span className="text-xs font-black text-white font-mono">{Math.floor(item.value / 10)}%</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
