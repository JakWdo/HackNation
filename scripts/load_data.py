"""
Skrypt pierwszego załadowania danych do ChromaDB.

Scrapuje dokumenty z publicznych źródeł i zapisuje do bazy wektorowej.

Usage:
    python scripts/load_data.py
"""

import asyncio
import sys
from pathlib import Path

# Dodaj root do sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.data_pipeline import scrape_all_sources, ingest_documents
from services.rag.vector_store import get_vector_store_manager
import logging

# Konfiguracja loggingu
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def main():
    """Główna funkcja - scraping + ingestion."""
    logger.info("=" * 60)
    logger.info("Rozpoczynam ładowanie danych do ChromaDB")
    logger.info("=" * 60)

    # 1. Scraping
    logger.info("\n📥 KROK 1/3: Scraping dokumentów z publicznych źródeł...")
    try:
        documents = await scrape_all_sources()
        logger.info(f"✅ Zescrapowano {len(documents)} dokumentów")

        if not documents:
            logger.warning("⚠️ Brak dokumentów do ingestion. Sprawdź konfigurację scraper i połączenie z internetem.")
            return

    except Exception as e:
        logger.error(f"❌ Błąd podczas scrapingu: {e}")
        return

    # 2. Ingestion do ChromaDB
    logger.info("\n💾 KROK 2/3: Ingestion do ChromaDB...")
    try:
        vector_store = get_vector_store_manager()
        chunks_added = await ingest_documents(documents, vector_store, batch_size=50)
        logger.info(f"✅ Dodano {chunks_added} chunków do ChromaDB")

    except Exception as e:
        logger.error(f"❌ Błąd podczas ingestion: {e}")
        return

    # 3. Weryfikacja
    logger.info("\n✓ KROK 3/3: Weryfikacja...")
    try:
        stats = vector_store.get_collection_stats()
        logger.info(f"📊 Statystyki ChromaDB:")
        logger.info(f"   - Kolekcja: {stats.get('name', 'N/A')}")
        logger.info(f"   - Liczba dokumentów: {stats.get('count', 0)}")

        if stats.get('count', 0) > 0:
            logger.info("\n🎉 Sukces! Dane zostały załadowane do ChromaDB.")
        else:
            logger.warning("\n⚠️ ChromaDB nadal puste. Sprawdź logi powyżej.")

    except Exception as e:
        logger.error(f"❌ Błąd podczas weryfikacji: {e}")

    logger.info("\n" + "=" * 60)
    logger.info("Zakończono ładowanie danych")
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
