import base64
import json

from anthropic import Anthropic

from ..schemas import Receipt


class ClaudeReceiptService:

    def __init__(self):
        self.client = Anthropic()

    def extract(self, image: bytes) -> Receipt:
        image64 = base64.b64encode(image).decode("utf-8")

        response = self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            system=(
                "You are a receipt extraction engine. "
                "Return ONLY valid JSON. Do not use markdown. Do not explain anything."
            ),
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": image64,
                            },
                        },
                        {
                            "type": "text",
                            "text": (
                                'Read this receipt. Return JSON with exactly this structure:\n'
                                '{"shop":null,"date":null,"currency":null,"total":0,'
                                '"products":[{"name":"","quantity":1,"price":0}]}'
                            ),
                        },
                    ],
                }
            ],
        )

        return Receipt.model_validate(json.loads(response.content[0].text))
