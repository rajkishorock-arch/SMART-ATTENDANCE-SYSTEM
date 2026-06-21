import urllib.request, urllib.parse, urllib.error
req = urllib.request.Request('https://smart-attendance-system-1-mvwa.onrender.com/api/v1/auth/token', data=urllib.parse.urlencode({'username': 'admin@face.com', 'password': 'admin123'}).encode('utf-8'))
try:
    urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    print(e.read().decode())
