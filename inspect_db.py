import firebase_admin
from firebase_admin import credentials, firestore
import os

# Use the same key as the backend
CRED_PATH = r"c:\digipol\2.0\3.0\SafeRoute\backend\serviceAccountKey.json"

if os.path.exists(CRED_PATH):
    cred = credentials.Certificate(CRED_PATH)
    try:
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Init error (might already be init): {e}")
    
    db = firestore.client()
    
    print("Checking emergency_logs...")
    docs = db.collection('emergency_logs').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(5).get()
    
    for doc in docs:
        data = doc.to_dict()
        print(f"ID: {doc.id}")
        print(f"  Phone: {data.get('phone')}")
        print(f"  Lat: {data.get('lat')}")
        print(f"  Lng: {data.get('lng')}")
        print(f"  Timestamp: {data.get('timestamp')}")
        print("-" * 20)
else:
    print("Key not found")
