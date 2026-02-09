import React, { useState, useEffect } from 'react';
import { Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Navigation2, User, Activity, Clock } from 'lucide-react';

const patrolIcon = new L.DivIcon({
    className: 'custom-div-icon',
    html: `
        <div class="relative">
            <div class="absolute inset-0 bg-police-blue/20 rounded-full animate-ping scale-150"></div>
            <div class="w-5 h-5 bg-police-blue rounded-full border-2 border-white shadow-[0_0_10px_rgba(59,130,246,0.8)] flex items-center justify-center">
                <div class="w-2 h-2 bg-white rounded-sm rotate-45"></div>
            </div>
        </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const PatrolLayer = () => {
    const [patrols, setPatrols] = useState([]);

    // Simulation of data if collection is empty
    useEffect(() => {
        const dummyPatrols = [
            { id: 'Alpha-1', officer: 'Sgt. Roman', status: 'Patrol', lat: 17.3850, lng: 78.4867, path: [[17.3800, 78.4800], [17.3825, 78.4840], [17.3850, 78.4867]] },
            { id: 'Bravo-4', officer: 'Cpl. Miller', status: 'Pursuit', lat: 17.3980, lng: 78.5120, path: [[17.3900, 78.5000], [17.3940, 78.5060], [17.3980, 78.5120]] },
            { id: 'Delta-9', officer: 'Ofc. Chen', status: 'Patrol', lat: 17.3610, lng: 78.4550, path: [[17.3550, 78.4450], [17.3580, 78.4500], [17.3610, 78.4550]] }
        ];

        // Try to listen to Firestore, fallback to dummy
        const q = query(collection(db, "active_patrols"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                setPatrols(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } else {
                setPatrols(dummyPatrols);
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <>
            {patrols.map((unit) => (
                <React.Fragment key={unit.id}>
                    {/* Unit Marker */}
                    <Marker position={[unit.lat, unit.lng]} icon={patrolIcon}>
                        <Popup className="dark-popup">
                            <div className="p-3 min-w-[180px]">
                                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                                    <h3 className="text-police-blue font-black text-xs uppercase tracking-widest">{unit.id}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${unit.status === 'Pursuit' ? 'bg-red-500 text-white animate-pulse' : 'bg-police-blue/10 text-police-blue'
                                        }`}>
                                        {unit.status}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                        <User size={12} className="text-gray-600" />
                                        <span>Officer: <b className="text-gray-200">{unit.officer}</b></span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                        <Activity size={12} className="text-gray-600" />
                                        <span>Engine: <b className="text-police-green font-mono uppercase">Operational</b></span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                                        <Clock size={12} className="text-gray-600" />
                                        <span>Last Sync: {new Date().toLocaleTimeString()}</span>
                                    </div>
                                </div>
                                <button className="w-full mt-4 bg-police-blue py-2 rounded-lg text-[9px] font-black text-white uppercase tracking-widest hover:bg-blue-600 transition-colors">
                                    Establish Voice Link
                                </button>
                            </div>
                        </Popup>
                    </Marker>

                    {/* Path Trail (Simulation of movement) */}
                    {unit.path && (
                        <Polyline
                            positions={unit.path}
                            pathOptions={{
                                color: '#3B82F6',
                                weight: 2,
                                opacity: 0.3,
                                dashArray: '5, 10'
                            }}
                        />
                    )}

                    {/* Unit Visual Range */}
                    <Circle
                        center={[unit.lat, unit.lng]}
                        radius={500}
                        pathOptions={{
                            color: '#3B82F6',
                            fillColor: '#3B82F6',
                            fillOpacity: 0.02,
                            weight: 1
                        }}
                    />
                </React.Fragment>
            ))}
        </>
    );
};

export default PatrolLayer;
