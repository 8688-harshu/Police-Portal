import firebase_admin
from firebase_admin import credentials, firestore
import os

CRED_PATH = r"c:\digipol\2.0\3.0\SafeRoute\backend\serviceAccountKey.json"

if os.path.exists(CRED_PATH):
    cred = credentials.Certificate(CRED_PATH)
    try:
        firebase_admin.initialize_app(cred)
    except:
        pass
    db = firestore.client()
    
    print("Checking risk_zones collection...")
    docs = db.collection('risk_zones').get()
    
    print(f"Total risk zones found: {len(docs)}")
    
    for doc in docs:
        data = doc.to_dict()
        print(f"ID: {doc.id}")
        print(f"  Lat: {data.get('lat')} ({type(data.get('lat'))})")
        print(f"  Lng: {data.get('lng')} ({type(data.get('lng'))})")
        print(f"  Radius: {data.get('radius')} ({type(data.get('radius'))})")
        print(f"  Risk Score: {data.get('risk_score')}")
        print("-" * 20)
        
else:
    print("Key not found at", CRED_PATH)
