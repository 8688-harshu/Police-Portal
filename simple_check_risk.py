import firebase_admin
from firebase_admin import credentials, firestore
import os
import time

CRED_PATH = r"c:\digipol\2.0\3.0\SafeRoute\backend\serviceAccountKey.json"

if os.path.exists(CRED_PATH):
    cred = credentials.Certificate(CRED_PATH)
    try: firebase_admin.initialize_app(cred)
    except: pass
    db = firestore.client()
    
    docs = list(db.collection('risk_zones').stream())
    print(f"COUNT: {len(docs)}")
    
    for doc in docs:
        d = doc.to_dict()
        lat = d.get('lat')
        lng = d.get('lng')
        print(f"ID:{doc.id}, LAT:{lat}, LNG:{lng}")
        time.sleep(0.1) # slow down for buffer
else:
    print("No Key")
