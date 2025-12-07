"""
Narzędzia dla agentów - połączone z systemem RAG.

Zapewnia wyszukiwanie hybrydowe (vector store + web search)
dla agentów geopolitycznych.
"""
from typing import List, Dict, Any, Optional
import logging

from langchain_core.tools import tool

from core.config import REGIONS
from services.rag.search import HybridSearchService, get_hybrid_search_service, SearchStrategy

logger = logging.getLogger(__name__)


# Singleton dla serwisu wyszukiwania
_search_service: Optional[HybridSearchService] = None


def get_search_service() -> HybridSearchService:
    """Zwraca singleton instancję HybridSearchService."""
    global _search_service
    if _search_service is None:
        _search_service = get_hybrid_search_service()
    return _search_service


@tool
def search_vector_store(
    query: str,
    region: Optional[str] = None,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Przeszukuje bazę wektorową dokumentów geopolitycznych.

    Używa wyszukiwania hybrydowego (vector + web search) dla najlepszych wyników.

    Args:
        query: Zapytanie tekstowe do wyszukania
        region: Opcjonalny filtr regionu (EU, USA, NATO, RUSSIA, ASIA)
        limit: Maksymalna liczba wyników (domyślnie 5)

    Returns:
        Lista słowników z wynikami wyszukiwania zawierająca:
        - content: Treść dokumentu
        - source: Źródło dokumentu
        - region: Region dokumentu
        - country: Kraj dokumentu
        - relevance_score: Ocena trafności (0-1)
        - source_type: Typ źródła (vector_store/web_search)
        - credibility: Ocena wiarygodności
    """
    try:
        service = get_search_service()
        results = service.search(
            query=query,
            n_results=limit,
            region=region,
            strategy=SearchStrategy.HYBRID
        )

        return [r.to_dict() for r in results]

    except Exception as e:
        logger.error(f"Błąd search_vector_store: {e}")
        return [{"error": str(e), "content": f"Błąd wyszukiwania: {query}"}]


@tool
def get_region_info(region_code: str) -> Dict[str, Any]:
    """
    Pobiera informacje o regionie geopolitycznym.

    Args:
        region_code: Kod regionu (EU, USA, NATO, RUSSIA, ASIA)

    Returns:
        Słownik z informacjami o regionie:
        - name: Nazwa regionu
        - countries: Lista krajów w regionie
        - description: Opis regionu
    """
    region_info = REGIONS.get(region_code)

    if region_info:
        return region_info

    return {
        "error": f"Nieznany region: {region_code}",
        "available_regions": list(REGIONS.keys())
    }


@tool
def search_by_source(
    query: str,
    source: str,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Przeszukuje dokumenty z konkretnego źródła.

    Args:
        query: Zapytanie tekstowe
        source: Kod źródła (NATO, EU_COMMISSION, US_STATE, UK_FCDO, CSIS)
        limit: Maksymalna liczba wyników (domyślnie 5)

    Returns:
        Lista dokumentów z danego źródła
    """
    try:
        service = get_search_service()
        results = service.search_by_source(
            query=query,
            source=source,
            n_results=limit
        )

        return [r.to_dict() for r in results]

    except Exception as e:
        logger.error(f"Błąd search_by_source: {e}")
        return [{"error": str(e), "content": f"Błąd wyszukiwania ze źródła {source}"}]


@tool
def search_by_country(
    query: str,
    country: str,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Przeszukuje dokumenty dotyczące konkretnego kraju.

    Args:
        query: Zapytanie tekstowe
        country: Kod kraju ISO (DE, US, PL, FR, CN, JP, RU, UK)
        limit: Maksymalna liczba wyników (domyślnie 5)

    Returns:
        Lista dokumentów dotyczących danego kraju
    """
    try:
        service = get_search_service()
        results = service.search_by_country(
            query=query,
            country=country,
            n_results=limit
        )

        return [r.to_dict() for r in results]

    except Exception as e:
        logger.error(f"Błąd search_by_country: {e}")
        return [{"error": str(e), "content": f"Błąd wyszukiwania dla kraju {country}"}]


@tool
def web_search_realtime(
    query: str,
    limit: int = 3
) -> List[Dict[str, Any]]:
    """
    Wykonuje wyszukiwanie w internecie w czasie rzeczywistym.

    Używa DuckDuckGo do wyszukiwania najnowszych informacji
    niedostępnych w bazie wektorowej.

    Args:
        query: Zapytanie tekstowe
        limit: Maksymalna liczba wyników (domyślnie 3)

    Returns:
        Lista wyników z internetu:
        - content: Treść znaleziona w sieci
        - source: "web_search"
        - relevance_score: Ocena trafności
    """
    try:
        service = get_search_service()
        results = service.web_search_only(
            query=query,
            n_results=limit
        )

        return [r.to_dict() for r in results]

    except Exception as e:
        logger.error(f"Błąd web_search_realtime: {e}")
        return [{"error": str(e), "content": f"Błąd wyszukiwania web: {query}"}]


@tool
def search_hybrid(
    query: str,
    region: Optional[str] = None,
    country: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Wykonuje zaawansowane wyszukiwanie hybrydowe z wieloma filtrami.

    Łączy wyszukiwanie wektorowe z web search dla kompleksowych wyników.

    Args:
        query: Zapytanie tekstowe
        region: Opcjonalny filtr regionu
        country: Opcjonalny filtr kraju
        source: Opcjonalny filtr źródła
        limit: Maksymalna liczba wyników (domyślnie 5)

    Returns:
        Lista wyników z różnych źródeł
    """
    try:
        service = get_search_service()
        results = service.search(
            query=query,
            n_results=limit,
            region=region,
            country=country,
            source=source,
            strategy=SearchStrategy.HYBRID
        )

        return [r.to_dict() for r in results]

    except Exception as e:
        logger.error(f"Błąd search_hybrid: {e}")
        return [{"error": str(e), "content": f"Błąd wyszukiwania hybrydowego"}]


# Lista wszystkich dostępnych narzędzi dla agentów
ALL_TOOLS = [
    search_vector_store,
    get_region_info,
    search_by_source,
    search_by_country,
    web_search_realtime,
    search_hybrid,
]

# Narzędzia dla region_node
REGION_TOOLS = [search_vector_store, get_region_info, web_search_realtime]

# Narzędzia dla country_node
COUNTRY_TOOLS = [search_by_source, search_by_country, web_search_realtime]

# Narzędzia dla synthesis_node
SYNTHESIS_TOOLS = [search_hybrid, web_search_realtime]
