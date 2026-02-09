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
    valid = 0
    invalid = 0
    
    print("Checking Zone Validity...")
    for doc in docs:
        d = doc.to_dict()
        if d.get('lat') and d.get('lng'):
            valid += 1
        else:
            invalid += 1
            print(f"Invalid Doc ID: {doc.id}")
            
    print(f"Total Valid: {valid}")
    print(f"Total Invalid: {invalid}")

else:
    print("No Key")
