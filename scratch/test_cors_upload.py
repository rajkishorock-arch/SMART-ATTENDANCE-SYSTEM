import requests

base_url = "https://smart-attendance-system-1-mvwa.onrender.com/api/v1"

# Minimal valid 1x1 JPEG bytes
jpeg_bytes = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xd2\xcf\x00\xff\xd9'

files = {'file': ('sample.jpg', jpeg_bytes, 'image/jpeg')}

# Test OPTIONS (CORS preflight)
r_opt = requests.options(f"{base_url}/users/students/655/upload-sample", headers={
    'Origin': 'https://kgattendence.vercel.app',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization,x-master-password'
})
print(f"CORS OPTIONS status: {r_opt.status_code}")
print(f"Access-Control-Allow-Origin: {r_opt.headers.get('access-control-allow-origin')}")
print(f"Access-Control-Allow-Headers: {r_opt.headers.get('access-control-allow-headers')}")

# Test POST with invalid token
r_post = requests.post(f"{base_url}/users/students/655/upload-sample", files=files, headers={
    'Authorization': 'Bearer invalidtoken',
    'X-Master-Password': 'master',
    'Origin': 'https://kgattendence.vercel.app'
})
print(f"POST status: {r_post.status_code}, body: {r_post.text}")
