#!/usr/bin/env python3
"""
Skrypt do uruchamiania pełnego pipeline'u:
1. Scraping dokumentów z wszystkich źródeł (w tym organisations.json)
2. Chunking dokumentów
3. Zapisywanie do ChromaDB

Użycie:
    python scripts/run_pipeline.py                    # Pełny pipeline
    python scripts/run_pipeline.py --source DE_MAE   # Tylko jedno źródło
    python scripts/run_pipeline.py --test            # Tryb testowy (1 dokument)
    python scripts/run_pipeline.py --stats           # Tylko statystyki
"""

import sys
import asyncio
import logging
import argparse
from pathlib import Path

# Dodaj root projektu do ścieżki
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from services.data_pipeline.scraper import (
    scrape_all_sources,
    scrape_single_source,
    SourceConfig,
    DocumentScraper,
    ScrapedDocument
)
from services.data_pipeline.ingestion import ingest_documents
from services.rag.vector_store import get_vector_store_manager

# Konfiguracja logowania
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(PROJECT_ROOT / "logs" / "pipeline.log", mode='a')
    ]
)
logger = logging.getLogger(__name__)


async def run_full_pipeline(include_json_sources: bool = True) -> dict:
    """
    Uruchamia pełny pipeline scrapingu i ingestion.

    Args:
        include_json_sources: Czy uwzględnić źródła z organisations.json

    Returns:
        Statystyki wykonania
    """
    logger.info("=" * 60)
    logger.info("ROZPOCZYNAM PEŁNY PIPELINE")
    logger.info("=" * 60)

    # 1. Scrapowanie
    logger.info("\n[1/3] SCRAPOWANIE DOKUMENTÓW...")
    documents = await scrape_all_sources(include_json_sources=include_json_sources)
    logger.info(f"Zescrapowano: {len(documents)} dokumentów")

    if not documents:
        logger.warning("Brak dokumentów do przetworzenia!")
        return {"scraped": 0, "chunks": 0, "sources": 0}

    # 2. Ingestion do ChromaDB
    logger.info("\n[2/3] INGESTION DO CHROMADB...")
    vector_store = get_vector_store_manager()

    chunks_added = await ingest_documents(documents, vector_store)
    logger.info(f"Dodano: {chunks_added} chunków do bazy wektorowej")

    # 3. Statystyki
    logger.info("\n[3/3] STATYSTYKI KOŃCOWE...")
    stats = vector_store.get_collection_stats()
    logger.info(f"Kolekcja: {stats['name']}")
    logger.info(f"Łączna liczba chunków: {stats['count']}")

    # Podsumowanie źródeł
    sources_summary = {}
    for doc in documents:
        sources_summary[doc.source] = sources_summary.get(doc.source, 0) + 1

    logger.info("\nPodsumowanie źródeł:")
    for source, count in sorted(sources_summary.items()):
        logger.info(f"  - {source}: {count} dokumentów")

    logger.info("=" * 60)
    logger.info("PIPELINE ZAKOŃCZONY POMYŚLNIE")
    logger.info("=" * 60)

    return {
        "scraped": len(documents),
        "chunks": chunks_added,
        "sources": len(sources_summary),
        "collection_total": stats['count']
    }


async def run_single_source_pipeline(source_code: str) -> dict:
    """
    Uruchamia pipeline dla pojedynczego źródła.

    Args:
        source_code: Kod źródła (np. "NATO", "DE_MAE")

    Returns:
        Statystyki wykonania
    """
    logger.info(f"Uruchamiam pipeline dla źródła: {source_code}")

    documents = await scrape_single_source(source_code)

    if not documents:
        logger.warning(f"Brak dokumentów z {source_code}")
        return {"scraped": 0, "chunks": 0}

    vector_store = get_vector_store_manager()
    chunks_added = await ingest_documents(documents, vector_store)

    stats = vector_store.get_collection_stats()
    logger.info(f"Dodano {chunks_added} chunków. Łącznie w bazie: {stats['count']}")

    return {
        "scraped": len(documents),
        "chunks": chunks_added,
        "collection_total": stats['count']
    }


async def run_test_pipeline() -> dict:
    """
    Tryb testowy - pobiera tylko 1 dokument z pierwszego źródła.

    Returns:
        Statystyki wykonania
    """
    logger.info("TRYB TESTOWY - pobieranie jednego dokumentu")

    # Użyj DE_MAE jako źródło testowe (z organisations.json)
    scraper = DocumentScraper()
    sources = SourceConfig.get_all_sources()

    if not sources:
        logger.error("Brak skonfigurowanych źródeł!")
        return {"scraped": 0, "chunks": 0}

    # Wybierz pierwsze źródło i ogranicz do 1 dokumentu
    test_source = sources[0].copy()
    test_source["max_documents"] = 1
    logger.info(f"Źródło testowe: {test_source['source_code']}")

    try:
        documents = await scraper.scrape_source(test_source)
    finally:
        await scraper.close()

    if not documents:
        logger.warning("Nie udało się pobrać dokumentu testowego")
        return {"scraped": 0, "chunks": 0}

    logger.info(f"Pobrano dokument: {documents[0].title[:60]}...")

    # Ingestion
    vector_store = get_vector_store_manager()
    chunks_added = await ingest_documents(documents, vector_store)

    stats = vector_store.get_collection_stats()
    logger.info(f"Test zakończony. Chunki: {chunks_added}, łącznie w bazie: {stats['count']}")

    return {
        "scraped": 1,
        "chunks": chunks_added,
        "collection_total": stats['count'],
        "test_document": documents[0].title
    }


def show_stats():
    """Wyświetla statystyki bazy wektorowej."""
    vector_store = get_vector_store_manager()

    print("\n" + "=" * 50)
    print("STATYSTYKI BAZY WEKTOROWEJ (ChromaDB)")
    print("=" * 50)

    stats = vector_store.get_collection_stats()
    print(f"Kolekcja: {stats['name']}")
    print(f"Liczba chunków: {stats['count']}")
    print(f"Ścieżka: {stats['persist_path']}")

    # Lista wszystkich źródeł w konfiguracji
    sources = SourceConfig.get_all_sources()
    print(f"\nSkonfigurowane źródła ({len(sources)}):")
    for s in sources:
        print(f"  - {s['source_code']}: {s.get('name_en', s['base_url'])}")

    print("=" * 50 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Uruchom pipeline scrapingu i ingestion do ChromaDB"
    )
    parser.add_argument(
        "--source",
        type=str,
        help="Kod źródła do scrapowania (np. NATO, DE_MAE)"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Tryb testowy (1 dokument)"
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Tylko wyświetl statystyki"
    )
    parser.add_argument(
        "--no-json",
        action="store_true",
        help="Nie uwzględniaj źródeł z organisations.json"
    )

    args = parser.parse_args()

    # Utwórz katalog logs jeśli nie istnieje
    (PROJECT_ROOT / "logs").mkdir(exist_ok=True)

    if args.stats:
        show_stats()
        return

    if args.test:
        result = asyncio.run(run_test_pipeline())
    elif args.source:
        result = asyncio.run(run_single_source_pipeline(args.source))
    else:
        result = asyncio.run(run_full_pipeline(include_json_sources=not args.no_json))

    print(f"\nWynik: {result}")


if __name__ == "__main__":
    main()
