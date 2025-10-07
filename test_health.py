import urllib.request

req = urllib.request.Request('http://127.0.0.1:5000/health', method='GET')

try:
    with urllib.request.urlopen(req) as response:
        print('Status:', response.status)
        print('Body:', response.read().decode())
except Exception as e:
    print('Error:', e)
