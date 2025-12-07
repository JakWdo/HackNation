"""
Pipeline ingestion: ScrapedDocument → ChromaDB.

Przetwarza zescrapowane dokumenty, dzieli na chunki, tworzy embeddingi
i zapisuje do bazy wektorowej ChromaDB.
"""

from typing import List
import logging
import hashlib

from services.rag.text_processor import DocumentProcessor
from services.rag.vector_store import VectorStoreManager
from schemas.schemas import DocumentMetadata, CredibilityScore, CredibilityLevel
from .scraper import ScrapedDocument

logger = logging.getLogger(__name__)


async def ingest_documents(
    documents: List[ScrapedDocument],
    vector_store: VectorStoreManager,
    batch_size: int = 50
) -> int:
    """
    Ingestuje dokumenty do ChromaDB.

    Args:
        documents: Lista zescrapowanych dokumentów
        vector_store: Instancja VectorStoreManager
        batch_size: Rozmiar batcha dla dodawania chunków

    Returns:
        Liczba dodanych chunków
    """
    processor = DocumentProcessor(chunk_size=1000, chunk_overlap=200)
    total_chunks = 0

    logger.info(f"Rozpoczynam ingestion {len(documents)} dokumentów...")

    for idx, doc in enumerate(documents, 1):
        try:
            # Twórz metadata
            metadata = DocumentMetadata(
                source=doc.source,
                date=doc.date,
                region=doc.region,
                country=doc.country,
                url=doc.url,
                title=doc.title,
                document_type=doc.document_type,
                credibility=_evaluate_source_credibility(doc.source)
            )

            # Przetwarzaj dokument na chunki
            chunks = processor.process_document(
                content=doc.content,
                metadata=metadata,
                document_id=_generate_doc_id(doc.url)
            )

            if chunks:
                # Dodaj do ChromaDB
                added = vector_store.add_chunks(
                    chunks,
                    batch_size=batch_size
                )
                total_chunks += added
                logger.debug(f"[{idx}/{len(documents)}] Dodano {added} chunków: {doc.title[:50]}...")
            else:
                logger.warning(f"[{idx}/{len(documents)}] Brak chunków dla: {doc.url}")

        except Exception as e:
            logger.error(f"Błąd ingestion dokumentu {doc.url}: {e}")
            continue

    logger.info(f"Ingestion zakończona. Dodano {total_chunks} chunków.")
    return total_chunks


def _generate_doc_id(url: str) -> str:
    """
    Generuje unikalny ID dokumentu z URL.

    Args:
        url: URL dokumentu

    Returns:
        16-znakowy hash SHA1
    """
    return hashlib.sha1(url.encode()).hexdigest()[:16]


def _evaluate_source_credibility(source: str) -> CredibilityScore:
    """
    Ocenia wiarygodność źródła.

    Args:
        source: Kod źródła (NATO, EU_COMMISSION, etc.)

    Returns:
        CredibilityScore z oceną wiarygodności
    """
    # Źródła o wysokiej wiarygodności (oficjalne rządowe/międzynarodowe)
    high_credibility_sources = [
        "NATO",
        "EU_COMMISSION",
        "US_STATE",
        "UK_FCDO",
        "UN",
    ]

    # Prefiksy ministerstw krajowych (oficjalne rządowe)
    # Format: XX_YYY gdzie XX = kod kraju, np. DE_MAE, PL_MSZ, FR_MAE
    ministry_prefixes = ["DE_", "PL_", "FR_", "UK_", "US_", "IT_", "ES_", "NL_", "BE_", "AT_"]

    # Źródła o średniej wiarygodności (think tanki)
    medium_credibility_sources = [
        "CSIS",
        "CHATHAM_HOUSE",
        "BROOKINGS"
    ]

    # Sprawdź czy to ministerstwo krajowe (wysoka wiarygodność)
    is_ministry = any(source.startswith(prefix) for prefix in ministry_prefixes)

    if source in high_credibility_sources or is_ministry:
        return CredibilityScore(
            score=0.95,
            level=CredibilityLevel.HIGH,
            reasoning=f"Oficjalne źródło rządowe/międzynarodowe: {source}",
            verified=True,
            flags=[]
        )
    elif source in medium_credibility_sources:
        return CredibilityScore(
            score=0.75,
            level=CredibilityLevel.MEDIUM,
            reasoning=f"Renomowany think tank: {source}",
            verified=True,
            flags=[]
        )
    else:
        return CredibilityScore(
            score=0.60,
            level=CredibilityLevel.MEDIUM,
            reasoning=f"Źródło zewnętrzne: {source}",
            verified=False,
            flags=["needs_verification"]
        )
