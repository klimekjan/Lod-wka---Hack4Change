import re

_SPECIAL = re.compile(r'[^a-ząćęłńóśźż\s]')
_WHITESPACE = re.compile(r'\s+')


def czysc_tekst(s: str) -> str:
    s = s.lower().strip()
    s = _SPECIAL.sub(' ', s)
    s = _WHITESPACE.sub(' ', s).strip()
    return s
