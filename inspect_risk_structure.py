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
    
    print("Checking risk_zones structure...")
    docs = list(db.collection('risk_zones').limit(2).stream())
    
    print(f"Found {len(docs)} docs.")
    
    for doc in docs:
        print(f"\nDocument ID: {doc.id}")
        data = doc.to_dict()
        for k, v in data.items():
            print(f"  {k}: {v} (Type: {type(v).__name__})")
            
else:
    print("Key not found")
