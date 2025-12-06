"""FastAPI - endpointy API."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from schemas.schemas import AnalyzeRequest, AnalyzeResponse
from services.graph import run_analysis

app = FastAPI(title="Scenariusze Jutra", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """Uruchamia analizę geopolityczną."""
    import uuid
    session_id = str(uuid.uuid4())

    # uruchom analizę
    result = run_analysis(
        query=request.query,
        region=request.regions[0].value if request.regions else None,
    )

    return AnalyzeResponse(session_id=session_id, status="completed")


@app.post("/analyze/full")
async def analyze_full(request: AnalyzeRequest):
    """Uruchamia analizę i zwraca pełny wynik."""
    result = run_analysis(
        query=request.query,
        region=request.regions[0].value if request.regions else None,
    )
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
