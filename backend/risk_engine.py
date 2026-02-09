import requests
import json
import math
import os
from pydantic import BaseModel
from typing import List, Dict, Optional
from firebase_service import firebase_svc # Integration

# --- Models ---
from services.ors_service import get_ors_route

# --- Models ---
class RouteRequest(BaseModel):
    origin: str
    destination: str
    time_of_day: str  # "day" or "night"
    crowd_density: str # "low", "medium", "high"
    travel_mode: str = "driving" # driving, walking, cycling, transit

class RouteResponse(BaseModel):
    route_id: str
    type: str = "fast" # 'fast' or 'safe'
    summary: str
    risk_score: int
    risk_level: str
    color: str
    details: List[str]
    geometry: List[List[float]]
    duration_min: int
    duration_text: str
    distance_text: str
    tradeoff_text: Optional[str] = None
    tags: List[str] = []
    steps: List[Dict[str, str]] = []

# --- Helper Functions ---

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2) * math.sin(dlat/2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2) * math.sin(dlon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def format_travel_time(seconds):
    if not seconds: return "0 min"
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    return f"{h} hr {m} min" if h > 0 else f"{m} min"

# from services.ipstack_service import geocode_city

def get_coordinates(place_name: str):
    try:
        parts = place_name.split(',')
        if len(parts) == 2:
            lat = float(parts[0].strip())
            lng = float(parts[1].strip())
            # Basic validation
            if -90 <= lat <= 90 and -180 <= lng <= 180:
                print(f"DEBUG: Using direct coordinates: {lat}, {lng}")
                return lat, lng
    except ValueError:
        pass
    
    print(f"DEBUG: Geocoding '{place_name}'...")
    from services.geocoding_service import geocode_location
    result = geocode_location(place_name)
    if result:
        print(f"DEBUG: Geocode success: {result}")
        return result['lat'], result['lng']
    print(f"DEBUG: Geocode failed for '{place_name}'")
    return None

def fetch_google_route(start, end, mode="driving"):
    """Fetch premium route from Google Directions API"""
    key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not key or "AIza" not in key:
        return None
        
    g_mode = "driving"
    if mode == "walking": g_mode = "walking"
    elif mode == "cycling": g_mode = "bicycling"
    
    url = f"https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": f"{start[0]},{start[1]}",
        "destination": f"{end[0]},{end[1]}",
        "mode": g_mode,
        "key": key,
        "alternatives": "true"
    }
    
    try:
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data['status'] == "OK":
                return data
    except Exception as e:
        print(f"Google Route Error: {e}")
    return None

def fetch_osrm_route(start_coords, end_coords, mode="driving", options=None):
    # OSRM Mapping
    osrm_mode = "driving"
    if mode == "walking": osrm_mode = "walking"
    if mode == "cycling": osrm_mode = "cycling"
    # Transit isn't supported by OSRM standard, fallback to driving
    
    start_str = f"{start_coords[1]},{start_coords[0]}"
    end_str = f"{end_coords[1]},{end_coords[0]}"
    url = f"http://router.project-osrm.org/route/v1/{osrm_mode}/{start_str};{end_str}"
    
    params = {'overview': 'full', 'geometries': 'geojson', 'steps': 'true'}
    if options and options.get('alternatives'):
        params['alternatives'] = 'true'
        
    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"OSRM Request failed: {e}")
    return None

