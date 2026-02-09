import firebase_admin
from firebase_admin import credentials, firestore
import os

CRED_PATH = r"c:\digipol\2.0\3.0\SafeRoute\backend\serviceAccountKey.json"

if os.path.exists(CRED_PATH):
    cred = credentials.Certificate(CRED_PATH)
    try: firebase_admin.initialize_app(cred)
    except: pass
    db = firestore.client()
    
    docs = db.collection('emergency_logs').get()
    print(f"Checking {len(docs)} documents...")
    fixed_count = 0
    for doc in docs:
        data = doc.to_dict()
        loc = data.get('location')
        needs_fix = False
        
        if loc and isinstance(loc, dict):
            lat_val = loc.get('lat')
            lng_val = loc.get('lng')
            
            if data.get('lat') != lat_val or data.get('lng') != lng_val:
                print(f"Fixing Doc: {doc.id} (Lat: {data.get('lat')} -> {lat_val})")
                db.collection('emergency_logs').document(doc.id).update({
                    'lat': lat_val,
                    'lng': lng_val
                })
                fixed_count += 1
    
    print(f"Repair complete. Fixed {fixed_count} documents.")
else:
    print("Key not found")
