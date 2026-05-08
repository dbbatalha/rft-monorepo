#!/usr/bin/env python3
"""
MMA Scraper v2 - Sistema Completo de Coleta de Dados MMA
=========================================================
Suporta: UFC, ONE Championship, PFL, Bellator, RIZIN, SFT, Jungle Fight, LFA
Fontes de atletas: UFCStats, Sherdog, Tapology, MMADecisions

Uso:
    python3 mma_scraper_v2.py --org ufc --max 10
    python3 mma_scraper_v2.py --org one --max 5
    python3 mma_scraper_v2.py --org all --max 20 --db
    python3 mma_scraper_v2.py --fighter "Michael Chiesa" --sources all
"""

import re
import time
import json
import logging
import argparse
import random
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field, asdict

import requests
from bs4 import BeautifulSoup

# ─── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("mma_scraper")


# ─── Data Classes ───────────────────────────────────────────────────────────

@dataclass
class FighterProfile:
    name: str
    nickname: str = ""
    nationality: str = ""
    height_cm: float = 0.0
    weight_kg: float = 0.0
    reach_cm: float = 0.0
    stance: str = ""
    date_of_birth: str = ""
    age: int = 0
    wins: int = 0
    losses: int = 0
    draws: int = 0
    no_contests: int = 0
    wins_ko: int = 0
    wins_sub: int = 0
    wins_dec: int = 0
    losses_ko: int = 0
    losses_sub: int = 0
    losses_dec: int = 0
    # UFC Stats metrics
    slpm: float = 0.0       # Strikes Landed per Minute
    str_acc: float = 0.0    # Striking Accuracy %
    sapm: float = 0.0       # Strikes Absorbed per Minute
    str_def: float = 0.0    # Strike Defense %
    td_avg: float = 0.0     # Takedown Average per 15 min
    td_acc: float = 0.0     # Takedown Accuracy %
    td_def: float = 0.0     # Takedown Defense %
    sub_avg: float = 0.0    # Submission Average per 15 min
    # Source URLs
    ufc_url: str = ""
    sherdog_url: str = ""
    tapology_url: str = ""
    mmadecisions_url: str = ""
    organization: str = ""
    source: str = ""


@dataclass
class FightResult:
    event_name: str
    event_date: str
    organization: str
    fighter1: str
    fighter2: str
    winner: str
    method: str
    method_detail: str = ""
    round_num: int = 0
    time_str: str = ""
    weight_class: str = ""
    discipline: str = "MMA"  # MMA, Muay Thai, Kickboxing, Grappling, Boxing
    is_title_fight: bool = False
    referee: str = ""
    # Fight stats (UFC only)
    f1_kd: int = 0
    f2_kd: int = 0
    f1_sig_str: str = ""
    f2_sig_str: str = ""
    f1_sig_str_pct: str = ""
    f2_sig_str_pct: str = ""
    f1_total_str: str = ""
    f2_total_str: str = ""
    f1_td: str = ""
    f2_td: str = ""
    f1_td_pct: str = ""
    f2_td_pct: str = ""
    f1_sub_att: int = 0
    f2_sub_att: int = 0
    f1_ctrl: str = ""
    f2_ctrl: str = ""
    rounds: list = field(default_factory=list)
    source_url: str = ""


@dataclass
class Event:
    name: str
    date: str
    organization: str
    location: str = ""
    venue: str = ""
    fights: list = field(default_factory=list)
    source_url: str = ""


# ─── HTTP Client ─────────────────────────────────────────────────────────────

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
]


class HTTPClient:
    """Robust HTTP client with retry, rate limiting, and anti-bot headers."""

    def __init__(self, delay: float = 1.5, max_retries: int = 3):
        self.delay = delay
        self.max_retries = max_retries
        self.session = requests.Session()
        self._last_request = 0.0

    def _headers(self) -> dict:
        return {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "max-age=0",
        }

    def get(self, url: str, **kwargs) -> Optional[BeautifulSoup]:
        """Fetch URL and return BeautifulSoup, with rate limiting and retries."""
        # Rate limiting
        elapsed = time.time() - self._last_request
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed + random.uniform(0.1, 0.5))

        for attempt in range(self.max_retries):
            try:
                resp = self.session.get(
                    url,
                    headers=self._headers(),
                    timeout=15,
                    **kwargs
                )
                self._last_request = time.time()

                if resp.status_code == 200:
                    return BeautifulSoup(resp.text, "html.parser")
                elif resp.status_code == 429:
                    wait = 30 * (attempt + 1)
                    logger.warning(f"Rate limited on {url}, waiting {wait}s...")
                    time.sleep(wait)
                elif resp.status_code == 403:
                    logger.warning(f"403 Forbidden on {url}")
                    return None
                else:
                    logger.warning(f"HTTP {resp.status_code} on {url}")
                    time.sleep(5)

            except requests.exceptions.Timeout:
                logger.warning(f"Timeout on {url} (attempt {attempt+1})")
                time.sleep(5)
            except requests.exceptions.ConnectionError as e:
                logger.warning(f"Connection error on {url}: {e}")
                time.sleep(10)
            except Exception as e:
                logger.error(f"Unexpected error on {url}: {e}")
                return None

        logger.error(f"Failed to fetch {url} after {self.max_retries} attempts")
        return None

    def get_json(self, url: str, **kwargs) -> Optional[dict]:
        """Fetch URL and return JSON."""
        elapsed = time.time() - self._last_request
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed + random.uniform(0.1, 0.5))

        try:
            resp = self.session.get(url, headers=self._headers(), timeout=15, **kwargs)
            self._last_request = time.time()
            if resp.status_code == 200:
                return resp.json()
        except Exception as e:
            logger.error(f"JSON fetch error on {url}: {e}")
        return None


# ─── Utility Functions ───────────────────────────────────────────────────────

def safe_int(s) -> int:
    """Convert value to int, return 0 on failure."""
    try:
        return int(str(s).strip())
    except (ValueError, TypeError):
        return 0


def parse_height(s: str) -> float:
    """Convert height string to cm. Handles '5\' 11"', '180 cm', '5-11'."""
    if not s:
        return 0.0
    s = s.strip()
    # Already in cm
    m = re.search(r'(\d+(?:\.\d+)?)\s*cm', s, re.IGNORECASE)
    if m:
        return float(m.group(1))
    # Feet and inches: 5' 11" or 5'11" or 5-11
    m = re.search(r"(\d+)['\-]?\s*(\d+)", s)
    if m:
        feet, inches = int(m.group(1)), int(m.group(2))
        return round(feet * 30.48 + inches * 2.54, 1)
    # Just feet
    m = re.search(r"(\d+)'", s)
    if m:
        return round(int(m.group(1)) * 30.48, 1)
    return 0.0


def parse_weight(s: str) -> float:
    """Convert weight string to kg. Handles 'lbs', 'kg'."""
    if not s:
        return 0.0
    s = s.strip()
    m = re.search(r'(\d+(?:\.\d+)?)\s*kg', s, re.IGNORECASE)
    if m:
        return float(m.group(1))
    m = re.search(r'(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)', s, re.IGNORECASE)
    if m:
        return round(float(m.group(1)) * 0.453592, 1)
    m = re.search(r'(\d+(?:\.\d+)?)', s)
    if m:
        v = float(m.group(1))
        return round(v * 0.453592, 1) if v > 100 else v
    return 0.0


def parse_reach(s: str) -> float:
    """Convert reach string to cm."""
    return parse_height(s)


def parse_pct(s: str) -> float:
    """Parse percentage string to float 0-100."""
    if not s:
        return 0.0
    m = re.search(r'(\d+(?:\.\d+)?)', s)
    return float(m.group(1)) if m else 0.0


def clean_text(s: str) -> str:
    """Strip whitespace and normalize spaces."""
    if not s:
        return ""
    return re.sub(r'\s+', ' ', s.strip())


def parse_time(s: str) -> str:
    """Normalize time string to MM:SS format."""
    if not s:
        return ""
    m = re.search(r'(\d+):(\d+)', s)
    if m:
        return f"{int(m.group(1)):02d}:{int(m.group(2)):02d}"
    m = re.search(r'(\d+)', s)
    if m:
        return f"00:{int(m.group(1)):02d}"
    return s.strip()


# ─── UFC Scraper (ufcstats.com) ──────────────────────────────────────────────

