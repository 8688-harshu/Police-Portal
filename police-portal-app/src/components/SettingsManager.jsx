import React from 'react';
import { motion } from 'framer-motion';
import {
    Settings, Shield, Bell, Eye, EyeOff,
    Monitor, Lock, Radio, Database, Server
} from 'lucide-react';

const SettingsManager = () => {
    const settingsGroups = [
        {
            title: "Terminal Preferences",
            icon: Monitor,
            settings: [
                { label: "High Contrast Radar", desc: "Enhance tactical visibility for low-light operations", type: "toggle", active: true },
                { label: "Vector Signal Processing", desc: "Enable advanced pathfinding algorithms", type: "toggle", active: true },
                { label: "Ghost Mode", desc: "Hide command center identity from external scanners", type: "toggle", active: false },
            ]
        },
        {
            title: "Encryption & Security",
            icon: Lock,
            settings: [
                { label: "SHA-256 Hashing", desc: "Automatic encryption for civilian identifiers", type: "toggle", active: true },
                { label: "Biometric Login Required", desc: "Force fingerprint/face scan for all officers", type: "toggle", active: true },
                { label: "Quantum Shielding", desc: "Experimental protocol for future-proof security", type: "toggle", active: false },
            ]
        },
        {
            title: "Network Nodes",
            icon: Server,
            settings: [
                { label: "Firebase Real-time Sync", desc: "Latency: < 45ms", type: "info", value: "ENCRYPTED" },
                { label: "Regional Node", desc: "Current Location: SECTOR-7-DELTA", type: "info", value: "HYDERABAD" },
                { label: "Protocol Version", desc: "Tactical Console v2.0.4", type: "info", value: "STABLE" },
            ]
        }
    ];

    return (
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            <header className="mb-10">
                <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-2">Terminal Configuration</h1>
                <p className="text-gray-500 font-medium">Fine-tune tactical protocols and security parameters</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {settingsGroups.map((group, i) => (
                    <motion.div
                        key={group.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card p-8 border-white/5 flex flex-col h-full"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center">
                                <group.icon size={24} />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-wider">{group.title}</h3>
                        </div>

                        <div className="space-y-6 flex-1">
                            {group.settings.map(setting => (
                                <div key={setting.label} className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <p className="text-[11px] font-black text-white uppercase tracking-tight mb-1">{setting.label}</p>
                                        <p className="text-[9px] text-gray-500 font-medium leading-relaxed">{setting.desc}</p>
                                    </div>
                                    {setting.type === 'toggle' ? (
                                        <button className={`w-10 h-5 rounded-full transition-all relative ${setting.active ? 'bg-brand-primary' : 'bg-white/5'}`}>
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${setting.active ? 'right-1' : 'left-1'}`} />
                                        </button>
                                    ) : (
                                        <span className="text-[9px] font-black font-mono text-brand-accent bg-brand-accent/10 px-2 py-1 rounded">
                                            {setting.value}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="mt-12 flex justify-end gap-4">
                <button className="px-8 py-4 glass-card border-white/5 font-black text-[10px] uppercase tracking-widest text-gray-500 hover:bg-white/5 transition-all">
                    Reset to Factory Protocols
                </button>
                <button className="px-8 py-4 bg-premium-gradient rounded-3xl font-black text-[10px] uppercase tracking-widest text-white shadow-neon-blue active:scale-95 transition-all">
                    Commit Config Changes
                </button>
            </div>
        </div>
    );
};

export default SettingsManager;
