import firebase_admin
from firebase_admin import credentials, firestore
import os

CRED_PATH = r"c:\digipol\2.0\3.0\SafeRoute\backend\serviceAccountKey.json"

if os.path.exists(CRED_PATH):
    cred = credentials.Certificate(CRED_PATH)
    try: firebase_admin.initialize_app(cred)
    except: pass
    db = firestore.client()
    
    docs = db.collection('emergency_logs').limit(10).get() # Just get a sample
    for doc in docs:
        data = doc.to_dict()
        print(f"ID: {doc.id}")
        print(f"  Status: {data.get('status')}")
        print(f"  HasTS: {'timestamp' in data}")
        if 'timestamp' in data:
            print(f"  TSType: {type(data['timestamp'])}")
            print(f"  TSVal: {data['timestamp']}")
        print("-" * 20)
else:
    print("Key not found")
