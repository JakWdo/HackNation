"""
Hybrid Search - łączenie wyszukiwania wektorowego z web search.

Obsługuje różne strategie wyszukiwania dla systemu RAG.
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import logging

from .vector_store import VectorStoreManager, get_vector_store_manager
from .embeddings import EmbeddingService
from services.web_search_engine import WebSearchEngine
from services.security import get_security_service
from schemas.schemas import DocumentMetadata

logger = logging.getLogger(__name__)


class SearchStrategy(str, Enum):
    """Strategie wyszukiwania."""

    VECTOR_ONLY = "vector_only"      # Tylko baza wektorowa
    WEB_ONLY = "web_only"            # Tylko web search
    HYBRID = "hybrid"                # Vector + web search
    FALLBACK = "fallback"            # Vector, web jako fallback gdy brak wyników


@dataclass
class HybridSearchResult:
    """Wynik wyszukiwania hybrydowego."""

    content: str
    metadata: DocumentMetadata
    relevance_score: float
    source_type: str  # "vector_store" | "web_search"

    def to_dict(self) -> Dict[str, Any]:
        """Konwertuje wynik do słownika."""
        return {
            "content": self.content,
            "source": self.metadata.source,
            "region": self.metadata.region,
            "country": self.metadata.country,
            "url": self.metadata.url,
            "date": self.metadata.date,
            "credibility": self.metadata.credibility.model_dump() if self.metadata.credibility else None,
            "relevance_score": self.relevance_score,
            "source_type": self.source_type,
        }


class HybridSearchService:
    """
    Serwis łączący wyszukiwanie wektorowe z web search.

    Obsługuje różne strategie:
    - vector_only: Tylko baza wektorowa (ChromaDB)
    - web_only: Tylko web search (DuckDuckGo)
    - hybrid: Kombinacja obu źródeł
    - fallback: Vector search z web search jako fallback
    """

    def __init__(
        self,
        vector_store: Optional[VectorStoreManager] = None,
        web_search: Optional[WebSearchEngine] = None,
        embedding_service: Optional[EmbeddingService] = None
    ):
        """
        Inicjalizuje HybridSearchService.

        Args:
            vector_store: Manager bazy wektorowej (opcjonalny)
            web_search: Serwis web search (opcjonalny)
            embedding_service: Serwis embeddingów (opcjonalny)
        """
        self._embedding_service = embedding_service or EmbeddingService()
        self._vector_store = vector_store or get_vector_store_manager()
        self._web_search = web_search or WebSearchEngine()
        self._security_service = get_security_service()

        logger.info("HybridSearchService zainicjalizowany")

    def search(
        self,
        query: str,
        n_results: int = 5,
        region: Optional[str] = None,
        country: Optional[str] = None,
        source: Optional[str] = None,
        strategy: str = "hybrid",
        min_relevance: float = 0.3,
        web_results_ratio: float = 0.3
    ) -> List[HybridSearchResult]:
        """
        Główna metoda wyszukiwania.

        Args:
            query: Tekst zapytania
            n_results: Liczba wyników do zwrócenia
            region: Filtr regionu (EU, USA, NATO, RUSSIA, ASIA)
            country: Filtr kraju (DE, US, PL, etc.)
            source: Filtr źródła (NATO, EU_COMMISSION, etc.)
            strategy: Strategia wyszukiwania
            min_relevance: Minimalny próg relevance score
            web_results_ratio: Proporcja wyników z web search w trybie hybrid

        Returns:
            Lista HybridSearchResult posortowana po relevance_score
        """
        results: List[HybridSearchResult] = []

        # 1. Wyszukiwanie wektorowe
        if strategy in [SearchStrategy.VECTOR_ONLY, SearchStrategy.HYBRID, SearchStrategy.FALLBACK]:
            vector_results = self._search_vector_store(
                query=query,
                n_results=n_results,
                region=region,
                country=country,
                source=source
            )
            results.extend(vector_results)

        # 2. Web search
        if strategy == SearchStrategy.WEB_ONLY:
            web_results = self._search_web(query, n_results)
            results.extend(web_results)

        elif strategy == SearchStrategy.HYBRID:
            # Dodaj web results proporcjonalnie
            web_count = max(1, int(n_results * web_results_ratio))
            web_results = self._search_web(query, web_count)
            results.extend(web_results)

        elif strategy == SearchStrategy.FALLBACK and len(results) < n_results:
            # Web search jako fallback gdy brak wyników z vector store
            missing = n_results - len(results)
            web_results = self._search_web(query, missing)
            results.extend(web_results)

        # 3. Filtruj po min_relevance i sortuj
        results = [r for r in results if r.relevance_score >= min_relevance]
        results.sort(key=lambda x: x.relevance_score, reverse=True)

        # 4. Deduplikacja (usuwanie duplikatów po treści)
        seen_content = set()
        unique_results = []
        for r in results:
            content_hash = hash(r.content[:200])  # Hash pierwszych 200 znaków
            if content_hash not in seen_content:
                seen_content.add(content_hash)
                unique_results.append(r)

        return unique_results[:n_results]

    def search_by_region(
        self,
        query: str,
        region: str,
        n_results: int = 5
    ) -> List[HybridSearchResult]:
        """Wyszukuje dokumenty dla konkretnego regionu."""
        return self.search(
            query=query,
            n_results=n_results,
            region=region,
            strategy=SearchStrategy.VECTOR_ONLY
        )

    def search_by_country(
        self,
        query: str,
        country: str,
        n_results: int = 5
    ) -> List[HybridSearchResult]:
        """Wyszukuje dokumenty dla konkretnego kraju."""
        return self.search(
            query=query,
            n_results=n_results,
            country=country,
            strategy=SearchStrategy.VECTOR_ONLY
        )

    def search_by_source(
        self,
        query: str,
        source: str,
        n_results: int = 5
    ) -> List[HybridSearchResult]:
        """Wyszukuje dokumenty z konkretnego źródła."""
        return self.search(
            query=query,
            n_results=n_results,
            source=source,
            strategy=SearchStrategy.VECTOR_ONLY
        )

    def web_search_only(
        self,
        query: str,
        n_results: int = 5
    ) -> List[HybridSearchResult]:
        """Wyszukuje tylko w internecie (real-time)."""
        return self.search(
            query=query,
            n_results=n_results,
            strategy=SearchStrategy.WEB_ONLY
        )

    def _search_vector_store(
        self,
        query: str,
        n_results: int,
        region: Optional[str] = None,
        country: Optional[str] = None,
        source: Optional[str] = None
    ) -> List[HybridSearchResult]:
        """Wyszukiwanie w bazie wektorowej z filtrowaniem."""
        # Buduj filtr where
        where_conditions = []

        if region:
            where_conditions.append({"region": region})
        if country:
            where_conditions.append({"country": country})
        if source:
            where_conditions.append({"source": source})

        where = None
        if len(where_conditions) == 1:
            where = where_conditions[0]
        elif len(where_conditions) > 1:
            where = {"$and": where_conditions}

        try:
            raw_results = self._vector_store.query(
                query_text=query,
                n_results=n_results,
                where=where
            )

            results = []

            if raw_results["documents"] and raw_results["documents"][0]:
                for i, doc in enumerate(raw_results["documents"][0]):
                    # Pobierz metadane
                    metadata_dict = {}
                    if raw_results.get("metadatas") and raw_results["metadatas"][0]:
                        metadata_dict = raw_results["metadatas"][0][i]

                    # Oblicz relevance score (1 - distance dla cosine)
                    distance = 1.0
                    if raw_results.get("distances") and raw_results["distances"][0]:
                        distance = raw_results["distances"][0][i]

                    relevance = max(0.0, min(1.0, 1.0 - distance))

                    # Ocena wiarygodności
                    source_name = metadata_dict.get("source", "unknown")
                    url = metadata_dict.get("url")
                    credibility = self._security_service.evaluate_credibility(source_name, url, doc)

                    results.append(HybridSearchResult(
                        content=doc,
                        metadata=DocumentMetadata(
                            source=source_name,
                            date=metadata_dict.get("date"),
                            region=metadata_dict.get("region"),
                            country=metadata_dict.get("country"),
                            url=url,
                            credibility=credibility
                        ),
                        relevance_score=relevance,
                        source_type="vector_store"
                    ))

            logger.debug(f"Vector search: {len(results)} wyników dla '{query[:50]}...'")
            return results

        except Exception as e:
            logger.error(f"Błąd wyszukiwania wektorowego: {e}")
            return []

    def _search_web(
        self,
        query: str,
        n_results: int
    ) -> List[HybridSearchResult]:
        """Wyszukiwanie w internecie (DuckDuckGo)."""
        try:
            raw_results = self._web_search.search_web_for_rag(query)

            results = []
            for i, doc in enumerate(raw_results[:n_results]):
                # Web search ma niższy base score (0.6) malejący z pozycją
                relevance = max(0.3, 0.6 - (i * 0.05))

                # Wyciągnij pola ze słownika
                content = doc.get("content", "")
                url = doc.get("url")
                title = doc.get("title", "")
                date = doc.get("date")

                # Ocena wiarygodności dla wyników z web search
                credibility = self._security_service.evaluate_credibility(
                    "web_search",
                    url,
                    content
                )

                results.append(HybridSearchResult(
                    content=content,
                    metadata=DocumentMetadata(
                        source="web_search",
                        region=None,
                        country=None,
                        url=url,
                        title=title,
                        date=date,
                        credibility=credibility
                    ),
                    relevance_score=relevance,
                    source_type="web_search"
                ))

            logger.debug(f"Web search: {len(results)} wyników dla '{query[:50]}...'")
            return results

        except Exception as e:
            logger.error(f"Błąd web search: {e}")
            return []

    def get_stats(self) -> Dict[str, Any]:
        """Zwraca statystyki serwisu."""
        vector_stats = self._vector_store.get_collection_stats()
        embedding_stats = self._embedding_service.get_cache_stats()

        return {
            "vector_store": vector_stats,
            "embedding_cache": embedding_stats,
        }


# Singleton instancja
_hybrid_search_service: Optional[HybridSearchService] = None


def get_hybrid_search_service() -> HybridSearchService:
    """Zwraca singleton instancję HybridSearchService."""
    global _hybrid_search_service
    if _hybrid_search_service is None:
        _hybrid_search_service = HybridSearchService()
    return _hybrid_search_service
