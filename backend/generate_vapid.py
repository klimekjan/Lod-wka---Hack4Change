"""
Generuje parę kluczy VAPID i wypisuje gotowe linie do .env

Użycie (z katalogu backend/):
    python generate_vapid.py
"""
import base64
from py_vapid import Vapid
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

vapid = Vapid()
vapid.generate_keys()

# Private key: raw 32-byte big-endian scalar (P-256)
priv_raw = vapid.private_key.private_numbers().private_value.to_bytes(32, "big")
priv_b64 = base64.urlsafe_b64encode(priv_raw).rstrip(b"=").decode()

# Public key: uncompressed point (0x04 || x || y), 65 bytes
pub_raw = vapid.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
pub_b64 = base64.urlsafe_b64encode(pub_raw).rstrip(b"=").decode()

print("=" * 60)
print("Wklej do backend/.env:")
print(f"VAPID_PRIVATE_KEY={priv_b64}")
print(f"VAPID_PUBLIC_KEY={pub_b64}")
print()
print("Wklej do frontend (np. sw.ts lub push-setup):")
print(f"const VAPID_PUBLIC_KEY = '{pub_b64}'")
print("=" * 60)
