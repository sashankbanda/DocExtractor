from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import upload, extract, documents, export

app = FastAPI(title="Document Extractor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(extract.router)
app.include_router(documents.router)
app.include_router(export.router)


@app.get("/health")
async def health():
    return {"status": "ok"}

