# Scenariusze Jutra - Podział Zadań

## Timeline

| Faza | Czas | Cel |
|------|------|-----|
| **TERAZ → 19:00** | 3.5h | Szkic działający E2E |
| **19:00 → 23:00** | 4h | Polish + debugging |
| **Jutro 8:00 → 11:00** | 3h | Final fixes + prezentacja |

### Synchronizacje
- **17:30** - Osoba 1 & 2: test query do ChromaDB
- **18:30** - Osoba 2 & 3: test streaming agentów do UI
- **19:00** - Full E2E test

---

## 👤 OSOBA 1: Data Pipeline (ETL & Vector Store)

**Cel:** ChromaDB z ~500+ dokumentów do 19:00. Baza wiedzy dla agentów.

| # | Task | Plik | Czas | Szczegóły Implementacyjne |
|---|------|------|------|---------------------------|
| 1.1 | Setup ChromaDB + Gemini embeddings | `services/vector_store.py` | 30min | • Inicjalizacja `chromadb.PersistentClient`.<br>• Implementacja wrappera na `google-generativeai` (`models/embedding-001`) lub `langchain-google-genai`.<br>• Funkcje: `add_documents`, `similarity_search`. |
| 1.2 | RSS/Atom scraper (NATO, CSIS, EU, UK) | `scrapers/rss_scraper.py` | 1h | • Użycie biblioteki `feedparser`.<br>• Normalizacja danych: `title`, `link`, `summary`, `published` -> `datetime`.<br>• Deduplikacja po URL.<br>• Obsługa błędów sieciowych (retry). |
| 1.3 | HTML scraper (State, Kiel, DE) | `scrapers/html_scraper.py` | 1h | • Użycie `BeautifulSoup4` + `requests`/`httpx`.<br>• Ekstrakcja głównej treści (pominąć nav/footer).<br>• Selektory CSS specyficzne dla każdej domeny (np. `div.article-content`). |
| 1.4 | Chunker z metadanymi | `services/chunker.py` | 30min | • `RecursiveCharacterTextSplitter` z LangChain.<br>• Chunk size: ~1000 znaków, overlap: 200.<br>• Dołączenie metadanych: źródło, data, kategoria do każdego chunka. |
| 1.5 | Script do uruchomienia | `scripts/ingest.py` | 30min | • Orkiestracja: Pobierz -> Podziel -> Zapisz.<br>• Logowanie postępu (tqdm).<br>• Obsługa argumentów CLI (np. `--source nato`). |

**Źródła do scrapowania:**
- **NATO:** `https://www.nato.int/cps/en/natohq/news.xml` (RSS)
- **EU Commission:** `https://ec.europa.eu/commission/presscorner/rss` (RSS)
- **CSIS:** `https://www.csis.org/analysis/feed` (RSS)
- **UK FCDO:** `https://www.gov.uk/government/organisations/foreign-commonwealth-development-office.atom` (Atom)
- **US State:** `https://www.state.gov/press-releases` (HTML - lista linków -> treść)
- **Kiel Institute:** `https://www.ifw-kiel.de/publications` (HTML)
- **DE Economy:** `https://www.bmwk.de/Navigation/EN/Press` (HTML)

---

## 👤 OSOBA 2: Agent System (LangGraph/LangChain)

**Cel:** Pipeline agentów generujący raport z CLI do 19:00. Logika biznesowa.

| # | Task | Plik | Czas | Szczegóły Implementacyjne |
|---|------|------|------|---------------------------|
| 2.1 | Gemini LLM wrapper | `services/llm.py` | 30min | • Konfiguracja `ChatGoogleGenerativeAI` (model `gemini-1.5-flash` lub `pro`).<br>• Obsługa rate limitów i błędów API.<br>• System prompt templates. |
| 2.2 | Region Agent (EU, USA) | `agents/region_agent.py` | 1h | • Agent skupiony na obszarze geograficznym.<br>• Prompt: "Analizuj wpływ wydarzeń na region X".<br>• Tool: `search_vector_store` (z Osobą 1). |
| 2.3 | Country/Source Agent | `agents/country_agent.py` | 1h | • Analiza specyficzna dla kraju/instytucji (np. "Co mówi NATO?").<br>• Filtrowanie dokumentów po metadanych źródła. |
| 2.4 | Synthesis Agent (raporty) | `agents/synthesis_agent.py` | 45min | • Agregacja outputów od Region/Country agents.<br>• Generowanie 4 sekcji raportu: Polityka, Gospodarka, Obronność, Społeczeństwo.<br>• Formatowanie Markdown. |
| 2.5 | Supervisor update (na Gemini) | `services/supervisor_agent.py` | 45min | • Implementacja w LangGraph.<br>• Graf: Start -> Supervisor -> [Region/Country] -> Synthesis -> End.<br>• Routing zapytań użytkownika do odpowiednich agentów. |

**Flow:** Supervisor (Router) → Region/Country Agents (RAG) → Synthesis (Writer) → 4 raporty sekcyjne

---

## 👤 OSOBA 3: Frontend + Streaming (Next.js & FastAPI)

**Cel:** UI z live reasoning + raportami do 19:00. Wizualizacja procesu.

| # | Task | Plik | Czas | Szczegóły Implementacyjne |
|---|------|------|------|---------------------------|
| 3.1 | FastAPI endpoints | `api/routes.py` | 30min | • Pydantic models dla Request/Response.<br>• CORS middleware.<br>• Dependency injection dla serwisów agentów. |
| 3.2 | SSE streaming | `api/streaming.py` | 1h | • Generator `event_stream()`.<br>• Format SSE: `data: {"type": "log", "content": "..."}`.<br>• Streaming tokenów z LLM oraz statusów ("Agent X myśli..."). |
| 3.3 | React - input form | `frontend/src/components/InputForm.tsx` | 45min | • Formularz z walidacją.<br>• Wybór opcji analizy (np. Region, Zakres dat).<br>• Stylowanie Tailwind CSS. |
| 3.4 | React - live reasoning | `frontend/src/components/ReasoningPanel.tsx` | 1h | • Obsługa `EventSource` / `fetch` ze strumieniowaniem.<br>• Wyświetlanie logów "na żywo" (np. terminal-style).<br>• Auto-scroll. |
| 3.5 | React - raport display | `frontend/src/components/ReportView.tsx` | 30min | • Renderowanie Markdown (`react-markdown`).<br>• Karty dla każdej z 4 sekcji raportu.<br>• Przycisk "Eksportuj PDF" (opcjonalnie). |

**Endpoints:**
- `POST /api/analyze` → payload: `{ query: str, filters: dict }` → zwraca `session_id` (lub stream bezpośrednio)
- `GET /api/stream/{session_id}` → Server-Sent Events z krokami rozumowania agentów
- `GET /api/report/{session_id}` → finalny ustrukturyzowany JSON raportu

---

## Quick Start

```bash
# Instalacja Dependencies
pip install -r requirements.txt
# Utwórz plik .env
echo "GEMINI_API_KEY=your_key_here" > .env

# Osoba 1: Uruchomienie Data Pipeline
python scripts/ingest.py

# Osoba 2: Testy Agentów (CLI)
python -m agents.test_pipeline

# Osoba 3: Uruchomienie Full Stack
# Terminal 1 (Backend)
uvicorn main:app --reload --port 8000
# Terminal 2 (Frontend)
cd frontend && npm install && npm run dev
```