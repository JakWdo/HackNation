# 📊 Scenariusze Jutra - Dokumentacja Zbierania Danych

## Spis treści
1. [Przegląd projektu](#1-przegląd-projektu)
2. [Źródła danych](#2-źródła-danych)
3. [Struktura listy źródeł](#3-struktura-listy-źródeł)
4. [Metodologia scrapowania](#4-metodologia-scrapowania)
5. [Format przechowywania danych](#5-format-przechowywania-danych)
6. [Instrukcje dla agentów AI](#6-instrukcje-dla-agentów-ai)
7. [Walidacja i czyszczenie danych](#7-walidacja-i-czyszczenie-danych)
8. [Harmonogram aktualizacji](#8-harmonogram-aktualizacji)

---

## 1. Przegląd projektu

### Cel główny
Stworzenie narzędzia do analizy foresightowej generującego scenariusze geopolityczne dla fikcyjnego państwa **Atlantis** (członek UE i NATO) w perspektywie 12 i 36 miesięcy.

### Wymagania dotyczące danych
- **Zakres czasowy**: Dane publikowane po **31 grudnia 2020 r.**
- **Języki**: Angielski (priorytet), Polski
- **Wolumen bazowy**: Do 50 mln słów
- **Wolumen docelowy (rozbudowa)**: Do 5 mld słów

### Kategorie tematyczne danych
| Kategoria | Waga istotności | Opis |
|-----------|-----------------|------|
| Technologie/Półprzewodniki | 30 | Produkcja GPU, łańcuchy dostaw |
| Motoryzacja/EV | 15 | Przemysł europejski, konkurencja azjatycka |
| Ekonomia UE | 15 | PKB, trendy makroekonomiczne |
| Sytuacja Ukraina | 10 | Rozejm, inwestycje, infrastruktura |
| Inwestycje zagraniczne | 5 | USA/UE w Ukrainie, surowce krytyczne |
| Energia/OZE | 25 | Ceny ropy, transformacja energetyczna |

---

## 2. Źródła danych

### 2.1 Ministerstwa rządowe (8 krajów × 10 resortów)

#### Kraje objęte analizą
```
COUNTRIES = [
    "Germany",      # Niemcy
    "France",       # Francja  
    "United_Kingdom", # Wielka Brytania
    "United_States",  # USA
    "Russia",       # Rosja
    "China",        # Chiny
    "India",        # Indie
    "Saudi_Arabia"  # Arabia Saudyjska
]
```

#### Typy ministerstw
```
MINISTRY_TYPES = [
    "foreign_affairs",      # Sprawy zagraniczne
    "defense",              # Obrona
    "interior",             # Sprawy wewnętrzne
    "economy",              # Gospodarka
    "trade",                # Handel
    "energy",               # Energia
    "climate",              # Klimat/Środowisko
    "higher_education",     # Szkolnictwo wyższe
    "digital_technology",   # Cyfryzacja/Nowe technologie
    "education"             # Edukacja
]
```

### 2.2 Instytucje międzynarodowe i think-tanki

```
INSTITUTIONS = {
    # Instytucje międzynarodowe
    "EU_Commission": {
        "name": "European Commission",
        "url": "https://ec.europa.eu",
        "type": "international_org",
        "priority": "high"
    },
    "NATO": {
        "name": "North Atlantic Treaty Organization",
        "url": "https://www.nato.int",
        "type": "international_org",
        "priority": "high"
    },
    "UN": {
        "name": "United Nations",
        "url": "https://www.un.org",
        "type": "international_org",
        "priority": "high"
    },
    "OECD": {
        "name": "Organisation for Economic Co-operation and Development",
        "url": "https://www.oecd.org",
        "type": "international_org",
        "priority": "high"
    },
    "GCC": {
        "name": "Gulf Cooperation Council",
        "url": "https://www.gcc-sg.org",
        "type": "international_org",
        "priority": "medium"
    },
    
    # Think-tanki
    "IISS": {
        "name": "International Institute for Strategic Studies",
        "url": "https://www.iiss.org",
        "type": "think_tank",
        "priority": "high"
    },
    "CSIS": {
        "name": "Center for Strategic and International Studies",
        "url": "https://www.csis.org",
        "type": "think_tank",
        "priority": "high"
    },
    "Chatham_House": {
        "name": "Chatham House",
        "url": "https://www.chathamhouse.org",
        "type": "think_tank",
        "priority": "high"
    },
    "ECFR": {
        "name": "European Council on Foreign Relations",
        "url": "https://ecfr.eu",
        "type": "think_tank",
        "priority": "high"
    },
    "Atlantic_Council": {
        "name": "Atlantic Council",
        "url": "https://www.atlanticcouncil.org",
        "type": "think_tank",
        "priority": "high"
    },
    "Kiel_Institute": {
        "name": "Kiel Institute for the World Economy",
        "url": "https://www.ifw-kiel.de",
        "type": "think_tank",
        "priority": "medium"
    },
    
    # Giełdy i instytucje finansowe
    "NASDAQ": {
        "name": "NASDAQ",
        "url": "https://www.nasdaq.com",
        "type": "financial",
        "priority": "medium"
    },
    "LSE_Group": {
        "name": "London Stock Exchange Group",
        "url": "https://www.lseg.com",
        "type": "financial",
        "priority": "medium"
    },
    "JPX": {
        "name": "Japan Exchange Group",
        "url": "https://www.jpx.co.jp/english",
        "type": "financial",
        "priority": "medium"
    }
}
```

---

## 3. Struktura listy źródeł

### 3.1 Format pliku konfiguracyjnego źródeł

Każde źródło powinno być opisane w formacie JSON z następującą strukturą:

```json
{
  "source_id": "DE_MOD",
  "country": "Germany",
  "country_code": "DE",
  "ministry_type": "defense",
  "official_name": "Federal Ministry of Defence",
  "native_name": "Bundesministerium der Verteidigung",
  "base_url": "https://www.bmvg.de/en",
  "endpoints": {
    "news": "/news",
    "press_releases": "/press-releases",
    "publications": "/publications",
    "speeches": "/speeches"
  },
  "language": "en",
  "data_format": ["html", "pdf"],
  "scraping_method": "requests_bs4",
  "rate_limit_seconds": 2,
  "priority": "high",
  "tags": ["defense", "military", "nato", "security"],
  "date_filter": "2021-01-01",
  "active": true,
  "last_scraped": null,
  "notes": "English version available"
}
```

### 3.2 Hierarchia plików źródeł

```
data_sources/
├── config/
│   ├── sources_master.json          # Główna lista wszystkich źródeł
│   ├── countries.json                # Definicje krajów
│   ├── ministry_types.json           # Typy ministerstw
│   └── institutions.json             # Instytucje międzynarodowe
│
├── ministries/
│   ├── germany/
│   │   ├── foreign_affairs.json
│   │   ├── defense.json
│   │   └── ...
│   ├── france/
│   ├── united_kingdom/
│   ├── united_states/
│   ├── russia/
│   ├── china/
│   ├── india/
│   └── saudi_arabia/
│
├── institutions/
│   ├── international_orgs/
│   │   ├── eu_commission.json
│   │   ├── nato.json
│   │   ├── un.json
│   │   ├── oecd.json
│   │   └── gcc.json
│   ├── think_tanks/
│   │   ├── iiss.json
│   │   ├── csis.json
│   │   ├── chatham_house.json
│   │   ├── ecfr.json
│   │   ├── atlantic_council.json
│   │   └── kiel_institute.json
│   └── financial/
│       ├── nasdaq.json
│       ├── lse_group.json
│       └── jpx.json
│
└── urls/
    ├── verified_urls.csv             # Zweryfikowane URL-e
    ├── failed_urls.csv               # Niedziałające URL-e
    └── sitemap_urls.csv              # URL-e z sitemapów
```

### 3.3 Format listy URL do scrapowania

Plik CSV z listą wszystkich endpointów:

```csv
source_id,url,content_type,priority,last_check,status,retry_count
DE_MOD_NEWS,https://www.bmvg.de/en/news,news,high,2025-01-15,active,0
DE_MOD_PRESS,https://www.bmvg.de/en/press-releases,press,high,2025-01-15,active,0
FR_MAE_NEWS,https://www.diplomatie.gouv.fr/en/latest-news,news,high,2025-01-14,active,0
```

---

## 4. Metodologia scrapowania

### 4.1 Diagram przepływu danych

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Lista źródeł   │────▶│  URL Discovery   │────▶│  Content Fetch  │
│  (JSON/CSV)     │     │  (Sitemap/RSS)   │     │  (HTML/PDF)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Data Storage   │◀────│  NLP Processing  │◀────│  Text Extract   │
│  (PostgreSQL)   │     │  (spaCy/NLTK)    │     │  (BS4/PyPDF)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Embeddings     │────▶│  Vector Store    │────▶│  LLM Analysis   │
│  (OpenAI/Local) │     │  (ChromaDB)      │     │  (Claude/GPT)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### 4.2 Metody pozyskiwania danych

| Metoda | Zastosowanie | Biblioteki Python |
|--------|--------------|-------------------|
| **Web Scraping** | Strony HTML | `requests`, `BeautifulSoup4`, `Scrapy` |
| **API REST** | Oficjalne API | `requests`, `aiohttp` |
| **RSS/Atom Feeds** | Aktualności | `feedparser` |
| **Sitemap Parsing** | Odkrywanie URL | `xml.etree`, `lxml` |
| **PDF Extraction** | Raporty, dokumenty | `PyPDF2`, `pdfplumber`, `pymupdf` |
| **Selenium** | Strony dynamiczne (JS) | `selenium`, `playwright` |

### 4.3 Strategia rate-limiting

```python
RATE_LIMITS = {
    "default": 2.0,           # 2 sekundy między requestami
    "government": 3.0,        # Strony rządowe - ostrożniej
    "think_tank": 1.5,        # Think-tanki
    "financial": 1.0,         # Giełdy
    "high_priority": 1.0,     # Pilne źródła
    "respectful_max": 5.0     # Maksymalny limit dla wrażliwych stron
}
```

### 4.4 Obsługa błędów i retry

```python
RETRY_CONFIG = {
    "max_retries": 3,
    "backoff_factor": 2,      # Wykładniczy backoff
    "retry_on_status": [429, 500, 502, 503, 504],
    "timeout": 30,
    "connection_timeout": 10
}
```

---

## 5. Format przechowywania danych

### 5.1 Struktura bazy danych

```sql
-- Tabela źródeł
CREATE TABLE sources (
    source_id VARCHAR(50) PRIMARY KEY,
    country VARCHAR(50),
    institution_type VARCHAR(50),
    name VARCHAR(200),
    base_url VARCHAR(500),
    language VARCHAR(10),
    priority VARCHAR(20),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela dokumentów
CREATE TABLE documents (
    doc_id SERIAL PRIMARY KEY,
    source_id VARCHAR(50) REFERENCES sources(source_id),
    url VARCHAR(1000) UNIQUE,
    title VARCHAR(500),
    content TEXT,
    content_hash VARCHAR(64),
    publication_date DATE,
    scrape_date TIMESTAMP,
    word_count INTEGER,
    language VARCHAR(10),
    document_type VARCHAR(50),
    tags TEXT[],
    metadata JSONB
);

-- Tabela embeddings
CREATE TABLE embeddings (
    embedding_id SERIAL PRIMARY KEY,
    doc_id INTEGER REFERENCES documents(doc_id),
    chunk_index INTEGER,
    chunk_text TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indeksy dla wydajności
CREATE INDEX idx_documents_source ON documents(source_id);
CREATE INDEX idx_documents_date ON documents(publication_date);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
```

### 5.2 Struktura plików lokalnych

```
data/
├── raw/
│   ├── html/
│   │   └── {source_id}/{YYYY-MM-DD}/{doc_hash}.html
│   └── pdf/
│       └── {source_id}/{YYYY-MM-DD}/{doc_hash}.pdf
│
├── processed/
│   ├── text/
│   │   └── {source_id}/{doc_id}.txt
│   └── json/
│       └── {source_id}/{doc_id}.json
│
├── embeddings/
│   └── {source_id}_embeddings.parquet
│
└── metadata/
    ├── scrape_logs/
    └── statistics/
```

### 5.3 Format dokumentu przetworzonego (JSON)

```json
{
  "doc_id": "DE_MOD_20240115_a1b2c3",
  "source_id": "DE_MOD",
  "url": "https://www.bmvg.de/en/news/article-123",
  "title": "Germany increases defense spending",
  "content": "Full text content...",
  "summary": "AI-generated summary...",
  "publication_date": "2024-01-15",
  "scrape_date": "2025-01-20T14:30:00Z",
  "word_count": 1250,
  "language": "en",
  "document_type": "news_article",
  "entities": {
    "countries": ["Germany", "NATO"],
    "organizations": ["Bundeswehr", "European Union"],
    "persons": ["Boris Pistorius"],
    "topics": ["defense", "military spending"]
  },
  "tags": ["defense", "nato", "budget", "germany"],
  "sentiment": 0.15,
  "relevance_scores": {
    "atlantis_interest": 0.85,
    "topic_defense": 0.95,
    "topic_economy": 0.30
  },
  "metadata": {
    "author": "Press Office",
    "section": "News",
    "images": 2,
    "links_count": 5
  }
}
```

---

## 6. Instrukcje dla agentów AI

### 6.1 Zadanie 1: Generowanie listy URL ministerstw

**Prompt dla agenta:**
```
ZADANIE: Wygeneruj kompletną listę URL oficjalnych stron ministerstw dla projektu "Scenariusze jutra".

WYMAGANIA:
1. Dla każdego z 8 krajów (Niemcy, Francja, UK, USA, Rosja, Chiny, Indie, Arabia Saudyjska):
   - Znajdź oficjalne strony 10 typów ministerstw
   - Priorytetowo traktuj wersje anglojęzyczne
   - Zidentyfikuj sekcje: news, press releases, publications, speeches

2. Format wyjściowy: JSON zgodny ze strukturą z sekcji 3.1

3. Walidacja:
   - Sprawdź czy URL odpowiada (status 200)
   - Zweryfikuj język strony
   - Potwierdź datę ostatniej aktualizacji

4. Dla każdego źródła określ:
   - Metodę scrapowania (static/dynamic)
   - Dostępność RSS/API
   - Strukturę paginacji

OUTPUT: Plik ministries_urls_master.json
```

### 6.2 Zadanie 2: Tworzenie scraperów

**Prompt dla agenta:**
```
ZADANIE: Stwórz modułowy system scraperów w Pythonie.

WYMAGANIA TECHNICZNE:
1. Architektura:
   - Klasa bazowa `BaseScraper` z metodami: fetch, parse, store
   - Klasy pochodne dla różnych typów stron
   - Obsługa async (aiohttp/asyncio)
   
2. Funkcjonalności:
   - Rate limiting z konfiguracją per-source
   - Retry logic z exponential backoff
   - Proxy rotation (opcjonalnie)
   - User-agent rotation
   - Caching (Redis/SQLite)
   
3. Parsowanie:
   - Ekstrakcja tekstu z HTML (BeautifulSoup)
   - Ekstrakcja z PDF (pdfplumber)
   - Czyszczenie tekstu (usuwanie boilerplate)
   - Wykrywanie języka
   - Ekstrakcja metadanych (data, autor, tagi)

4. Storage:
   - Zapis do PostgreSQL
   - Eksport do Parquet/JSON
   - Deduplikacja (hash contentu)

5. Monitoring:
   - Logowanie (structlog)
   - Metryki (ilość dokumentów, błędy)
   - Alerty przy failure rate > 10%

STRUKTURA PLIKÓW:
scrapers/
├── __init__.py
├── base.py           # BaseScraper
├── ministry.py       # MinistryScraper
├── think_tank.py     # ThinkTankScraper
├── financial.py      # FinancialScraper
├── pdf_extractor.py  # PDFScraper
├── utils/
│   ├── rate_limiter.py
│   ├── text_cleaner.py
│   └── date_parser.py
├── config/
│   └── scraper_config.yaml
└── tests/
    └── test_scrapers.py
```

### 6.3 Zadanie 3: Pipeline przetwarzania NLP

**Prompt dla agenta:**
```
ZADANIE: Zbuduj pipeline NLP do analizy dokumentów.

KOMPONENTY:
1. Text Preprocessing:
   - Tokenizacja (spaCy)
   - Lemmatyzacja
   - Usuwanie stopwords
   - Normalizacja

2. Named Entity Recognition:
   - Kraje i regiony
   - Organizacje
   - Osoby
   - Daty i wydarzenia

3. Topic Modeling:
   - Przypisanie do kategorii tematycznych (z sekcji 1)
   - Scoring relevance dla Atlantis

4. Sentiment Analysis:
   - Ogólny sentiment
   - Sentiment per-entity
   - Tone detection (formal/informal)

5. Embedding Generation:
   - Chunking dokumentów (500 tokenów)
   - Generowanie embeddings (OpenAI/local model)
   - Storage w vector DB

6. Summarization:
   - Automatyczne streszczenia (max 200 słów)
   - Ekstrakcja kluczowych informacji

OUTPUT: Moduły Python + konfiguracja + testy
```

### 6.4 Zadanie 4: System wykrywania data poisoning

**Prompt dla agenta:**
```
ZADANIE: Zaimplementuj mechanizm wykrywania manipulacji danymi.

METODY DETEKCJI:
1. Anomaly Detection:
   - Nagłe zmiany w frequency publikacji
   - Nietypowe wzorce językowe
   - Outliers w embedding space

2. Source Verification:
   - Cross-checking z wieloma źródłami
   - Weryfikacja autorstwa
   - Sprawdzanie dat publikacji

3. Content Analysis:
   - Wykrywanie sprzeczności
   - Identyfikacja propagandy
   - Analiza bias

4. Technical Indicators:
   - Sprawdzanie domen
   - SSL certificates
   - WHOIS history

OUTPUT: Moduł Python z API: verify_source(), detect_anomaly(), trust_score()
```

---

## 7. Walidacja i czyszczenie danych

### 7.1 Reguły walidacji

```python
VALIDATION_RULES = {
    "url": {
        "required": True,
        "format": "valid_url",
        "max_length": 1000
    },
    "content": {
        "required": True,
        "min_words": 50,
        "max_words": 50000,
        "language": ["en", "pl"]
    },
    "publication_date": {
        "required": True,
        "min_date": "2021-01-01",
        "max_date": "today"
    },
    "source_id": {
        "required": True,
        "format": "valid_source_id"
    }
}
```

### 7.2 Pipeline czyszczenia tekstu

1. **Usuwanie HTML tags** - BeautifulSoup
2. **Normalizacja whitespace** - regex
3. **Usuwanie boilerplate** - readability-lxml
4. **Detekcja języka** - langdetect
5. **Usuwanie duplikatów** - simhash/minhash
6. **Spell checking** (opcjonalnie) - pyspellchecker

### 7.3 Quality metrics

| Metryka | Próg akceptacji | Opis |
|---------|-----------------|------|
| `content_length` | > 100 znaków | Minimalna długość |
| `language_confidence` | > 0.8 | Pewność detekcji języka |
| `date_validity` | 100% | Poprawny format daty |
| `duplicate_rate` | < 5% | Procent duplikatów |
| `encoding_errors` | < 1% | Błędy kodowania |

---

## 8. Harmonogram aktualizacji

### 8.1 Częstotliwość scrapowania

| Typ źródła | Częstotliwość | Uzasadnienie |
|------------|---------------|--------------|
| News feeds | Co 4 godziny | Szybko zmieniające się |
| Press releases | Codziennie | Umiarkowana częstotliwość |
| Publications | Co tydzień | Rzadko aktualizowane |
| Reports | Co miesiąc | Kwartalne/roczne raporty |

### 8.2 Cron schedule

```bash
# News - co 4 godziny
0 */4 * * * /usr/bin/python3 /app/scrapers/run.py --type news

# Press releases - codziennie o 6:00
0 6 * * * /usr/bin/python3 /app/scrapers/run.py --type press

# Publications - niedziela o 3:00
0 3 * * 0 /usr/bin/python3 /app/scrapers/run.py --type publications

# Full rescan - pierwszy dzień miesiąca
0 1 1 * * /usr/bin/python3 /app/scrapers/run.py --type full
```

---

## Załączniki

### A. Przykładowe URL-e ministerstw (do weryfikacji)

```yaml
Germany:
  foreign_affairs: https://www.auswaertiges-amt.de/en
  defense: https://www.bmvg.de/en
  economy: https://www.bmwk.de/en
  
France:
  foreign_affairs: https://www.diplomatie.gouv.fr/en
  defense: https://www.defense.gouv.fr/english
  economy: https://www.economie.gouv.fr/welcome-to-the-french-ministry-for-the-economy
  
United_Kingdom:
  foreign_affairs: https://www.gov.uk/government/organisations/foreign-commonwealth-development-office
  defense: https://www.gov.uk/government/organisations/ministry-of-defence
  economy: https://www.gov.uk/government/organisations/department-for-business-and-trade

United_States:
  foreign_affairs: https://www.state.gov
  defense: https://www.defense.gov
  economy: https://www.commerce.gov
  trade: https://ustr.gov
  energy: https://www.energy.gov
```

### B. Checklist przed uruchomieniem scrapera

- [ ] Zweryfikowano wszystkie URL-e (status 200)
- [ ] Skonfigurowano rate limiting
- [ ] Ustawiono prawidłowy User-Agent
- [ ] Sprawdzono robots.txt dla każdej domeny
- [ ] Przygotowano bazę danych
- [ ] Skonfigurowano logging
- [ ] Ustawiono alerty błędów
- [ ] Przetestowano na małej próbce
- [ ] Zweryfikowano format output

### C. Kontakt i eskalacja

- **Problemy techniczne**: Sprawdź logi w `/var/log/scrapers/`
- **Blokady IP**: Użyj proxy rotation lub zmniejsz rate
- **Zmiany struktury stron**: Zaktualizuj parsery w `/scrapers/parsers/`

---

*Dokument wersja 1.0 | Ostatnia aktualizacja: Grudzień 2025*