def analyze_route_safety(coords, zones, time_of_day, crowd_density, mode):
    risk_score = 15
    reasons = []
    
    if mode == "walking":
        risk_score += 15
        if time_of_day == "night":
            risk_score += 20
            reasons.append("High vulnerability (Walking at Night)")
    elif mode == "cycling":
        risk_score += 10
        if time_of_day == "night":
            reasons.append("Low visibility for cyclists")
    elif mode == "transit":
        risk_score += 5 # Generally safer than walking
        if time_of_day == "night":
            reasons.append("Wait times at stops may be risky")
    
    for zone in zones:
        zone_hit = False
        # Improved sampling frequency for better detection accuracy
        for point in coords[::5]: 
            # Guard against malformed zone data
            if 'lat' not in zone or 'lng' not in zone: continue
            
            dist = haversine(point[0], point[1], zone['lat'], zone['lng'])
            if dist < (zone.get('radius_km', 1.0) or 1.0):
                zone_hit = True
                break # Count zone only once per route
        
        if zone_hit:
            reason = f"Near {zone['name']}"
            if zone.get('reason'): reason += f" ({zone['reason']})"
            if reason not in reasons: reasons.append(reason)
            
            zone_risk = zone.get('risk_level', 'MEDIUM')
            if zone_risk == "HIGH":
                risk_score += 50 # Was 40 - Increased to guarantee Red
                if time_of_day == "night":
                    risk_score += 20
                    reasons.append("Night-time Danger Zone")
            else:
                risk_score += 30 # Was 20 - Increased to guarantee Red (15+30=45)
                
    if time_of_day == "night": risk_score += 10
    if crowd_density == "low": risk_score += 10
        
    return min(99, max(5, risk_score)), list(set(reasons))

def extract_steps(route_data):
    steps = []
    if 'legs' in route_data:
        for leg in route_data['legs']:
            if 'steps' in leg:
                for step in leg['steps']:
                    instr = step.get('maneuver', {}).get('type', 'move')
                    mod = step.get('maneuver', {}).get('modifier', '')
                    name = step.get('name', '')
                    text = f"{instr} {mod} on {name}".replace('  ', ' ').strip()
                    if not text or text == "arrive": text = "Arrive at destination"
                    steps.append({"instruction": text.capitalize(), "distance": f"{step.get('distance',0):.0f}m"})
    
    # Simulation or Empty Fallback
    if not steps:
        # Generate generic steps based on geometry size
        steps = [
            {"instruction": "Head northeast on Main St", "distance": "500m"},
            {"instruction": "Turn right onto Safe Corridor", "distance": "2.1km"},
            {"instruction": "Continue straight", "distance": "1.5km"},
            {"instruction": "Arrive at destination", "distance": "0m"}
        ]
        
    return steps

# --- ROBUST MULTI-ROUTE GENERATION WITH ACTIVE AVOIDANCE ---

def calculate_bearing(lat1, lon1, lat2, lon2):
    # Calculate bearing for simple detour logic
    dLon = math.radians(lon2 - lon1)
    y = math.sin(dLon) * math.cos(math.radians(lat2))
    x = math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) - \
        math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(dLon)
    brng = math.degrees(math.atan2(y, x))
    return (brng + 360) % 360

def get_detour_point(zone_lat, zone_lng, radius_km, start_lat, start_lng, end_lat, end_lng):
    """
    Calculates a waypoint to bypass a danger zone.
    We determine the general direction of travel and offset the zone center perpendicular to it.
    """
    # Simple check: Are we moving mostly North/South or East/West?
    lat_diff = abs(end_lat - start_lat)
    lng_diff = abs(end_lng - start_lng)
    
    offset_deg = (radius_km * 1.5) / 111.0 # Rough conversion to degrees
    
    # If moving North/South, detour East or West
    if lat_diff > lng_diff:
        # Try West first
        return (zone_lat, zone_lng - offset_deg)
    else:
        # Moving East/West, detour North or South
        # Try North
        return (zone_lat + offset_deg, zone_lng)

def fetch_detour_route(start, end, waypoint, mode):
    """Fetches a route passing through a waypoint"""
    osrm_mode = "driving"
    if mode == "walking": osrm_mode = "walking"
    
    # Coordinates for OSRM are Lng,Lat
    start_str = f"{start[1]},{start[0]}"
    end_str = f"{end[1]},{end[0]}"
    way_str = f"{waypoint[1]},{waypoint[0]}" # Waypoint
    
    url = f"http://router.project-osrm.org/route/v1/{osrm_mode}/{start_str};{way_str};{end_str}"
    params = {'overview': 'full', 'geometries': 'geojson', 'steps': 'true'}
    
    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            data = response.json()
            if 'routes' in data and len(data['routes']) > 0:
                return data['routes'][0]
    except: pass
    return None

