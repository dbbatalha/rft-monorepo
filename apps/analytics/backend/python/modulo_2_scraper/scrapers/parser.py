from bs4 import BeautifulSoup


def soup(html):

    if not html:
        return None

    return BeautifulSoup(html, "lxml")