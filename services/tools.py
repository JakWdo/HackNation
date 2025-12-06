"""Narzędzia dla agentów - wyszukiwanie w bazie."""
from typing import List, Dict, Any
from langchain_core.tools import tool

from core.config import REGIONS


@tool
def search_vector_store(query: str, region: str = None, limit: int = 5) -> List[Dict[str, Any]]:
    """Przeszukuje bazę wektorową dokumentów."""
    # TODO: integracja z ChromaDB
    return [{"content": f"[Placeholder] {query}", "source": "NATO", "region": region or "EU"}]


@tool
def get_region_info(region_code: str) -> Dict[str, Any]:
    """Pobiera informacje o regionie."""
    return REGIONS.get(region_code, {"error": f"Nieznany region: {region_code}"})


@tool
def search_by_source(query: str, source: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Przeszukuje dokumenty po źródle (NATO, EU, etc.)."""
    # TODO: integracja z ChromaDB
    return [{"content": f"[Placeholder] {query}", "source": source}]


@tool
def search_by_country(query: str, country: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Przeszukuje dokumenty dla danego kraju."""
    # TODO: integracja z ChromaDB
    return [{"content": f"[Placeholder] {query}", "country": country}]
