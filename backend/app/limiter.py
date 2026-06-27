"""Wspoldzielona instancja rate-limitera (slowapi).

Jedna instancja uzywana zarowno przez dekoratory `@limiter.limit(...)` w routerach,
jak i przez `app.state.limiter` w main.py — inaczej limity nie sa egzekwowane.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
