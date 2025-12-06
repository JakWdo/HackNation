"""Wrapper LLM z retry logic."""
from typing import List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, AIMessage
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from google.api_core.exceptions import ResourceExhausted, ServiceUnavailable

from core.config import settings


class GeminiLLM:
    def __init__(self, model: str = None, temperature: float = 0.7):
        self.model_name = model or settings.llm_model
        self.temperature = temperature
        self._llm = ChatGoogleGenerativeAI(
            model=self.model_name,
            google_api_key=settings.gemini_api_key,
            temperature=self.temperature,
            convert_system_message_to_human=True,
        )

    @property
    def llm(self) -> ChatGoogleGenerativeAI:
        return self._llm

    @retry(
        retry=retry_if_exception_type((ResourceExhausted, ServiceUnavailable)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=60),
    )
    def invoke(self, messages: List[BaseMessage]) -> AIMessage:
        return self._llm.invoke(messages)


def get_llm(model: str = None, temperature: float = 0.7) -> ChatGoogleGenerativeAI:
    """Zwraca instancję LLM."""
    return GeminiLLM(model=model, temperature=temperature).llm
