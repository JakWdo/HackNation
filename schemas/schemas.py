"""
Schematy Pydantic - modele danych dla API i stanu agentów.
"""
from typing import List, Dict, Any, Optional, Annotated, Sequence
from enum import Enum
from datetime import datetime
import operator

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
    regions: List[RegionCode] = Field(default=[RegionCode.EU])
    sources: List[SourceCode] = Field(default_factory=list)
    include_synthesis: bool = True


class AnalyzeResponse(BaseModel):
    """Response z analizy."""
    session_id: str
    status: str = "processing"


class StreamEvent(BaseModel):
    """Event do streamingu."""
    type: str
    agent: Optional[str] = None
    content: str
    timestamp: Optional[str] = None


# === DOKUMENTY ===

class DocumentMetadata(BaseModel):
    """Metadane dokumentu."""
    source: str
    date: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    url: Optional[str] = None


class SearchResult(BaseModel):
    """Wynik wyszukiwania."""
    content: str
    metadata: DocumentMetadata
    relevance_score: float = 0.0


# === ROUTING ===

class RouteResponse(BaseModel):
    """Odpowiedź supervisora - dokąd dalej."""
    next: str = Field(description="Następny agent lub FINISH")
