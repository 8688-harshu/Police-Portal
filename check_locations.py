import firebase_admin
from firebase_admin import credentials, firestore
import os

CRED_PATH = r"c:\digipol\2.0\3.0\SafeRoute\backend\serviceAccountKey.json"

if os.path.exists(CRED_PATH):
    cred = credentials.Certificate(CRED_PATH)
    try: firebase_admin.initialize_app(cred)
    except: pass
    db = firestore.client()
    
    docs = db.collection('risk_zones').stream()
    
    print("Risk Zone Locations:")
    for doc in docs:
        d = doc.to_dict()
        lat = d.get('lat')
        lng = d.get('lng')
        # Check distance from Hyderabad (approx)
        is_hyd = False
        if lat and lng:
            if 17.0 < lat < 17.8 and 78.0 < lng < 79.0:
                is_hyd = True
        
        print(f"ID:{doc.id}, Lat:{lat}, Lng:{lng}, NearHYD:{is_hyd}")

else:
    print("No Key")
