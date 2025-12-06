import operator
from typing import Annotated, List, Sequence, TypedDict, Union, Any, Dict, Callable
from langchain_gemini import 
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage, FunctionMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END, START
from pydantic import BaseModel

# --- 1. Definicja Stanu ---
# Stan przechowuje historię wiadomości i informację o tym, kto ma działać następny
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    next: str

# --- 2. Fabryka Agentów ---
# Funkcja pomocnicza do tworzenia węzła agenta (Workera)
def create_agent(llm, tools, system_prompt):
    """Tworzy agenta, który wykonuje zadania i zwraca wynik do stanu."""
    
    # Jeśli agent ma narzędzia, bindujemy je
    if tools:
        llm_with_tools = llm.bind_tools(tools)
    else:
        llm_with_tools = llm

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
    ])

    def agent_node(state: AgentState):
        chain = prompt | llm_with_tools
        result = chain.invoke(state)
        # Wynik jest dodawany do historii wiadomości
        return {"messages": [result]}

    return agent_node

# --- 3. Główna Klasa: Dynamiczny System Agentów ---
class ScalableAgentSystem:
    def __init__(self, llm_model: ChatOpenAI):
        self.llm = llm_model
        self.agents = {}  # Słownik przechowujący zarejestrowanych agentów
        self.agent_names = []
        
    def add_agent(self, name: str, description: str, tools: List[Any], system_instructions: str):
        """
        Rejestruje nowego agenta w systemie.
        
        Args:
            name: Unikalna nazwa agenta (używana przez Supervisora).
            description: Opis dla Supervisora, kiedy użyć tego agenta.
            tools: Lista narzędzi dostępnych dla agenta.
            system_instructions: Prompt systemowy dla agenta.
        """
        node_func = create_agent(self.llm, tools, system_instructions)
        self.agents[name] = {
            "node": node_func,
            "description": description
        }
        self.agent_names.append(name)
        print(f"[SYSTEM] Zarejestrowano agenta: {name} ({description})")

    def _create_supervisor(self):
        """Tworzy logikę Meta Supervisora."""
        
        # Definiujemy możliwe wyjścia: nazwy agentów lub KONIEC
        options = ["FINISH"] + self.agent_names
        
        # Definicja struktury decyzji dla LLM (Function Calling)
        class routeResponse(BaseModel):
            next: str

        system_prompt = (
            "Jesteś Meta Supervisorem zarządzającym rozmową między użytkownikiem a wyspecjalizowanymi agentami.\n"
            "Dostępni agenci i ich kompetencje:\n"
            "{members_desc}\n\n"
            "Biorąc pod uwagę prośbę użytkownika, wybierz następnego pracownika do działania.\n"
            "Każdy pracownik wykona zadanie i zwróci wyniki i swój status.\n"
            "Gdy zadanie zostanie wykonane całkowicie, odpowiedz 'FINISH'."
        )
        
        members_description = "\n".join([f"- {name}: {data['description']}" for name, data in self.agents.items()])
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="messages"),
            ("system", "Biorąc pod uwagę powyższą historię, kto powinien działać następny? Wybierz jedną z opcji: {options}")
        ]).partial(options=str(options), members_desc=members_description)

        # Używamy with_structured_output, aby wymusić konkretny wybór
        supervisor_chain = (
            prompt 
            | self.llm.with_structured_output(routeResponse)
        )

        def supervisor_node(state: AgentState):
            result = supervisor_chain.invoke(state)
            # Jeśli LLM zgubi się i zwróci coś spoza listy, domyślnie FINISH
            next_step = result.next if result.next in options else "FINISH"
            return {"next": next_step}

        return supervisor_node

    def build_graph(self):
        """Kompiluje graf LangGraph z dynamicznie dodanymi agentami."""
        workflow = StateGraph(AgentState)
        
        # 1. Dodaj węzeł Supervisora
        supervisor_node = self._create_supervisor()
        workflow.add_node("supervisor", supervisor_node)
        
        # 2. Dodaj węzły Agentów
        for name, agent_data in self.agents.items():
            workflow.add_node(name, agent_data["node"])
            # Każdy agent po wykonaniu pracy wraca do Supervisora
            workflow.add_edge(name, "supervisor")
        
        # 3. Dodaj logikę warunkową (Routing)
        # Mapa mapuje wyjście z supervisora ("next") na węzły w grafie
        conditional_map = {name: name for name in self.agent_names}
        conditional_map["FINISH"] = END
        
        workflow.add_conditional_edges(
            "supervisor",
            lambda x: x["next"],
            conditional_map
        ) 
        
        # 4. Punkt startowy
        workflow.add_edge(START, "supervisor")
        
        return workflow.compile()

# --- 4. Przykładowe Narzędzia (Mock Tools) ---
@tool
def internet_search(query: str):
    """Służy do wyszukiwania informacji w internecie."""
    return f"Wyniki wyszukiwania dla: {query}. LangGraph to biblioteka do budowania agentów..."

@tool
def run_python_code(code: str):
    """Uruchamia kod Pythona do obliczeń."""
    return f"Wykonano kod: {code}. Wynik: 42"

@tool
def generate_image_prompt(description: str):
    """Generuje profesjonalny prompt do generatora obrazów."""
    return f"Midjourney prompt: High quality, 4k image of {description}"

# --- 5. Uruchomienie (Symulacja User Prompt) ---

if __name__ == "__main__":
    # Inicjalizacja LLM (Wymaga ustawionego OPENAI_API_KEY)
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    
    # Inicjalizacja systemu
    system = ScalableAgentSystem(llm)
    
    print("--- Konfiguracja Systemu ---")
    
    # Symulacja: Użytkownik wybiera obszary zainteresowania, a my tworzymy odpowiednich agentów
    # Scenariusz: Użytkownik chce robić research i liczyć, ale nie interesuje go grafika.
    user_interests = ["research", "math"] 
    
    if "research" in user_interests:
        system.add_agent(
            name="Badacz", 
            description="Użyj tego agenta do wyszukiwania informacji, faktów i newsów.", 
            tools=[internet_search], 
            system_instructions="Jesteś ekspertem researchu. Używaj narzędzi wyszukiwania."
        )
        
    if "math" in user_interests:
        system.add_agent(
            name="Analityk",
            description="Użyj tego agenta do obliczeń matematycznych i analizy danych.",
            tools=[run_python_code],
            system_instructions="Jesteś matematykiem. Używaj pythona do obliczeń."
        )

    if "art" in user_interests: # To się nie wykona w tym przykładzie
        system.add_agent(
            name="Artysta",
            description="Użyj tego agenta do generowania opisów obrazów.",
            tools=[generate_image_prompt],
            system_instructions="Jesteś kreatywnym dyrektorem artystycznym."
        )

    # Budowa grafu
    graph = system.build_graph()
    
    #  - Tagged as per instruction context
    
    print("\n--- Rozpoczęcie Rozmowy ---")
    # Zapytanie użytkownika
    user_input = "Znajdź informacje o bibliotece LangGraph, a następnie oblicz ile liter ma jej nazwa pomnożone przez 5."
    
    inputs = {"messages": [HumanMessage(content=user_input)]}
    
    for s in graph.stream(inputs):
        if "__end__" not in s:
            print(s)
            print("----")