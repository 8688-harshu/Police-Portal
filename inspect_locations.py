import firebase_admin
from firebase_admin import credentials, firestore
import os

CRED_PATH = r"c:\digipol\2.0\3.0\SafeRoute\backend\serviceAccountKey.json"

if os.path.exists(CRED_PATH):
    cred = credentials.Certificate(CRED_PATH)
    try: firebase_admin.initialize_app(cred)
    except: pass
    db = firestore.client()
    
    docs = db.collection('emergency_logs').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(10).get()
    
    for doc in docs:
        print(f"ID: {doc.id}")
        data = doc.to_dict()
        print(f"  phone: {data.get('phone')}")
        print(f"  lat: {data.get('lat')}")
        print(f"  lng: {data.get('lng')}")
        print(f"  location: {data.get('location')}")
        print(f"  status: {data.get('status')}")
        print(f"  timestamp: {data.get('timestamp')}")
        print("-" * 20)
else:
    print("Key not found")
