"""
Data pipeline module - scraping i ingestion do ChromaDB.
"""

from .scraper import scrape_all_sources, ScrapedDocument, SourceConfig, DocumentScraper
from .ingestion import ingest_documents

__all__ = [
    "scrape_all_sources",
    "ScrapedDocument",
    "SourceConfig",
    "DocumentScraper",
    "ingest_documents"
]
