"""
FastAPI Main - główny entry point aplikacji.

Uruchomienie:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router as api_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title="sedno",
    description="System analizy geopolitycznej stworzony dla MSZ",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS - pozwól na requesty z frontendu
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dołącz router API
app.include_router(api_router)


@app.on_event("startup")
async def startup_event():
    """Event wykonywany przy starcie aplikacji - walidacja systemu."""
    logger.info("=" * 60)
    logger.info("Sedno API - uruchamianie...")
    logger.info("=" * 60)

    # Walidacja ChromaDB
    try:
        from services.rag.vector_store import get_vector_store_manager
        vsm = get_vector_store_manager()
        stats = vsm.get_collection_stats()

        doc_count = stats.get("count", 0)

        if doc_count == 0:
            logger.warning("⚠️  BAZA WEKTOROWA PUSTA!")
            logger.warning("    Załaduj dane używając: python scripts/load_data.py")
        else:
            logger.info(f"✅ ChromaDB: {doc_count} dokumentów gotowych")

    except Exception as e:
        logger.error(f"❌ Błąd sprawdzania ChromaDB: {e}")

    logger.info("=" * 60)
    logger.info("✓ Aplikacja gotowa")
    logger.info("=" * 60)


@app.get("/")
def root():
    """Root endpoint - informacje o API."""
    return {
        "name": "Sedno API",
        "version": "2.0.0",
        "docs": "/docs",
        "endpoints": {
            "analyze": "POST /api/analyze - Rozpocznij analizę",
            "stream": "GET /api/stream/{session_id} - SSE streaming",
            "session": "GET /api/session/{session_id} - Status sesji",
            "regions": "GET /api/regions - Lista regionów",
            "countries": "GET /api/countries - Lista krajów",
        }
    }


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
