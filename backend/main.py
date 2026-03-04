from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.chat import router as chat_router
from app.api.routes.conversations import router as conversations_router
from app.db.mongo import MongoClientSingleton

@asynccontextmanager
async def lifespan(_: FastAPI):
    await MongoClientSingleton.connect()
    try:
        yield
    finally:
        await MongoClientSingleton.disconnect()


app = FastAPI(
    title="WeatherPocket API",
    description="Weather tracking API with JWT authentication",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(conversations_router)
app.include_router(chat_router)


@app.get("/")
async def root():
    return {"message": "WeatherPocket API is running"}

@app.get("/api/weather")
async def get_weather(city: str):
    # TODO: Implement weather API logic
    return {"city": city, "temp": 25}