from utils.http import get
from utils.parser import soup


def get_fighter_details(url):

    html = get(url)
    s = soup(html)

    fighter = {}

    fighter["name"] = s.select_one(
        ".b-content__title-highlight"
    ).text.strip()

    info = s.select(".b-list__box-list-item")

    for i in info:

        text = i.text.strip()

        if "Height:" in text:
            fighter["height"] = text.replace("Height:", "").strip()

        if "Reach:" in text:
            fighter["reach"] = text.replace("Reach:", "").strip()

        if "Stance:" in text:
            fighter["stance"] = text.replace("Stance:", "").strip()

        if "DOB:" in text:
            fighter["dob"] = text.replace("DOB:", "").strip()

    fighter["url"] = url
    fighter["fighter_id"] = url.split("/")[-1]

    return fighter