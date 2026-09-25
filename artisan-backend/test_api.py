import requests

BASE_URL = "http://127.0.0.1:8000"

def test_flow():
    print("Testing backend endpoints...")
    # 1. Unauthenticated endpoints
    r = requests.get(f"{BASE_URL}/")
    print("GET / ->", r.status_code, r.json())
    assert r.status_code == 200

    r = requests.get(f"{BASE_URL}/services")
    print("GET /services ->", r.status_code, len(r.json()))
    assert r.status_code == 200

    r = requests.get(f"{BASE_URL}/artisans?verified_only=true")
    print("GET /artisans?verified_only=true ->", r.status_code, len(r.json()))
    assert r.status_code == 200

    # 2. Login as admin
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@demo.com", "password": "Passw0rd!"})
    print("POST /auth/login (admin) ->", r.status_code)
    assert r.status_code == 200
    admin_token = r.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 3. Test Admin endpoints
    for ep in ["/admin/artisans", "/admin/stats", "/admin/services/stats", "/admin/reviews", "/admin/requests", "/admin/artisans/activity", "/admin/complaints"]:
        res = requests.get(f"{BASE_URL}{ep}", headers=admin_headers)
        print(f"GET {ep} ->", res.status_code, res.text[:100] if res.status_code != 200 else "OK")

    # 4. Login as customer
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": "customer@demo.com", "password": "Passw0rd!"})
    print("POST /auth/login (customer) ->", r.status_code)
    assert r.status_code == 200
    cust_token = r.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    # 5. Test Customer endpoints
    for ep in [
        "/auth/me",
        "/resident/dashboard",
        "/resident/me",
        "/resident/service-categories",
        "/resident/requests",
        "/resident/requests/current",
        "/resident/requests/history",
        "/resident/ratings/summary",
        "/resident/reviews",
        "/resident/pending-review",
        "/resident/complaints",
        "/notifications",
        "/notifications/unread-count"
    ]:
        res = requests.get(f"{BASE_URL}{ep}", headers=cust_headers)
        print(f"GET {ep} ->", res.status_code, res.text[:100] if res.status_code != 200 else "OK")

    # 6. Login as artisan
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": "artisan@demo.com", "password": "Passw0rd!"})
    print("POST /auth/login (artisan) ->", r.status_code)
    assert r.status_code == 200
    artisan_token = r.json()["access_token"]
    art_headers = {"Authorization": f"Bearer {artisan_token}"}

    # 7. Test Artisan endpoints
    for ep in [
        "/auth/me",
        "/artisans/me",
        "/artisans/me/reviews",
        "/artisans/me/monthly-building-stats",
        "/requests",
        "/requests/available",
        "/notifications",
        "/notifications/unread-count"
    ]:
        res = requests.get(f"{BASE_URL}{ep}", headers=art_headers)
        print(f"GET {ep} ->", res.status_code, res.text[:100] if res.status_code != 200 else "OK")

if __name__ == "__main__":
    test_flow()
