import urllib.request

req = urllib.request.Request('http://127.0.0.1:5000/api/crop/predict', method='OPTIONS', headers={
    'Origin': 'http://localhost:3000',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type'
})

try:
    with urllib.request.urlopen(req) as response:
        print('Status:', response.status)
        print('Headers:')
        for key, value in response.headers.items():
            print(f'{key}: {value}')
except Exception as e:
    print('Error:', e)
