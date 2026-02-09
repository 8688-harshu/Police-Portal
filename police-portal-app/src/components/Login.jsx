import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Shield, Lock, User, Terminal, Fingerprint, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // DEV MODE: Hardcoded Credentials Check
        if (email === 'admin@police.gov' && password === 'admin123') {
            localStorage.setItem('dev_access', 'true');
            setIsScanning(true);
            setTimeout(() => {
                navigate('/');
            }, 2500);
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            setIsScanning(true);
            setTimeout(() => {
                navigate('/');
            }, 2500);
        } catch (err) {
            setError('ACCESS DENIED: INVALID BADGE ID OR PASSCODE');
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full bg-dark-bg flex items-center justify-center relative overflow-hidden font-sans">
            {/* Background Grid & FX */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(26,115,232,0.05)_0%,_transparent_70%)]" />
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-md relative z-10 p-1"
            >
                <div className="glass-card p-10 border-white/10 shadow-2xl relative overflow-hidden bg-dark-bg/40 backdrop-blur-2xl">

                    {/* Biometric Scan Overlay */}
                    <AnimatePresence>
                        {isScanning && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 z-50 bg-dark-bg/90 backdrop-blur-md flex flex-col items-center justify-center"
                            >
                                <div className="relative w-48 h-48 mb-8">
                                    <Fingerprint size={192} className="text-brand-primary opacity-20" />
                                    <motion.div
                                        initial={{ top: 0 }}
                                        animate={{ top: '100%' }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                        className="absolute left-0 right-0 h-1 bg-brand-accent shadow-[0_0_15px_#C6FF00]"
                                    />
                                </div>
                                <h3 className="text-brand-accent font-black tracking-[0.4em] uppercase text-sm animate-pulse">
                                    Identity Verified
                                </h3>
                                <p className="text-gray-500 font-mono text-[10px] mt-4 uppercase">Initializing Tactical Node...</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Header */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-16 h-16 bg-premium-gradient rounded-2xl flex items-center justify-center shadow-neon-blue mb-6">
                            <Shield size={32} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-white uppercase">Access Terminal</h1>
                        <p className="text-[10px] font-mono text-gray-500 mt-2 tracking-[0.2em] uppercase">SafeRoute Tactical Control</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase px-1 flex items-center gap-2">
                                <User size={12} /> Badge ID (Email)
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm font-mono focus:border-brand-primary outline-none transition-all placeholder:text-gray-700"
                                placeholder="OFFICER@SAFEROUTE.GOV"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase px-1 flex items-center gap-2">
                                <Lock size={12} /> Passcode
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm font-mono focus:border-brand-primary outline-none transition-all placeholder:text-gray-700"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3"
                            >
                                <AlertCircle size={16} className="text-red-500 shrink-0" />
                                <p className="text-[10px] font-bold text-red-500 uppercase leading-tight">{error}</p>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-premium-gradient py-5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-neon-blue active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Terminal size={18} />
                                    Establish Link
                                </>
                            )}
                        </button>

                        <div className="flex items-center gap-4 py-2">
                            <div className="flex-1 h-[1px] bg-white/5" />
                            <span className="text-[8px] font-mono text-gray-700 uppercase">OR</span>
                            <div className="flex-1 h-[1px] bg-white/5" />
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                localStorage.setItem('dev_access', 'true');
                                navigate('/');
                            }}
                            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 transition-all active:scale-[0.98]"
                        >
                            Emergency Bypass (Dev Mode)
                        </button>
                    </form>

                    {/* Footer Info */}
                    <div className="mt-10 pt-10 border-t border-white/5 text-center">
                        <p className="text-[9px] font-mono text-gray-600 leading-relaxed uppercase">
                            Federal Warning: Unauthorized access to this terminal is strictly prohibited under protocol 7-DELTA. Your IP and physical location are being logged.
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Bottom Version Tag */}
            <div className="absolute bottom-8 text-[10px] font-mono text-gray-800 tracking-widest uppercase pointer-events-none">
                SafeRoute Console // Build 2.0.4-TACTICAL
            </div>
        </div>
    );
};

export default Login;
