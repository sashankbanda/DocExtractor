# Document Extractor

Dark themed insurance document extraction platform mirroring the provided prototype. Built with React + Tailwind on the frontend and FastAPI + MongoDB on the backend.

## Tech Stack

- React 18 (Vite + TypeScript), Tailwind CSS, Zustand, React Query, PDF.js
- FastAPI, Motor (MongoDB), PyMuPDF, EasyOCR, Pandas/OpenPyXL
- Docker Compose for local dev (FastAPI, MongoDB, Vite dev server)

## Getting Started

```bash
git clone <repo>
cd document-extractor
docker compose up --build
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:8000`, MongoDB on `mongodb://localhost:27017`.

## Manual Setup

```bash
cd client
npm install
npm run dev

cd ../server
python -m venv .venv && .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Postman

Import `postman/DocumentExtractor.postman_collection.json` and configure environment variables:

- `BASE_URL` (default `http://localhost:8000`)
- `FILE_ID`
- `TOKEN` (placeholder)

## Directory Layout

```
document-extractor/
├─ client/   # React UI
├─ server/   # FastAPI services
├─ uploads/  # Local file storage
├─ postman/  # Collection
└─ docker-compose.yml
```

## Notes

- Upload limit: 5 files, 20 MB each. Supported: PDF, XLS, XLSX, CSV.
- Extraction schema defined in `server/app/schemas/extraction.py`.
- Local LLM fallback via Ollama (see `server/app/utils/llm_fallback.py`).

