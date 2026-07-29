import subprocess
import json

# Run ipconfig /all
result = subprocess.run(['ipconfig', '/all'], capture_output=True, text=True)
print("=== IPCONFIG /ALL ===")
print(result.stdout)

# Run wmic for NIC speeds
print("\n=== NIC SPEEDS ===")
result2 = subprocess.run(['wmic', 'nic', 'where', 'NetEnabled=true', 'get', 'Name,Speed,MACAddress'], capture_output=True, text=True)
print(result2.stdout)

# Get wireless interface details
print("\n=== WIRELESS DETAILS ===")
result3 = subprocess.run(['netsh', 'wlan', 'show', 'interfaces'], capture_output=True, text=True)
print(result3.stdout)
