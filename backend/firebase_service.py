import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
import googlemaps
import requests
from typing import List, Dict

# Path to service account key (user needs to place this file)
CRED_PATH = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
LOCAL_DB_PATH = os.path.join(os.path.dirname(__file__), "data", "risk_zones.json")

class FirebaseService:
    def __init__(self):
        self.db = None
        self.use_local = True
        self.gmaps = None
        
        # Init Google Maps for Geocoding Fallback
        key = os.getenv("GOOGLE_MAPS_API_KEY")
        if key:
            try:
                self.gmaps = googlemaps.Client(key=key)
            except Exception as e:
                print(f"Maps Client Init Error: {e}")

        # Try to initialize Firebase
        cred = None
        if os.getenv("FIREBASE_CREDENTIALS"):
            try:
                cred_json = json.loads(os.getenv("FIREBASE_CREDENTIALS"))
                cred = credentials.Certificate(cred_json)
                print("✅ Loaded Firebase Credentials from Environment Variable")
            except Exception as e:
                print(f"⚠️ Error parsing FIREBASE_CREDENTIALS: {e}")

        if not cred and os.path.exists(CRED_PATH):
            try:
                cred = credentials.Certificate(CRED_PATH)
                print("✅ Loaded Firebase Credentials from File")
            except Exception as e:
                print(f"⚠️ Error reading serviceAccountKey.json: {e}")

        if cred:
            try:
                firebase_admin.initialize_app(cred)
                self.db = firestore.client()
                self.use_local = False
                print("✅ Firebase Connected Successfully")
            except Exception as e:
                 print(f"⚠️ Firebase Init Error: {e}")
        else:
            print("\n" + "!"*50)
            print("CRITICAL WARNING: No Valid Firebase Credentials Found (Env or File).")
            print("Running in Demo Mode. Data will NOT be saved to the cloud.")
            print("!"*50 + "\n")

    def get_risk_zones(self) -> List[Dict]:
        """Fetch risk zones from Firestore or Local JSON"""
        zones = []
        if not self.use_local and self.db:
            try:
                docs = self.db.collection('risk_zones').stream()
                for doc in docs:
                    data = doc.to_dict()
                    
                    if 'lat' not in data or 'lng' not in data:
                        # Try to find name
                        name = data.get('area_name') or data.get('area_name2') or data.get('name')
                        if name:
                            from services.geocoding_service import geocode_location
                            loc = geocode_location(name)
                            if loc:
                                data['lat'] = loc['lat']
                                data['lng'] = loc['lng']
                                data['name'] = name
                    
                    # Standardize Defaults if missing
                    if 'radius_km' not in data: data['radius_km'] = 2.0
                    if 'risk_level' not in data: data['risk_level'] = "HIGH"
                    if 'name' not in data: data['name'] = data.get('area_name', 'Unknown Zone')
                    
                    zones.append(data)
                
                print(f"DEBUG: Loaded {len(zones)} risk zones from Firebase")
                return zones
            except Exception as e:
                print(f"Firestore Read Error: {e}")
                local = self._load_local_zones()
                print(f"DEBUG: Loaded {len(local)} risk zones from LOCAL (Fallback)")
                return local
        else:
            local = self._load_local_zones()
            print(f"DEBUG: Loaded {len(local)} risk zones from LOCAL storage")
            return local

    def add_safety_report(self, report_data: Dict):
        """Save report to Firestore and potentially update a risk zone"""
        if not self.use_local and self.db:
            try:
                self.db.collection('safety_reports').add(report_data)
                print(f"Report saved to Firebase: {report_data}")
                return True
            except Exception as e:
                print(f"Firestore Write Error: {e}")
                return False
        else:
            print(f"LOCAL SAVE (No DB): {report_data}")
            return True

    def log_emergency(self, data: Dict):
        """Log SOS to emergency_logs"""
        print(f"DEBUG: log_emergency called with: {data}")
        if not self.use_local and self.db:
            try:
                # Proper way with firebase-admin
                from firebase_admin import firestore
                import time
                
                # Normalize coordinates
                # Normalize coordinates - Critical for Dashboard display
                lat_val = None
                lng_val = None
                
                # Try location object first
                if 'location' in data and isinstance(data['location'], dict):
                    lat_val = data['location'].get('lat')
                    lng_val = data['location'].get('lng')
                
                # Try top level fallback
                if lat_val is None: lat_val = data.get('lat')
                if lng_val is None: lng_val = data.get('lng')
                
                try:
                    data['lat'] = float(lat_val) if lat_val is not None else None
                    data['lng'] = float(lng_val) if lng_val is not None else None
                except:
                    data['lat'] = None
                    data['lng'] = None
                    print(f"⚠️ ERROR: Could not parse coordinates: {lat_val}, {lng_val}")
                
                # Use definitive Server Timestamp
                data['timestamp'] = firestore.SERVER_TIMESTAMP
                
                doc_id = f"{data.get('phone', 'unknown')}_{int(time.time())}"
                print(f"DEBUG: Attempting to save to collection 'emergency_logs' with ID: {doc_id}")
                
                self.db.collection('emergency_logs').document(doc_id).set(data)
                print(f"🚀 SUCCESS: SOS Logged to Firebase with ID: {doc_id}")
                return True
            except Exception as e:
                print(f"🔥 ERROR: Firestore SOS Write Failed: {e}")
                import traceback
                traceback.print_exc()
                return False
        else:
            print(f"⚠️ WARNING: Firebase not connected, logging SOS locally: {data}")
            return True

    def check_criminal_record(self, phone: str) -> bool:
        """Query criminal_blacklist for a specific phone number"""
        if not self.use_local and self.db:
            try:
                # Query Firestore for matching phoneNumber
                docs = self.db.collection('criminal_blacklist').where('phoneNumber', '==', phone).limit(1).get()
                if len(docs) > 0:
                    print(f"⚠️ SECURITY ALERT: Criminal record found for {phone}")
                    return True
                return False
            except Exception as e:
                print(f"Firestore Blacklist Error: {e}")
                return False
        return False # Fallback to safe if DB unavailable or local

    def _load_local_zones(self):
        if os.path.exists(LOCAL_DB_PATH):
            with open(LOCAL_DB_PATH, 'r') as f:
                return json.load(f)
        return []

    def resolve_emergency(self, alert_id: str) -> bool:
        """Mark an emergency alert as resolved in Firestore"""
        print(f"DEBUG: Resolving alert {alert_id}")
        if not self.use_local and self.db:
            try:
                from firebase_admin import firestore
                ref = self.db.collection('emergency_logs').document(alert_id)
                ref.update({
                    "status": "resolved",
                    "resolved_at": firestore.SERVER_TIMESTAMP
                })
                print(f"✅ Alert {alert_id} resolved successfully")
                return True
            except Exception as e:
                print(f"🔥 ERROR: Failed to resolve alert: {e}")
                return False
        else:
            print(f"⚠️ Simulation: Alert {alert_id} resolved (Local Mode)")
            return True

# Singleton instance
firebase_svc = FirebaseService()
