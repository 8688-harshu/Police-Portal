import requests
import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("IPSTACK_API_KEY")
print(f"Testing API Key: {key}")

# Test 1: PositionStack (Forward Geocoding) - This is what my code uses
url_pos = f"http://api.positionstack.com/v1/forward?access_key={key}&query=London&limit=1"
print(f"\n[Test 1] PositionStack Geocoding endpoint...")
try:
    resp = requests.get(url_pos)
    print(f"Status Code: {resp.status_code}")
    print(f"Response: {resp.text[:200]}...") # Print first 200 chars
except Exception as e:
    print(f"Error: {e}")

# Test 2: IPStack (IP Geolocation) - In case the key is ONLY for this
url_ip = f"http://api.ipstack.com/check?access_key={key}"
print(f"\n[Test 2] IPStack IP-Lookup endpoint...")
try:
    resp = requests.get(url_ip)
    print(f"Status Code: {resp.status_code}")
    print(f"Response: {resp.text[:200]}...")
except Exception as e:
    print(f"Error: {e}")
