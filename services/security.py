"""
Serwis bezpieczeństwa danych i oceny wiarygodności źródeł.
Realizuje mechanizm ochrony przed "data poisoning".
"""
from typing import List, Dict, Optional
from urllib.parse import urlparse
from schemas.schemas import CredibilityScore, CredibilityLevel

class SecurityService:
    """
    Serwis oceniający wiarygodność źródeł informacji.
    """

    # Lista zaufanych domen (whitelist)
    TRUSTED_DOMAINS = [
        "gov.pl", "europa.eu", "nato.int", "state.gov", "un.org",
        "worldbank.org", "imf.org", "who.int", "oecd.org",
        "reuters.com", "bloomberg.com", "apnews.com", "bbc.com",
        "pap.pl", "osw.waw.pl", "pism.pl"
    ]

    # Lista podejrzanych domen (blacklist/watch list) - przykładowa
    SUSPICIOUS_DOMAINS = [
        "rt.com", "sputniknews.com", "tass.com",
        "globalresearch.ca", "infowars.com",
        "fake-news-example.com"
    ]

    def evaluate_credibility(self, source: str, url: Optional[str] = None, content: Optional[str] = None) -> CredibilityScore:
        """
        Ocenia wiarygodność źródła/dokumentu.
        
        Args:
            source: Nazwa źródła (np. "NATO", "Reuters")
            url: URL źródła (opcjonalnie)
            content: Treść dokumentu (opcjonalnie - do analizy sentymentu/anomalii)
            
        Returns:
            CredibilityScore z oceną i uzasadnieniem.
        """
        score = 0.5
        level = CredibilityLevel.MEDIUM
        reasoning = "Standardowa weryfikacja źródła."
        flags = []
        verified = False

        # 1. Sprawdzenie domeny (jeśli jest URL)
        if url:
            domain = self._extract_domain(url)
            if any(trusted in domain for trusted in self.TRUSTED_DOMAINS):
                score = 0.9
                level = CredibilityLevel.HIGH
                reasoning = f"Domena {domain} znajduje się na liście zaufanych instytucji/mediów."
                verified = True
            elif any(suspicious in domain for suspicious in self.SUSPICIOUS_DOMAINS):
                score = 0.1
                level = CredibilityLevel.SUSPICIOUS
                reasoning = f"OSTRZEŻENIE: Domena {domain} jest oznaczona jako potencjalne źródło dezinformacji."
                flags.append("suspicious_domain")

        # 2. Sprawdzenie nazwy źródła (jeśli brak URL lub dodatkowo)
        if not verified and source:
            source_lower = source.lower()
            if "gov" in source_lower or "government" in source_lower or "ministerstwo" in source_lower:
                score = max(score, 0.8)
                level = CredibilityLevel.HIGH
                reasoning = "Źródło rządowe/oficjalne."
                verified = True
            elif "official" in source_lower:
                score = max(score, 0.7)
                level = CredibilityLevel.HIGH
            
        # 3. Analiza treści (bardzo prosta heurystyka pod kątem 'poisoning')
        if content:
            # Sprawdzanie czy tekst nie jest zbyt krótki lub nie zawiera dziwnych znaków
            if len(content) < 50:
                score -= 0.1
                flags.append("short_content")
                reasoning += " Treść jest bardzo krótka, co może sugerować niską jakość."
            
            # Tutaj można dodać bardziej zaawansowaną analizę NLP w przyszłości
            # np. wykrywanie sprzeczności z "wiedzą bazową" (Grounding)

        # Finalne ustalenie poziomu na podstawie score
        if score >= 0.8:
            level = CredibilityLevel.HIGH
        elif score >= 0.5:
            level = CredibilityLevel.MEDIUM
        elif score >= 0.3:
            level = CredibilityLevel.LOW
        else:
            level = CredibilityLevel.SUSPICIOUS

        return CredibilityScore(
            score=score,
            level=level,
            reasoning=reasoning,
            verified=verified,
            flags=flags
        )

    def _extract_domain(self, url: str) -> str:
        try:
            parsed = urlparse(url)
            return parsed.netloc or url
        except:
            return url


# Singleton
_security_service: Optional[SecurityService] = None

def get_security_service() -> SecurityService:
    global _security_service
    if _security_service is None:
        _security_service = SecurityService()
    return _security_service
