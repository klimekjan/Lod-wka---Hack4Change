"""
Trenuje lekki klasyfikator kategorii produktów (nazwa → 1 z 11 kategorii).

Użycie:
    python -m app.services.ml.train_classifier          # z katalogu backend/
    python -m app.services.ml.train_classifier --seed   # tylko dane seed (bez CSV)

Dane treningowe: data/kategorie_training.csv  (generuj: python data/fetch_categories_dataset.py)
Model zapisywany do: backend/models/kategoria_clf.joblib
"""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent.parent.parent
DATA_DIR = BACKEND_DIR / "data"
MODELS_DIR = BACKEND_DIR / "models"

# Ręcznie zebrany zbiór seed (PL nazwy) — używany gdy brak CSV lub z flagą --seed.
_SEED: list[tuple[str, str]] = [
    # nabiał
    ("Mleko UHT 3,2%", "nabiał"), ("Mleko świeże 2%", "nabiał"),
    ("Jogurt naturalny", "nabiał"), ("Jogurt truskawkowy", "nabiał"),
    ("Jogurt grecki", "nabiał"), ("Ser żółty gouda", "nabiał"),
    ("Ser biały twarogowy", "nabiał"), ("Ser pleśniowy camembert", "nabiał"),
    ("Masło extra 82%", "nabiał"), ("Śmietana 18%", "nabiał"),
    ("Kefir naturalny", "nabiał"), ("Maślanka", "nabiał"),
    ("Serek wiejski", "nabiał"), ("Mozzarella kulka", "nabiał"),
    ("Parmezan tarty", "nabiał"), ("Ricotta", "nabiał"),
    ("Ser feta", "nabiał"), ("Brie", "nabiał"),
    ("Śmietanka do kawy 30%", "nabiał"), ("Twaróg półtłusty", "nabiał"),
    ("Mleko kokosowe", "nabiał"), ("Napój sojowy", "nabiał"),
    ("Jogurt owocowy malina", "nabiał"), ("Ser edamski", "nabiał"),
    ("Mleko odtłuszczone 0%", "nabiał"),
    # mięso surowe
    ("Filet z kurczaka", "mięso surowe"), ("Pierś z kurczaka", "mięso surowe"),
    ("Mięso mielone wołowe", "mięso surowe"), ("Schab wieprzowy", "mięso surowe"),
    ("Żeberka wieprzowe", "mięso surowe"), ("Polędwica wołowa", "mięso surowe"),
    ("Udziec z indyka", "mięso surowe"), ("Boczek surowy", "mięso surowe"),
    ("Skrzydełka z kurczaka", "mięso surowe"), ("Łopatka wieprzowa", "mięso surowe"),
    ("Szynka surowa", "mięso surowe"), ("Wołowina na gulasz", "mięso surowe"),
    ("Kiełbasa surowa biała", "mięso surowe"), ("Karkówka wieprzowa", "mięso surowe"),
    ("Mięso mielone wieprzowe", "mięso surowe"), ("Steak wołowy", "mięso surowe"),
    ("Rostbef", "mięso surowe"), ("Kurczak cały", "mięso surowe"),
    ("Nóżki kurczaka", "mięso surowe"), ("Comber jagnięcy", "mięso surowe"),
    ("Polędwica wieprzowa", "mięso surowe"), ("Filet z indyka", "mięso surowe"),
    ("Antrykot wołowy", "mięso surowe"), ("Wątroba wołowa", "mięso surowe"),
    ("Golonka wieprzowa", "mięso surowe"),
    # ryby
    ("Filet z łososia", "ryby"), ("Tuńczyk w puszce", "ryby"),
    ("Makrela wędzona", "ryby"), ("Pstrąg tęczowy", "ryby"),
    ("Dorsz bałtycki", "ryby"), ("Śledź w oleju", "ryby"),
    ("Krewetki koktajlowe", "ryby"), ("Tilapia filet", "ryby"),
    ("Mintaj filet", "ryby"), ("Sardynki w pomidorach", "ryby"),
    ("Halibut", "ryby"), ("Morszczuk", "ryby"),
    ("Łosoś wędzony", "ryby"), ("Tuńczyk świeży", "ryby"),
    ("Pangas filet", "ryby"), ("Karp", "ryby"),
    ("Pstrąg wędzony", "ryby"), ("Anchois", "ryby"),
    ("Kalmary", "ryby"), ("Małże", "ryby"),
    ("Dorsz wędzony", "ryby"), ("Ryba maślana", "ryby"),
    ("Flądra", "ryby"), ("Okoń", "ryby"), ("Sandacz", "ryby"),
    # warzywa liściaste
    ("Sałata lodowa", "warzywa liściaste"), ("Szpinak baby", "warzywa liściaste"),
    ("Rukola", "warzywa liściaste"), ("Kapusta pekińska", "warzywa liściaste"),
    ("Sałata masłowa", "warzywa liściaste"), ("Liście jarmużu", "warzywa liściaste"),
    ("Endywia", "warzywa liściaste"), ("Radicchio", "warzywa liściaste"),
    ("Sałata roszponka", "warzywa liściaste"), ("Pak choi", "warzywa liściaste"),
    ("Mix sałat", "warzywa liściaste"), ("Szpinak świeży", "warzywa liściaste"),
    ("Sałata rzymska", "warzywa liściaste"), ("Boćwina", "warzywa liściaste"),
    ("Natka pietruszki", "warzywa liściaste"), ("Bazylia świeża", "warzywa liściaste"),
    ("Szpinak mrożony", "warzywa liściaste"), ("Koperek świeży", "warzywa liściaste"),
    ("Szczypiorek", "warzywa liściaste"), ("Liście szpinaku", "warzywa liściaste"),
    ("Kapusta włoska", "warzywa liściaste"), ("Sałata dębowa", "warzywa liściaste"),
    ("Mniszek lekarski", "warzywa liściaste"), ("Roszponka z rukola", "warzywa liściaste"),
    ("Cykoria", "warzywa liściaste"),
    # warzywa twarde
    ("Marchewka", "warzywa twarde"), ("Ziemniaki", "warzywa twarde"),
    ("Papryka czerwona", "warzywa twarde"), ("Pomidor malinowy", "warzywa twarde"),
    ("Ogórek zielony", "warzywa twarde"), ("Brokuł", "warzywa twarde"),
    ("Kalafior", "warzywa twarde"), ("Cebula żółta", "warzywa twarde"),
    ("Czosnek główka", "warzywa twarde"), ("Buraki ćwikłowe", "warzywa twarde"),
    ("Bataty słodkie ziemniaki", "warzywa twarde"), ("Cukinia", "warzywa twarde"),
    ("Bakłażan", "warzywa twarde"), ("Por", "warzywa twarde"),
    ("Seler naciowy", "warzywa twarde"), ("Pieczarki", "warzywa twarde"),
    ("Grzyby boczniaki", "warzywa twarde"), ("Kukurydza kolba", "warzywa twarde"),
    ("Dynia hokkaido", "warzywa twarde"), ("Rzodkiewka", "warzywa twarde"),
    ("Fasolka szparagowa", "warzywa twarde"), ("Groch zielony", "warzywa twarde"),
    ("Szparagi", "warzywa twarde"), ("Kalarepka", "warzywa twarde"),
    ("Pasternak", "warzywa twarde"),
    # owoce
    ("Jabłka golden", "owoce"), ("Banany", "owoce"),
    ("Pomarańcze", "owoce"), ("Truskawki", "owoce"),
    ("Winogrona zielone", "owoce"), ("Kiwi", "owoce"),
    ("Mango", "owoce"), ("Awokado", "owoce"),
    ("Cytryna", "owoce"), ("Grapefruit", "owoce"),
    ("Borówki", "owoce"), ("Maliny", "owoce"),
    ("Gruszki", "owoce"), ("Śliwki", "owoce"),
    ("Brzoskwinie", "owoce"), ("Nektarynki", "owoce"),
    ("Arbuz", "owoce"), ("Melon", "owoce"),
    ("Wiśnie", "owoce"), ("Czereśnie", "owoce"),
    ("Mandarynki", "owoce"), ("Ananas", "owoce"),
    ("Papaja", "owoce"), ("Granat", "owoce"), ("Figi świeże", "owoce"),
    # pieczywo
    ("Chleb żytni razowy", "pieczywo"), ("Bułki pszenne", "pieczywo"),
    ("Bagietka pszenna", "pieczywo"), ("Chleb tostowy", "pieczywo"),
    ("Chałka", "pieczywo"), ("Pumpernikiel", "pieczywo"),
    ("Chleb wieloziarnisty", "pieczywo"), ("Rogale maślane", "pieczywo"),
    ("Chleb graham", "pieczywo"), ("Bułka kajzerka", "pieczywo"),
    ("Croissant", "pieczywo"), ("Chleb orkiszowy", "pieczywo"),
    ("Bułka hamburgerowa", "pieczywo"), ("Chleb z ziarnami", "pieczywo"),
    ("Ciabatta", "pieczywo"), ("Pita", "pieczywo"),
    ("Tortilla pszenna", "pieczywo"), ("Naan", "pieczywo"),
    ("Chleb bezglutenowy", "pieczywo"), ("Bułka drożdżowa", "pieczywo"),
    ("Chleb żytni na zakwasie", "pieczywo"), ("Bułki grahamowe", "pieczywo"),
    ("Chleb słonecznikowy", "pieczywo"), ("Precle", "pieczywo"),
    ("Chlebek czosnkowy", "pieczywo"),
    # jajka
    ("Jajka kurze M 10szt", "jajka"), ("Jajka L białe", "jajka"),
    ("Jajka XL od kur z wolnego wybiegu", "jajka"), ("Jajka S", "jajka"),
    ("Jajka ekologiczne", "jajka"), ("Jajka przepiórcze", "jajka"),
    ("Jajka brązowe L", "jajka"), ("Jajka 6 sztuk", "jajka"),
    ("Jajka wiejskie", "jajka"), ("Jajko sadzone gotowe", "jajka"),
    ("Jajka na twardo", "jajka"), ("Jajka omega 3", "jajka"),
    ("Jajka kacze", "jajka"), ("Jajka kurze świeże", "jajka"),
    ("Jajka białe M 12 sztuk", "jajka"), ("Jaja wolny wybieg", "jajka"),
    ("Jajka klasa A", "jajka"), ("Jajka XXL", "jajka"),
    ("Jajka z wolnego wybiegu L", "jajka"), ("Jajka zagrodowe", "jajka"),
    ("Jajka kur niosek", "jajka"), ("Jaja kurze M", "jajka"),
    ("Jajka bio", "jajka"), ("Jajka size M", "jajka"), ("Jaja sadzone", "jajka"),
    # napoje
    ("Sok pomarańczowy 100%", "napoje"), ("Woda mineralna niegazowana", "napoje"),
    ("Cola 1,5L", "napoje"), ("Herbata czarna liściasta", "napoje"),
    ("Kawa mielona arabica", "napoje"), ("Sok jabłkowy", "napoje"),
    ("Woda gazowana", "napoje"), ("Napój energetyczny", "napoje"),
    ("Herbata zielona", "napoje"), ("Kawa ziarnista", "napoje"),
    ("Sok multiwitamina", "napoje"), ("Lemoniada", "napoje"),
    ("Napój izotoniczny", "napoje"), ("Piwo bezalkoholowe", "napoje"),
    ("Sok grejpfrutowy", "napoje"), ("Kawa cappuccino instant", "napoje"),
    ("Kombucha", "napoje"), ("Sok marchwiowy", "napoje"),
    ("Woda kokosowa", "napoje"), ("Sok pomidorowy", "napoje"),
    ("Napój owocowy", "napoje"), ("Herbata owocowa", "napoje"),
    ("Kawa nescafe", "napoje"), ("Latte macchiato", "napoje"),
    ("Sok z czarnej porzeczki", "napoje"),
    # przetwory
    ("Dżem truskawkowy", "przetwory"), ("Dżem morelowy", "przetwory"),
    ("Ogórki kiszone", "przetwory"), ("Koncentrat pomidorowy", "przetwory"),
    ("Fasola biała w puszce", "przetwory"), ("Kukurydza konserwowa", "przetwory"),
    ("Groszek zielony konserwowy", "przetwory"), ("Pesto bazyliowe", "przetwory"),
    ("Sos pomidorowy passata", "przetwory"), ("Kapusta kiszona", "przetwory"),
    ("Oliwki czarne", "przetwory"), ("Dżem wiśniowy", "przetwory"),
    ("Hummus", "przetwory"), ("Pasta z tuńczyka", "przetwory"),
    ("Sos sojowy", "przetwory"), ("Marynowane pieczarki", "przetwory"),
    ("Ciecierzyca w puszce", "przetwory"), ("Pasta pomidorowa", "przetwory"),
    ("Ocet jabłkowy", "przetwory"), ("Marmolada", "przetwory"),
    ("Ogórki konserwowe", "przetwory"), ("Papryka marynowana", "przetwory"),
    ("Sos worcestershire", "przetwory"), ("Miso", "przetwory"),
    ("Konfitury z wiśni", "przetwory"),
    # inne
    ("Chipsy ziemniaczane", "inne"), ("Czekolada mleczna", "inne"),
    ("Mąka pszenna typ 450", "inne"), ("Ryż biały", "inne"),
    ("Makaron spaghetti", "inne"), ("Cukier biały", "inne"),
    ("Olej rzepakowy", "inne"), ("Ketchup", "inne"),
    ("Musztarda", "inne"), ("Majonez", "inne"),
    ("Płatki owsiane", "inne"), ("Musli z owocami", "inne"),
    ("Kasza gryczana", "inne"), ("Soczewica czerwona", "inne"),
    ("Orzechy włoskie", "inne"), ("Migdały", "inne"),
    ("Miód wielokwiatowy", "inne"), ("Syrop klonowy", "inne"),
    ("Ocet winny", "inne"), ("Sos tabasco", "inne"),
    ("Proszek do pieczenia", "inne"), ("Drożdże instant", "inne"),
    ("Sól morska", "inne"), ("Pieprz czarny mielony", "inne"),
    ("Oregano suszone", "inne"),
]


