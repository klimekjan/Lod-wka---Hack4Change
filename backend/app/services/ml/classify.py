import re


def init_classifier() -> None:
    pass


_SLOWA: dict[str, list[str]] = {
    "mięso surowe":      ["kurczak", "wołowina", "wieprzowina", "schab", "szynka", "boczek",
                          "mielone", "filet", "żeberka", "indyk", "kaczka", "mięso"],
    "ryby":              ["łosoś", "tuńczyk", "dorsz", "śledź", "makrela", "pstrąg",
                          "krewetki", "owoce morza", "ryba", "filety rybne"],
    "warzywa liściaste": ["sałata", "szpinak", "rukola", "jarmuż", "kapusta", "seler naciowy",
                          "pietruszka", "koperek", "bazylia", "szczypiorek"],
    "warzywa twarde":    ["marchew", "ziemniak", "burak", "cebula", "czosnek", "papryka",
                          "brokuł", "kalafior", "cukinia", "pomidor", "ogórek", "por",
                          "dynia", "bakłażan", "warzywa"],
    "owoce":             ["jabłko", "gruszka", "banan", "truskawka", "malina", "winogrona",
                          "pomarańcza", "cytryna", "mango", "ananas", "brzoskwinia",
                          "borówka", "jagoda", "śliwka", "owoc"],
    "nabiał":            ["mleko", "jogurt", "kefir", "śmietana", "ser", "twaróg",
                          "masło", "maślanka", "fromage", "ricotta", "mozzarella"],
    "jajka":             ["jajko", "jajka", "jajo"],
    "pieczywo":          ["chleb", "bułka", "bagietka", "croissant", "tost", "chałka",
                          "ciabatta", "tortilla", "wrap", "pita", "pieczywo"],
    "napoje":            ["sok", "woda", "napój", "cola", "piwo", "wino", "herbata",
                          "kawa", "smoothie", "nektar", "lemoniada", "kompot"],
    "przetwory":         ["dżem", "konserwa", "sos", "ketchup", "musztarda", "majonez",
                          "pasta", "puszka", "słoik", "marynata", "kiszonka",
                          "mąka", "ryż", "makaron", "kasza", "płatki", "musli"],
}


def klasyfikuj(nazwa: str) -> tuple[str, float]:
    """Zwraca (kategoria, pewność) na podstawie słów kluczowych w nazwie produktu."""
    n = nazwa.lower()
    n = re.sub(r"[^\w\s]", " ", n)
    tokeny = set(n.split())

    najlepszy = "inne"
    max_trafien = 0

    for kat, slowa in _SLOWA.items():
        trafienia = sum(1 for s in slowa if s in n)
        if trafienia > max_trafien:
            max_trafien = trafienia
            najlepszy = kat

    pewnosc = min(0.95, 0.5 + max_trafien * 0.2) if max_trafien > 0 else 0.0
    return najlepszy, pewnosc
