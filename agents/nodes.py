"""Nodes - agenci jako funkcje dla LangGraph."""
from typing import Dict, Any
from datetime import datetime

from langchain_core.messages import HumanMessage, AIMessage
from langgraph.prebuilt import create_react_agent

from services.llm import get_llm
from core.config import REGIONS, COUNTRIES, SOURCES, REGION_PROMPT, COUNTRY_PROMPT, SYNTHESIS_PROMPT
from schemas.schemas import RegionAnalysis, CountryAnalysis, ExpertAnalysis, FullReport, ReportSectionType
from services.tools import search_vector_store, get_region_info, search_by_source, search_by_country


# === REGION NODE ===

async def region_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Analizuje region geopolityczny."""
    messages = state.get("messages", [])
    query = messages[-1].content if messages else ""
    region = state.get("region", "EU")
    context = state.get("context", "")

    region_info = REGIONS.get(region, {})
    prompt = REGION_PROMPT.format(region=region_info.get("name", region), context=context)

    llm = get_llm(temperature=0.3)
    agent = create_react_agent(model=llm, tools=[search_vector_store, get_region_info])

    result = await agent.ainvoke({"messages": [HumanMessage(content=f"{prompt}\n\nZapytanie: {query}")]})
    summary = result["messages"][-1].content

    analysis = RegionAnalysis(region=region, summary=summary)

    return {
        "messages": messages + [AIMessage(content=summary)],
        "region_analysis": analysis.model_dump(),
    }


# === COUNTRY NODE ===

async def country_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Analizuje kraj/źródło."""
    messages = state.get("messages", [])
    query = messages[-1].content if messages else ""
    country = state.get("country")
    source = state.get("source", "NATO")
    context = state.get("context", "")

    country_name = COUNTRIES.get(country, {}).get("name", country) if country else "nieznany"
    source_name = SOURCES.get(source, {}).get("name", source)

    prompt = COUNTRY_PROMPT.format(country=country_name, source=source_name, context=context)

    llm = get_llm(temperature=0.3)
    agent = create_react_agent(model=llm, tools=[search_by_source, search_by_country])

    result = await agent.ainvoke({"messages": [HumanMessage(content=f"{prompt}\n\nZapytanie: {query}")]})
    position = result["messages"][-1].content

    analysis = CountryAnalysis(country=country, source=source, official_position=position)

    return {
        "messages": messages + [AIMessage(content=position)],
        "country_analysis": analysis.model_dump(),
    }


# === SYNTHESIS NODE ===

async def synthesis_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Tworzy raport końcowy z analiz."""
    messages = state.get("messages", [])
    query = messages[0].content if messages else ""

    # zbierz analizy ekspertów
    expert_analyses = []
    if state.get("region_analysis"):
        ra = state["region_analysis"]
        expert_analyses.append(ExpertAnalysis(
            agent_name=f"Region: {ra.get('region', '?')}",
            agent_type="region",
            content=ra.get("summary", ""),
        ))
    if state.get("country_analysis"):
        ca = state["country_analysis"]
        expert_analyses.append(ExpertAnalysis(
            agent_name=f"Kraj: {ca.get('source', '?')}",
            agent_type="country",
            content=ca.get("official_position", ""),
        ))

    expert_text = "\n---\n".join([f"### {a.agent_name}\n{a.content}" for a in expert_analyses])
    prompt = SYNTHESIS_PROMPT.format(expert_analyses=expert_text)

    llm = get_llm(temperature=0.5)
    agent = create_react_agent(model=llm, tools=[])

    result = await agent.ainvoke({"messages": [HumanMessage(content=f"{prompt}\n\nZapytanie: {query}")]})
    content = result["messages"][-1].content

    avg_confidence = sum(a.confidence for a in expert_analyses) / max(len(expert_analyses), 1)

    report = FullReport(
        title=f"Raport: {query[:50]}",
        executive_summary=content,
        sections={s.value: "" for s in ReportSectionType},
        confidence_score=avg_confidence,
    )

    return {
        "messages": messages + [AIMessage(content=content)],
        "final_report": report.model_dump(),
    }


def report_to_markdown(report: FullReport) -> str:
    """Konwertuje raport do Markdown."""
    md = f"# {report.title}\n\n"
    md += f"*{report.generated_at}* | Pewność: {report.confidence_score:.0%}\n\n"
    md += f"## Podsumowanie\n\n{report.executive_summary}\n"
    return md
