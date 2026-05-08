from utils.http import get
from utils.parser import soup


def scrape_sherdog(url):

    html = get(url)

    s = soup(html)

    if not s:
        return {}

    fighter = {}

    h1 = s.select_one("h1")

    if h1:
        fighter["name"] = h1.text.strip()

    text = s.get_text("\n")

    fighter["raw_text"] = text

    return fighter