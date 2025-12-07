"""
Web Search Engine - wyszukiwanie w internecie.

Używa DuckDuckGo do wyszukiwania informacji w czasie rzeczywistym.
Przetwarzanie dokumentów i baza wektorowa przeniesione do services/rag/.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
import re

from langchain_community.tools import DuckDuckGoSearchRun

logger = logging.getLogger(__name__)


class WebSearchEngine:
    """
    Serwis wyszukiwania w internecie.

    Używa DuckDuckGo Search API do wyszukiwania informacji
    w czasie rzeczywistym.
    """

    def __init__(self):
        """Inicjalizuje WebSearchEngine z DuckDuckGo."""
        self.search = DuckDuckGoSearchRun()
        logger.info("WebSearchEngine zainicjalizowany (DuckDuckGo)")

    def search_web(self, query: str) -> str:
        """
        Wykonuje wyszukiwanie w internecie.

        Args:
            query: Zapytanie tekstowe

        Returns:
            Tekst z wynikami wyszukiwania
        """
        if not query or not query.strip():
            logger.warning("Próba wyszukiwania z pustym zapytaniem")
            return ""

        try:
            result = self.search.run(query)
            logger.debug(f"Web search dla '{query[:50]}...': {len(result)} znaków")
            return result
        except Exception as e:
            logger.error(f"Błąd web search: {e}")
            return ""

    def search_web_for_rag(self, query: str) -> List[Dict[str, Any]]:
        """
        Wyszukuje w internecie i zwraca listę dokumentów z metadanymi dla RAG.

        Args:
            query: Zapytanie tekstowe

        Returns:
            Lista słowników z polami: url, title, content, date, snippet
        """
        result = self.search_web(query)

        if not result:
            return []

        # Podziel wynik na fragmenty
        fragments = self._split_into_fragments(result)

        # Wyciągnij URL-e z wyniku
        urls = self.get_search_urls(query)

        # Parsuj fragmenty na dokumenty z metadanymi
        documents = []
        for idx, fragment in enumerate(fragments):
            # Każdy fragment to osobny dokument
            url = urls[idx] if idx < len(urls) else None
            title = self._extract_title_from_fragment(fragment)

            documents.append({
                "url": url,
                "title": title,
                "content": fragment,
                "snippet": fragment[:200],  # Pierwsze 200 znaków jako snippet
                "date": datetime.now().isoformat(),  # Web search nie ma konkretnej daty
                "source": "web_search"
            })

        return documents

    def get_search_urls(self, query: str) -> List[str]:
        """
        Wyszukuje i ekstrahuje URL-e z wyników.

        Args:
            query: Zapytanie tekstowe

        Returns:
            Lista znalezionych URL-i
        """
        result = self.search_web(query)

        if not result:
            return []

        # Regex do znajdowania URL-i
        url_pattern = r'https?://[^\s<>"\']+|www\.[^\s<>"\']+'
        urls = re.findall(url_pattern, result)

        # Deduplikacja i walidacja
        unique_urls = []
        for url in urls:
            # Wyczyść URL z trailing znaków
            url = url.rstrip('.,;:!?)')

            if url.startswith(("http://", "https://", "www.")):
                if url not in unique_urls:
                    unique_urls.append(url)

        return unique_urls

    def _split_into_fragments(
        self,
        text: str,
        max_fragment_length: int = 1000
    ) -> List[str]:
        """
        Dzieli tekst na fragmenty.

        Args:
            text: Tekst do podziału
            max_fragment_length: Maksymalna długość fragmentu

        Returns:
            Lista fragmentów
        """
        if not text:
            return []

        # Najpierw podziel po podwójnych newline'ach
        paragraphs = text.split('\n\n')

        fragments = []
        current_fragment = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if len(current_fragment) + len(para) + 2 <= max_fragment_length:
                if current_fragment:
                    current_fragment += "\n\n"
                current_fragment += para
            else:
                if current_fragment:
                    fragments.append(current_fragment)
                current_fragment = para

        if current_fragment:
            fragments.append(current_fragment)

        # Jeśli brak fragmentów, zwróć cały tekst jako jeden fragment
        if not fragments:
            fragments = [text[:max_fragment_length]]

        return fragments

    def _extract_title_from_fragment(self, fragment: str) -> str:
        """
        Próbuje wyciągnąć tytuł z fragmentu tekstu.

        Args:
            fragment: Fragment tekstu

        Returns:
            Tytuł (pierwsze zdanie lub pierwsze 60 znaków)
        """
        if not fragment:
            return "Web Search Result"

        # Pierwsze zdanie (max 100 znaków)
        first_line = fragment.split('\n')[0].strip()

        if len(first_line) > 100:
            return first_line[:97] + "..."

        return first_line if first_line else "Web Search Result"


# Singleton instancja
_web_search_engine: WebSearchEngine = None


def get_web_search_engine() -> WebSearchEngine:
    """Zwraca singleton instancję WebSearchEngine."""
    global _web_search_engine
    if _web_search_engine is None:
        _web_search_engine = WebSearchEngine()
    return _web_search_engine


# Dla kompatybilności wstecznej
if __name__ == '__main__':
    # Test
    engine = WebSearchEngine()

    print("--- Testing search_web ---")
    query = "current weather in London"
    result = engine.search_web(query)
    print(f"Query: {query}\nResult: {result[:500]}...")

    print("\n--- Testing search_web_for_rag ---")
    query = "latest AI advancements 2024"
    fragments = engine.search_web_for_rag(query)
    print(f"Query: {query}")
    for i, fragment in enumerate(fragments[:3]):
        print(f"Fragment {i + 1}:\n{fragment[:300]}...")

    print("\n--- Testing get_search_urls ---")
    query = "best AI research papers 2024"
    urls = engine.get_search_urls(query)
    print(f"Query: {query}")
    for i, url in enumerate(urls[:5]):
        print(f"URL {i + 1}: {url}")
