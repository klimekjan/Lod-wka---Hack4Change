import json
import os
from datetime import datetime, timezone

from anthropic import AsyncAnthropic

from ..models import PantryItem

client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

_PROMPT = """\
Jesteś kulinarnym asystentem. Masz spiżarnię z poniższymi produktami.
Produkty "priorytetowe" kończą się w ciągu 3 dni i powinny być zużyte w pierwszej kolejności.

Priorytetowe (na wylocie):
{priorytety}

Pozostałe dostępne:
{pozostale}

Zaproponuj 3 różne przepisy, które maksymalnie wykorzystają priorytetowe produkty.
Odpowiedź TYLKO w JSON, bez żadnego tekstu przed ani po:

{{
  "przepisy": [
    {{
      "tytul": "Nazwa dania",
      "opis": "Jedno zdanie opisu",
      "czas_min": 30,
      "porcje": 4,
      "trudnosc": "łatwy",
      "skladniki_spizarni": ["produkt1", "produkt2"],
      "skladniki_dodatkowe": ["sól", "pieprz"],
      "kroki": ["Krok 1.", "Krok 2.", "Krok 3."],
      "uratowane_produkty": 2
    }}
  ]
}}"""


async def generuj_przepisy(produkty: list[PantryItem]) -> list[dict]:
    teraz = datetime.now(timezone.utc)
    priorytety = [
        p for p in produkty
        if p.expires_at and (
            (p.expires_at if p.expires_at.tzinfo else p.expires_at.replace(tzinfo=timezone.utc)) - teraz
        ).days <= 3
    ]
    pozostale = [p for p in produkty if p not in priorytety]

    def fmt(items: list) -> str:
        if not items:
            return "(brak)"
        return "\n".join(f"- {p.name} ({p.quantity} {p.unit})" for p in items)

    prompt = _PROMPT.format(priorytety=fmt(priorytety), pozostale=fmt(pozostale))

    msg = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    blok = next((b for b in msg.content if b.type == "text"), None)
    if not blok:
        return []
    text = blok.text.strip()

    # Usuń markdown code fences jeśli model je dodał
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    try:
        return json.loads(text).get("przepisy", [])
    except json.JSONDecodeError:
        return []
