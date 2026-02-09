import firebase_admin
from firebase_admin import credentials, firestore
import os

CRED_PATH = r"c:\digipol\2.0\3.0\SafeRoute\backend\serviceAccountKey.json"

if os.path.exists(CRED_PATH):
    cred = credentials.Certificate(CRED_PATH)
    try: firebase_admin.initialize_app(cred)
    except: pass
    db = firestore.client()
    
    docs = db.collection('emergency_logs').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(3).get()
    
    for doc in docs:
        print(f"ID: {doc.id}")
        data = doc.to_dict()
        for k, v in data.items():
            print(f"  {k}: {v} ({type(v)})")
        print("-" * 20)
else:
    print("Key not found")
