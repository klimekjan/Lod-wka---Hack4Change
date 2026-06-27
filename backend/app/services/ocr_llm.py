import base64
import json
import re

from anthropic import Anthropic

from ..schemas import Receipt


def _wykryj_mime(data: bytes) -> str:
    if data[:4] == b'\x89PNG':
        return "image/png"
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return "image/webp"
    if data[:3] == b'GIF':
        return "image/gif"
    return "image/jpeg"


def _wyodrebnij_json(tekst: str) -> dict:
    # usuń code block jeśli Claude go dodał
    tekst = re.sub(r'^```(?:json)?\s*', '', tekst.strip(), flags=re.MULTILINE)
    tekst = re.sub(r'```\s*$', '', tekst.strip(), flags=re.MULTILINE)
    tekst = tekst.strip()

    # znajdź pierwszy {...} w odpowiedzi
    match = re.search(r'\{[\s\S]*\}', tekst)
    if match:
        return json.loads(match.group())
    return json.loads(tekst)


class ClaudeReceiptService:

    def __init__(self):
        self.client = Anthropic()

    def extract(self, image: bytes) -> Receipt:
        mime = _wykryj_mime(image)
        image64 = base64.b64encode(image).decode("utf-8")

        response = self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            system=(
                "You are a receipt OCR engine. "
                "Output ONLY a single raw JSON object — no markdown, no code fences, no comments. "
                "All text values must be in their original language from the receipt."
            ),
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime,
                                "data": image64,
                            },
                        },
                        {
                            "type": "text",
                            "text": (
                                "Extract all line items from this receipt. "
                                "Return exactly this JSON structure with no extra fields:\n"
                                '{"shop":null,"date":null,"currency":"PLN","total":0.0,'
                                '"products":[{"name":"Product name","quantity":1.0,"price":0.0}]}\n'
                                "Rules:\n"
                                "- products must contain EVERY item on the receipt\n"
                                "- quantity is the number of units (default 1)\n"
                                "- price is the per-item price\n"
                                "- if a field is unknown, use null\n"
                                "Output only the JSON, nothing else."
                            ),
                        },
                    ],
                }
            ],
        )

        raw = response.content[0].text
        data = _wyodrebnij_json(raw)

        # normalizuj products żeby zawsze był lista
        if "products" not in data or not isinstance(data["products"], list):
            data["products"] = []

        for p in data["products"]:
            if "quantity" not in p or p["quantity"] is None:
                p["quantity"] = 1.0
            if "price" not in p or p["price"] is None:
                p["price"] = 0.0

        return Receipt.model_validate(data)
