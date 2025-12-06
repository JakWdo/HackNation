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