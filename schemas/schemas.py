"""
Schematy Pydantic - modele danych dla API i stanu agentów.
"""
from typing import List, Dict, Any, Optional, Annotated, Sequence
from enum import Enum
from datetime import datetime
import operator
import uuid

from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage


# === ENUMS ===

class RegionCode(str, Enum):
    EU = "EU"
    USA = "USA"
    NATO = "NATO"
    RUSSIA = "RUSSIA"
    ASIA = "ASIA"


class SourceCode(str, Enum):
    NATO = "NATO"
    EU_COMMISSION = "EU_COMMISSION"
    US_STATE = "US_STATE"
    UK_FCDO = "UK_FCDO"
    CSIS = "CSIS"


class ReportSectionType(str, Enum):
    POLITICS = "POLITYKA"
    ECONOMY = "GOSPODARKA"
    DEFENSE = "OBRONNOŚĆ"
    SOCIETY = "SPOŁECZEŃSTWO"


class CredibilityLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    SUSPICIOUS = "suspicious"


class CredibilityScore(BaseModel):
    """Ocena wiarygodności źródła."""
    score: float = Field(..., description="0.0 to 1.0")
    level: CredibilityLevel
    reasoning: str
    verified: bool = False
    flags: List[str] = Field(default_factory=list)


# === STAN AGENTÓW (LangGraph) ===

class AgentState(BaseModel):
    """Stan przepływający przez graf agentów."""
    messages: Annotated[Sequence[BaseMessage], operator.add] = Field(default_factory=list)
    next: str = ""
    region: Optional[str] = None
    country: Optional[str] = None
    source: Optional[str] = None
    context: str = ""
    region_analysis: Optional[Dict[str, Any]] = None
    country_analysis: Optional[Dict[str, Any]] = None
    final_report: Optional[Dict[str, Any]] = None

    class Config:
        arbitrary_types_allowed = True


# === WYNIKI ANALIZY ===

class RegionAnalysis(BaseModel):
    """Wynik analizy regionu."""
    region: str
    summary: str
    key_findings: List[str] = Field(default_factory=list)


class CountryAnalysis(BaseModel):
    """Wynik analizy kraju/źródła."""
    country: Optional[str] = None
    source: str
    official_position: str
    key_statements: List[str] = Field(default_factory=list)
    confidence: float = 0.8


class ExpertAnalysis(BaseModel):
    """Analiza od eksperta do syntezy."""
    agent_name: str
    agent_type: str
    content: str
    confidence: float = 0.8


# === RAPORT ===

class ReportSection(BaseModel):
    """Sekcja raportu."""
    title: str
    content: str
    key_points: List[str] = Field(default_factory=list)


class FullReport(BaseModel):
    """Pełny raport końcowy."""
    title: str
    executive_summary: str
    sections: Dict[str, str] = Field(default_factory=dict)
    generated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    confidence_score: float = 0.0


# === API REQUEST/RESPONSE ===

class AnalyzeRequest(BaseModel):
    """Request do analizy."""
    query: str = Field(..., min_length=3, description="Zapytanie do analizy")
    regions: List[str] = Field(default=["europe"], description="Regiony: europe, asia, africa, americas, oceania lub EU, USA, NATO")
    countries: List[str] = Field(default_factory=list, description="Kody krajów (ISO)")
    sectors: List[str] = Field(default_factory=list, description="Sektory: security, trade, energy, diplomacy, etc.")
    sources: List[str] = Field(default_factory=list)
    weights: Dict[str, float] = Field(default_factory=dict)
    timeframes: List[str] = Field(default=["12m", "36m"])
    include_synthesis: bool = True

    class Config:
        json_schema_extra = {
            "example": {
                "query": "Analiza wpływu kryzysu...",
                "regions": ["europe", "asia"],
                "countries": ["DEU", "POL"],
                "sectors": ["security", "trade"],
                "weights": {"economy": 0.8},
                "timeframes": ["12m"]
            }
        }


class AnalyzeResponse(BaseModel):
    """Response z analizy."""
    session_id: str
    status: str = "processing"
    message: str = "Analiza rozpoczęta"


class SessionStatusResponse(BaseModel):
    """Status sesji."""
    session_id: str
    status: str
    created_at: str
    query: str


