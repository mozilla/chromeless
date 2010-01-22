import urllib
import httplib2
import sys
from datetime import datetime

def dekiQuote(string):
  enc = urllib.quote_plus
  return enc(enc(string))

def edittime():
  return datetime.now().strftime("%Y%m%d%H%M%S")

username = "JetpackBot"
password = "jetpack!"

http = httplib2.Http()
http.add_credentials(username, password)
headers = {'Content-type': 'application/x-www-form-urlencoded'}

postUrl = "https://developer.mozilla.org/@api/deki/pages/=%s/contents?edittime=%s&title=%s"

def commit(doc):
  where = postUrl % (dekiQuote(doc["id"]), edittime(), urllib.quote(doc["title"]))

  response = http.request(
      where, 
      "POST", 
      headers = headers,
      body = doc["html"],
  )

  return response

