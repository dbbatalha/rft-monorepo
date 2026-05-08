import cloudscraper
import time

scraper = cloudscraper.create_scraper()

def get(url):

    try:

        r = scraper.get(url, timeout=30)

        if r.status_code != 200:
            print("HTTP ERROR", r.status_code, url)
            return None

        time.sleep(1)

        return r.text

    except Exception as e:

        print("REQUEST ERROR", e)
        return None