class StreamEvent(BaseModel):
    """Event do streamingu - rozszerzony dla features 1.1-1.3."""
    type: str
    agent: Optional[str] = None
    content: str
    timestamp: Optional[str] = None

    # Dodatkowe pola dla różnych typów zdarzeń
    query: Optional[str] = None
    docs: Optional[List[Dict[str, Any]]] = None
    progress: Optional[float] = None
    section: Optional[str] = None
    timeframe: Optional[str] = None
    variant: Optional[str] = None
    title: Optional[str] = None
    confidence: Optional[float] = None
    session_id: Optional[str] = None
    result: Optional[Dict[str, Any]] = None

    # NOWE dla feature 1.1 - Tagowanie
    tagged_info: Optional[List[Dict[str, Any]]] = Field(None, description="Lista InformationUnit jako dict")

    # NOWE dla feature 1.2 - Ścieżka rozumowania
    reasoning_step: Optional[Dict[str, Any]] = Field(None, description="ReasoningStep jako dict")

    # NOWE dla feature 1.3 - Wykresy
    chart_data: Optional[Dict[str, Any]] = Field(None, description="ChartData jako dict")


# === DOKUMENTY ===

class DocumentMetadata(BaseModel):
    """Metadane dokumentu - rozszerzone dla feature 1.2."""
    # Podstawowe pola
    source: str
    date: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    url: Optional[str] = None
    credibility: Optional[CredibilityScore] = None

    # NOWE pola dla feature 1.2 - Ścieżka rozumowania z linkami
    title: str = ""
    snippet: Optional[str] = None  # Fragment tekstu (200-300 znaków) z highlighted terms
    author: Optional[str] = None
    published_date: Optional[str] = None  # ISO format
    document_type: Optional[str] = None  # "report", "article", "statement", etc.
    relevance_score: float = 0.0

    # NOWE dla feature 1.1 - powiązania z tagami
    related_tags: List[str] = Field(default_factory=list)  # Lista ID tagów związanych z tym dokumentem


class SearchResult(BaseModel):
    """Wynik wyszukiwania."""
    content: str
    metadata: DocumentMetadata
    relevance_score: float = 0.0


class InformationUnit(BaseModel):
    """Jednostka informacji - otagowany fakt."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str = Field(..., description="Treść faktu, np. 'Cena ropy Brent: $85/baryłka (2024-11-15)'")
    fact_type: str = Field(..., description="Typ: economic_indicator, political_event, statement, statistic, other")
    source_doc_ids: List[str] = Field(default_factory=list, description="IDs dokumentów źródłowych")
    confidence: float = Field(default=0.8, ge=0.0, le=1.0)
    priority: int = Field(default=2, ge=1, le=3, description="1=high, 2=medium, 3=low")
    timestamp: Optional[str] = None

    # Powiązania z wnioskami/rekomendacjami
    impacts: List[str] = Field(default_factory=list, description="IDs wniosków na które wpływa ten fakt")

    # Metadane dla wizualizacji
    region: Optional[str] = None
    sector: Optional[str] = None
    entities: List[str] = Field(default_factory=list, description="Podmioty, np. ['Russia', 'OPEC', 'oil_price']")


class ReasoningStep(BaseModel):
    """Krok rozumowania w Chain of Thought."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent: str
    agent_type: str = Field(..., description="orchestrator, regional, country, sector, synthesis")
    content: str = Field(..., description="Treść myśli/wniosku")

    # NOWE - powiązania
    source_docs: List[DocumentMetadata] = Field(default_factory=list, description="Dokumenty użyte w tym kroku")
    source_tags: List[str] = Field(default_factory=list, description="IDs tagów (InformationUnit)")
    leads_to: List[str] = Field(default_factory=list, description="IDs następnych kroków rozumowania")

    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    status: str = Field(default="complete", description="thinking, searching, analyzing, complete, error")


class ChartData(BaseModel):
    """Dane do wizualizacji wykresów."""
    chart_type: str = Field(..., description="line, bar, pie, area")
    title: str
    data: List[Dict[str, Any]] = Field(..., description="Format zależny od chart_type")

    # Etykiety osi
    x_axis_label: Optional[str] = None
    y_axis_label: Optional[str] = None
    unit: Optional[str] = Field(None, description="Jednostka: $bn, %, million, etc.")


# === ROUTING ===

class RouteResponse(BaseModel):
    """Odpowiedź supervisora - dokąd dalej."""
    next: str = Field(description="Następny agent lub FINISH")
