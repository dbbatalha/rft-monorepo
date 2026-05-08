#!/usr/bin/env python3
"""
Scrape de eventos futuros multi-org → upcoming_events_raw + upcoming_bouts_raw.

Fontes (ordem de preferência por org):
    UFC          : ufcstats.com  (cards completos)        → fallback Tapology
    ONE          : onefc.com/events/  (cards com bouts)   → fallback Tapology
    PFL          : pflmma.com/events  (listing, sem bouts via HTML estático)
                   Tapology como fallback pra cards.
    LFA          : Tapology /fightcenter/promotions/p/legacy-fighting-alliance-lfa
                   (sem fonte oficial estável — site lfafighting.com não responde)
    Jungle Fight : Tapology /fightcenter/promotions/p/jungle-fight
                   (junglefight.com.br não está ativo)

Tapology está bloqueando com 403 Cloudflare em vários slugs — quando isso ocorre,
a org volta vazia até a próxima rodada.

Uso:
    python3 scrape_upcoming.py                 # todas as orgs (default)
    python3 scrape_upcoming.py --org ufc one
    python3 scrape_upcoming.py --max-events 4
"""
import argparse
import logging
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent.parent))
from _lib.db import cursor, insert_upcoming_event_raw, insert_upcoming_bout_raw

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s",
                    datefmt="%H:%M:%S")
log = logging.getLogger("scrape_upcoming")

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
HEADERS = {"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9,pt;q=0.8"}

UFCSTATS_URL = "http://ufcstats.com/statistics/events/upcoming?page=all"

TAPOLOGY_BASE = "https://www.tapology.com"
TAPOLOGY_SLUGS = {
    "ufc":          "ultimate-fighting-championship-ufc",
    "one":          "one-championship",
    "pfl":          "pfl-professional-fighters-league",
    "lfa":          "legacy-fighting-alliance-lfa",
    "jungle-fight": "jungle-fight",
}

ALL_ORGS = ["ufc", "jungle-fight", "lfa", "one", "pfl"]


def fetch(url: str, timeout=20) -> str:
    r = requests.get(url, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    return r.text


# ---------------------------------------------------------------------------
# UFC Stats — fonte primária pra UFC
# ---------------------------------------------------------------------------

def scrape_ufcstats() -> list[dict]:
    html = fetch(UFCSTATS_URL)
    events: list[dict] = []
    for m in re.finditer(
        r'<tr[^>]*b-statistics__table-row[^>]*>([\s\S]*?)</tr>', html
    ):
        block = m.group(1)
        link = re.search(
            r'href="(http://ufcstats\.com/event-details/[^"]+)"[^>]*>\s*([\s\S]*?)\s*</a>',
            block,
        )
        if not link:
            continue
        url = link.group(1).strip()
        name = re.sub(r"<[^>]+>", "", link.group(2)).strip()
        cells = re.findall(r"<td[^>]*>([\s\S]*?)</td>", block)
        date = re.sub(r"<[^>]+>", "", cells[1]).strip() if len(cells) > 1 else ""
        loc  = re.sub(r"<[^>]+>", "", cells[2]).strip() if len(cells) > 2 else ""
        events.append({"name": name, "eventDate": date, "location": loc, "url": url, "source": "ufcstats"})
    return events


def scrape_ufcstats_card(event_url: str) -> list[dict]:
    html = fetch(event_url)
    bouts: list[dict] = []
    for m in re.finditer(
        r'<tr[^>]*b-fight-details__table-row[^>]*>([\s\S]*?)</tr>', html
    ):
        block = m.group(1)
        f_links = re.findall(
            r'href="[^"]*fighter-details[^"]*"[^>]*>\s*([\s\S]*?)\s*</a>', block
        )
        if len(f_links) < 2:
            continue
        f1 = re.sub(r"<[^>]+>", "", f_links[0]).strip()
        f2 = re.sub(r"<[^>]+>", "", f_links[1]).strip()
        wc = re.search(r'b-fight-details__table-text">\s*((?:Women\'s\s+)?[A-Za-z\' ]+weight)', block)
        bouts.append({
            "fighter1": f1, "fighter2": f2,
            "weightClass": wc.group(1).strip() if wc else "",
        })
    return bouts


# ---------------------------------------------------------------------------
# Tapology — fonte multi-org
# ---------------------------------------------------------------------------

def scrape_tapology(slug: str) -> list[dict]:
    url = f"{TAPOLOGY_BASE}/fightcenter/promotions/p/{slug}"
    try:
        html = fetch(url)
    except Exception as e:
        log.warning(f"  Tapology {slug}: {e}")
        return []

    soup = BeautifulSoup(html, "html.parser")
    events: list[dict] = []
    seen = set()

    for a in soup.find_all("a", href=True):
        href = a["href"]
        if not href.startswith("/fightcenter/events/"):
            continue
        if href in seen:
            continue
        seen.add(href)
        name = a.get_text(strip=True)
        if not name or len(name) < 4:
            continue

        # Data + local em torno do link
        ctx = str(a.parent.parent) if a.parent and a.parent.parent else str(a.parent)
        date = ""
        m = re.search(r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}(?:,\s*\d{4})?)", ctx)
        if m:
            date = m.group(1)

        events.append({
            "name": name,
            "eventDate": date,
            "location": "",
            "url": f"{TAPOLOGY_BASE}{href}",
            "source": "tapology",
        })
    return events


