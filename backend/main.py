from fastapi import FastAPI, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from risk_engine import calculate_route_risk, RouteRequest, RouteResponse
import firebase_service
print(f"DEBUG: Loading firebase_service from {firebase_service.__file__}")
from firebase_service import firebase_svc
from fastapi.middleware.cors import CORSMiddleware
# Import the new search function
from services.geocoding_service import search_places

app = FastAPI(title="SafeRoute API", description="Safety-aware navigation backend", version="1.0.0")

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Critical for Mobile Access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SafetyReport(BaseModel):
    location: dict
    report_type: str
    description: Optional[str] = None
    timestamp: str

@app.get("/")
def read_root():
    return {
        "status": "ok",
        "message": "Welcome to SafeRoute Police Portal Backend",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "SafeRoute Backend is Running"}

@app.get("/api/search")
def search_locations(query: str):
    """
    Search for locations by name.
    """
    print(f"DEBUG: Search hit for query: {query}")
    if not query:
        return []
    results = search_places(query)
    print(f"DEBUG: Search returned {len(results)} results")
    return results

@app.post("/safe-route", response_model=List[RouteResponse])
def get_safe_routes(request: RouteRequest):
    """
    Calculate and return safe routes based on origin, destination, time, and preferences.
    """
    try:
        print(f"DEBUG: Route Request: {request}")
        routes = calculate_route_risk(request)
        return routes
    except Exception as e:
        print(f"CRITICAL ERROR in calculate_route_risk: {e}")
        return []

@app.get("/risk-zones")
def get_risk_zones():
    """
    Get all active risk zones from the database for map visualization.
    """
    return firebase_svc.get_risk_zones()

@app.post("/report-unsafe")
def report_unsafe_area(report: SafetyReport):
    """
    Submit a user safety report to Firebase.
    """
    success = firebase_svc.add_safety_report(report.dict())
    if success:
        return {"status": "success", "message": "Report submitted to Safety Database"}
    return {"status": "error", "message": "Failed to save report"}

class SOSRequest(BaseModel):
    phone: str
    lat: float
    lng: float

@app.post("/api/sos")
def trigger_sos(request: SOSRequest):
    """
    Log emergency SOS with location to Firestore.
    """
    from datetime import datetime
    
    data = {
        "phone": request.phone,
        "location": {"lat": request.lat, "lng": request.lng},
        "status": "OPEN",
        "timestamp": datetime.now().isoformat()
    }
    
    success = firebase_svc.log_emergency(data)
    if success:
        return {"status": "success", "message": "SOS Alert Logged"}
    raise HTTPException(status_code=500, detail="Failed to log SOS")

@app.get("/api/check-blacklist")
def check_blacklist(phone: str):
    """
    Check if a phone number is in the criminal_blacklist.
    """
    is_blocked = firebase_svc.check_criminal_record(phone)
    return {"blocked": is_blocked}

@app.post("/api/resolve-alert")
def resolve_alert(alert_id: str = Body(..., embed=True)):
    """
    Mark an alert as resolved.
    """
    success = firebase_svc.resolve_emergency(alert_id)
    if success:
        return {"status": "success", "message": "Alert resolved"}
    raise HTTPException(status_code=500, detail="Failed to resolve alert")
# app.mount("/", StaticFiles(directory=client_dir, html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
