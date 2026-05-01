import httpx
client = httpx.Client(base_url="http://localhost:8000")
resp = client.post("/api/auth/login", json={"email": "sarah@university.edu", "password": "password123"})
if resp.status_code == 200:
    token = resp.json()["access_token"]
    res = client.post("/api/ai/external-scan/9", json={"api_key": ""}, headers={"Authorization": f"Bearer {token}"})
    print(res.status_code)
    print(res.text)
else:
    print("Login failed", resp.text)