class UFCScraper:
    """Scrapes UFC events, fights, and fighter stats from ufcstats.com."""

    BASE = "http://ufcstats.com"
    EVENTS_URL = f"{BASE}/statistics/events/completed?page=all"
    FIGHTERS_URL = f"{BASE}/statistics/fighters?char={{letter}}&page=all"

    def __init__(self, http: HTTPClient):
        self.http = http
        self.log = logging.getLogger("UFCScraper")

    def get_events(self, max_events: int = 50) -> list[Event]:
        """Get list of completed UFC events."""
        self.log.info(f"Fetching UFC events (max={max_events})...")
        soup = self.http.get(self.EVENTS_URL)
        if not soup:
            return []

        events = []
        rows = soup.select("tr.b-statistics__table-row")
        for row in rows[:max_events]:
            link = row.select_one("a.b-link")
            if not link:
                continue
            name = clean_text(link.text)
            url = link.get("href", "")
            cells = row.select("td")
            date = clean_text(cells[1].text) if len(cells) > 1 else ""
            location = clean_text(cells[2].text) if len(cells) > 2 else ""

            events.append(Event(
                name=name,
                date=date,
                organization="UFC",
                location=location,
                source_url=url,
            ))

        self.log.info(f"Found {len(events)} UFC events")
        return events

    def get_event_fights(self, event: Event) -> list[FightResult]:
        """Get all fights from a UFC event page."""
        if not event.source_url:
            return []

        soup = self.http.get(event.source_url)
        if not soup:
            return []

        fights = []
        rows = soup.select("tr.b-fight-details__table-row[data-link]")

        for row in rows:
            fight_url = row.get("data-link", "")
            cells = row.select("td.b-fight-details__table-col")
            if len(cells) < 8:
                continue

            # Fighters
            fighters = cells[1].select("a")
            if len(fighters) < 2:
                continue
            f1_name = clean_text(fighters[0].text)
            f2_name = clean_text(fighters[1].text)

            # Winner (first fighter in bold or first listed)
            winner_el = cells[0].select_one("i.b-flag")
            winner = f1_name  # UFC lists winner first

            # KD
            kd_texts = cells[2].select("p")
            f1_kd = safe_int(clean_text(kd_texts[0].text)) if kd_texts else 0
            f2_kd = safe_int(clean_text(kd_texts[1].text)) if len(kd_texts) > 1 else 0

            # Sig Strikes
            str_texts = cells[3].select("p")
            f1_sig = clean_text(str_texts[0].text) if str_texts else ""
            f2_sig = clean_text(str_texts[1].text) if len(str_texts) > 1 else ""

            # Sig Strike %
            str_pct = cells[4].select("p")
            f1_sig_pct = clean_text(str_pct[0].text) if str_pct else ""
            f2_sig_pct = clean_text(str_pct[1].text) if len(str_pct) > 1 else ""

            # Takedowns
            td_texts = cells[5].select("p")
            f1_td = clean_text(td_texts[0].text) if td_texts else ""
            f2_td = clean_text(td_texts[1].text) if len(td_texts) > 1 else ""

            # TD %
            td_pct = cells[6].select("p")
            f1_td_pct = clean_text(td_pct[0].text) if td_pct else ""
            f2_td_pct = clean_text(td_pct[1].text) if len(td_pct) > 1 else ""

            # Sub attempts
            sub_texts = cells[7].select("p")
            f1_sub = safe_int(clean_text(sub_texts[0].text)) if sub_texts else 0
            f2_sub = safe_int(clean_text(sub_texts[1].text)) if len(sub_texts) > 1 else 0

            # Method, Round, Time, Weight class
            method = clean_text(cells[8].text) if len(cells) > 8 else ""
            round_num = safe_int(clean_text(cells[9].text)) if len(cells) > 9 else 0
            time_str = parse_time(cells[10].text) if len(cells) > 10 else ""
            weight_class = clean_text(cells[11].text) if len(cells) > 11 else ""

            # Parse method detail
            method_parts = method.split("\n")
            method_main = clean_text(method_parts[0]) if method_parts else method
            method_detail = clean_text(method_parts[1]) if len(method_parts) > 1 else ""

            fight = FightResult(
                event_name=event.name,
                event_date=event.date,
                organization="UFC",
                fighter1=f1_name,
                fighter2=f2_name,
                winner=winner,
                method=method_main,
                method_detail=method_detail,
                round_num=round_num,
                time_str=time_str,
                weight_class=weight_class,
                discipline="MMA",
                f1_kd=f1_kd,
                f2_kd=f2_kd,
                f1_sig_str=f1_sig,
                f2_sig_str=f2_sig,
                f1_sig_str_pct=f1_sig_pct,
                f2_sig_str_pct=f2_sig_pct,
                f1_td=f1_td,
                f2_td=f2_td,
                f1_td_pct=f1_td_pct,
                f2_td_pct=f2_td_pct,
                f1_sub_att=f1_sub,
                f2_sub_att=f2_sub,
                source_url=fight_url,
            )
            fights.append(fight)

        return fights

    def get_fight_details(self, fight: FightResult) -> FightResult:
        """Get detailed round-by-round stats for a UFC fight."""
        if not fight.source_url:
            return fight

        soup = self.http.get(fight.source_url)
        if not soup:
            return fight

        # Referee
        ref_el = soup.find("i", string=re.compile(r"Referee:", re.I))
        if ref_el:
            fight.referee = clean_text(ref_el.find_next_sibling(text=True) or "")

        # Title fight check
        title_el = soup.find(string=re.compile(r"title", re.I))
        fight.is_title_fight = bool(title_el and "title bout" in title_el.lower())

        # Control time (from totals table)
        totals_tables = soup.select("table.b-fight-details__table")
        if totals_tables:
            ctrl_rows = totals_tables[0].select("tr.b-fight-details__table-row")
            for row in ctrl_rows[1:2]:  # First data row = totals
                cells = row.select("td")
                if len(cells) >= 9:
                    ctrl_texts = cells[8].select("p")
                    fight.f1_ctrl = clean_text(ctrl_texts[0].text) if ctrl_texts else ""
                    fight.f2_ctrl = clean_text(ctrl_texts[1].text) if len(ctrl_texts) > 1 else ""

        # Per-round stats
        rounds = []
        round_tables = soup.select("section.b-fight-details__section")
        for section in round_tables:
            heading = section.select_one("p.b-fight-details__collapse-link_tot")
            if not heading:
                continue
            heading_text = clean_text(heading.text)
            if "round" not in heading_text.lower():
                continue

            rows = section.select("tr.b-fight-details__table-row")
            for row in rows[1:]:  # Skip header
                cells = row.select("td")
                if len(cells) < 10:
                    continue

                round_data = {}
                # Round number from heading
                m = re.search(r'round\s+(\d+)', heading_text, re.I)
                round_data["round"] = int(m.group(1)) if m else 0

                def get_pair(idx):
                    if idx >= len(cells):
                        return "", ""
                    ps = cells[idx].select("p")
                    v1 = clean_text(ps[0].text) if ps else ""
                    v2 = clean_text(ps[1].text) if len(ps) > 1 else ""
                    return v1, v2

                kd = get_pair(2)
                round_data["f1_kd"] = int(kd[0] or 0)
                round_data["f2_kd"] = int(kd[1] or 0)

                sig = get_pair(3)
                round_data["f1_sig_str"] = sig[0]
                round_data["f2_sig_str"] = sig[1]

                sig_pct = get_pair(4)
                round_data["f1_sig_str_pct"] = sig_pct[0]
                round_data["f2_sig_str_pct"] = sig_pct[1]

                total = get_pair(5)
                round_data["f1_total_str"] = total[0]
                round_data["f2_total_str"] = total[1]

                td = get_pair(6)
                round_data["f1_td"] = td[0]
                round_data["f2_td"] = td[1]

                td_pct = get_pair(7)
                round_data["f1_td_pct"] = td_pct[0]
                round_data["f2_td_pct"] = td_pct[1]

                sub = get_pair(8)
                round_data["f1_sub_att"] = int(sub[0] or 0)
                round_data["f2_sub_att"] = int(sub[1] or 0)

                ctrl = get_pair(9)
                round_data["f1_ctrl"] = ctrl[0]
                round_data["f2_ctrl"] = ctrl[1]

                rounds.append(round_data)
                break  # One row per round section

        fight.rounds = rounds
        return fight

    def get_fighter_details(self, fighter_url: str) -> Optional[FighterProfile]:
        """Get full fighter profile from ufcstats.com."""
        soup = self.http.get(fighter_url)
        if not soup:
            return None

        name_el = soup.select_one("span.b-content__title-highlight")
        if not name_el:
            return None
        name = clean_text(name_el.text)

        nickname_el = soup.select_one("p.b-content__Nickname")
        nickname = clean_text(nickname_el.text).strip('"') if nickname_el else ""

        profile = FighterProfile(name=name, nickname=nickname, organization="UFC", source="ufcstats")
        profile.ufc_url = fighter_url

        # Physical stats
        stat_map = {
            "height": "height_cm",
            "weight": "weight_kg",
            "reach": "reach_cm",
            "stance": "stance",
            "dob": "date_of_birth",
        }
        for li in soup.select("li.b-list__box-list-item"):
            text = li.get_text(" ", strip=True)
            for key, attr in stat_map.items():
                if key.lower() in text.lower():
                    val = text.split(":", 1)[-1].strip()
                    if attr == "height_cm":
                        setattr(profile, attr, parse_height(val))
                    elif attr == "weight_kg":
                        setattr(profile, attr, parse_weight(val))
                    elif attr == "reach_cm":
                        setattr(profile, attr, parse_reach(val))
                    else:
                        setattr(profile, attr, val)

        # Record
        record_el = soup.select_one("span.b-content__title-record")
        if record_el:
            m = re.search(r'(\d+)-(\d+)-(\d+)', record_el.text)
            if m:
                profile.wins, profile.losses, profile.draws = int(m.group(1)), int(m.group(2)), int(m.group(3))

        # Career stats
        career_stats = {}
        for li in soup.select("li.b-list__box-list-item_type_block"):
            text = li.get_text(" ", strip=True)
            if ":" in text:
                k, v = text.split(":", 1)
                career_stats[k.strip().lower()] = v.strip()

        profile.slpm = float(career_stats.get("slpm", 0) or 0)
        profile.str_acc = parse_pct(career_stats.get("str. acc.", "0"))
        profile.sapm = float(career_stats.get("sapm", 0) or 0)
        profile.str_def = parse_pct(career_stats.get("str. def", "0"))
        profile.td_avg = float(career_stats.get("td avg.", 0) or 0)
        profile.td_acc = parse_pct(career_stats.get("td acc.", "0"))
        profile.td_def = parse_pct(career_stats.get("td def.", "0"))
        profile.sub_avg = float(career_stats.get("sub. avg.", 0) or 0)

        return profile

    def get_all_fighters(self, letters: str = "abcdefghijklmnopqrstuvwxyz") -> list[dict]:
        """Get all UFC fighters by iterating through alphabet pages."""
        all_fighters = []
        for letter in letters:
            url = self.FIGHTERS_URL.format(letter=letter)
            soup = self.http.get(url)
            if not soup:
                continue

            rows = soup.select("tr.b-statistics__table-row")
            for row in rows:
                link = row.select_one("a.b-link")
                if not link:
                    continue
                cells = row.select("td")
                all_fighters.append({
                    "name": clean_text(link.text),
                    "url": link.get("href", ""),
                    "nickname": clean_text(cells[1].text) if len(cells) > 1 else "",
                    "height": clean_text(cells[2].text) if len(cells) > 2 else "",
                    "weight": clean_text(cells[3].text) if len(cells) > 3 else "",
                    "reach": clean_text(cells[4].text) if len(cells) > 4 else "",
                    "stance": clean_text(cells[5].text) if len(cells) > 5 else "",
                    "wins": clean_text(cells[6].text) if len(cells) > 6 else "",
                    "losses": clean_text(cells[7].text) if len(cells) > 7 else "",
                    "draws": clean_text(cells[8].text) if len(cells) > 8 else "",
                })
            self.log.info(f"Letter '{letter}': {len(rows)} fighters")

        return all_fighters


