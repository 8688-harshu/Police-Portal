import firebase_admin
from firebase_admin import credentials, firestore
import os
import datetime

CRED_PATH = r"c:\digipol\2.0\3.0\SafeRoute\backend\serviceAccountKey.json"

if os.path.exists(CRED_PATH):
    cred = credentials.Certificate(CRED_PATH)
    try: firebase_admin.initialize_app(cred)
    except: pass
    db = firestore.client()
    
    print("Adding Hyderabad Risk Zone...")
    
    # Charminar Area
    new_zone = {
        "lat": 17.3616,
        "lng": 78.4747,
        "radius": 300,
        "risk_score": 85,
        "description": "High Traffic Risk Area - Charminar",
        "created_at": datetime.datetime.now(),
        "type": "Traffic/Crowd"
    }
    
    db.collection('risk_zones').add(new_zone)
    print("Added successfully.")

else:
    print("No Key")
