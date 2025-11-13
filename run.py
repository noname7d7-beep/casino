from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api.index import router as api_router


app = FastAPI(title="MoneyTalks Promo API")

# CORS (на будущее для Telegram MiniApp)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API
app.include_router(api_router)

# фронтенд (HTML/CSS/JS/картинки)
app.mount("/", StaticFiles(directory="frontend/public", html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    print("🚀 Server running at http://127.0.0.1:8000")
    uvicorn.run("run:app", host="0.0.0.0", port=8000, reload=True)