def scrape_tapology_card(event_url: str) -> list[dict]:
    try:
        html = fetch(event_url)
    except Exception:
        return []
    bouts: list[dict] = []
    soup = BeautifulSoup(html, "html.parser")
    # Cada bout é uma li.fightCard ou similar — heurística:
    for block in soup.select("li[class*='fightCard'], div[class*='fightCard'], section[class*='fightCard']"):
        f_links = block.find_all("a", href=re.compile(r"/fightcenter/fighters/"))
        if len(f_links) < 2:
            continue
        f1 = f_links[0].get_text(strip=True)
        f2 = f_links[1].get_text(strip=True)
        wc_match = re.search(
            r"((?:Women\'s\s+)?(?:Strawweight|Atomweight|Flyweight|Bantamweight|Featherweight|Lightweight|Welterweight|Middleweight|Light Heavyweight|Heavyweight|Catchweight|Openweight))",
            block.get_text(" ", strip=True),
        )
        bouts.append({
            "fighter1": f1, "fighter2": f2,
            "weightClass": wc_match.group(1) if wc_match else "",
        })
    return bouts


# ---------------------------------------------------------------------------
# ONE Championship — onefc.com/events/
# ---------------------------------------------------------------------------

def scrape_onefc() -> list[dict]:
    """Lista eventos da home do ONE — pega cards `box-post-event` com link e nome."""
    try:
        html = fetch("https://www.onefc.com/events/")
    except Exception as e:
        log.warning(f"  onefc.com listing: {e}")
        return []

    events: list[dict] = []
    seen = set()

    # Pega TODOS os links que apontem pra /events/<slug>/ (slug != home, != #upcoming)
    for m in re.finditer(
        r'<a[^>]*href="(https?://www\.onefc\.com/events/([^/"#]+)/)"[^>]*>(.*?)</a>',
        html, re.DOTALL,
    ):
        url, slug, inner = m.group(1), m.group(2), m.group(3)
        if slug in ("upcoming", "past") or url in seen:
            continue
        seen.add(url)

        # Tenta pegar o nome do <h2> dentro do bloco do evento (próximo ao link)
        # Ou usa o slug formatado
        name = ""
        # Cherry-pick do span com title ou texto não-vazio do <a>
        text_inner = re.sub(r"<[^>]+>", " ", inner).strip()
        if text_inner and len(text_inner) > 5:
            name = text_inner
        if not name:
            name = slug.replace("-", " ").title()

        events.append({
            "name": name, "eventDate": "", "location": "",
            "url": url, "source": "onefc",
        })
    return events


def scrape_onefc_card(event_url: str) -> list[dict]:
    """Extrai bouts via JSON-LD do detalhe do evento ONE.
       Estrutura: cada bout aparece como `"name":"Fighter A vs. Fighter B"` no JSON,
       seguido pelos lutadores individuais (`"name":"Fighter A"`, `"name":"Fighter B"`)."""
    try:
        html = fetch(event_url)
    except Exception:
        return []

    bouts: list[dict] = []
    # Captura todos os "name":"..." em ordem
    names = re.findall(r'"name":"([^"]+)"', html)

    # Filtra só os que parecem "X vs. Y"
    for n in names:
        m = re.match(r"^(.+?)\s+vs\.?\s+(.+?)$", n)
        if not m:
            continue
        f1 = m.group(1).strip().replace("&amp;", "&")
        f2 = m.group(2).strip().replace("&amp;", "&")
        # filtra falso-positivos óbvios
        if len(f1) < 2 or len(f2) < 2 or len(f1) > 80 or len(f2) > 80:
            continue
        bouts.append({"fighter1": f1, "fighter2": f2, "weightClass": ""})
    return bouts


# ---------------------------------------------------------------------------
# PFL — pflmma.com/events
# ---------------------------------------------------------------------------

