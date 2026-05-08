from utils.http import get
from utils.parser import soup


URL = "http://ufcstats.com/statistics/events/completed?page=all"


def get_all_events():

    html = get(URL)

    if not html:
        print("failed to download page")
        return []

    s = soup(html)

    events = []

    links = s.find_all("a", href=True)

    seen = set()

    for link in links:

        href = link["href"]

        if "event-details" not in href:
            continue

        if href in seen:
            continue

        seen.add(href)

        event_name = link.text.strip()

        events.append({
            "event_name": event_name,
            "event_url": href
        })

    return events