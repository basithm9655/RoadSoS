import requests

form_url = "https://docs.google.com/forms/d/e/1FAIpQLSf1ZQdEm-3BoaWsoru6nVELnGgiP7lEX28FaGEA7P8ihTNSHA/formResponse"

payload = {
    'entry.2005620554': '04:18:00 PM', # time
    'entry.1745558313': 'Python Test Incident Alert', # location
    'entry.1851319683': 'https://maps.google.com/?q=11,76', # map link
    'entry.128770266': 'basi1312345@gmail.com', # target email
    'fvv': '1',
    'pageHistory': '0',
    'fbzx': '4063816215861590838'
}

response = requests.post(form_url, data=payload)
print(f"Status Code: {response.status_code}")
if "formResponse" in response.text or response.status_code == 200:
    print("Submission completed successfully!")
else:
    print("Failed to submit. Response content snippet:")
    print(response.text[:500])
