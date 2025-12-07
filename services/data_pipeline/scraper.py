"""
Scraper dokumentów z publicznych źródeł geopolitycznych.

Obsługuje: NATO.int, EC.europa.eu, US State Department, UK FCDO
+ źródła z organisations.json (ministerstwa krajowe)
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import asyncio
import json
import httpx
from bs4 import BeautifulSoup
import trafilatura
from tenacity import retry, stop_after_attempt, wait_exponential
import logging

logger = logging.getLogger(__name__)

# Ścieżka do pliku konfiguracji ministerstw
ORGANISATIONS_JSON_PATH = Path(__file__).parent.parent.parent / "data" / "schemas" / "organisations.json"


@dataclass
class ScrapedDocument:
    """Pojedynczy zescrapowany dokument."""
    url: str
    title: str
    content: str
    source: str  # "NATO", "EU_COMMISSION", etc.
    date: Optional[str] = None  # ISO format
    region: Optional[str] = None
    country: Optional[str] = None
    document_type: str = "article"  # "report", "statement", "article"
    metadata: Dict[str, Any] = field(default_factory=dict)


class SourceConfig:
    """Konfiguracja źródeł do scrapowania."""

    NATO = {
        "base_url": "https://www.nato.int",
        "search_paths": [
            "/cps/en/natohq/news.htm",
            "/cps/en/natohq/official_texts.htm"
        ],
        "source_code": "NATO",
        "region": "NATO",
        "max_documents": 30,
        "keywords": ["news", "press", "statement", "publication"]
    }

    EU_COMMISSION = {
        "base_url": "https://ec.europa.eu",
        "search_paths": [
            "/commission/presscorner/home/en"
        ],
        "source_code": "EU_COMMISSION",
        "region": "EU",
        "max_documents": 30,
        "keywords": ["press-release", "statement"]
    }

    US_STATE = {
        "base_url": "https://www.state.gov",
        "search_paths": [
            "/briefings-foreign-press-centers/",
            "/press-releases/"
        ],
        "source_code": "US_STATE",
        "region": "USA",
        "max_documents": 30,
        "keywords": ["press-releases", "briefings"]
    }

    # === INSTITUTIONS ===
    UN = {
        "base_url": "https://press.un.org",
        "search_paths": ["/en"],
        "source_code": "UN",
        "region": "GLOBAL",
        "max_documents": 30,
        "keywords": ["press", "statement"]
    }
    OECD = {
        "base_url": "https://www.oecd.org",
        "search_paths": ["/newsroom/"],
        "source_code": "OECD",
        "region": "GLOBAL",
        "max_documents": 30,
        "keywords": ["news", "release"]
    }
    GCC = {
        "base_url": "https://www.gcc-sg.org",
        "search_paths": ["/en-us/MediaCenter/News/Pages/News.aspx"],
        "source_code": "GCC",
        "region": "ASIA",
        "max_documents": 30,
        "keywords": ["news"]
    }
    IISS = {
        "base_url": "https://www.iiss.org",
        "search_paths": ["/press/"],
        "source_code": "IISS",
        "region": "GLOBAL",
        "max_documents": 30,
        "keywords": ["press-release"]
    }
    CSIS = {
        "base_url": "https://www.csis.org",
        "search_paths": ["/news"],
        "source_code": "CSIS",
        "region": "USA",
        "max_documents": 30,
        "keywords": ["news"]
    }
    CHATHAM_HOUSE = {
        "base_url": "https://www.chathamhouse.org",
        "search_paths": ["/news-and-opinion"],
        "source_code": "CHATHAM_HOUSE",
        "region": "EU", # UK
        "max_documents": 30,
        "keywords": ["news"]
    }
    ECFR = {
        "base_url": "https://ecfr.eu",
        "search_paths": ["/article/"],
        "source_code": "ECFR",
        "region": "EU",
        "max_documents": 30,
        "keywords": ["article"]
    }
    ATLANTIC_COUNCIL = {
        "base_url": "https://www.atlanticcouncil.org",
        "search_paths": ["/content-type/press-release/"],
        "source_code": "ATLANTIC_COUNCIL",
        "region": "USA",
        "max_documents": 30,
        "keywords": ["press-release"]
    }
    KIEL_INSTITUTE = {
        "base_url": "https://www.ifw-kiel.de",
        "search_paths": ["/experts/media/media-releases/"],
        "source_code": "KIEL_INSTITUTE",
        "region": "EU",
        "max_documents": 30,
        "keywords": ["media-releases"]
    }
    NASDAQ = {
        "base_url": "https://ir.nasdaq.com",
        "search_paths": ["/news-events/press-releases"],
        "source_code": "NASDAQ",
        "region": "USA",
        "max_documents": 30,
        "keywords": ["press-releases"]
    }
    LSEG = {
        "base_url": "https://www.lseg.com",
        "search_paths": ["/en/media-centre/press-releases"],
        "source_code": "LSEG",
        "region": "EU", # UK
        "max_documents": 30,
        "keywords": ["press-releases"]
    }
    JPX = {
        "base_url": "https://www.jpx.co.jp",
        "search_paths": ["/english/corporate/news/news-releases/"],
        "source_code": "JPX",
        "region": "ASIA",
        "max_documents": 30,
        "keywords": ["news-releases"]
    }

    # === MINISTRIES - GERMANY (DE) ===
    DE_MFA = {"base_url": "https://www.auswaertiges-amt.de", "search_paths": ["/en/newsroom/news"], "source_code": "DE_MFA", "region": "EU", "country": "DE", "max_documents": 30, "keywords": ["news", "press", "statement"]}
    DE_MOD = {"base_url": "https://www.bmvg.de", "search_paths": ["/en/press/press-releases"], "source_code": "DE_MOD", "region": "EU", "country": "DE", "max_documents": 30, "keywords": ["press", "security", "defense"]}
    DE_BMWK = {"base_url": "https://www.bmwk.de", "search_paths": ["/Redaktion/EN/Pressestelle/press-releases.html"], "source_code": "DE_BMWK", "region": "EU", "country": "DE", "max_documents": 30, "keywords": ["press", "economy", "trade"]}
    DE_BMI = {"base_url": "https://www.bmi.bund.de", "search_paths": ["/EN/news/news_node.html"], "source_code": "DE_BMI", "region": "EU", "country": "DE", "max_documents": 30, "keywords": ["news", "security", "migration"]}
    DE_BMBF = {"base_url": "https://www.bmbf.de", "search_paths": ["/en/press-releases/"], "source_code": "DE_BMBF", "region": "EU", "country": "DE", "max_documents": 30, "keywords": ["press", "research", "education"]}
    DE_BMUV = {"base_url": "https://www.bmuv.de", "search_paths": ["/en/pressreleases/"], "source_code": "DE_BMUV", "region": "EU", "country": "DE", "max_documents": 30, "keywords": ["press", "climate", "environment"]}
    DE_BMDV = {"base_url": "https://www.bmdv.bund.de", "search_paths": ["/EN/press/press.html"], "source_code": "DE_BMDV", "region": "EU", "country": "DE", "max_documents": 30, "keywords": ["press", "digital", "transport"]}

    # === MINISTRIES - FRANCE (FR) ===
    FR_MFA = {"base_url": "https://www.diplomatie.gouv.fr", "search_paths": ["/en/press/"], "source_code": "FR_MFA", "region": "EU", "country": "FR", "max_documents": 30, "keywords": ["press", "statement"]}
    FR_MOD = {"base_url": "https://www.defense.gouv.fr", "search_paths": ["/english/"], "source_code": "FR_MOD", "region": "EU", "country": "FR", "max_documents": 30, "keywords": ["news", "defense"]}
    FR_INTERIOR = {"base_url": "https://www.interieur.gouv.fr", "search_paths": ["/actualites/"], "source_code": "FR_INTERIOR", "region": "EU", "country": "FR", "max_documents": 30, "keywords": ["actualites", "news"]}
    FR_ECONOMY = {"base_url": "https://www.economie.gouv.fr", "search_paths": ["/actualites/"], "source_code": "FR_ECONOMY", "region": "EU", "country": "FR", "max_documents": 30, "keywords": ["actualites", "news", "economy"]}
    FR_ECOLOGY = {"base_url": "https://www.ecologie.gouv.fr", "search_paths": ["/actualites/"], "source_code": "FR_ECOLOGY", "region": "EU", "country": "FR", "max_documents": 30, "keywords": ["actualites", "climat", "energy"]}
    FR_EDUCATION = {"base_url": "https://www.education.gouv.fr", "search_paths": ["/toute-l-actualite/"], "source_code": "FR_EDUCATION", "region": "EU", "country": "FR", "max_documents": 30, "keywords": ["actualite", "education"]}
    FR_RESEARCH = {"base_url": "https://www.enseignementsup-recherche.gouv.fr", "search_paths": ["/toute-l-actualite/"], "source_code": "FR_RESEARCH", "region": "EU", "country": "FR", "max_documents": 30, "keywords": ["actualite", "research"]}
    FR_DIGITAL = {"base_url": "https://www.economie.gouv.fr/numerique", "search_paths": ["/actualites/"], "source_code": "FR_DIGITAL", "region": "EU", "country": "FR", "max_documents": 30, "keywords": ["numerique", "digital"]}

    # === MINISTRIES - UK ===
    UK_GOV = {"base_url": "https://www.gov.uk", "search_paths": ["/search/news-and-communications"], "source_code": "UK_GOV", "region": "EU", "country": "UK", "max_documents": 30, "keywords": ["news"]}
    UK_FCDO = {"base_url": "https://www.gov.uk", "search_paths": ["/government/organisations/foreign-commonwealth-development-office"], "source_code": "UK_FCDO", "region": "EU", "country": "UK", "max_documents": 30, "keywords": ["news", "press", "statement"]}
    UK_MOD = {"base_url": "https://www.gov.uk", "search_paths": ["/government/organisations/ministry-of-defence"], "source_code": "UK_MOD", "region": "EU", "country": "UK", "max_documents": 30, "keywords": ["news", "defence"]}
    UK_HOME = {"base_url": "https://www.gov.uk", "search_paths": ["/government/organisations/home-office"], "source_code": "UK_HOME", "region": "EU", "country": "UK", "max_documents": 30, "keywords": ["news", "security"]}
    UK_TRADE = {"base_url": "https://www.gov.uk", "search_paths": ["/government/organisations/department-for-business-and-trade"], "source_code": "UK_TRADE", "region": "EU", "country": "UK", "max_documents": 30, "keywords": ["news", "trade"]}
    UK_ENERGY = {"base_url": "https://www.gov.uk", "search_paths": ["/government/organisations/department-for-energy-security-and-net-zero"], "source_code": "UK_ENERGY", "region": "EU", "country": "UK", "max_documents": 30, "keywords": ["news", "energy", "climate"]}
    UK_DSIT = {"base_url": "https://www.gov.uk", "search_paths": ["/government/organisations/department-for-science-innovation-and-technology"], "source_code": "UK_DSIT", "region": "EU", "country": "UK", "max_documents": 30, "keywords": ["news", "technology", "digital"]}
    UK_EDUCATION = {"base_url": "https://www.gov.uk", "search_paths": ["/government/organisations/department-for-education"], "source_code": "UK_EDUCATION", "region": "EU", "country": "UK", "max_documents": 30, "keywords": ["news", "education"]}

    # === MINISTRIES - USA ===
    USA_DOD = {"base_url": "https://www.defense.gov", "search_paths": ["/News/Press-Releases/"], "source_code": "USA_DOD", "region": "USA", "country": "US", "max_documents": 30, "keywords": ["press-releases", "news"]}
    USA_DOC = {"base_url": "https://www.commerce.gov", "search_paths": ["/news/press-releases"], "source_code": "USA_DOC", "region": "USA", "country": "US", "max_documents": 30, "keywords": ["press-releases", "trade"]}
    USA_DOE = {"base_url": "https://www.energy.gov", "search_paths": ["/newsroom"], "source_code": "USA_DOE", "region": "USA", "country": "US", "max_documents": 30, "keywords": ["news", "energy"]}
    USA_DHS = {"base_url": "https://www.dhs.gov", "search_paths": ["/news-releases/press-releases"], "source_code": "USA_DHS", "region": "USA", "country": "US", "max_documents": 30, "keywords": ["press-releases", "security"]}
    USA_ED = {"base_url": "https://www.ed.gov", "search_paths": ["/news/press-releases"], "source_code": "USA_ED", "region": "USA", "country": "US", "max_documents": 30, "keywords": ["press-releases", "education"]}
    USA_TREASURY = {"base_url": "https://home.treasury.gov", "search_paths": ["/news/press-releases"], "source_code": "USA_TREASURY", "region": "USA", "country": "US", "max_documents": 30, "keywords": ["press-releases", "economy"]}
    USA_USTR = {"base_url": "https://ustr.gov", "search_paths": ["/about-us/press-office/press-releases"], "source_code": "USA_USTR", "region": "USA", "country": "US", "max_documents": 30, "keywords": ["press-releases", "trade"]}
    USA_EPA = {"base_url": "https://www.epa.gov", "search_paths": ["/newsreleases"], "source_code": "USA_EPA", "region": "USA", "country": "US", "max_documents": 30, "keywords": ["news", "climate", "environment"]}
    USA_NSF = {"base_url": "https://www.nsf.gov", "search_paths": ["/news/news_summ.jsp"], "source_code": "USA_NSF", "region": "USA", "country": "US", "max_documents": 30, "keywords": ["news", "research", "science"]}

    # === MINISTRIES - RUSSIA ===
    RU_MFA = {"base_url": "https://mid.ru", "search_paths": ["/en/foreign_policy/news/"], "source_code": "RU_MFA", "region": "RUSSIA", "country": "RU", "max_documents": 30, "keywords": ["news", "statement"]}
    RU_MOD = {"base_url": "https://eng.mil.ru", "search_paths": ["/en/news_page/"], "source_code": "RU_MOD", "region": "RUSSIA", "country": "RU", "max_documents": 30, "keywords": ["news", "defence"]}
    RU_ECONOMY = {"base_url": "https://www.economy.gov.ru", "search_paths": ["/en/press/news/"], "source_code": "RU_ECONOMY", "region": "RUSSIA", "country": "RU", "max_documents": 30, "keywords": ["news", "economy"]}
    RU_MINENERGO = {"base_url": "https://minenergo.gov.ru", "search_paths": ["/en/node/"], "source_code": "RU_MINENERGO", "region": "RUSSIA", "country": "RU", "max_documents": 30, "keywords": ["news", "energy"]}
    RU_DIGITAL = {"base_url": "https://digital.gov.ru", "search_paths": ["/en/events/"], "source_code": "RU_DIGITAL", "region": "RUSSIA", "country": "RU", "max_documents": 30, "keywords": ["news", "digital"]}
    RU_EDUCATION = {"base_url": "https://minobrnauki.gov.ru", "search_paths": ["/en/press-center/news/"], "source_code": "RU_EDUCATION", "region": "RUSSIA", "country": "RU", "max_documents": 30, "keywords": ["news", "education", "science"]}

    # === MINISTRIES - CHINA ===
    CN_MFA = {"base_url": "https://www.fmprc.gov.cn", "search_paths": ["/mfa_eng/xwfw_665399/s2510_665401/"], "source_code": "CN_MFA", "region": "ASIA", "country": "CN", "max_documents": 30, "keywords": ["news", "statement"]}
    CN_MOFCOM = {"base_url": "http://english.mofcom.gov.cn", "search_paths": ["/news.shtml"], "source_code": "CN_MOFCOM", "region": "ASIA", "country": "CN", "max_documents": 30, "keywords": ["news", "trade"]}
    CN_MOD = {"base_url": "http://eng.mod.gov.cn", "search_paths": ["/news/index.htm"], "source_code": "CN_MOD", "region": "ASIA", "country": "CN", "max_documents": 30, "keywords": ["news", "defense"]}
    CN_NDRC = {"base_url": "https://en.ndrc.gov.cn", "search_paths": ["/news/"], "source_code": "CN_NDRC", "region": "ASIA", "country": "CN", "max_documents": 30, "keywords": ["news", "economy", "development"]}
    CN_MOE = {"base_url": "http://en.moe.gov.cn", "search_paths": ["/news/"], "source_code": "CN_MOE", "region": "ASIA", "country": "CN", "max_documents": 30, "keywords": ["news", "education"]}
    CN_MIIT = {"base_url": "https://wap.miit.gov.cn", "search_paths": ["/"], "source_code": "CN_MIIT", "region": "ASIA", "country": "CN", "max_documents": 30, "keywords": ["news", "industry", "technology"]}
    CN_MEE = {"base_url": "https://english.mee.gov.cn", "search_paths": ["/News/"], "source_code": "CN_MEE", "region": "ASIA", "country": "CN", "max_documents": 30, "keywords": ["news", "environment", "climate"]}
    CN_NEA = {"base_url": "http://www.nea.gov.cn", "search_paths": ["/english/"], "source_code": "CN_NEA", "region": "ASIA", "country": "CN", "max_documents": 30, "keywords": ["news", "energy"]}

    # === MINISTRIES - INDIA ===
    IN_MEA = {"base_url": "https://www.mea.gov.in", "search_paths": ["/media-center.htm"], "source_code": "IN_MEA", "region": "ASIA", "country": "IN", "max_documents": 30, "keywords": ["media", "press"]}
    IN_MOD = {"base_url": "https://mod.gov.in", "search_paths": ["/news/"], "source_code": "IN_MOD", "region": "ASIA", "country": "IN", "max_documents": 30, "keywords": ["news", "defence"]}
    IN_MOC = {"base_url": "https://commerce.gov.in", "search_paths": ["/press-releases/"], "source_code": "IN_MOC", "region": "ASIA", "country": "IN", "max_documents": 30, "keywords": ["press", "trade"]}
    IN_MOPNG = {"base_url": "https://mopng.gov.in", "search_paths": ["/en/news-media/press-releases"], "source_code": "IN_MOPNG", "region": "ASIA", "country": "IN", "max_documents": 30, "keywords": ["press", "energy"]}
    IN_MEITY = {"base_url": "https://www.meity.gov.in", "search_paths": ["/news/"], "source_code": "IN_MEITY", "region": "ASIA", "country": "IN", "max_documents": 30, "keywords": ["news", "digital", "technology"]}
    IN_MOEFCC = {"base_url": "https://moef.gov.in", "search_paths": ["/en/news-updates/"], "source_code": "IN_MOEFCC", "region": "ASIA", "country": "IN", "max_documents": 30, "keywords": ["news", "environment", "climate"]}
    IN_MHA = {"base_url": "https://www.mha.gov.in", "search_paths": ["/en/news/"], "source_code": "IN_MHA", "region": "ASIA", "country": "IN", "max_documents": 30, "keywords": ["news", "security"]}
    IN_MHRD = {"base_url": "https://www.education.gov.in", "search_paths": ["/news/"], "source_code": "IN_MHRD", "region": "ASIA", "country": "IN", "max_documents": 30, "keywords": ["news", "education"]}

    # === MINISTRIES - SAUDI ARABIA ===
    SA_SPA = {"base_url": "https://www.spa.gov.sa", "search_paths": ["/en/news"], "source_code": "SA_SPA", "region": "ASIA", "country": "SA", "max_documents": 30, "keywords": ["news"]}
    SA_MFA = {"base_url": "https://www.mofa.gov.sa", "search_paths": ["/en/media-center/news"], "source_code": "SA_MFA", "region": "ASIA", "country": "SA", "max_documents": 30, "keywords": ["news", "statement"]}
    SA_MOD = {"base_url": "https://www.mod.gov.sa", "search_paths": ["/en/MediaCenter/News"], "source_code": "SA_MOD", "region": "ASIA", "country": "SA", "max_documents": 30, "keywords": ["news", "defense"]}
    SA_MISA = {"base_url": "https://www.misa.gov.sa", "search_paths": ["/en/mediacenter/news"], "source_code": "SA_MISA", "region": "ASIA", "country": "SA", "max_documents": 30, "keywords": ["news", "investment", "economy"]}
    SA_MOI = {"base_url": "https://www.moi.gov.sa", "search_paths": ["/en/media-center/news"], "source_code": "SA_MOI", "region": "ASIA", "country": "SA", "max_documents": 30, "keywords": ["news", "security"]}
    SA_MOENERGY = {"base_url": "https://www.moenergy.gov.sa", "search_paths": ["/en/media-center/news"], "source_code": "SA_MOENERGY", "region": "ASIA", "country": "SA", "max_documents": 30, "keywords": ["news", "energy"]}
    SA_MCIT = {"base_url": "https://www.mcit.gov.sa", "search_paths": ["/en/media-center/news"], "source_code": "SA_MCIT", "region": "ASIA", "country": "SA", "max_documents": 30, "keywords": ["news", "digital", "technology"]}
    SA_MOE = {"base_url": "https://www.moe.gov.sa", "search_paths": ["/en/mediacenter/MOEnews"], "source_code": "SA_MOE", "region": "ASIA", "country": "SA", "max_documents": 30, "keywords": ["news", "education"]}

    @classmethod
    def load_from_organisations_json(cls, json_path: Path = None) -> List[Dict[str, Any]]:
        """
        Ładuje konfigurację źródeł z pliku organisations.json.

        Args:
            json_path: Ścieżka do pliku JSON (domyślnie ORGANISATIONS_JSON_PATH)

        Returns:
            Lista konfiguracji źródeł w formacie kompatybilnym ze scraperem
        """
        path = json_path or ORGANISATIONS_JSON_PATH

        if not path.exists():
            logger.warning(f"Plik organisations.json nie istnieje: {path}")
            return []

        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Błąd parsowania JSON: {e}")
            return []

        sources = []
        date_from = data.get("date_from", "2021-01-01")

        for country_name, country_data in data.get("ministries", {}).items():
            country_code = country_data.get("country_code", "")
            language = country_data.get("language", "en")
            english_available = country_data.get("english_available", False)

            for source in country_data.get("sources", []):
                if not source.get("active", True):
                    logger.debug(f"Pomijam nieaktywne źródło: {source.get('source_id')}")
                    continue

                # Ustal bazowy URL
                # Jeśli jest english_url, użyj go jako base (bez dodatkowych ścieżek z endpoints)
                # Endpointy są względne do base_url, nie do english_url
                if english_available and source.get("english_url"):
                    base_url = source.get("english_url").rstrip("/")
                    # Endpointy są już zdefiniowane względem /en/, więc używamy ich bezpośrednio
                    endpoints = source.get("endpoints", {})
                    # Usuń prefix /en z endpointów jeśli base_url już go zawiera
                    search_paths = []
                    for endpoint in endpoints.values():
                        # Endpoint jest już poprawny (np. /en/newsroom)
                        # base_url to https://www.auswaertiges-amt.de/en
                        # Musimy usunąć /en z endpointu bo jest już w base_url
                        if endpoint.startswith("/en/"):
                            search_paths.append(endpoint[3:])  # Usuń /en
                        else:
                            search_paths.append(endpoint)
                else:
                    base_url = source.get("base_url", "").rstrip("/")
                    endpoints = source.get("endpoints", {})
                    search_paths = list(endpoints.values()) if endpoints else ["/"]

                # Mapuj region na podstawie kraju
                region = cls._map_country_to_region(country_code)

                source_config = {
                    "base_url": base_url,
                    "search_paths": search_paths,
                    "source_code": source.get("source_id", f"{country_code}_MINISTRY"),
                    "region": region,
                    "country": country_code,
                    "max_documents": 20,  # Domyślny limit dla ministerstw
                    "keywords": cls._get_keywords_for_ministry_type(source.get("ministry_type", "")),
                    "priority": source.get("priority", "medium"),
                    "scraping_method": source.get("scraping_method", "static"),
                    "ministry_type": source.get("ministry_type", ""),
                    "name_en": source.get("name_en", ""),
                    "name_native": source.get("name_native", ""),
                    "date_from": date_from
                }

                sources.append(source_config)
                logger.info(f"Załadowano źródło: {source_config['source_code']} ({source_config['name_en']})")

        logger.info(f"Załadowano {len(sources)} źródeł z organisations.json")
        return sources

    @staticmethod
    def _map_country_to_region(country_code: str) -> str:
        """Mapuje kod kraju na region."""
        eu_countries = ["DE", "FR", "PL", "IT", "ES", "NL", "BE", "AT", "SE", "DK", "FI", "CZ", "HU", "RO", "BG", "GR", "PT", "IE"]
        asia_countries = ["CN", "JP", "KR", "IN", "ID", "TH", "VN", "MY", "SG", "PH"]

        if country_code in eu_countries:
            return "EU"
        elif country_code == "US":
            return "USA"
        elif country_code in ["GB", "UK"]:
            return "EU"  # UK nadal blisko EU geopolitycznie
        elif country_code == "RU":
            return "RUSSIA"
        elif country_code in asia_countries:
            return "ASIA"
        else:
            return "OTHER"

    @staticmethod
    def _get_keywords_for_ministry_type(ministry_type: str) -> List[str]:
        """Zwraca słowa kluczowe dla typu ministerstwa."""
        keywords_map = {
            "foreign_affairs": ["news", "press", "statement", "speech", "policy", "diplomatic"],
            "defense": ["news", "press", "statement", "security", "military", "defense"],
            "economy": ["news", "press", "economy", "trade", "industry", "investment"],
            "finance": ["news", "press", "budget", "fiscal", "economic"],
            "interior": ["news", "press", "security", "migration", "police"],
        }
        return keywords_map.get(ministry_type, ["news", "press", "statement"])

    @classmethod
    def get_all_sources(cls) -> List[Dict[str, Any]]:
        """
        Zwraca wszystkie źródła: hardcoded + z organisations.json.

        Returns:
            Lista wszystkich konfiguracji źródeł
        """
        # Źródła hardcoded
        hardcoded = [
            # === Główne organizacje międzynarodowe ===
            cls.NATO, cls.EU_COMMISSION, cls.US_STATE,
            cls.UN, cls.OECD, cls.GCC,

            # === Think tanki i instytuty badawcze ===
            cls.IISS, cls.CSIS, cls.CHATHAM_HOUSE, cls.ECFR,
            cls.ATLANTIC_COUNCIL, cls.KIEL_INSTITUTE,

            # === Giełdy i instytucje finansowe ===
            cls.NASDAQ, cls.LSEG, cls.JPX,

            # === Niemcy (DE) - wszystkie ministerstwa ===
            cls.DE_MFA, cls.DE_MOD, cls.DE_BMWK, cls.DE_BMI,
            cls.DE_BMBF, cls.DE_BMUV, cls.DE_BMDV,

            # === Francja (FR) - wszystkie ministerstwa ===
            cls.FR_MFA, cls.FR_MOD, cls.FR_INTERIOR, cls.FR_ECONOMY,
            cls.FR_ECOLOGY, cls.FR_EDUCATION, cls.FR_RESEARCH, cls.FR_DIGITAL,

            # === Wielka Brytania (UK) - wszystkie ministerstwa ===
            cls.UK_GOV, cls.UK_FCDO, cls.UK_MOD, cls.UK_HOME,
            cls.UK_TRADE, cls.UK_ENERGY, cls.UK_DSIT, cls.UK_EDUCATION,

            # === USA - wszystkie ministerstwa ===
            cls.USA_DOD, cls.USA_DOC, cls.USA_DOE, cls.USA_DHS,
            cls.USA_ED, cls.USA_TREASURY, cls.USA_USTR, cls.USA_EPA, cls.USA_NSF,

            # === Rosja (RU) - wszystkie ministerstwa ===
            cls.RU_MFA, cls.RU_MOD, cls.RU_ECONOMY,
            cls.RU_MINENERGO, cls.RU_DIGITAL, cls.RU_EDUCATION,

            # === Chiny (CN) - wszystkie ministerstwa ===
            cls.CN_MFA, cls.CN_MOFCOM, cls.CN_MOD, cls.CN_NDRC,
            cls.CN_MOE, cls.CN_MIIT, cls.CN_MEE, cls.CN_NEA,

            # === Indie (IN) - wszystkie ministerstwa ===
            cls.IN_MEA, cls.IN_MOD, cls.IN_MOC, cls.IN_MOPNG,
            cls.IN_MEITY, cls.IN_MOEFCC, cls.IN_MHA, cls.IN_MHRD,

            # === Arabia Saudyjska (SA) - wszystkie ministerstwa ===
            cls.SA_SPA, cls.SA_MFA, cls.SA_MOD, cls.SA_MISA,
            cls.SA_MOI, cls.SA_MOENERGY, cls.SA_MCIT, cls.SA_MOE,
        ]

        # Źródła z JSON (dodatkowe ministerstwa jeśli są)
        from_json = cls.load_from_organisations_json()

        return hardcoded + from_json


class DocumentScraper:
    """Główna klasa scrapera z retry logic i rate limiting."""

    def __init__(self, timeout: int = 30, rate_limit_delay: float = 1.5):
        """
        Args:
            timeout: Timeout dla requestów HTTP (sekundy)
            rate_limit_delay: Opóźnienie między requestami (sekundy)
        """
        self.timeout = timeout
        self.rate_limit_delay = rate_limit_delay
        self.client = httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers={
                "User-Agent": "GeopoliticalAnalysisBot/1.0 (Educational Research; +https://github.com/yourusername/project)"
            }
        )

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    async def fetch_url(self, url: str) -> Optional[str]:
        """
        Pobiera HTML z retry logic.

        Args:
            url: URL do pobrania

        Returns:
            HTML jako string lub None jeśli błąd
        """
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            return response.text
        except httpx.HTTPError as e:
            logger.warning(f"Błąd HTTP dla {url}: {e}")
            return None
        except Exception as e:
            logger.error(f"Nieoczekiwany błąd dla {url}: {e}")
            return None

    async def scrape_source(self, source_config: Dict[str, Any]) -> List[ScrapedDocument]:
        """
        Scrapuje dokumenty z jednego źródła.

        Args:
            source_config: Konfiguracja źródła (z SourceConfig)

        Returns:
            Lista zescrapowanych dokumentów
        """
        documents = []
        base_url = source_config["base_url"]
        max_documents = source_config.get("max_documents", 30)

        logger.info(f"Scrapuję źródło: {source_config['source_code']}")

        for search_path in source_config["search_paths"]:
            listing_url = f"{base_url}{search_path}"
            logger.info(f"Pobieram listing: {listing_url}")

            html = await self.fetch_url(listing_url)
            if not html:
                logger.warning(f"Nie udało się pobrać {listing_url}")
                continue

            # Wyciągnij URL-e artykułów
            article_urls = self._extract_article_urls(
                html,
                base_url,
                source_config.get("keywords", [])
            )

            logger.info(f"Znaleziono {len(article_urls)} potencjalnych artykułów")

            # Scrapuj każdy artykuł
            for article_url in article_urls[:max_documents]:
                doc = await self._scrape_single_document(article_url, source_config)
                if doc:
                    documents.append(doc)
                    logger.debug(f"Zescrapowano: {doc.title[:60]}...")

                # Rate limiting
                await asyncio.sleep(self.rate_limit_delay)

                if len(documents) >= max_documents:
                    break

            if len(documents) >= max_documents:
                break

        logger.info(f"Zakończono scraping {source_config['source_code']}: {len(documents)} dokumentów")
        return documents

    async def _scrape_single_document(
        self,
        url: str,
        config: Dict[str, Any]
    ) -> Optional[ScrapedDocument]:
        """
        Scrapuje pojedynczy dokument używając trafilatura.

        Args:
            url: URL dokumentu
            config: Konfiguracja źródła

        Returns:
            ScrapedDocument lub None jeśli błąd
        """
        html = await self.fetch_url(url)
        if not html:
            return None

        # Ekstrakcja treści przez trafilatura
        content = trafilatura.extract(
            html,
            include_tables=True,
            include_links=False,
            favor_precision=True,
            favor_recall=False
        )

        if not content or len(content) < 200:
            logger.debug(f"Za krótki content dla {url}: {len(content) if content else 0} znaków")
            return None

        # Parsowanie metadanych
        soup = BeautifulSoup(html, 'html.parser')
        title = self._extract_title(soup)
        date_str = self._extract_date(soup)

        # Filtr daty > 31.12.2020
        if date_str:
            try:
                # Proste parsowanie daty (oczekiwany format YYYY-MM-DD lub YYYY/MM/DD)
                year_str = date_str[:4]
                if year_str.isdigit():
                    year = int(year_str)
                    if year < 2021:
                        logger.debug(f"Pominięto stary dokument (rok {year}): {url}")
                        return None
            except Exception as e:
                logger.debug(f"Nie udało się sparsować daty '{date_str}' dla {url}: {e}")
                # Jeśli parsowanie się nie powiedzie, to dokument zostanie uwzględniony, 
                # chyba że jego tytuł lub inne cechy wskażą na przestarzałość.
                # Jest to bezpieczniejsze niż odrzucenie wszystkiego.
                pass

        return ScrapedDocument(
            url=url,
            title=title,
            content=content,
            source=config["source_code"],
            date=date_str,
            region=config.get("region"),
            country=config.get("country"),
            document_type=self._infer_document_type(url, title),
            metadata={
                "scraped_at": datetime.now().isoformat(),
                "base_url": config["base_url"]
            }
        )

    def _extract_article_urls(
        self,
        html: str,
        base_url: str,
        keywords: List[str]
    ) -> List[str]:
        """
        Wyciąga URL-e artykułów z listingu.

        Args:
            html: HTML strony z listingiem
            base_url: Bazowy URL źródła
            keywords: Słowa kluczowe do filtrowania linków

        Returns:
            Lista URL-i artykułów
        """
        soup = BeautifulSoup(html, 'html.parser')
        urls = set()

        # Wyciągnij bazową domenę do walidacji
        from urllib.parse import urlparse
        parsed_base = urlparse(base_url)
        base_domain = f"{parsed_base.scheme}://{parsed_base.netloc}"

        for link in soup.find_all('a', href=True):
            href = link['href']

            # Pomiń nieprawidłowe linki
            if not href or href.startswith('#'):
                continue

            # Pomiń linki mailto:, javascript:, tel:, whatsapp:, etc.
            if any(href.lower().startswith(proto) for proto in ['mailto:', 'javascript:', 'tel:', 'whatsapp:', 'sms:']):
                continue

            # Filtrowanie po keywords (jeśli podane)
            if keywords and not any(kw in href.lower() for kw in keywords):
                continue

            # Konwersja relative → absolute URL
            if href.startswith('http'):
                full_url = href
            elif href.startswith('/'):
                # Użyj base_domain zamiast base_url aby uniknąć /en/en/
                full_url = f"{base_domain}{href}"
            else:
                full_url = f"{base_url}/{href}"

            # Walidacja URL
            # 1. Musi być z tej samej domeny
            # 2. Nie może być plikiem binarnym
            # 3. Nie może zawierać podejrzanych schematów w środku URL
            parsed_full = urlparse(full_url)
            if parsed_full.netloc != parsed_base.netloc:
                continue

            if any(ext in full_url.lower() for ext in ['.pdf', '.jpg', '.png', '.xml', '.gif', '.mp3', '.mp4']):
                continue

            # Pomiń URLe zawierające schematy w ścieżce (np. /en/WhatsApp://...)
            if '://' in parsed_full.path:
                continue

            urls.add(full_url)

        return list(urls)

    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Wyciąga tytuł ze strony."""
        # Próbuj h1
        h1 = soup.find('h1')
        if h1:
            return h1.get_text(strip=True)

        # Fallback: title tag
        title_tag = soup.find('title')
        if title_tag:
            return title_tag.get_text(strip=True)

        return "Unknown Title"

    def _extract_date(self, soup: BeautifulSoup) -> Optional[str]:
        """Wyciąga datę publikacji ze strony."""
        # Próbuj meta tag
        date_meta = soup.find('meta', {'property': 'article:published_time'})
        if date_meta and date_meta.get('content'):
            return date_meta['content']

        # Próbuj time tag
        time_tag = soup.find('time', {'datetime': True})
        if time_tag:
            return time_tag['datetime']

        return None

    def _infer_document_type(self, url: str, title: str) -> str:
        """Inferencja typu dokumentu na podstawie URL i tytułu."""
        url_lower = url.lower()
        title_lower = title.lower()

        if 'press' in url_lower or 'statement' in title_lower:
            return "statement"
        elif 'report' in url_lower or 'publication' in url_lower:
            return "report"
        elif 'speech' in url_lower or 'remarks' in title_lower:
            return "speech"

        return "article"

    async def close(self):
        """Zamyka HTTP client."""
        await self.client.aclose()