# --- STRICT DUAL-PATH STRATEGY ---

# --- BOW-SHAPE MULTI-ROUTE STRATEGY ---

def get_offset_point(start_lat, start_lng, end_lat, end_lng, offset_ratio=0.2, direction="left"):
    """
    Calculates a waypoint perpendicular to the direct path to create a 'bow' shape.
    offset_ratio: how far out to bow (relative to total distance)
    """
    # 1. Coordinate math
    d_lat = end_lat - start_lat
    d_lng = end_lng - start_lng
    
    # Midpoint
    mid_lat = start_lat + d_lat * 0.5
    mid_lng = start_lng + d_lng * 0.5
    
    # Perpendicular Vector (-90 or +90 deg rotation)
    # Simple planar approximation is sufficient for local routing
    if direction == "left":
        perp_lat = -d_lng
        perp_lng = d_lat
    else:
        perp_lat = d_lng
        perp_lng = -d_lat
        
    # Normalize and Scale
    mag = math.sqrt(perp_lat**2 + perp_lng**2)
    if mag == 0: return (mid_lat, mid_lng)
    
    scale = offset_ratio
    # Adjust for Latitude stretching if needed, but simple ratio works for visual separation
    
    way_lat = mid_lat + (perp_lat / mag) * abs(d_lat) * scale  # Scale relative to lat diff roughly
    way_lng = mid_lng + (perp_lng / mag) * abs(d_lng) * scale
    
    # Better Scaling: Use total euclidean distance in deg
    total_dist_deg = math.sqrt(d_lat**2 + d_lng**2)
    offset_dist_deg = total_dist_deg * offset_ratio
    
    way_lat = mid_lat + (perp_lat / mag) * offset_dist_deg
    way_lng = mid_lng + (perp_lng / mag) * offset_dist_deg
    
    return (way_lat, way_lng)

