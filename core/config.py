"""
Konfiguracja aplikacji - settings, prompts, stałe.
"""
from typing import Optional
from pydantic_settings import BaseSettings


# === SETTINGS ===

class Settings(BaseSettings):
    """Ustawienia aplikacji z .env"""
    gemini_api_key: Optional[str] = None
    llm_model: str = "gemini-2.0-flash"
    hf_token: Optional[str] = None
    debug: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()


# === STAŁE - REGIONY, KRAJE, ŹRÓDŁA ===

REGIONS = {
    "EU": {"name": "Unia Europejska", "countries": ["DE", "FR", "PL"]},
    "USA": {"name": "Stany Zjednoczone", "countries": ["US"]},
    "NATO": {"name": "NATO", "countries": ["członkowie NATO"]},
    "RUSSIA": {"name": "Rosja", "countries": ["RU"]},
    "ASIA": {"name": "Azja-Pacyfik", "countries": ["CN", "JP"]},
}

COUNTRIES = {
    "DE": {"name": "Niemcy", "sources": ["DE_BMWK"]},
    "US": {"name": "USA", "sources": ["US_STATE", "CSIS"]},
    "UK": {"name": "Wielka Brytania", "sources": ["UK_FCDO"]},
    "PL": {"name": "Polska", "sources": []},
    "FR": {"name": "Francja", "sources": []},
    "CN": {"name": "Chiny", "sources": []},
    "JP": {"name": "Japonia", "sources": []},
    "RU": {"name": "Rosja", "sources": []},
}

SOURCES = {
    "NATO": {"name": "NATO", "type": "organization"},
    "EU_COMMISSION": {"name": "Komisja Europejska", "type": "organization"},
    "US_STATE": {"name": "Departament Stanu USA", "type": "government"},
    "UK_FCDO": {"name": "UK Foreign Office", "type": "government"},
    "CSIS": {"name": "CSIS", "type": "think_tank"},
    "DE_BMWK": {"name": "Niemieckie Ministerstwo Gospodarki", "type": "government"},
}


# === PROMPTS ===

REGION_PROMPT = """Jesteś ekspertem ds. analizy geopolitycznej regionu {region}.

Zadania:
1. Analizuj wpływ wydarzeń na region {region}
2. Identyfikuj trendy i zagrożenia
3. Oceniaj relacje między krajami

Kontekst: {context}

Odpowiadaj konkretnie, powołując się na źródła."""

COUNTRY_PROMPT = """Jesteś ekspertem ds. polityki {country}.

Zadania:
1. Analizuj oficjalne stanowisko {country}
2. Identyfikuj kluczowe interesy
3. Śledź wypowiedzi polityków

Źródło: {source}
Kontekst: {context}

Odpowiadaj konkretnie, cytując źródła."""

SYNTHESIS_PROMPT = """Jesteś analitykiem tworzącym raporty strategiczne.

Zadania:
1. Zsyntezuj analizy ekspertów
2. Stwórz raport w 4 sekcjach:
   - POLITYKA
   - GOSPODARKA
   - OBRONNOŚĆ
   - SPOŁECZEŃSTWO

Analizy ekspertów:
{expert_analyses}

Format: Markdown z nagłówkami ##."""

SUPERVISOR_PROMPT = """Jesteś Meta Supervisorem koordynującym analityków.

Dostępni eksperci:
{members_desc}

Zapytanie: {query}

Wybierz następnego eksperta lub FINISH."""
