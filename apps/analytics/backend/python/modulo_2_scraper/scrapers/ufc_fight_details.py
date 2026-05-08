from utils.http import get
from utils.parser import soup


def clean(v):
    return v.replace("\n", "").strip()


def get_event_fights(event_url):

    html = get(event_url)

    if not html:
        return []

    s = soup(html)

    fights = []

    links = s.find_all("a", href=True)

    for l in links:

        if "fight-details" not in l["href"]:
            continue

        fights.append({
            "fight_url": l["href"]
        })

    return fights


def get_fight_details(url):

    html = get(url)

    if not html:
        return None

    s = soup(html)

    fight = {}

    fight["fight_id"] = url.split("/")[-1]
    fight["url"] = url

    # ---------------------
    # fighters
    # ---------------------

    fighters = s.select("a.b-link.b-link_style_black")

    fight["fighters"] = [
        {
            "name": clean(fighters[0].text),
            "url": fighters[0]["href"]
        },
        {
            "name": clean(fighters[1].text),
            "url": fighters[1]["href"]
        }
    ]

    # ---------------------
    # fight info
    # ---------------------

    info = s.select(".b-fight-details__text")

    fight_info = {}

    for i in info:

        text = clean(i.text)

        if "Method:" in text:
            fight_info["method"] = text.replace("Method:", "").strip()

        if "Round:" in text:
            fight_info["round"] = text.replace("Round:", "").strip()

        if "Time:" in text:
            fight_info["time"] = text.replace("Time:", "").strip()

        if "Referee:" in text:
            fight_info["referee"] = text.replace("Referee:", "").strip()

    fight["fight_info"] = fight_info

    # ---------------------
    # TOTAL STATS
    # ---------------------

    totals = []

    rows = s.select(".b-fight-details__table tbody tr")

    for r in rows:

        cols = r.select("td")

        if len(cols) < 10:
            continue

        totals.append({
            "fighter": clean(cols[0].text),
            "knockdowns": clean(cols[1].text),
            "sig_strikes": clean(cols[2].text),
            "sig_strike_pct": clean(cols[3].text),
            "total_strikes": clean(cols[4].text),
            "takedowns": clean(cols[5].text),
            "takedown_pct": clean(cols[6].text),
            "submission_attempts": clean(cols[7].text),
            "reversals": clean(cols[8].text),
            "control_time": clean(cols[9].text)
        })

    fight["totals"] = totals

    # ---------------------
    # ROUND STATS
    # ---------------------

    round_stats = []

    tables = s.select(".b-fight-details__table-body")

    for table in tables:

        rows = table.select("tr")

        for r in rows:

            cols = r.select("td")

            if len(cols) < 10:
                continue

            round_stats.append({
                "fighter": clean(cols[0].text),
                "knockdowns": clean(cols[1].text),
                "sig_strikes": clean(cols[2].text),
                "sig_strike_pct": clean(cols[3].text),
                "total_strikes": clean(cols[4].text),
                "takedowns": clean(cols[5].text),
                "takedown_pct": clean(cols[6].text),
                "submission_attempts": clean(cols[7].text),
                "reversals": clean(cols[8].text),
                "control_time": clean(cols[9].text)
            })

    fight["round_stats"] = round_stats

    # ---------------------
    # STRIKE BREAKDOWN
    # ---------------------

    strike_tables = s.select(".b-fight-details__table")

    strike_breakdown = []

    for table in strike_tables:

        header = table.select("thead th")

        if len(header) < 6:
            continue

        rows = table.select("tbody tr")

        for r in rows:

            cols = r.select("td")

            if len(cols) < 6:
                continue

            strike_breakdown.append({
                "fighter": clean(cols[0].text),
                "head": clean(cols[1].text),
                "body": clean(cols[2].text),
                "leg": clean(cols[3].text),
                "distance": clean(cols[4].text),
                "clinch": clean(cols[5].text),
                "ground": clean(cols[6].text) if len(cols) > 6 else ""
            })

    fight["strike_breakdown"] = strike_breakdown

    return fight