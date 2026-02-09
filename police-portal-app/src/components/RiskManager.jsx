import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, X, ShieldAlert, Target, AlertTriangle, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RiskManager = ({ isDrawing, setIsDrawing, lastClick, setLastClick }) => {
    const [showModal, setShowModal] = useState(false);
    const [reason, setReason] = useState('');
    const [radius, setRadius] = useState(250);
    const [loading, setLoading] = useState(false);

    // Trigger modal on map click
    React.useEffect(() => {
        if (lastClick) {
            setShowModal(true);
        }
    }, [lastClick]);

    const handleSave = async () => {
        if (!reason || !lastClick) return;
        setLoading(true);
        try {
            await addDoc(collection(db, "risk_zones"), {
                lat: lastClick.lat,
                lng: lastClick.lng,
                radius: parseInt(radius),
                reason: reason,
                severity: 'CRITICAL',
                timestamp: serverTimestamp(),
                createdBy: 'TACTICAL-OPS-CENTER'
            });
            setShowModal(false);
            setReason('');
            setLastClick(null);
            setIsDrawing(false);
        } catch (error) {
            console.error("Error broadcasting zone:", error);
        }
        setLoading(false);
    };

    return (
        <div className="flex gap-4 pointer-events-auto">
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsDrawing(!isDrawing)}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-glass border ${isDrawing
                    ? 'bg-red-500 text-white border-red-400 animate-pulse'
                    : 'glass-card text-white border-white/10 hover:bg-white/5'
                    }`}
            >
                {isDrawing ? <Radio size={16} className="animate-spin" /> : <Plus size={16} />}
                {isDrawing ? "SELECT SECTOR ON MAP" : "INITIATE RISK ZONE"}
            </motion.button>

            <AnimatePresence>
                {showModal && (
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
                            className="bg-dark-card border border-white/10 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
                        >
                            {/* Decorative Background Elements */}
                            <button
                                onClick={() => { setShowModal(false); setLastClick(null); setIsDrawing(false); }}
                                className="absolute top-6 right-6 p-2 rounded-xl text-gray-500 hover:bg-white/5 hover:text-white transition-all z-50 cursor-pointer"
                            >
                                <X size={24} />
                            </button>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[80px]" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-primary/10 blur-[80px]" />

                            <div className="flex items-center gap-6 mb-10 relative">
                                <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-3xl flex items-center justify-center shadow-neon-red">
                                    <ShieldAlert size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight">Deploy Tactical Warning</h3>
                                    <p className="text-gray-500 text-sm font-medium">Broadcasting live geofence to all mobile units</p>
                                </div>
                            </div>

                            <div className="space-y-8 relative">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-dark-bg/60 p-4 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-black text-gray-500 uppercase mb-2 flex items-center gap-2">
                                            <Target size={10} /> Latitude
                                        </p>
                                        <p className="text-sm font-mono text-gray-200">{lastClick?.lat.toFixed(6)}</p>
                                    </div>
                                    <div className="bg-dark-bg/60 p-4 rounded-2xl border border-white/5">
                                        <p className="text-[9px] font-black text-gray-500 uppercase mb-2 flex items-center gap-2">
                                            <Target size={10} /> Longitude
                                        </p>
                                        <p className="text-sm font-mono text-gray-200">{lastClick?.lng.toFixed(6)}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] uppercase font-black text-gray-500 flex items-center gap-2 px-1">
                                        <AlertTriangle size={12} className="text-police-yellow" />
                                        Threat Classification
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            "CIVIL UNREST", "CRIME CLUSTER",
                                            "ROAD BLOCK", "HAZARD AREA"
                                        ].map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setReason(t)}
                                                className={`px-4 py-3 rounded-xl border text-[10px] font-black transition-all ${reason === t
                                                    ? 'bg-red-500 border-red-400 text-white shadow-lg'
                                                    : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/10'
                                                    }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] uppercase font-black text-gray-500">Effective Radius</label>
                                        <span className="text-xs font-black text-brand-primary">{radius} METERS</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="100" max="1000" step="50"
                                        className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                                        value={radius}
                                        onChange={(e) => setRadius(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button
                                        onClick={() => { setShowModal(false); setLastClick(null); setIsDrawing(false); }}
                                        className="flex-1 px-8 py-4 rounded-2xl border border-white/5 font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all text-gray-400"
                                    >
                                        Abort
                                    </button>
                                    <button
                                        disabled={!reason || loading}
                                        onClick={handleSave}
                                        className="flex-[1.5] px-8 py-4 rounded-2xl bg-premium-gradient text-white disabled:opacity-50 font-black text-[10px] uppercase tracking-widest transition-all shadow-neon-blue active:scale-95"
                                    >
                                        {loading ? "TRANSMITTING..." : "BROADCAST ALERT"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RiskManager;
