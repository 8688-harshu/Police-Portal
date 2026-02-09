import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { db } from './firebase';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import {
    Shield, Radio, Users, Phone, MapPin, Volume2,
    CheckCircle, XCircle, Activity, Settings, LogOut,
    Bell, Search, Filter, ChevronRight, Clock, ShieldAlert,
    BarChart3, Layers, Navigation2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import RiskManager from './components/RiskManager';
import CriminalManager from './components/CriminalManager';
import PatrolLayer from './components/PatrolLayer';
import AnalyticsWidget from './components/AnalyticsWidget';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import GeofenceManager from './components/GeofenceManager';
import SettingsManager from './components/SettingsManager';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { useNavigate } from 'react-router-dom';

// Fix Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Premium Icons
const sosIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div class="pulse-ring"><div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-neon-red"></div></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const incidentIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div class="w-3 h-3 bg-police-yellow rounded-full border-2 border-white shadow-lg"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

const Dashboard = () => {
    const [sosAlerts, setSosAlerts] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [riskZones, setRiskZones] = useState([]);
    const [selectedSOS, setSelectedSOS] = useState(null);
    const [activeTab, setActiveTab] = useState('map');
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [dbStatus, setDbStatus] = useState('connecting'); // connecting, online, offline
    const [lastSync, setLastSync] = useState(null);
    const navigate = useNavigate();

    // Reliable Alarm Sound - Web Audio API (No external files needed)
    const playAlertSound = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();

            // Function to play a single tone
            const playTone = (freq, type, startTime, duration) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(0.3, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            // Play urgent double beep pattern
            const now = ctx.currentTime;
            playTone(880, 'square', now, 0.2);       // High Beep
            playTone(880, 'square', now + 0.25, 0.2); // High Beep

        } catch (e) {
            console.error("� Sound Error:", e);
        }
    };

    // Risk Drawing State
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastClick, setLastClick] = useState(null);

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');

    // Track initial load to prevent sound on page load
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [lastAlertLocation, setLastAlertLocation] = useState(null);
    // Zoom Effect Component (Robust)
    const AutoZoom = ({ target }) => {
        const map = useMap(); // Get direct access to the map instance

        useEffect(() => {
            console.log("⚓ AUTOZOOM RENDERED. Target:", target);
            if (target && target.coordinates) {
                const [lat, lng] = target.coordinates;
                console.log("🚀 TRIGGERING MAP MOVEMENT ->", lat, lng, "ID:", target.id);

                map.setView([lat, lng], 16, {
                    animate: true,
                    duration: 2
                });
            }
        }, [target, map]);

        return null;
    };

    const MapEvents = () => {
        useMapEvents({
            click(e) {
                if (isDrawing) {
                    setLastClick(e.latlng);
                }
            },
        });
        return null;
    };

    useEffect(() => {
        console.log("� PORTAL: Starting 'Session Mode' Listener...");

        // Local variables to track session state inside the closure (Fixes Stale State Bug)
        let isFirstSnapshot = true;
        const ignoredIds = new Set();

        console.log("🔥 PORTAL: Starting 'Session Mode' Listener...");

        // NO FILTERS - Fetch ALL documents for debugging
        const qSOS = collection(db, "emergency_logs");

        const unsubscribeSOS = onSnapshot(qSOS, (snapshot) => {
            // 1. On first load, mark ALL existing docs as 'ignored' (Past Data)
            if (isFirstSnapshot) {
                snapshot.docs.forEach(doc => ignoredIds.add(doc.id));
                isFirstSnapshot = false;
                console.log(`🔥 PORTAL: Session Initialized. Ignoring ${ignoredIds.size} past alerts.`);
            }

            // Map ALL documents with RAW data
            const alerts = snapshot.docs.map(doc => {
                const data = doc.data();
                const lat = data.lat ?? data.location?.lat;
                const lng = data.lng ?? data.location?.lng;

                // Enhanced Timestamp Parsing
                let ts = data.timestamp;
                try {
                    if (ts && typeof ts.toDate === 'function') {
                        ts = ts.toDate();
                    } else if (typeof ts === 'string') {
                        ts = new Date(ts);
                    } else if (ts && ts.seconds) {
                        ts = new Date(ts.seconds * 1000);
                    } else {
                        ts = new Date();
                    }
                } catch (e) {
                    ts = new Date();
                }

                return {
                    id: doc.id,
                    RAW_STATUS: data.status,
                    phone: data.phone ?? data.user_phone ?? 'Unknown',
                    lat: lat ? parseFloat(lat) : null,
                    lng: lng ? parseFloat(lng) : null,
                    timestamp: ts,
                    ...data
                };
            });

            // 3. Filter: Only show alerts that are NEW to this session (not in ignoredIds)
            const liveSessionAlerts = alerts.filter(a => {
                // Restore filtering of past alerts
                const isIgnored = ignoredIds.has(a.id);

                const status = (a.status || 'OPEN').toLowerCase();
                const isActive = status !== 'resolved';

                // Only show if it's NOT ignored (new) AND it's active
                return !isIgnored && isActive;
            });

            console.log(`🔥 PORTAL: Showing ${liveSessionAlerts.length} LIVE alerts`);

            // 4. Sound & Toast Logic for NEW additions
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const docId = change.doc.id;
                    const alertData = change.doc.data();

                    // Skip if we are ignoring this ID (initial load)
                    if (ignoredIds.has(docId)) return;

                    const status = (alertData.status || 'OPEN').toLowerCase();
                    if (status !== 'resolved') {
                        console.log("🚨 NEW LIVE SOS ALERT DETECTED:", alertData.phone);
                        playAlertSound();
                        toast.error(`🚨 NEW SOS FROM: ${alertData.phone || 'Unknown'}`, {
                            duration: 10000,
                            position: 'top-right',
                            style: {
                                background: '#111',
                                color: '#fff',
                                border: '2px solid #ef4444',
                                fontWeight: 'bold'
                            }
                        });

                        // Trigger Auto-Zoom if coordinates exist
                        const lat = alertData.lat || alertData.location?.lat;
                        const lng = alertData.lng || alertData.location?.lng;

                        if (lat && lng) {
                            const newLocation = {
                                coordinates: [parseFloat(lat), parseFloat(lng)],
                                id: docId // Use docId to track uniqueness
                            };
                            setLastAlertLocation(newLocation);
                            // Also select it to trigger sidebar highlight
                            // Note: We can't set selectedSOS here easily because we need the full object, 
                            // but the state update below will handle the map render.
                        }
                    }
                }
            });

            // Mark initial load as complete
            if (isInitialLoad) {
                setIsInitialLoad(false);
            }

            setSosAlerts(liveSessionAlerts);
            setDbStatus('online');
            setLastSync(new Date());
        }, (err) => {
            console.error("🔥 DATABASE SYNC ERROR:", err);
            setDbStatus('offline');
        });

        const qIncidents = query(collection(db, "live_incidents"), limit(50));
        const unsubscribeIncidents = onSnapshot(qIncidents, (snapshot) => {
            setIncidents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qZones = query(collection(db, "risk_zones"));
        const unsubscribeZones = onSnapshot(qZones, (snapshot) => {
            const zones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log(`🔥 PORTAL: Loaded ${zones.length} Risk Zones`);
            setRiskZones(zones);
        });

        return () => {
            unsubscribeSOS();
            unsubscribeIncidents();
            unsubscribeZones();
        };
    }, []);

    const activeEmergencies = useMemo(() => {
        const filtered = sosAlerts.filter(a => (a.user_phone?.includes(searchQuery) || searchQuery === ''));
        console.log(`Feed Processing: ${sosAlerts.length} total -> ${filtered.length} filtered`);
        return filtered;
    }, [sosAlerts, searchQuery]);

    const handleAcknowledge = async (id) => {
        const ref = doc(db, "emergency_logs", id);
        await updateDoc(ref, { status: 'dispatched', acknowledgedBy: 'Officer-Admin', acknowledgedAt: new Date() });
    };

    const handleResolve = async (id) => {
        // Optimistic Update: Immediately remove from UI
        setSosAlerts(prev => prev.filter(a => a.id !== id));
        if (selectedSOS?.id === id) setSelectedSOS(null);

        try {
            // Call Backend to resolve (Bypasses Client Permissions)
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/resolve-alert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alert_id: id })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Backend failed');
            }

            toast.success("Alert Resolved by Command Center");
        } catch (error) {
            console.error("Resolve Failed:", error);
            toast.error(`Error: ${error.message}`);
        }
    };

    const handleSignOut = async () => {
        localStorage.removeItem('dev_access');
        await signOut(auth);
        navigate('/login');
    };

    return (
        <div className="flex h-screen w-full bg-dark-bg text-gray-100 font-sans overflow-hidden">
            <Toaster />
            {/* 1. Ultra-Slim Premium Nav */}
            <nav className="w-20 bg-dark-bg border-r border-white/5 flex flex-col items-center py-8 gap-10 z-[1200]">
                <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-12 h-12 bg-premium-gradient rounded-2xl flex items-center justify-center shadow-neon-blue"
                >
                    <Shield size={24} className="text-white" />
                </motion.div>

                <div className="flex flex-col gap-8">
                    {[
                        { id: 'map', icon: Activity, label: 'Tactical Map' },
                        { id: 'criminals', icon: Users, label: 'Intel Base' },
                        { id: 'analytics', icon: BarChart3, label: 'Analytics' },
                        { id: 'layers', icon: Layers, label: 'Geofencing' }
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`group relative p-3 rounded-xl transition-all duration-300 ${activeTab === item.id ? 'bg-brand-primary/20 text-brand-primary' : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <item.icon size={24} />
                            <span className="absolute left-full ml-4 px-2 py-1 bg-dark-surface border border-white/10 rounded-md text-[10px] uppercase font-bold tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                {item.label}
                            </span>
                            {activeTab === item.id && (
                                <motion.div layoutId="activeNav" className="absolute left-[-20px] top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-primary rounded-r-full" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="mt-auto flex flex-col gap-6">
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`p-3 transition-colors ${activeTab === 'settings' ? 'text-brand-primary bg-brand-primary/10 rounded-xl' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Settings size={22} />
                    </button>
                    <button
                        onClick={async () => {
                            const testId = `TEST_${Date.now()}`;
                            const randomNum = Math.floor(1000 + Math.random() * 9000);
                            console.log("Simulating SOS...");
                            try {
                                const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
                                await addDoc(collection(db, "emergency_logs"), {
                                    phone: `TEST-${randomNum}`,
                                    lat: 17.3850 + (Math.random() - 0.5) * 0.1,
                                    lng: 78.4867 + (Math.random() - 0.5) * 0.1,
                                    status: "OPEN",
                                    timestamp: serverTimestamp(),
                                    is_test: true
                                });
                            } catch (e) { alert("Test failed: " + e.message); }
                        }}
                        className="p-3 text-brand-accent hover:bg-brand-accent/10 rounded-xl transition-colors"
                        title="Simulate Test SOS"
                    >
                        <Radio size={22} />
                    </button>
                    <button
                        onClick={handleSignOut}
                        className="p-3 text-gray-500 hover:text-red-400 transition-colors"
                    >
                        <LogOut size={22} />
                    </button>
                </div>
            </nav>

            {/* Main Workspace */}
            <main className="flex-1 flex flex-col relative overflow-hidden bg-[#080808]">
                {activeTab === 'map' ? (
                    <>
                        {/* 2. Top Bar Dashboard Intelligence */}
                        <header className="absolute top-0 left-0 right-0 h-24 flex items-center px-10 z-[1100] pointer-events-none">
                            <div className="flex items-center gap-6 pointer-events-auto">
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass-card px-6 py-3 flex items-center gap-5 shadow-glass"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center">
                                            <Radio className="text-brand-primary animate-pulse" size={20} />
                                        </div>
                                        <div>
                                            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white">Live Operations</h1>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] text-gray-400 font-mono tracking-tight uppercase">Node Status:</p>
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${dbStatus === 'online' ? 'bg-police-green/20 text-police-green' :
                                                    dbStatus === 'offline' ? 'bg-red-500/20 text-red-500 animate-pulse' :
                                                        'bg-yellow-500/20 text-yellow-500'
                                                    }`}>
                                                    {dbStatus}
                                                </span>
                                                {lastSync && (
                                                    <span className="text-[8px] text-gray-600 font-mono ml-2">
                                                        SYNC: {format(lastSync, 'HH:mm:ss')}
                                                    </span>
                                                )}
                                                <div className="ml-4 px-2 py-0.5 bg-brand-accent/20 border border-brand-accent/30 rounded text-brand-accent text-[8px] font-mono">
                                                    RAW_SOS: {sosAlerts.length} | FILT: {activeEmergencies.length}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-[1px] h-8 bg-white/10" />
                                    <div className="flex gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-gray-500">Active SOS</span>
                                            <span className="text-lg font-black text-police-red leading-none">
                                                {sosAlerts.filter(a => a.status === 'pending').length}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-gray-500">Field Units</span>
                                            <span className="text-lg font-black text-brand-secondary leading-none">
                                                {Math.max(0, 20 - sosAlerts.filter(a => a.status === 'pending' || a.status === 'OPEN').length)}
                                            </span>
                                        </div>
                                        <div className="w-[1px] h-8 bg-white/10" />
                                        <button
                                            onClick={() => {
                                                console.log("🔊 Validating Audio System...");
                                                playAlertSound();
                                                toast.success("🔊 Audio Test Triggered");
                                            }}
                                            className="group flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all"
                                            title="Click to enable sound alerts"
                                        >
                                            <Volume2 size={18} className="text-gray-400 group-hover:text-brand-primary transition-colors" />
                                            <span className="text-[8px] font-bold text-gray-500 uppercase mt-0.5 group-hover:text-white">Test</span>
                                        </button>
                                    </div>
                                </motion.div>

                                <RiskManager
                                    isDrawing={isDrawing}
                                    setIsDrawing={setIsDrawing}
                                    lastClick={lastClick}
                                    setLastClick={setLastClick}
                                />
                            </div>

                            <div className="ml-auto flex items-center gap-4 pointer-events-auto">
                                <div className="glass-card flex items-center px-4 py-2 border-white/5">
                                    <Search size={16} className="text-gray-500 mr-3" />
                                    <input
                                        type="text"
                                        placeholder="SEARCH ID..."
                                        className="bg-transparent text-xs font-mono outline-none w-32 placeholder:text-gray-700"
                                    />
                                </div>
                                <div className="w-10 h-10 rounded-xl glass-card flex items-center justify-center relative cursor-pointer hover:bg-white/5 transition-colors">
                                    <Bell size={18} />
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-brand-accent rounded-full shadow-neon-blue" />
                                </div>
                            </div>
                        </header>

                        {/* 3. Full-Screen Tactical Map */}
                        <div className="flex-1 relative z-0">
                            <MapContainer
                                center={[17.3850, 78.4867]}
                                zoom={13}
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={false}
                                attributionControl={false}
                            >
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                <MapEvents />
                                <AutoZoom target={lastAlertLocation} />
                                <PatrolLayer />

                                {/* SOS Markers */}
                                {sosAlerts.filter(a => a.status !== 'resolved').map(alert => (
                                    (alert.lat && alert.lng) && (
                                        <Marker
                                            key={alert.id}
                                            position={[alert.lat, alert.lng]}
                                            icon={sosIcon}
                                            eventHandlers={{
                                                add: (e) => {
                                                    // Auto-open popup if this is the most recent alert
                                                    if (lastAlertLocation && lastAlertLocation.id === alert.id) {
                                                        e.target.openPopup();
                                                    }
                                                },
                                                click: () => {
                                                    setSelectedSOS(alert);
                                                }
                                            }}
                                        >
                                            <Popup className="dark-popup" minWidth={200}>
                                                <div className="p-2 font-sans">
                                                    <h3 className="text-red-500 font-black text-sm mb-2 flex items-center gap-2">
                                                        <ShieldAlert size={16} className="animate-pulse" />
                                                        EMERGENCY SOS
                                                    </h3>
                                                    <div className="space-y-1 text-xs">
                                                        <p className="flex justify-between">
                                                            <span className="text-gray-400 font-bold">Phone:</span>
                                                            <span className="text-white font-mono">{alert.phone}</span>
                                                        </p>
                                                        <p className="flex justify-between">
                                                            <span className="text-gray-400 font-bold">Status:</span>
                                                            <span className={`font-black uppercase ${alert.status === 'PENDING' ? 'text-red-500' : 'text-blue-400'}`}>
                                                                {alert.status}
                                                            </span>
                                                        </p>
                                                        <p className="flex justify-between">
                                                            <span className="text-gray-400 font-bold">Time:</span>
                                                            <span className="text-gray-300">
                                                                {alert.timestamp instanceof Date ? alert.timestamp.toLocaleTimeString() : 'Live'}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </Popup>
                                            <Circle
                                                center={[alert.lat, alert.lng]}
                                                radius={300}
                                                pathOptions={{
                                                    color: '#EF4444',
                                                    fillColor: '#EF4444',
                                                    fillOpacity: 0.1,
                                                    weight: 1,
                                                    dashArray: '5, 10'
                                                }}
                                            />
                                        </Marker>
                                    )
                                ))}

                                {/* Incident Markers */}
                                {incidents.map(incident => (
                                    <Marker
                                        key={incident.id}
                                        position={[incident.latitude, incident.longitude]}
                                        icon={incidentIcon}
                                    >
                                        <Popup className="dark-popup">
                                            <div className="text-xs p-1">
                                                <p className="font-black text-brand-accent uppercase tracking-wider mb-1">
                                                    {incident.type || 'Field Incident'}
                                                </p>
                                                <p className="text-gray-300 leading-relaxed text-[10px]">{incident.description}</p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}

                                {/* Risk Zones */}
                                {riskZones.map(zone => {
                                    if (!zone.lat || !zone.lng) {
                                        console.warn("⚠️ Invalid Risk Zone Data:", zone);
                                        return null;
                                    }
                                    return (
                                        <Circle
                                            key={zone.id}
                                            center={[zone.lat, zone.lng]}
                                            radius={zone.radius || 200}
                                            pathOptions={{
                                                color: '#DC2626',
                                                fillColor: '#DC2626',
                                                fillOpacity: 0.1,
                                                weight: 2
                                            }}
                                        />
                                    );
                                })}
                            </MapContainer>
                        </div>

                        {/* 4. Left Side HUD Elements (Floating Over Map) */}
                        <div className="absolute bottom-10 left-10 z-[1100] flex flex-col gap-4 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="glass-card p-4 pointer-events-auto"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
                                    <span className="text-[10px] font-black tracking-widest text-gray-400">RADAR CONNECTED</span>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { label: 'ACTIVE THREATS', val: riskZones.length, color: riskZones.length > 0 ? 'text-red-500' : 'text-police-green' },
                                        { label: 'LIVE SIGNALS', val: sosAlerts.length, color: sosAlerts.length > 0 ? 'text-brand-secondary' : 'text-gray-500' },
                                        { label: 'SYSTEM LOAD', val: activeEmergencies.length > 3 ? 'HIGH' : 'OPTIMAL', color: activeEmergencies.length > 3 ? 'text-yellow-500' : 'text-brand-accent' }
                                    ].map((s, i) => (
                                        <div key={i} className="flex justify-between gap-10 items-center">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase">{s.label}</span>
                                            <span className={`text-[10px] font-mono font-black ${s.color}`}>{s.val}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </>
                ) : activeTab === 'criminals' ? (
                    <CriminalManager />
                ) : activeTab === 'analytics' ? (
                    <AnalyticsDashboard incidents={incidents} sosAlerts={sosAlerts} riskZones={riskZones} />
                ) : activeTab === 'layers' ? (
                    <GeofenceManager riskZones={riskZones} />
                ) : activeTab === 'settings' ? (
                    <SettingsManager />
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center italic text-gray-600">Module [ {activeTab} ] offline... coming soon</div>
                    </div>
                )}

                {/* 5. Right Side Tactical Feed (The Dispatcher) */}
                <AnimatePresence>
                    {(activeTab === 'map') && (
                        <motion.aside
                            initial={{ x: 500 }}
                            animate={{ x: isSidebarOpen ? 0 : 450 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 150 }}
                            className="absolute top-4 bottom-4 right-4 w-92 flex flex-col z-[1101] pointer-events-none"
                        >
                            <div className="flex-1 glass-card p-5 flex flex-col shadow-2xl pointer-events-auto border-white/10 overflow-hidden">
                                <header className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                            <ShieldAlert size={20} className="text-red-500" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-black uppercase tracking-widest">Emergency Feed</h2>
                                            <p className="text-[10px] text-red-400 font-bold">TOTAL HAZARDS: {activeEmergencies.length}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSidebarOpen(false)}
                                        className="text-gray-600 hover:text-white transition-colors"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </header>

                                {/* Alert Search */}
                                <div className="relative mb-6">
                                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="FILTER BY PHONE..."
                                        className="w-full bg-dark-bg/50 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[10px] font-mono outline-none focus:border-brand-primary"
                                    />
                                </div>

                                <div className="flex flex-col min-h-0 flex-1 overflow-y-auto custom-scrollbar pr-1">
                                    {/* Pass SOS Alerts to Analytics for Live data */}
                                    <AnalyticsWidget incidents={sosAlerts} />

                                    <div className="space-y-4 mt-6">
                                        <div className="flex items-center gap-2 mb-2 px-1">
                                            <ShieldAlert size={14} className="text-red-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live Command Feed</span>
                                        </div>
                                        <AnimatePresence mode="popLayout">
                                            {activeEmergencies.map(alert => (
                                                <motion.div
                                                    key={alert.id}
                                                    layout
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    className={`group relative p-5 rounded-2xl border transition-all duration-300 
                                                        ${selectedSOS?.id === alert.id
                                                            ? 'bg-red-500/5 border-red-500/50 shadow-neon-red'
                                                            : 'bg-dark-surface border-white/5 hover:border-white/20'
                                                        }`}
                                                >
                                                    {/* PING ANIMATION for Pending Alerts */}
                                                    {(alert.status || 'OPEN') !== 'resolved' && (
                                                        <span className="absolute top-3 right-3 flex h-3 w-3">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                        </span>
                                                    )}

                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-lg">
                                                                <Phone size={18} className="text-white" />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-sm text-gray-200 tracking-wide">{alert.phone}</h3>
                                                                <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                                                                    <Clock size={10} />
                                                                    <span className="font-mono">
                                                                        {alert.timestamp instanceof Date && !isNaN(alert.timestamp.getTime())
                                                                            ? format(alert.timestamp, 'HH:mm:ss')
                                                                            : 'LIVE'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (alert.lat && alert.lng) {
                                                                    setLastAlertLocation({
                                                                        coordinates: [parseFloat(alert.lat), parseFloat(alert.lng)],
                                                                        id: alert.id // Trigger AutoZoom
                                                                    });
                                                                    setSelectedSOS(alert);
                                                                    toast.success("Flying to Location...");
                                                                } else {
                                                                    toast.error("Location data missing");
                                                                }
                                                            }}
                                                            className="flex items-center justify-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all border border-blue-500/20"
                                                        >
                                                            <MapPin size={12} />
                                                            Center Map
                                                        </button>

                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleResolve(alert.id); }}
                                                            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-green-500/10 text-gray-400 hover:text-green-400 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all border border-white/5 hover:border-green-500/20"
                                                        >
                                                            <CheckCircle size={12} />
                                                            Resolve
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>

                                        {activeEmergencies.length === 0 && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="h-40 flex flex-col items-center justify-center text-gray-600 border border-white/5 rounded-2xl border-dashed"
                                            >
                                                <Shield size={32} className="mb-4 opacity-10" />
                                                <p className="text-[10px] uppercase font-black tracking-widest italic text-center text-gray-700">No Active Threats</p>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Footer Tactical */}
                                <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 shrink-0">
                                    <div className="bg-dark-bg/50 p-2 rounded-xl">
                                        <p className="text-[8px] font-black text-gray-500 uppercase mb-0.5">Est. Response</p>
                                        <p className="text-lg font-mono font-black text-police-green leading-none">
                                            {activeEmergencies.length > 0 ? '4:00' : 'READY'}
                                        </p>
                                    </div>
                                    <div className="bg-dark-bg/50 p-2 rounded-xl">
                                        <p className="text-[8px] font-black text-gray-500 uppercase mb-0.5">Shift Clearance</p>
                                        <p className="text-lg font-mono font-black text-brand-primary leading-none">
                                            {Math.floor((Math.random() * 5) + 93)}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default Dashboard;