# ─── ONE Championship Scraper ────────────────────────────────────────────────

class ONEScraper:
    """Scrapes ONE Championship events and results from onefc.com."""

    BASE = "https://www.onefc.com"
    RESULTS_URL = f"{BASE}/live-results/"

    def __init__(self, http: HTTPClient):
        self.http = http
        self.log = logging.getLogger("ONEScraper")

    def get_events(self, max_events: int = 30) -> list[Event]:
        """Get list of ONE Championship events from live-results page."""
        self.log.info(f"Fetching ONE Championship events (max={max_events})...")
        soup = self.http.get(self.RESULTS_URL)
        if not soup:
            return []

        events = []
        # Find all result article links
        articles = soup.select("a[hint]")
        seen_urls = set()

        for a in articles:
            href = a.get("href", "")
            hint = a.get("hint", "")
            if not href or href in seen_urls:
                continue
            if "results-and-highlights" not in href.lower() and "results" not in hint.lower():
                continue
            seen_urls.add(href)

            # Extract event name from hint or text
            name = hint or clean_text(a.text)
            # Remove "– Results And Highlights For Every Match" suffix
            name = re.sub(r'\s*[–-]\s*Results.*', '', name, flags=re.I).strip()

            # Try to find date nearby
            parent = a.find_parent()
            date_el = parent.find(string=re.compile(r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b', re.I)) if parent else None
            date = clean_text(str(date_el)) if date_el else ""

            events.append(Event(
                name=name,
                date=date,
                organization="ONE Championship",
                source_url=self.BASE + href if href.startswith("/") else href,
            ))

            if len(events) >= max_events:
                break

        self.log.info(f"Found {len(events)} ONE Championship events")
        return events

    def get_event_fights(self, event: Event) -> list[FightResult]:
        """Parse fight results from a ONE Championship results article."""
        if not event.source_url:
            return []

        soup = self.http.get(event.source_url)
        if not soup:
            return []

        fights = []
        content = soup.select_one("div.entry-content, article, main")
        if not content:
            content = soup

        # ONE Championship results format:
        # <h5>Weight Class Discipline</h5>
        # <p>[Winner] defeats [Loser] via [method] at [time] of round [N]</p>
        # OR: <p>[Winner] defeats [Loser] via unanimous/split/majority decision</p>

        current_weight_class = ""
        current_discipline = "MMA"

        for el in content.find_all(["h5", "h4", "h3", "p", "li"]):
            text = clean_text(el.get_text())
            if not text:
                continue

            # Weight class / discipline headings
            if el.name in ["h5", "h4", "h3"]:
                current_weight_class = text
                # Detect discipline
                disciplines = {
                    "muay thai": "Muay Thai",
                    "kickboxing": "Kickboxing",
                    "submission grappling": "Grappling",
                    "grappling": "Grappling",
                    "boxing": "Boxing",
                    "mma": "MMA",
                }
                current_discipline = "MMA"
                for kw, disc in disciplines.items():
                    if kw in text.lower():
                        current_discipline = disc
                        break
                continue

            # Fight result line
            # Pattern: "Fighter A defeats Fighter B via [method] at [time] of round [N]"
            # Pattern: "Fighter A defeats Fighter B via [decision type] decision"
            # Pattern: "Fighter A defeats Fighter B via TKO at [time] of round [N]"
            defeat_match = re.search(
                r'(.+?)\s+defeats?\s+(.+?)\s+via\s+(.+?)(?:\s+at\s+([\d:]+)\s+of\s+round\s+(\d+))?\.?$',
                text, re.I
            )
            if not defeat_match:
                # Try "wins by" format
                defeat_match = re.search(
                    r'(.+?)\s+wins?\s+by\s+(.+?)(?:\s+at\s+([\d:]+)\s+of\s+round\s+(\d+))?\.?$',
                    text, re.I
                )

            if defeat_match:
                winner = clean_text(defeat_match.group(1))
                loser = clean_text(defeat_match.group(2))
                method_str = clean_text(defeat_match.group(3))

                # Parse round and time
                round_num = 0
                time_str = ""
                if len(defeat_match.groups()) >= 5 and defeat_match.group(5):
                    round_num = int(defeat_match.group(5))
                    time_str = defeat_match.group(4) or ""
                elif len(defeat_match.groups()) >= 4 and defeat_match.group(4):
                    round_num = int(defeat_match.group(4))
                    time_str = defeat_match.group(3) or ""

                # Classify method
                method = self._classify_method(method_str)

                # Title fight detection
                is_title = bool(re.search(r'world\s+title|championship|champion', current_weight_class, re.I))

                fight = FightResult(
                    event_name=event.name,
                    event_date=event.date,
                    organization="ONE Championship",
                    fighter1=winner,
                    fighter2=loser,
                    winner=winner,
                    method=method,
                    method_detail=method_str,
                    round_num=round_num,
                    time_str=parse_time(time_str),
                    weight_class=current_weight_class,
                    discipline=current_discipline,
                    is_title_fight=is_title,
                    source_url=event.source_url,
                )
                fights.append(fight)

        self.log.info(f"Parsed {len(fights)} fights from {event.name}")
        return fights

    def _classify_method(self, method_str: str) -> str:
        """Classify method string into standard categories."""
        s = method_str.lower()
        if any(w in s for w in ["ko", "knockout", "tko", "technical knockout", "stoppage"]):
            return "KO/TKO"
        if any(w in s for w in ["submission", "sub", "choke", "lock", "triangle", "armbar", "guillotine", "rear-naked"]):
            return "Submission"
        if any(w in s for w in ["unanimous", "split", "majority", "decision"]):
            return "Decision"
        if "draw" in s:
            return "Draw"
        if "no contest" in s:
            return "No Contest"
        return method_str[:50]

    def get_fighter(self, fighter_name: str) -> Optional[FighterProfile]:
        """Search and get ONE Championship fighter profile."""
        search_url = f"{self.BASE}/athletes/?s={requests.utils.quote(fighter_name)}"
        soup = self.http.get(search_url)
        if not soup:
            return None

        # Find first athlete link
        athlete_link = soup.select_one("a.c-card-athlete__link, a[href*='/athletes/']")
        if not athlete_link:
            return None

        profile_url = athlete_link.get("href", "")
        if not profile_url.startswith("http"):
            profile_url = self.BASE + profile_url

        return self._parse_athlete_page(profile_url)

    def _parse_athlete_page(self, url: str) -> Optional[FighterProfile]:
        """Parse ONE Championship athlete profile page."""
        soup = self.http.get(url)
        if not soup:
            return None

        name_el = soup.select_one("h1.c-hero__headline, h1")
        if not name_el:
            return None
        name = clean_text(name_el.text)

        profile = FighterProfile(name=name, organization="ONE Championship", source="onefc")

        # Physical stats
        stat_items = soup.select("div.c-hero__stats-item, li.c-hero__stat")
        for item in stat_items:
            label_el = item.select_one(".c-hero__stats-label, .label")
            value_el = item.select_one(".c-hero__stats-value, .value")
            if not label_el or not value_el:
                continue
            label = clean_text(label_el.text).lower()
            value = clean_text(value_el.text)

            if "height" in label:
                profile.height_cm = parse_height(value)
            elif "weight" in label:
                profile.weight_kg = parse_weight(value)
            elif "reach" in label:
                profile.reach_cm = parse_reach(value)
            elif "nationality" in label or "country" in label:
                profile.nationality = value
            elif "age" in label:
                try:
                    profile.age = int(re.search(r'\d+', value).group())
                except:
                    pass

        # Record
        record_el = soup.select_one(".c-hero__record, .record")
        if record_el:
            m = re.search(r'(\d+)-(\d+)-(\d+)', record_el.text)
            if m:
                profile.wins, profile.losses, profile.draws = int(m.group(1)), int(m.group(2)), int(m.group(3))

        return profile


# ─── Tapology Scraper ─────────────────────────────────────────────────────────

class TapologyScraper:
    """
    Scrapes Tapology for fighter profiles and fight history.
    Tapology covers ALL major organizations: UFC, ONE, PFL, Bellator, RIZIN, etc.
    """

    BASE = "https://www.tapology.com"

    def __init__(self, http: HTTPClient):
        self.http = http
        self.log = logging.getLogger("TapologyScraper")

    def search_fighter(self, name: str) -> Optional[str]:
        """Search for a fighter and return their profile URL."""
        search_url = f"{self.BASE}/search/fighters?term={requests.utils.quote(name)}"
        soup = self.http.get(search_url)
        if not soup:
            return None

        # Try direct fighter link
        for a in soup.select("a[href*='/fightcenter/fighters/']"):
            href = a.get("href", "")
            if "/fightcenter/fighters/" in href:
                return self.BASE + href if href.startswith("/") else href

        return None

    def get_fighter(self, url: str) -> Optional[FighterProfile]:
        """Get full fighter profile from Tapology."""
        soup = self.http.get(url)
        if not soup:
            return None

        # Name
        name_el = soup.select_one("span[itemprop='name'], h1.fighterUpcomingHeader")
        if not name_el:
            name_el = soup.select_one("h1")
        if not name_el:
            return None
        name = clean_text(name_el.text)

        profile = FighterProfile(name=name, source="tapology")
        profile.tapology_url = url

        # Nickname
        nick_el = soup.select_one("span.nickname, em.nickname")
        if nick_el:
            profile.nickname = clean_text(nick_el.text).strip('"\'')

        # Physical stats from details list
        details = soup.select("ul.details li, div.details li")
        for li in details:
            text = clean_text(li.get_text(" "))
            label_el = li.select_one("strong, b, span.label")
            value_el = li.select_one("span:not(.label), span[itemprop]")

            if label_el and value_el:
                label = clean_text(label_el.text).lower().rstrip(":")
                value = clean_text(value_el.text)
            else:
                parts = text.split(":", 1)
                if len(parts) != 2:
                    continue
                label, value = parts[0].strip().lower(), parts[1].strip()

            if "height" in label:
                profile.height_cm = parse_height(value)
            elif "weight" in label and "class" not in label:
                profile.weight_kg = parse_weight(value)
            elif "reach" in label:
                profile.reach_cm = parse_reach(value)
            elif "stance" in label:
                profile.stance = value
            elif "born" in label or "date of birth" in label or "age" in label:
                profile.date_of_birth = value
            elif "nationality" in label or "country" in label:
                profile.nationality = value

        # Record
        record_el = soup.select_one("span.record, div.record")
        if record_el:
            m = re.search(r'(\d+)-(\d+)-(\d+)', record_el.text)
            if m:
                profile.wins, profile.losses, profile.draws = int(m.group(1)), int(m.group(2)), int(m.group(3))

        # Fight history
        fights = self._parse_fight_history(soup, name)
        # Count win/loss methods
        for f in fights:
            if f.winner == name:
                if "KO" in f.method or "TKO" in f.method:
                    profile.wins_ko += 1
                elif "Sub" in f.method or "Submission" in f.method:
                    profile.wins_sub += 1
                elif "Dec" in f.method or "Decision" in f.method:
                    profile.wins_dec += 1
            else:
                if "KO" in f.method or "TKO" in f.method:
                    profile.losses_ko += 1
                elif "Sub" in f.method or "Submission" in f.method:
                    profile.losses_sub += 1
                elif "Dec" in f.method or "Decision" in f.method:
                    profile.losses_dec += 1

        return profile

    def _parse_fight_history(self, soup: BeautifulSoup, fighter_name: str) -> list[FightResult]:
        """Parse fight history table from Tapology fighter page."""
        fights = []
        table = soup.select_one("table.fightHistoryTable, table#fightHistoryTable")
        if not table:
            # Try generic table
            tables = soup.select("table")
            for t in tables:
                if t.select("tr") and len(t.select("tr")) > 3:
                    table = t
                    break

        if not table:
            return fights

        for row in table.select("tr")[1:]:  # Skip header
            cells = row.select("td")
            if len(cells) < 4:
                continue

            result_text = clean_text(cells[0].text).upper()
            opponent_el = cells[1].select_one("a") if len(cells) > 1 else None
            opponent = clean_text(opponent_el.text) if opponent_el else clean_text(cells[1].text) if len(cells) > 1 else ""

            event_el = cells[2].select_one("a") if len(cells) > 2 else None
            event_name = clean_text(event_el.text) if event_el else clean_text(cells[2].text) if len(cells) > 2 else ""

            method = clean_text(cells[3].text) if len(cells) > 3 else ""
            round_str = clean_text(cells[4].text) if len(cells) > 4 else ""
            time_str = clean_text(cells[5].text) if len(cells) > 5 else ""
            date = clean_text(cells[6].text) if len(cells) > 6 else ""

            # Detect organization from event name
            org = self._detect_org(event_name)

            winner = fighter_name if result_text in ["W", "WIN", "WINNER"] else opponent

            fight = FightResult(
                event_name=event_name,
                event_date=date,
                organization=org,
                fighter1=fighter_name,
                fighter2=opponent,
                winner=winner,
                method=method,
                round_num=int(re.search(r'\d+', round_str).group()) if re.search(r'\d+', round_str) else 0,
                time_str=parse_time(time_str),
                source_url=event_el.get("href", "") if event_el else "",
            )
            fights.append(fight)

        return fights

    def _detect_org(self, event_name: str) -> str:
        """Detect organization from event name."""
        name_lower = event_name.lower()
        org_map = {
            "ufc": "UFC",
            "one fc": "ONE Championship",
            "one championship": "ONE Championship",
            "one friday": "ONE Championship",
            "one fight night": "ONE Championship",
            "pfl": "PFL",
            "bellator": "Bellator",
            "rizin": "RIZIN",
            "sft": "SFT",
            "jungle fight": "Jungle Fight",
            "lfa": "LFA",
            "invicta": "Invicta FC",
            "cage warriors": "Cage Warriors",
            "ksw": "KSW",
            "glory": "Glory Kickboxing",
        }
        for key, org in org_map.items():
            if key in name_lower:
                return org
        return "Unknown"

    def get_events_by_org(self, org: str, max_events: int = 20) -> list[Event]:
        """Get events for a specific organization from Tapology."""
        org_slugs = {
            "pfl": "professional-fighters-league",
            "bellator": "bellator-mma",
            "rizin": "rizin-fighting-federation",
            "sft": "shooto-fight-team",
            "jungle fight": "jungle-fight",
            "lfa": "legacy-fighting-alliance",
            "one": "one-championship",
            "cage warriors": "cage-warriors",
            "ksw": "ksw",
        }

        slug = org_slugs.get(org.lower())
        if not slug:
            self.log.warning(f"Unknown organization slug for: {org}")
            return []

        url = f"{self.BASE}/fightcenter/promotions/{slug}"
        soup = self.http.get(url)
        if not soup:
            return []

        events = []
        for a in soup.select("a[href*='/fightcenter/events/']")[:max_events]:
            href = a.get("href", "")
            name = clean_text(a.text)
            if not name:
                continue

            # Find date nearby
            parent = a.find_parent("tr") or a.find_parent("li") or a.find_parent()
            date = ""
            if parent:
                date_el = parent.find(string=re.compile(r'\d{4}'))
                date = clean_text(str(date_el)) if date_el else ""

            events.append(Event(
                name=name,
                date=date,
                organization=org.upper(),
                source_url=self.BASE + href if href.startswith("/") else href,
            ))

        return events

    def get_event_fights(self, event: Event) -> list[FightResult]:
        """Get fights from a Tapology event page."""
        if not event.source_url:
            return []

        soup = self.http.get(event.source_url)
        if not soup:
            return []

        fights = []
        fight_rows = soup.select("tr.fightCard, li.fightCard, div.fightCard")

        for row in fight_rows:
            # Fighter names
            fighters = row.select("a[href*='/fighters/']")
            if len(fighters) < 2:
                continue

            f1_name = clean_text(fighters[0].text)
            f2_name = clean_text(fighters[1].text)

            # Result
            result_el = row.select_one(".result, .outcome, span.win, span.loss")
            result_text = clean_text(result_el.text).upper() if result_el else ""
            winner = f1_name if result_text in ["W", "WIN"] else f2_name if result_text in ["L", "LOSS"] else ""

            # Method
            method_el = row.select_one(".method, .stoppage")
            method = clean_text(method_el.text) if method_el else ""

            # Round and time
            round_el = row.select_one(".round")
            time_el = row.select_one(".time")
            round_num = int(re.search(r'\d+', round_el.text).group()) if round_el and re.search(r'\d+', round_el.text) else 0
            time_str = parse_time(time_el.text) if time_el else ""

            # Weight class
            wc_el = row.select_one(".weightClass, .weight-class")
            weight_class = clean_text(wc_el.text) if wc_el else ""

            fight = FightResult(
                event_name=event.name,
                event_date=event.date,
                organization=event.organization,
                fighter1=f1_name,
                fighter2=f2_name,
                winner=winner,
                method=method,
                round_num=round_num,
                time_str=time_str,
                weight_class=weight_class,
                discipline="MMA",
                source_url=event.source_url,
            )
            fights.append(fight)

        return fights


# ─── Sherdog Scraper ──────────────────────────────────────────────────────────

class SherdogScraper:
    """Scrapes Sherdog for fighter profiles with complete fight history."""

    BASE = "https://www.sherdog.com"
    SEARCH_URL = f"{BASE}/stats/fightfinder?SearchTxt={{name}}"

    def __init__(self, http: HTTPClient):
        self.http = http
        self.log = logging.getLogger("SherdogScraper")

    def search_fighter(self, name: str) -> Optional[str]:
        """Search for fighter on Sherdog and return profile URL."""
        url = self.SEARCH_URL.format(name=requests.utils.quote(name))
        soup = self.http.get(url)
        if not soup:
            return None

        # Find first fighter result
        for a in soup.select("a[href*='/fighter/']"):
            href = a.get("href", "")
            if "/fighter/" in href and re.search(r'-\d+$', href):
                return self.BASE + href if href.startswith("/") else href

        return None

    def get_fighter(self, url: str) -> Optional[FighterProfile]:
        """Get fighter profile from Sherdog."""
        soup = self.http.get(url)
        if not soup:
            return None

        # Name
        name_el = soup.select_one("span[itemprop='name'], h1.fn")
        if not name_el:
            name_el = soup.select_one("h1")
        if not name_el:
            return None
        name = clean_text(name_el.text)

        profile = FighterProfile(name=name, source="sherdog")
        profile.sherdog_url = url

        # Nickname
        nick_el = soup.select_one("span.nickname")
        if nick_el:
            profile.nickname = clean_text(nick_el.text).strip('"')

        # Physical stats
        for li in soup.select("li.bio_field, div.bio_field, span[itemprop]"):
            label_el = li.select_one("span.label, strong")
            value_el = li.select_one("span.field, span[itemprop]")
            if not label_el:
                continue

            label = clean_text(label_el.text).lower().rstrip(":")
            value = clean_text(value_el.text) if value_el else clean_text(li.text.split(":", 1)[-1])

            if "height" in label:
                profile.height_cm = parse_height(value)
            elif "weight" in label:
                profile.weight_kg = parse_weight(value)
            elif "association" in label or "camp" in label:
                pass  # gym/team
            elif "nationality" in label:
                profile.nationality = value
            elif "born" in label or "birth" in label:
                profile.date_of_birth = value

        # Record from win/loss boxes
        win_box = soup.select_one("div.wins span.counter, span.wins")
        loss_box = soup.select_one("div.losses span.counter, span.losses")
        draw_box = soup.select_one("div.draws span.counter, span.draws")
        nc_box = soup.select_one("div.nc span.counter, span.nc")

        if win_box:
            try:
                profile.wins = int(re.search(r'\d+', win_box.text).group())
            except:
                pass
        if loss_box:
            try:
                profile.losses = int(re.search(r'\d+', loss_box.text).group())
            except:
                pass
        if draw_box:
            try:
                profile.draws = int(re.search(r'\d+', draw_box.text).group())
            except:
                pass
        if nc_box:
            try:
                profile.no_contests = int(re.search(r'\d+', nc_box.text).group())
            except:
                pass

        # Win methods breakdown
        for section in soup.select("div.win, div.loss"):
            is_win = "win" in section.get("class", [])
            for li in section.select("li"):
                text = clean_text(li.text).lower()
                count_el = li.select_one("span.counter, span.count")
                count = int(re.search(r'\d+', count_el.text).group()) if count_el and re.search(r'\d+', count_el.text) else 0

                if "ko" in text or "tko" in text:
                    if is_win:
                        profile.wins_ko = count
                    else:
                        profile.losses_ko = count
                elif "sub" in text:
                    if is_win:
                        profile.wins_sub = count
                    else:
                        profile.losses_sub = count
                elif "dec" in text:
                    if is_win:
                        profile.wins_dec = count
                    else:
                        profile.losses_dec = count

        return profile

    def get_fight_history(self, url: str, fighter_name: str) -> list[FightResult]:
        """Get complete fight history from Sherdog fighter page."""
        soup = self.http.get(url)
        if not soup:
            return []

        fights = []
        # Sherdog fight history table
        table = soup.select_one("table.fight_history, section.fight_history table")
        if not table:
            return []

        for row in table.select("tr")[1:]:  # Skip header
            cells = row.select("td")
            if len(cells) < 6:
                continue

            result_text = clean_text(cells[0].text).upper()
            opponent_el = cells[1].select_one("a")
            opponent = clean_text(opponent_el.text) if opponent_el else clean_text(cells[1].text)
            event_el = cells[2].select_one("a")
            event_name = clean_text(event_el.text) if event_el else clean_text(cells[2].text)
            method = clean_text(cells[3].text)
            round_str = clean_text(cells[4].text)
            time_str = clean_text(cells[5].text)
            date = clean_text(cells[6].text) if len(cells) > 6 else ""

            winner = fighter_name if result_text in ["WIN", "W"] else opponent

            # Detect organization
            org = "Unknown"
            for kw, o in [("UFC", "UFC"), ("ONE", "ONE Championship"), ("PFL", "PFL"),
                           ("Bellator", "Bellator"), ("RIZIN", "RIZIN"), ("SFT", "SFT"),
                           ("Jungle Fight", "Jungle Fight"), ("LFA", "LFA")]:
                if kw.lower() in event_name.lower():
                    org = o
                    break

            fight = FightResult(
                event_name=event_name,
                event_date=date,
                organization=org,
                fighter1=fighter_name,
                fighter2=opponent,
                winner=winner,
                method=method,
                round_num=int(re.search(r'\d+', round_str).group()) if re.search(r'\d+', round_str) else 0,
                time_str=parse_time(time_str),
                source_url=event_el.get("href", "") if event_el else "",
            )
            fights.append(fight)

        return fights


# ─── MMA Decisions Scraper ────────────────────────────────────────────────────

class MMADecisionsScraper:
    """Scrapes mmadecisions.com for scorecard data and judge decisions."""

    BASE = "http://mmadecisions.com"

    def __init__(self, http: HTTPClient):
        self.http = http
        self.log = logging.getLogger("MMADecisionsScraper")

    def search_fighter(self, name: str) -> Optional[str]:
        """Search for fighter on MMA Decisions."""
        url = f"{self.BASE}/fighter/?s={requests.utils.quote(name)}"
        soup = self.http.get(url)
        if not soup:
            return None

        for a in soup.select("a[href*='/fighter/']"):
            href = a.get("href", "")
            if "/fighter/" in href:
                return self.BASE + href if href.startswith("http") else self.BASE + "/" + href.lstrip("/")

        return None

    def get_fighter(self, url: str) -> Optional[dict]:
        """Get fighter scorecard history from MMA Decisions."""
        soup = self.http.get(url)
        if not soup:
            return None

        name_el = soup.select_one("h1, h2.fighter-name")
        if not name_el:
            return None
        name = clean_text(name_el.text)

        fights = []
        for row in soup.select("tr.decision-row, table tr")[1:]:
            cells = row.select("td")
            if len(cells) < 5:
                continue

            opponent = clean_text(cells[0].text)
            event = clean_text(cells[1].text)
            result = clean_text(cells[2].text)
            scores = clean_text(cells[3].text)
            date = clean_text(cells[4].text) if len(cells) > 4 else ""

            fights.append({
                "opponent": opponent,
                "event": event,
                "result": result,
                "scores": scores,
                "date": date,
            })

        return {"name": name, "fights": fights, "source": "mmadecisions", "url": url}

    def get_fight_scorecard(self, fight_url: str) -> Optional[dict]:
        """Get detailed scorecard for a specific fight."""
        soup = self.http.get(fight_url)
        if not soup:
            return None

        scorecard = {"judges": [], "rounds": [], "source_url": fight_url}

        # Judge names
        for judge_el in soup.select("th.judge-name, td.judge"):
            scorecard["judges"].append(clean_text(judge_el.text))

        # Round scores
        for row in soup.select("tr.round-row, tr.round"):
            cells = row.select("td")
            if len(cells) < 3:
                continue
            round_data = {
                "round": clean_text(cells[0].text),
                "scores": [clean_text(c.text) for c in cells[1:]],
            }
            scorecard["rounds"].append(round_data)

        return scorecard


# ─── RIZIN Scraper ────────────────────────────────────────────────────────────

class RIZINScraper:
    """Scrapes RIZIN FF events and results from rizinff.com."""

    BASE = "https://www.rizinff.com"

    def __init__(self, http: HTTPClient):
        self.http = http
        self.log = logging.getLogger("RIZINScraper")

    def get_events(self, max_events: int = 20) -> list[Event]:
        """Get RIZIN events."""
        soup = self.http.get(f"{self.BASE}/events/")
        if not soup:
            return []

        events = []
        for a in soup.select("a[href*='/events/']")[:max_events]:
            href = a.get("href", "")
            name = clean_text(a.text)
            if not name or name.lower() in ["events", "all events"]:
                continue

            events.append(Event(
                name=name,
                date="",
                organization="RIZIN",
                source_url=self.BASE + href if href.startswith("/") else href,
            ))

        return events

    def get_event_fights(self, event: Event) -> list[FightResult]:
        """Get fights from RIZIN event page."""
        if not event.source_url:
            return []

        soup = self.http.get(event.source_url)
        if not soup:
            return []

        fights = []
        for row in soup.select("div.bout, li.bout, tr.bout"):
            fighters = row.select("span.fighter-name, a.fighter")
            if len(fighters) < 2:
                continue

            f1 = clean_text(fighters[0].text)
            f2 = clean_text(fighters[1].text)

            result_el = row.select_one(".result, .winner")
            method_el = row.select_one(".method, .finish")
            round_el = row.select_one(".round")
            time_el = row.select_one(".time")

            winner = f1  # Default
            if result_el:
                result_text = clean_text(result_el.text).lower()
                if "red" in result_text or "1" in result_text:
                    winner = f1
                elif "blue" in result_text or "2" in result_text:
                    winner = f2

            method = clean_text(method_el.text) if method_el else ""
            round_num = int(re.search(r'\d+', round_el.text).group()) if round_el and re.search(r'\d+', round_el.text) else 0
            time_str = parse_time(time_el.text) if time_el else ""

            fight = FightResult(
                event_name=event.name,
                event_date=event.date,
                organization="RIZIN",
                fighter1=f1,
                fighter2=f2,
                winner=winner,
                method=method,
                round_num=round_num,
                time_str=time_str,
                discipline="MMA",
                source_url=event.source_url,
            )
            fights.append(fight)

        return fights


# ─── Bellator Scraper (via Tapology) ─────────────────────────────────────────

class BellatorScraper:
    """
    Scrapes Bellator MMA events using Tapology as the primary source.
    Bellator's official site has heavy JS rendering, making direct scraping unreliable.
    """

    def __init__(self, http: HTTPClient):
        self.tapology = TapologyScraper(http)
        self.log = logging.getLogger("BellatorScraper")

    def get_events(self, max_events: int = 20) -> list[Event]:
        return self.tapology.get_events_by_org("bellator", max_events)

    def get_event_fights(self, event: Event) -> list[FightResult]:
        return self.tapology.get_event_fights(event)


# ─── PFL Scraper (via Tapology) ───────────────────────────────────────────────

class PFLScraper:
    """
    Scrapes PFL (Professional Fighters League) events using Tapology.
    PFL's official site uses heavy React rendering.
    """

    def __init__(self, http: HTTPClient):
        self.tapology = TapologyScraper(http)
        self.log = logging.getLogger("PFLScraper")

    def get_events(self, max_events: int = 20) -> list[Event]:
        return self.tapology.get_events_by_org("pfl", max_events)

    def get_event_fights(self, event: Event) -> list[FightResult]:
        return self.tapology.get_event_fights(event)


# ─── SFT / Jungle Fight Scraper ──────────────────────────────────────────────

class RegionalScraper:
    """
    Scrapes regional MMA organizations (SFT, Jungle Fight, LFA, etc.) via Tapology.
    """

    ORG_MAP = {
        "sft": "SFT",
        "jungle fight": "Jungle Fight",
        "lfa": "LFA",
        "cage warriors": "Cage Warriors",
        "ksw": "KSW",
        "invicta": "Invicta FC",
    }

    def __init__(self, http: HTTPClient):
        self.tapology = TapologyScraper(http)
        self.log = logging.getLogger("RegionalScraper")

    def get_events(self, org: str, max_events: int = 20) -> list[Event]:
        return self.tapology.get_events_by_org(org, max_events)

    def get_event_fights(self, event: Event) -> list[FightResult]:
        return self.tapology.get_event_fights(event)


# ─── Multi-Source Fighter Aggregator ─────────────────────────────────────────

class FighterAggregator:
    """
    Aggregates fighter data from multiple sources (UFCStats, Sherdog, Tapology, MMADecisions).
    Merges and deduplicates data, preferring more complete sources.
    """

    def __init__(self, http: HTTPClient):
        self.ufc = UFCScraper(http)
        self.sherdog = SherdogScraper(http)
        self.tapology = TapologyScraper(http)
        self.mmadecisions = MMADecisionsScraper(http)
        self.log = logging.getLogger("FighterAggregator")

    def scrape_fighter(self, name: str, sources: list[str] = None) -> dict:
        """
        Scrape fighter from multiple sources and merge results.
        sources: list of ['ufc', 'sherdog', 'tapology', 'mmadecisions'] or None for all
        """
        if sources is None:
            sources = ["ufc", "sherdog", "tapology", "mmadecisions"]

        self.log.info(f"Aggregating data for '{name}' from sources: {sources}")
        result = {
            "name": name,
            "sources": {},
            "merged": None,
            "fight_history": [],
            "scorecards": [],
        }

        profiles = []

        # UFC Stats
        if "ufc" in sources:
            try:
                fighters_page = self.ufc.http.get(
                    f"http://ufcstats.com/statistics/fighters?char={name[0].lower()}&page=all"
                )
                if fighters_page:
                    for a in fighters_page.select("a.b-link"):
                        if name.lower() in clean_text(a.text).lower():
                            ufc_profile = self.ufc.get_fighter_details(a.get("href", ""))
                            if ufc_profile:
                                profiles.append(ufc_profile)
                                result["sources"]["ufc"] = asdict(ufc_profile)
                                self.log.info(f"UFC Stats: found {ufc_profile.name}")
                                break
            except Exception as e:
                self.log.warning(f"UFC Stats error for {name}: {e}")

        # Sherdog
        if "sherdog" in sources:
            try:
                sherdog_url = self.sherdog.search_fighter(name)
                if sherdog_url:
                    sherdog_profile = self.sherdog.get_fighter(sherdog_url)
                    if sherdog_profile:
                        profiles.append(sherdog_profile)
                        result["sources"]["sherdog"] = asdict(sherdog_profile)
                        fight_history = self.sherdog.get_fight_history(sherdog_url, name)
                        result["fight_history"].extend([asdict(f) for f in fight_history])
                        self.log.info(f"Sherdog: found {sherdog_profile.name}, {len(fight_history)} fights")
            except Exception as e:
                self.log.warning(f"Sherdog error for {name}: {e}")

        # Tapology
        if "tapology" in sources:
            try:
                tapology_url = self.tapology.search_fighter(name)
                if tapology_url:
                    tapology_profile = self.tapology.get_fighter(tapology_url)
                    if tapology_profile:
                        profiles.append(tapology_profile)
                        result["sources"]["tapology"] = asdict(tapology_profile)
                        self.log.info(f"Tapology: found {tapology_profile.name}")
            except Exception as e:
                self.log.warning(f"Tapology error for {name}: {e}")

        # MMA Decisions
        if "mmadecisions" in sources:
            try:
                mmad_url = self.mmadecisions.search_fighter(name)
                if mmad_url:
                    mmad_data = self.mmadecisions.get_fighter(mmad_url)
                    if mmad_data:
                        result["sources"]["mmadecisions"] = mmad_data
                        result["scorecards"] = mmad_data.get("fights", [])
                        self.log.info(f"MMADecisions: found {mmad_data['name']}, {len(result['scorecards'])} decisions")
            except Exception as e:
                self.log.warning(f"MMADecisions error for {name}: {e}")

        # Merge profiles (prefer UFC Stats > Sherdog > Tapology)
        if profiles:
            merged = self._merge_profiles(profiles)
            result["merged"] = asdict(merged)

        return result

    def _merge_profiles(self, profiles: list[FighterProfile]) -> FighterProfile:
        """Merge multiple profiles, taking best available data from each."""
        if not profiles:
            return FighterProfile(name="Unknown")

        # Start with the most complete profile
        base = max(profiles, key=lambda p: sum([
            bool(p.height_cm), bool(p.weight_kg), bool(p.reach_cm),
            bool(p.wins), bool(p.slpm), bool(p.nationality),
        ]))

        # Fill in missing fields from other profiles
        for p in profiles:
            if p is base:
                continue
            if not base.height_cm and p.height_cm:
                base.height_cm = p.height_cm
            if not base.weight_kg and p.weight_kg:
                base.weight_kg = p.weight_kg
            if not base.reach_cm and p.reach_cm:
                base.reach_cm = p.reach_cm
            if not base.stance and p.stance:
                base.stance = p.stance
            if not base.nationality and p.nationality:
                base.nationality = p.nationality
            if not base.date_of_birth and p.date_of_birth:
                base.date_of_birth = p.date_of_birth
            if not base.nickname and p.nickname:
                base.nickname = p.nickname
            if not base.wins and p.wins:
                base.wins = p.wins
            if not base.losses and p.losses:
                base.losses = p.losses
            # UFC stats only from UFCStats source
            if not base.slpm and p.slpm:
                base.slpm = p.slpm
            if not base.td_avg and p.td_avg:
                base.td_avg = p.td_avg

        return base


# ─── Main Orchestrator ────────────────────────────────────────────────────────

class MMAOrchestrator:
    """
    Main orchestrator that coordinates all scrapers and optionally saves to MySQL.
    """

    ORG_SCRAPERS = {
        "ufc": "UFCScraper",
        "one": "ONEScraper",
        "pfl": "PFLScraper",
        "bellator": "BellatorScraper",
        "rizin": "RIZINScraper",
        "sft": "RegionalScraper:sft",
        "jungle fight": "RegionalScraper:jungle fight",
        "lfa": "RegionalScraper:lfa",
    }

    def __init__(self, delay: float = 2.0, use_db: bool = False):
        self.http = HTTPClient(delay=delay)
        self.ufc = UFCScraper(self.http)
        self.one = ONEScraper(self.http)
        self.pfl = PFLScraper(self.http)
        self.bellator = BellatorScraper(self.http)
        self.rizin = RIZINScraper(self.http)
        self.regional = RegionalScraper(self.http)
        self.aggregator = FighterAggregator(self.http)
        self.use_db = use_db
        self.db = None
        self.log = logging.getLogger("MMAOrchestrator")

        if use_db:
            self._init_db()

    def _init_db(self):
        """Initialize MySQL database connection."""
        try:
            import mysql.connector
            import os
            self.db = mysql.connector.connect(
                host=os.getenv("DB_HOST", "localhost"),
                port=int(os.getenv("DB_PORT", 3306)),
                user=os.getenv("DB_USER", "mma_user"),
                password=os.getenv("DB_PASSWORD", "mma_password"),
                database=os.getenv("DB_NAME", "mma_analytics"),
            )
            self.log.info("Database connected successfully")
        except Exception as e:
            self.log.error(f"Database connection failed: {e}")
            self.db = None

    def scrape_org(self, org: str, max_events: int = 10, save_fights: bool = True) -> list[dict]:
        """Scrape all events and fights for an organization."""
        self.log.info(f"=== Scraping {org.upper()} (max {max_events} events) ===")
        results = []

        # Get events
        if org.lower() == "ufc":
            events = self.ufc.get_events(max_events)
        elif org.lower() == "one":
            events = self.one.get_events(max_events)
        elif org.lower() == "pfl":
            events = self.pfl.get_events(max_events)
        elif org.lower() == "bellator":
            events = self.bellator.get_events(max_events)
        elif org.lower() == "rizin":
            events = self.rizin.get_events(max_events)
        elif org.lower() in ["sft", "jungle fight", "lfa", "cage warriors", "ksw"]:
            events = self.regional.get_events(org.lower(), max_events)
        else:
            self.log.warning(f"Unknown organization: {org}")
            return []

        self.log.info(f"Found {len(events)} events for {org.upper()}")

        for i, event in enumerate(events):
            self.log.info(f"[{i+1}/{len(events)}] Processing: {event.name}")

            # Get fights
            if org.lower() == "ufc":
                fights = self.ufc.get_event_fights(event)
                if fights:
                    # Get detailed stats for each fight
                    detailed_fights = []
                    for fight in fights[:5]:  # Limit detail fetching
                        detailed = self.ufc.get_fight_details(fight)
                        detailed_fights.append(detailed)
                    fights = detailed_fights + fights[5:]
            elif org.lower() == "one":
                fights = self.one.get_event_fights(event)
            elif org.lower() == "pfl":
                fights = self.pfl.get_event_fights(event)
            elif org.lower() == "bellator":
                fights = self.bellator.get_event_fights(event)
            elif org.lower() == "rizin":
                fights = self.rizin.get_event_fights(event)
            else:
                fights = self.regional.get_event_fights(event)

            event.fights = fights
            event_dict = {
                "name": event.name,
                "date": event.date,
                "organization": event.organization,
                "location": event.location,
                "source_url": event.source_url,
                "fights": [asdict(f) for f in fights],
            }
            results.append(event_dict)

            if self.db and save_fights:
                self._save_event_to_db(event, fights)

            self.log.info(f"  → {len(fights)} fights scraped")

        return results

    def scrape_all_orgs(self, max_events_per_org: int = 5) -> dict:
        """Scrape all supported organizations."""
        all_results = {}
        orgs = ["ufc", "one", "pfl", "bellator", "rizin", "sft", "lfa"]

        for org in orgs:
            try:
                results = self.scrape_org(org, max_events_per_org)
                all_results[org] = results
                self.log.info(f"✓ {org.upper()}: {len(results)} events scraped")
            except Exception as e:
                self.log.error(f"✗ {org.upper()} failed: {e}")
                all_results[org] = []

        return all_results

    def scrape_fighter(self, name: str, sources: list[str] = None) -> dict:
        """Scrape fighter from multiple sources."""
        return self.aggregator.scrape_fighter(name, sources)

    def _save_event_to_db(self, event: Event, fights: list[FightResult]):
        """Save event and fights to MySQL database."""
        if not self.db:
            return

        cursor = self.db.cursor()
        try:
            # Insert event
            cursor.execute("""
                INSERT IGNORE INTO events (name, date, organization, location, source_url)
                VALUES (%s, %s, %s, %s, %s)
            """, (event.name, event.date, event.organization, event.location, event.source_url))
            event_id = cursor.lastrowid

            # Insert fighters and fights
            for fight in fights:
                # Upsert fighters
                for fname in [fight.fighter1, fight.fighter2]:
                    cursor.execute("""
                        INSERT IGNORE INTO fighters (name, organization)
                        VALUES (%s, %s)
                    """, (fname, event.organization))

                # Get fighter IDs
                cursor.execute("SELECT id FROM fighters WHERE name = %s", (fight.fighter1,))
                row = cursor.fetchone()
                f1_id = row[0] if row else None

                cursor.execute("SELECT id FROM fighters WHERE name = %s", (fight.fighter2,))
                row = cursor.fetchone()
                f2_id = row[0] if row else None

                # Insert fight
                cursor.execute("""
                    INSERT IGNORE INTO fights
                    (event_id, fighter1_id, fighter2_id, winner_name, method, method_detail,
                     round_num, time_str, weight_class, discipline, is_title_fight,
                     f1_kd, f2_kd, f1_sig_str, f2_sig_str, f1_td, f2_td,
                     f1_ctrl, f2_ctrl, source_url)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    event_id, f1_id, f2_id, fight.winner, fight.method, fight.method_detail,
                    fight.round_num, fight.time_str, fight.weight_class, fight.discipline,
                    fight.is_title_fight, fight.f1_kd, fight.f2_kd,
                    fight.f1_sig_str, fight.f2_sig_str, fight.f1_td, fight.f2_td,
                    fight.f1_ctrl, fight.f2_ctrl, fight.source_url,
                ))

            self.db.commit()
        except Exception as e:
            self.log.error(f"DB save error: {e}")
            self.db.rollback()
        finally:
            cursor.close()


# ─── CLI ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="MMA Scraper v2 - Coleta dados de múltiplas organizações MMA",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python3 mma_scraper_v2.py --org ufc --max 10
  python3 mma_scraper_v2.py --org one --max 5
  python3 mma_scraper_v2.py --org all --max 3
  python3 mma_scraper_v2.py --fighter "Michael Chiesa" --sources ufc sherdog tapology
  python3 mma_scraper_v2.py --org ufc --max 20 --db --output resultados.json
        """
    )
    parser.add_argument("--org", default="ufc",
                        choices=["ufc", "one", "pfl", "bellator", "rizin", "sft", "lfa", "all"],
                        help="Organização para scraping (default: ufc)")
    parser.add_argument("--max", type=int, default=5,
                        help="Número máximo de eventos por organização (default: 5)")
    parser.add_argument("--fighter", type=str, default=None,
                        help="Nome do atleta para busca multi-fonte")
    parser.add_argument("--sources", nargs="+",
                        choices=["ufc", "sherdog", "tapology", "mmadecisions"],
                        default=["ufc", "sherdog", "tapology"],
                        help="Fontes para busca de atleta (default: ufc sherdog tapology)")
    parser.add_argument("--db", action="store_true",
                        help="Salvar resultados no banco MySQL")
    parser.add_argument("--output", type=str, default=None,
                        help="Arquivo JSON de saída (default: {org}_results.json)")
    parser.add_argument("--delay", type=float, default=2.0,
                        help="Delay entre requisições em segundos (default: 2.0)")
    parser.add_argument("--verbose", action="store_true",
                        help="Log detalhado")

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    orchestrator = MMAOrchestrator(delay=args.delay, use_db=args.db)

    if args.fighter:
        # Fighter multi-source scraping
        print(f"\n🥊 Buscando dados de '{args.fighter}' em {args.sources}...")
        result = orchestrator.scrape_fighter(args.fighter, args.sources)

        output_file = args.output or f"{args.fighter.lower().replace(' ', '_')}_profile.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2, default=str)

        print(f"\n✅ Dados salvos em: {output_file}")
        if result.get("merged"):
            m = result["merged"]
            print(f"   Nome: {m.get('name')}")
            print(f"   Record: {m.get('wins', 0)}-{m.get('losses', 0)}-{m.get('draws', 0)}")
            print(f"   Altura: {m.get('height_cm', 0)} cm | Envergadura: {m.get('reach_cm', 0)} cm")
            print(f"   Fontes encontradas: {list(result.get('sources', {}).keys())}")
            print(f"   Lutas no histórico: {len(result.get('fight_history', []))}")
            print(f"   Scorecards: {len(result.get('scorecards', []))}")

    else:
        # Organization event scraping
        if args.org == "all":
            print(f"\n🌍 Scraping TODAS as organizações (max {args.max} eventos cada)...")
            results = orchestrator.scrape_all_orgs(args.max)
            total_events = sum(len(v) for v in results.values())
            total_fights = sum(len(e.get("fights", [])) for v in results.values() for e in v)
            print(f"\n✅ Total: {total_events} eventos, {total_fights} lutas")
        else:
            print(f"\n🥊 Scraping {args.org.upper()} (max {args.max} eventos)...")
            results = orchestrator.scrape_org(args.org, args.max)
            total_fights = sum(len(e.get("fights", [])) for e in results)
            print(f"\n✅ {len(results)} eventos, {total_fights} lutas coletadas")

        output_file = args.output or f"{args.org}_results_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2, default=str)

        print(f"💾 Resultados salvos em: {output_file}")

        # Print summary
        if isinstance(results, list):
            for event in results[:3]:
                print(f"\n  📅 {event.get('name')} ({event.get('date')})")
                for fight in event.get("fights", [])[:3]:
                    print(f"     • {fight.get('fighter1')} vs {fight.get('fighter2')} → {fight.get('winner')} ({fight.get('method')})")


if __name__ == "__main__":
    main()