def scrape_pflmma() -> list[dict]:
    """PFL: listing de /events expõe `href="/event/<slug>"`. Detalhe é renderizado
       client-side, então bouts ficam vazios — frontend mostrará "card a confirmar"."""
    try:
        html = fetch("https://pflmma.com/events", timeout=15)
    except Exception as e:
        log.warning(f"  pflmma.com: {e}")
        return []

    soup = BeautifulSoup(html, "html.parser")
    events: list[dict] = []
    seen = set()

    for a in soup.find_all("a", href=re.compile(r"^/event/[^/]+/?$")):
        slug = a["href"]
        if slug in seen:
            continue
        seen.add(slug)
        name = a.get_text(strip=True) or slug.split("/")[-1].replace("-", " ").title()

        events.append({
            "name": name, "eventDate": "", "location": "",
            "url": f"https://pflmma.com{slug}", "source": "pflmma",
        })
    return events


# ---------------------------------------------------------------------------
# Persistência (raw layer)
# ---------------------------------------------------------------------------

def persist_org(org: str, events: list[dict], max_events: int):
    if not events:
        log.info(f"  {org}: 0 eventos")
        return 0, 0

    nearest = events[:max_events]
    ev_count = bt_count = 0

    with cursor(commit=True) as (_, c):
        for ev in nearest:
            # fetch card por fonte
            src = ev.get("source", "")
            if src == "ufcstats":
                bouts = scrape_ufcstats_card(ev["url"])
            elif src == "onefc":
                bouts = scrape_onefc_card(ev["url"])
            elif src == "pflmma":
                bouts = []  # PFL HTML estático não traz cards; mantém só listing
            else:
                bouts = scrape_tapology_card(ev["url"])

            # Persiste evento mesmo sem bouts (PFL etc) — frontend mostra "card a confirmar".
            event_raw_id = insert_upcoming_event_raw(
                c,
                org=org, source=ev["source"], name=ev["name"],
                eventDate=ev.get("eventDate") or None,
                location=ev.get("location") or None,
                url=ev["url"], payload=ev,
            )
            ev_count += 1

            for i, b in enumerate(bouts):
                insert_upcoming_bout_raw(
                    c,
                    eventRawId=event_raw_id, position=i,
                    fighter1=b["fighter1"], fighter2=b["fighter2"],
                    weightClass=b.get("weightClass") or None,
                )
                bt_count += 1

            time.sleep(0.5)  # rate-limit gentil
    log.info(f"  {org}: {ev_count} eventos, {bt_count} lutas")
    return ev_count, bt_count


# ---------------------------------------------------------------------------

def scrape_org(org: str, max_events: int):
    log.info(f"━━ {org} ━━")

    if org == "ufc":
        try:
            events = scrape_ufcstats()
            log.info(f"  ufcstats: {len(events)} eventos detectados")
            if events:
                return persist_org(org, events, max_events)
        except Exception as e:
            log.warning(f"  ufcstats falhou: {e} — fallback Tapology")
        events = scrape_tapology(TAPOLOGY_SLUGS["ufc"])

    elif org == "one":
        events = scrape_onefc()
        log.info(f"  onefc.com: {len(events)} eventos detectados")
        if not events:
            log.info(f"  fallback Tapology")
            events = scrape_tapology(TAPOLOGY_SLUGS["one"])

    elif org == "pfl":
        events = scrape_pflmma()
        log.info(f"  pflmma.com: {len(events)} eventos detectados")
        if not events:
            log.info(f"  fallback Tapology")
            events = scrape_tapology(TAPOLOGY_SLUGS["pfl"])

    else:
        # LFA, Jungle Fight: sem fonte oficial estável → Tapology como única opção
        slug = TAPOLOGY_SLUGS.get(org)
        events = scrape_tapology(slug) if slug else []
        log.info(f"  tapology: {len(events)} eventos detectados")

    return persist_org(org, events, max_events)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--org", nargs="+", default=ALL_ORGS,
                   help=f"orgs (default: {' '.join(ALL_ORGS)})")
    p.add_argument("--max-events", type=int, default=4,
                   help="Quantos eventos por org (default 4)")
    args = p.parse_args()

    total_ev = total_bt = 0
    for org in args.org:
        org = org.lower()
        if org not in TAPOLOGY_SLUGS:
            log.warning(f"  org '{org}' desconhecida — skip")
            continue
        e, b = scrape_org(org, args.max_events)
        total_ev += e
        total_bt += b

    log.info(f"━━ Total: {total_ev} eventos, {total_bt} lutas ━━")


if __name__ == "__main__":
    main()
