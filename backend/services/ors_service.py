import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables (explicit path to ensure it works)
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

ORS_API_KEY = os.getenv("ORS_API_KEY")
ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions"

# Map internal modes to ORS profiles
MODE_MAP = {
    "driving": "driving-car",
    "car": "driving-car",
    "walking": "foot-walking",
    "walk": "foot-walking",
    "cycling": "cycling-regular",
    "bike": "cycling-regular",
    "transit": "driving-car", # Fallback as ORS basic routing doesn't support transit schedules
    "bus": "driving-hgv" # Optional specificity
}

def get_ors_route(start_coords: tuple, end_coords: tuple, mode: str = "driving"):
    """
    Fetch route from OpenRouteService.
    
    Args:
        start_coords: (lat, lon)
        end_coords: (lat, lon)
        mode: 'driving', 'walking', 'cycling'
        
    Returns:
        dict: Standardized response with 'routes' list looking like OSRM format
              or None if failure.
    """
    if not ORS_API_KEY or ORS_API_KEY == "MY_API_KEY_HERE":
        print("ORS Service: Missing or invalid API Key")
        return None

    profile = MODE_MAP.get(mode, "driving-car")
    
    # ORS expected body for POST
    # coordinates: [[lon, lat], [lon, lat]]
    body = {
        "coordinates": [
            [start_coords[1], start_coords[0]],
            [end_coords[1], end_coords[0]]
        ],
        "alternative_routes": {
            "target_count": 3,
            "weight_factor": 1.4,
            "share_factor": 0.6
        }
    }
    
    headers = {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8"
    }

    try:
        # Using POST for greater control (and alternatives support)
        print(f"DEBUG: Requesting ORS Profile: {profile} for mode: {mode}")
        response = requests.post(f"{ORS_BASE_URL}/{profile}/geojson", json=body, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"DEBUG: ORS returned {len(data.get('features', []))} features")
            return _adapt_ors_to_osrm(data)
        else:
            print(f"ORS API Error {response.status_code}: {response.text}")
            return None
            
    except Exception as e:
        print(f"ORS Connection Error: {e}")
        return None

def _adapt_ors_to_osrm(ors_data):
    """
    Convert ORS GeoJSON response to OSRM-like structure 
    to maintain compatibility with existing risk engine.
    """
    if 'features' not in ors_data or not ors_data['features']:
        return None
        
    routes = []
    for feature in ors_data['features']:
        props = feature.get('properties', {})
        summary = props.get('summary', {})
        
        # DEBUG: Requested by User
        print(f"DEBUG: Raw ORS Response: {summary}")

        # Extract geometry (already in [lon, lat] format)
        geometry = feature.get('geometry', {})
        
        # Build OSRM-like route object
        route = {
            'geometry': geometry, # {'type': 'LineString', 'coordinates': [[lon, lat], ...]}
            'distance': summary.get('distance', 0),    # Meters (Strict)
            'duration': summary.get('duration', 0),    # Seconds (Strict)
            'weight_name': 'routability',
            'legs': [] # Simplified
        }
        routes.append(route)
        
    return {'routes': routes}

def search_places_ors(query: str):
    """
    Search for places using ORS Geocoding API.
    Returns: List of {name, lat, lng}
    """
    # 1. Mock Data / Fallback if critical
    # Note: Returning mocks if query is 'fail' or similar could be useful, 
    # but here we try real API first.
    
    if not ORS_API_KEY or ORS_API_KEY == "MY_API_KEY_HERE":
        # Return fallback for testing without keys
        return [
           {"name": "San Francisco, CA (Mock)", "lat": 37.7749, "lng": -122.4194},
           {"name": "Googleplex, Mountain View (Mock)", "lat": 37.4220, "lng": -122.0841}
        ]

    url = "https://api.openrouteservice.org/geocode/search"
    params = {
        "api_key": ORS_API_KEY,
        "text": query,
        "size": 5
    }
    
    try:
        resp = requests.get(url, params=params, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            results = []
            for feature in data.get('features', []):
                coords = feature['geometry']['coordinates'] # [lon, lat]
                props = feature['properties']
                results.append({
                    "name": props.get('label', props.get('name', 'Unknown Location')),
                    "lat": coords[1],
                    "lng": coords[0]
                })
            if results:
                return results
        else:
            print(f"Geocode Error {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"Geocode Exception: {e}")
        
    # Standard Fallback results for demonstration
    return [
        {"name": "Narasapuram, AP", "lat": 16.4419, "lng": 81.6967},
        {"name": "Hyderabad Safe Zone", "lat": 17.3850, "lng": 78.4867},
        {"name": "Vijayawada High Risk", "lat": 16.5062, "lng": 80.6480}
    ]
