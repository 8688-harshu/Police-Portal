
import googlemaps
import os
import polyline_decoder # We will create this local util since 'polyline' package might not be installed
from datetime import datetime

def get_google_route(origin_str, destination_str, mode="driving"):
    key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not key:
        print("Google Service: No API Key found.")
        return None
    
    try:
        gmaps = googlemaps.Client(key=key)
        
        # Map modes
        g_mode = "driving"
        if mode == "walking": g_mode = "walking"
        if mode == "cycling": g_mode = "bicycling"
        if mode == "transit": g_mode = "transit"

        print(f"Google Maps Request: {origin_str} -> {destination_str} [{g_mode}]")
        
        # Request
        directions_result = gmaps.directions(
            origin_str,
            destination_str,
            mode=g_mode,
            alternatives=True
        )
        
        return _adapt_google_to_osrm(directions_result)
        
    except Exception as e:
        print(f"Google Maps API Error: {e}")
        return None

def _adapt_google_to_osrm(g_data):
    if not g_data:
        return None
        
    routes = []
    for g_route in g_data:
        # 1. Decode Polyline
        # Google returns encoded string. We need [[lng, lat]]
        encoded = g_route['overview_polyline']['points']
        path = polyline_decoder.decode(encoded) # Returns [(lat, lng)]
        
        # Convert to [[lng, lat]] for OSRM/GeoJSON compatibility
        geometry = [[lng, lat] for lat, lng in path]
        
        leg = g_route['legs'][0]
        
        route = {
            'geometry': geometry,
            'distance': leg['distance']['value'], # meters
            'duration': leg['duration']['value'], # seconds
            'weight_name': 'google',
            'summary': g_route.get('summary', 'Google Route')
        }
        routes.append(route)
        
    return {'routes': routes}