def trenuj(use_seed: bool = False) -> None:
    import pandas as pd
    import joblib
    from sklearn.pipeline import Pipeline
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report

    sys.path.insert(0, str(BACKEND_DIR))
    from app.services.ml.text_clean import czysc_tekst

    csv_path = DATA_DIR / "kategorie_training.csv"

    if not use_seed and csv_path.exists():
        df = pd.read_csv(csv_path)
        df = df.dropna(subset=["nazwa", "kategoria"])
        df = df[df["nazwa"].str.strip() != ""]
        print(f"Załadowano {len(df)} wierszy z {csv_path}")
    else:
        if not use_seed:
            print(f"Brak {csv_path}. Trenuje na danych seed ({len(_SEED)} próbek).")
            print("Aby uzyskać lepszy model: python data/fetch_categories_dataset.py")
        df = pd.DataFrame(_SEED, columns=["nazwa", "kategoria"])

    df["nazwa_clean"] = df["nazwa"].apply(czysc_tekst)
    X = df["nazwa_clean"].values
    y = df["kategoria"].values

    if len(df) >= 50:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
    else:
        X_train, X_test, y_train, y_test = X, X, y, y

    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), min_df=1, max_features=30000)),
        ("clf", LogisticRegression(max_iter=2000, class_weight="balanced", C=5.0, solver="lbfgs")),
    ])
    pipe.fit(X_train, y_train)

    y_pred = pipe.predict(X_test)
    report = classification_report(y_test, y_pred)
    try:
        print("\nWyniki na zbiorze testowym:")
        print(report)
    except UnicodeEncodeError:
        print(report.encode('utf-8', errors='replace').decode('ascii', errors='replace'))

    MODELS_DIR.mkdir(exist_ok=True)
    out = MODELS_DIR / "kategoria_clf.joblib"
    joblib.dump(pipe, out)
    print(f"Model zapisany: {out}")


if __name__ == "__main__":
    import io as _io
    if hasattr(sys.stdout, 'buffer'):
        sys.stdout = _io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    use_seed = "--seed" in sys.argv
    trenuj(use_seed=use_seed)