async def scrape_all_sources(include_json_sources: bool = True) -> List[ScrapedDocument]:
    """
    Scrapuje wszystkie skonfigurowane źródła.

    Args:
        include_json_sources: Czy uwzględnić źródła z organisations.json

    Returns:
        Lista wszystkich zescrapowanych dokumentów
    """
    scraper = DocumentScraper()

    if include_json_sources:
        sources = SourceConfig.get_all_sources()
    else:
        sources = [
            SourceConfig.NATO,
            SourceConfig.EU_COMMISSION,
            SourceConfig.US_STATE
        ]

    all_documents = []

    logger.info(f"Rozpoczynam scrapowanie {len(sources)} źródeł...")

    for source in sources:
        try:
            docs = await scraper.scrape_source(source)
            all_documents.extend(docs)
            logger.info(f"✓ {source['source_code']}: {len(docs)} dokumentów")
        except Exception as e:
            logger.error(f"✗ Błąd scrapowania {source['source_code']}: {e}")
            continue

    await scraper.close()

    logger.info(f"Łącznie zescrapowano {len(all_documents)} dokumentów z {len(sources)} źródeł")
    return all_documents


async def scrape_single_source(source_code: str) -> List[ScrapedDocument]:
    """
    Scrapuje pojedyncze źródło po kodzie.

    Args:
        source_code: Kod źródła (np. "NATO", "DE_MAE")

    Returns:
        Lista zescrapowanych dokumentów
    """
    scraper = DocumentScraper()
    all_sources = SourceConfig.get_all_sources()

    source = next((s for s in all_sources if s["source_code"] == source_code), None)
    if not source:
        logger.error(f"Nie znaleziono źródła: {source_code}")
        await scraper.close()
        return []

    try:
        docs = await scraper.scrape_source(source)
        logger.info(f"Zescrapowano {len(docs)} dokumentów z {source_code}")
    except Exception as e:
        logger.error(f"Błąd scrapowania {source_code}: {e}")
        docs = []

    await scraper.close()
    return docs
