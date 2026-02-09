import os
import requests
import googlemaps
from typing import Dict, List, Optional

# Load keys
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
ORS_API_KEY = os.getenv("ORS_API_KEY")

def geocode_location(query: str) -> Optional[Dict]:
    """
    Highly robust geocoder that prioritizes Google Maps, 
    then falls back to OpenRouteService, then Nominatim.
    """
    if not query:
        return None

    # 1. Google Maps (Primary & Most Accurate)
    if GOOGLE_MAPS_API_KEY and "AIza" in GOOGLE_MAPS_API_KEY:
        try:
            gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
            res = gmaps.geocode(query)
            if res:
                loc = res[0]['geometry']['location']
                print(f"✅ Google Maps Geocode Success: {query}")
                return {'lat': loc['lat'], 'lng': loc['lng'], 'source': 'google'}
        except Exception as e:
            print(f"⚠️ Google Geocode Error: {e}")

    # 2. OpenRouteService (Secondary)
    if ORS_API_KEY:
        try:
            url = "https://api.openrouteservice.org/geocode/search"
            params = {"api_key": ORS_API_KEY, "text": query, "size": 1}
            resp = requests.get(url, params=params, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                if data.get('features'):
                    coords = data['features'][0]['geometry']['coordinates']
                    print(f"✅ ORS Geocode Success: {query}")
                    return {'lat': coords[1], 'lng': coords[0], 'source': 'ors'}
        except Exception as e:
            print(f"⚠️ ORS Geocode Error: {e}")

    # 3. Nominatim (Free Fallback)
    try:
        headers = {'User-Agent': 'SafeRouteApp/1.0'}
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={query}&limit=1"
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200 and len(resp.json()) > 0:
            loc = resp.json()[0]
            print(f"✅ Nominatim Geocode Success: {query}")
            return {'lat': float(loc['lat']), 'lng': float(loc['lon']), 'source': 'nominatim'}
    except Exception as e:
        print(f"⚠️ Nominatim Fallback Error: {e}")

    return None

def search_places(query: str) -> List[Dict]:
    """
    Search for multiple places matching query.
    """
    # Prefer Google Places if possible
    if GOOGLE_MAPS_API_KEY and "AIza" in GOOGLE_MAPS_API_KEY:
        try:
            gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
            res = gmaps.places(query)
            if res and res.get('results'):
                results = []
                for p in res['results'][:5]:
                    results.append({
                        "name": p.get('name', p.get('formatted_address')),
                        "lat": p['geometry']['location']['lat'],
                        "lng": p['geometry']['location']['lng'],
                        "source": "google"
                    })
                return results
        except Exception as e:
            print(f"⚠️ Google Search Error: {e}")

    # Fallback to ORS Search (already implemented in ors_service but centralizing here)
    from services.ors_service import search_places_ors
    return search_places_ors(query)
