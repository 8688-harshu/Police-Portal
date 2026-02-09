import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { doc, deleteDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
    Map as MapIcon, ShieldAlert, Trash2, Edit3,
    Navigation, Activity, MapPin, Layers, Plus, Target, X
} from 'lucide-react';

const GeofenceManager = ({ riskZones }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        lat: '',
        lng: '',
        radius: '250',
        reason: ''
    });

    const handleDelete = async (id) => {
        if (window.confirm("PROTOCOL ALERT: Confirm permanent removal of this tactical geofence?")) {
            await deleteDoc(doc(db, "risk_zones", id));
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, "risk_zones"), {
                lat: parseFloat(formData.lat),
                lng: parseFloat(formData.lng),
                radius: parseInt(formData.radius),
                reason: formData.reason || "Tactical Exclusion Zone",
                severity: 'CRITICAL',
                timestamp: serverTimestamp(),
                createdBy: 'COMMAND-CONSOLE'
            });
            setIsAdding(false);
            setFormData({ lat: '', lng: '', radius: '250', reason: '' });
        } catch (err) {
            console.error("Error adding zone:", err);
            alert("Deployment Failed: " + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative">
            <header className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-2">Tactical Geofencing</h1>
                    <p className="text-gray-500 font-medium">Manage active exclusion zones and high-risk urban barriers</p>
                </div>
                <div className="flex gap-4">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsAdding(true)}
                        className="bg-brand-primary hover:bg-brand-primary/80 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-neon-blue transition-all"
                    >
                        <Plus size={16} /> Manual Deployment
                    </motion.button>
                    <div className="glass-card px-6 py-3 border-white/5 flex items-center gap-4">
                        <Layers size={20} className="text-brand-primary" />
                        <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase">Active Shields</p>
                            <p className="text-xl font-black text-white leading-none">{riskZones.length}</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                    {riskZones.map((zone, i) => (
                        <motion.div
                            key={zone.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass-card p-8 border-white/5 group hover:border-brand-primary/20 transition-all"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-neon-red">
                                        <ShieldAlert size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">
                                            {zone.reason || "Tactical Exclusion Zone"}
                                        </h3>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 tracking-widest">
                                            <MapPin size={12} />
                                            LAT: {Number(zone.lat).toFixed(4)} / LNG: {Number(zone.lng).toFixed(4)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
                                        <Edit3 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(zone.id)}
                                        className="p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-500 transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/5">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Shield Radius</p>
                                    <p className="text-sm font-black text-brand-secondary font-mono">{zone.radius || 200}M</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Target Flux</p>
                                    <p className="text-sm font-black text-police-yellow font-mono">MEDIUM</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Bypass Status</p>
                                    <p className="text-sm font-black text-police-green font-mono uppercase tracking-tighter">RESTRICTED</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {riskZones.length === 0 && (
                    <div className="col-span-full h-80 glass-card flex flex-col items-center justify-center border-dashed border-white/10">
                        <Navigation size={48} className="text-gray-700 mb-6 animate-pulse" />
                        <h3 className="text-lg font-black text-gray-500 uppercase tracking-[0.3em]">No Active Geofences</h3>
                        <p className="text-[10px] text-gray-600 font-bold mt-2">USE 'MANUAL DEPLOYMENT' OR SWITCH TO MAP MODE</p>
                    </div>
                )}
            </div>

            {/* ADD MODAL */}
            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-dark-card border border-white/10 w-full max-w-lg rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-[80px] pointer-events-none" />

                            <div className="flex justify-between items-start mb-8 relative z-50">
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase">Manual Deployment</h2>
                                    <p className="text-sm text-gray-500">Enter coordinates for immediate geofence establishment</p>
                                </div>
                                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition cursor-pointer">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleAdd} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase">Latitude</label>
                                        <input
                                            type="number"
                                            step="any"
                                            required
                                            value={formData.lat}
                                            onChange={e => setFormData({ ...formData, lat: e.target.value })}
                                            className="w-full bg-dark-bg p-4 rounded-xl text-sm font-mono text-white border border-white/5 focus:border-brand-primary outline-none"
                                            placeholder="12.9716"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase">Longitude</label>
                                        <input
                                            type="number"
                                            step="any"
                                            required
                                            value={formData.lng}
                                            onChange={e => setFormData({ ...formData, lng: e.target.value })}
                                            className="w-full bg-dark-bg p-4 rounded-xl text-sm font-mono text-white border border-white/5 focus:border-brand-primary outline-none"
                                            placeholder="77.5946"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase">Radius (Meters)</label>
                                    <input
                                        type="range"
                                        min="100"
                                        max="5000"
                                        value={formData.radius}
                                        onChange={e => setFormData({ ...formData, radius: e.target.value })}
                                        className="w-full h-2 bg-dark-bg rounded-lg appearance-none cursor-pointer accent-brand-primary"
                                    />
                                    <div className="flex justify-between text-[10px] font-mono text-gray-500">
                                        <span>100m</span>
                                        <span className="text-brand-primary font-bold">{formData.radius}m</span>
                                        <span>5km</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase">Strategic Reason</label>
                                    <input
                                        type="text"
                                        value={formData.reason}
                                        onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                        className="w-full bg-dark-bg p-4 rounded-xl text-sm font-bold text-white border border-white/5 focus:border-brand-primary outline-none"
                                        placeholder="e.g. HIGH ACCIDENT ZONE"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-brand-primary hover:bg-brand-primary/80 text-white rounded-xl font-black uppercase tracking-widest shadow-neon-blue transition-all disabled:opacity-50"
                                >
                                    {loading ? "ESTABLISHING UPLINK..." : "INITIATE LOCKDOWN"}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GeofenceManager;