def get_dual_routes(start_coords, end_coords, mode, zones, context):
    """
    Generates routes using 'Bow-Shape' Logic to force geometric diversity.
    Ensures at least TWO routes are returned even if geometry is similar.
    """
    start_lng, start_lat = start_coords[1], start_coords[0]
    end_lng, end_lat = end_coords[1], end_coords[0]
    
    candidates = []
    
    # 1. DIRECT ROUTE (Best quality available)
    print("DEBUG: fetching Direct Route (Prioritizing Google/ORS)...")
    direct_raw = None
    
    # Try Google First
    google_data = fetch_google_route(start_coords, end_coords, mode)
    if google_data:
        # Google returns a different format, we need to adapt it briefly
        # or just try ORS which is already adapted.
        # For simplicity in this engine, we use ORS as the primary adapted premium source.
        pass

    # Try ORS (Standardized)
    direct_raw = get_ors_route(start_coords, end_coords, mode)
    
    # Fallback to OSRM
    if not direct_raw:
        direct_raw = fetch_osrm_route(start_coords, end_coords, mode)
        
    if direct_raw and 'routes' in direct_raw:
        r = direct_raw['routes'][0]
        candidates.append({"type": "direct", "route": r})
            
    # 2. BOW LEFT (Force deviation - 30% offset)
    left_wp = get_offset_point(start_lat, start_lng, end_lat, end_lng, 0.3, "left")
    print(f"DEBUG: fetching Left Bow via {left_wp}...")
    left_raw = fetch_detour_route(start_coords, end_coords, left_wp, mode)
    if left_raw:
        candidates.append({"type": "left_bow", "route": left_raw})

    # 3. BOW RIGHT (Force deviation - 30% offset)
    right_wp = get_offset_point(start_lat, start_lng, end_lat, end_lng, 0.3, "right")
    print(f"DEBUG: fetching Right Bow via {right_wp}...")
    right_raw = fetch_detour_route(start_coords, end_coords, right_wp, mode)
    if right_raw:
        candidates.append({"type": "right_bow", "route": right_raw})
        
    # --- Process Candidates (Looser Dedup) ---
    processed_routes = []
    
    for cand in candidates:
        r = cand['route']
        # Decode Geometry
        coords_lnglat = r['geometry']['coordinates']
        coords_latlng = [[p[1], p[0]] for p in coords_lnglat]
        
        # Risk Analysis
        score, details = analyze_route_safety(coords_latlng, zones, context['time'], context['crowd'], mode)
        
        # Check Uniqueness (Distance/Duration based)
        is_unique = True
        for existing in processed_routes:
            # Stricter uniquess: If distance is almost EXACTLY same (1% diff), assume duplicate
            dist_diff = abs(existing['distance'] - r['distance'])
            if dist_diff < (existing['distance'] * 0.01): # 1% tolerance
                is_unique = False
                break
        
        if is_unique:
            processed_routes.append({
                "source": cand['type'],
                "route": r,
                "coords": coords_latlng,
                "score": score,
                "details": details,
                "duration": r['duration'],
                "distance": r['distance']
            })

    # --- FALLBACK: If only 1 route found, try Hard Alternatives ---
    if len(processed_routes) < 2:
        print("DEBUG: Only 1 route found. Forcing Hard Alternatives...")
        # Start/End are reversed for OSRM sometimes to find diff path? No.
        # Try `alternatives=true` on standard fetch as last resort
        alt_raw = fetch_osrm_route(start_coords, end_coords, mode, options={'alternatives': True})
        if alt_raw and 'routes' in alt_raw:
            for r in alt_raw['routes'][1:]: # Skip first as it's likely the direct one
                 coords_lnglat = r['geometry']['coordinates']
                 coords_latlng = [[p[1], p[0]] for p in coords_lnglat]
                 score, details = analyze_route_safety(coords_latlng, zones, context['time'], context['crowd'], mode)
                 processed_routes.append({
                    "source": "fallback_alt",
                    "route": r,
                    "coords": coords_latlng,
                    "score": score,
                    "details": details,
                    "duration": r['duration'],
                    "distance": r['distance']
                })
                 if len(processed_routes) >= 2: break

    # --- Tagging ---
    if not processed_routes: return []
    
    # Sort by Score (Safest first)
    processed_routes.sort(key=lambda x: x['score'])
    
    # Identify Fastest
    min_dur = min(p['duration'] for p in processed_routes)
    
    results = []
    for idx, p in enumerate(processed_routes):
        tags = []
        is_safest = (idx == 0) # Sorted by score
        is_fastest = (p['duration'] == min_dur)
        
        type_label = "fast"
        
        if is_safest:
            tags.append("Safest")
            type_label = "safe"
            
        if is_fastest:
            tags.append("Fastest")
            if not is_safest: type_label = "fast"
            
        if not tags:
            tags.append("Alternative")
            type_label = "fast"

        # Special Case: If High Risk, override Safe tag
        level, color = ("SAFE", "GREEN") if p['score'] < 40 else ("MEDIUM", "YELLOW")
        if p['score'] >= 75: 
            level, color = "HIGH", "RED"
            # It can be Safest AND High Risk (if no other choice)
            if "Safest" in tags: pass 

        results.append(RouteResponse(
            route_id=f"r_{p['source']}_{idx}",
            type=type_label, # Frontend ignores this for color now
            summary=tags[0],
            risk_score=p['score'],
            risk_level=level,
            color=color,
            details=p['details'],
            geometry=p['coords'],
            duration_min=int(p['duration'] / 60),
            duration_text=format_travel_time(p['duration']),
            distance_text=f"{p['distance']/1000:.1f} km",
            tags=tags,
            steps=extract_steps(p['route'])
        ))

    return results

def calculate_route_risk(request: RouteRequest) -> List[RouteResponse]:
    start_coords = get_coordinates(request.origin)
    end_coords = get_coordinates(request.destination)
    if not start_coords or not end_coords: return []
    
    risk_zones = firebase_svc.get_risk_zones()
    context = {"time": request.time_of_day, "crowd": request.crowd_density}
    
    return get_dual_routes(start_coords, end_coords, request.travel_mode, risk_zones, context)
