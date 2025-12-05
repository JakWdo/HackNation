# Scenariusze Jutra

MSZ | HackNation 2025

## Struktura

```
├── api/
├── schemas/
├── services/
├── core/
│   └── settings.py
├── frontend/
├── main.py
├── requirements.txt
└── .env.example
```

## Uruchomienie

```bash
pip install -r requirements.txt
cp .env.example .env  # uzupełnij klucze
uvicorn main:app --reload
```
