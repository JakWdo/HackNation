"""Graf LangGraph - supervisor i workflow."""
from typing import Dict, Any, List

from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langgraph.graph import StateGraph, START, END

from services.llm import get_llm
from core.config import SUPERVISOR_PROMPT
from schemas.schemas import RouteResponse
from agents.nodes import region_node, country_node, synthesis_node


# dostępni agenci
AGENTS = {
    "region_agent": {"node": region_node, "desc": "Analiza regionów (EU, USA, NATO)"},
    "country_agent": {"node": country_node, "desc": "Analiza krajów i źródeł"},
    "synthesis_agent": {"node": synthesis_node, "desc": "Tworzenie raportów końcowych"},
}


def create_supervisor_node():
    """Tworzy node supervisora decydującego o routingu."""
    llm = get_llm(temperature=0.3)
    options = ["FINISH"] + list(AGENTS.keys())
    members_desc = "\n".join([f"- {name}: {data['desc']}" for name, data in AGENTS.items()])

    prompt = ChatPromptTemplate.from_messages([
        ("system", SUPERVISOR_PROMPT),
        MessagesPlaceholder(variable_name="messages"),
        ("system", f"Wybierz: {options}"),
    ])

    chain = prompt | llm.with_structured_output(RouteResponse)

    def supervisor_node(state: Dict[str, Any]) -> Dict[str, Any]:
        messages = state.get("messages", [])
        query = messages[0].content if messages else ""
        result = chain.invoke({"messages": messages, "members_desc": members_desc, "query": query})
        next_step = result.next if result.next in options else "FINISH"
        print(f"[SUPERVISOR] -> {next_step}")
        return {"next": next_step}

    return supervisor_node


def build_graph() -> StateGraph:
    """Buduje graf agentów."""
    # stan jako dict (TypedDict pattern)
    from typing import TypedDict, Annotated, Sequence
    from langchain_core.messages import BaseMessage
    import operator

    class GraphState(TypedDict):
        messages: Annotated[Sequence[BaseMessage], operator.add]
        next: str
        region: str | None
        country: str | None
        source: str | None
        context: str
        region_analysis: Dict[str, Any] | None
        country_analysis: Dict[str, Any] | None
        final_report: Dict[str, Any] | None

    workflow = StateGraph(GraphState)

    # dodaj supervisor
    workflow.add_node("supervisor", create_supervisor_node())

    # dodaj agentów
    for name, data in AGENTS.items():
        workflow.add_node(name, data["node"])
        workflow.add_edge(name, "supervisor")

    # routing
    conditional_map = {name: name for name in AGENTS.keys()}
    conditional_map["FINISH"] = END
    workflow.add_conditional_edges("supervisor", lambda x: x["next"], conditional_map)
    workflow.add_edge(START, "supervisor")

    return workflow.compile()


def run_analysis(query: str, region: str = None, country: str = None, source: str = None, context: str = "") -> Dict[str, Any]:
    """Uruchamia pełną analizę."""
    graph = build_graph()
    initial_state = {
        "messages": [HumanMessage(content=query)],
        "next": "",
        "region": region,
        "country": country,
        "source": source,
        "context": context,
        "region_analysis": None,
        "country_analysis": None,
        "final_report": None,
    }
    return graph.invoke(initial_state)
