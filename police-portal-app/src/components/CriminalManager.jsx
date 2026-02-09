import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, limit, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { UserPlus, ShieldX, Hash, Search, Trash2, Calendar, Lock, Database, Fingerprint, PhoneOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const CriminalManager = () => {
    const [phone, setPhone] = useState('');
    const [blacklist, setBlacklist] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const q = query(collection(db, "criminal_blacklist"), orderBy("timestamp", "desc"), limit(50));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setBlacklist(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!phone) return;
        setLoading(true);
        try {
            // Check if already exists (simple client-side check for now, ideally server-side)
            if (blacklist.some(item => item.phoneNumber === phone)) {
                toast.error("Number already blacklisted!");
                setLoading(false);
                return;
            }

            await addDoc(collection(db, "criminal_blacklist"), {
                phoneNumber: phone,
                reason: "Enforcement Action",
                timestamp: serverTimestamp(),
                addedBy: 'TACTICAL-INTEL-UNIT'
            });
            setPhone('');
            toast.success("Number Blacklisted Successfully");
        } catch (error) {
            console.error("Error adding to blacklist:", error);
            toast.error(`Operation Failed: ${error.code || error.message}`);
        }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Remove this number from blacklist? access will be restored.")) {
            await deleteDoc(doc(db, "criminal_blacklist", id));
            toast.success("Blacklist Entry Removed");
        }
    }

    const filteredList = blacklist.filter(item =>
        item.phoneNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-12 overflow-auto bg-[#080808] relative"
        >
            <header className="mb-16 flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <Database className="text-brand-primary" size={20} />
                        <span className="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase">Classified Intel</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter mb-4">Enforcement Database</h1>
                    <p className="text-gray-500 max-w-xl text-sm leading-relaxed border-l-2 border-brand-primary pl-6">
                        Central repository for blacklisted identifiers. Numbers listed here are automatically rejected by the authentication gateway.
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-dark-surface p-6 rounded-[2rem] border border-white/5 shadow-glass">
                        <p className="text-[10px] uppercase font-black text-gray-500 mb-1">BLOCKED USERS</p>
                        <p className="text-3xl font-black text-brand-primary">{blacklist.length}</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
                <div className="xl:col-span-4">
                    <div className="glass-card p-10 border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Fingerprint size={120} />
                        </div>

                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center shadow-neon-red">
                                <ShieldX size={24} />
                            </div>
                            <h2 className="text-xl font-black tracking-tight uppercase">Blacklist Ingest</h2>
                        </div>

                        <form onSubmit={handleAdd} className="space-y-8 relative">
                            <div className="space-y-3">
                                <label className="text-[10px] uppercase font-black text-gray-500 px-1">Target Identifier (Phone)</label>
                                <input
                                    type="tel"
                                    placeholder="+91 99999 99999"
                                    className="w-full bg-dark-bg/60 border border-white/10 rounded-2xl px-6 py-4 text-sm font-mono tracking-wider focus:border-red-500 outline-none transition-all placeholder:text-gray-700 text-white"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="bg-red-500/5 border border-red-500/10 p-5 rounded-2xl flex gap-4">
                                <Lock size={20} className="text-red-500 shrink-0" />
                                <p className="text-[10px] text-gray-400 leading-normal font-medium italic">
                                    ENFORCEMENT PROTOCOL ACTIVE: Entering a number will immediately revoke access privileges across all client applications.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !phone}
                                className="w-full bg-premium-gradient py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-4 shadow-neon-blue active:scale-95 transition-all disabled:opacity-50 text-white"
                            >
                                {loading ? "PROCESSING..." : <><PhoneOff size={18} /> BACKLIST NUMBER</>}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="xl:col-span-8 space-y-8">
                    <div className="relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
                        <input
                            type="text"
                            placeholder="SEARCH BLACKLIST..."
                            className="w-full glass-card pl-16 pr-8 py-5 text-xs font-mono tracking-[0.2em] outline-none focus:border-brand-primary text-white bg-transparent"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="glass-card overflow-hidden shadow-2xl border-white/5">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/2">
                                    <th className="p-6 text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">Blocked Identifier</th>
                                    <th className="p-6 text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">Status</th>
                                    <th className="p-6 text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">Banned On</th>
                                    <th className="p-6 text-[10px] uppercase font-black text-gray-500 tracking-[0.2em] text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode="popLayout">
                                    {filteredList.map((item, idx) => (
                                        <motion.tr
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="border-b border-white/2 hover:bg-white/5 transition-colors group"
                                        >
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-2 h-2 rounded-full bg-red-500 group-hover:animate-pulse" />
                                                    <span className="font-mono text-sm text-white font-bold tracking-wider">
                                                        {item.phoneNumber}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="bg-red-500/10 px-3 py-1 rounded-full text-[10px] font-black text-red-500 border border-red-500/20">
                                                    ACCESS DENIED
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2 text-gray-500 text-[11px] font-medium uppercase font-mono">
                                                    <Calendar size={14} />
                                                    {item.timestamp?.seconds ? new Date(item.timestamp.seconds * 1000).toLocaleDateString() : 'JUST NOW'}
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-3 text-gray-500 hover:text-red-500 transition-all hover:bg-red-500/10 rounded-xl cursor-pointer"
                                                    title="Remove from Blacklist"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                        {filteredList.length === 0 && (
                            <div className="py-24 text-center">
                                <Search size={48} className="mx-auto mb-6 text-gray-800 opacity-20" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-700">Database Clear</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default CriminalManager;
