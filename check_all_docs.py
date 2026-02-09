import firebase_admin
from firebase_admin import credentials, firestore
import os

CRED_PATH = r"backend\serviceAccountKey.json"

if os.path.exists(CRED_PATH):
    cred = credentials.Certificate(CRED_PATH)
    try: firebase_admin.initialize_app(cred)
    except: pass
    db = firestore.client()
    
    docs = db.collection('emergency_logs').get()
    print(f"Total documents: {len(docs)}")
    for doc in docs:
        data = doc.to_dict()
        has_ts = 'timestamp' in data
        ts_type = type(data.get('timestamp')) if has_ts else 'N/A'
        status = data.get('status')
        print(f"Doc: {doc.id} | HasTS: {has_ts} | TSType: {ts_type} | Status: {status}")
else:
    print("Key not found")
