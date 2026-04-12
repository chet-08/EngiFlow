from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import syllabus, tutor, progress, knowledge
import time

# 1. Initialize the App with metadata
app = FastAPI(
    title="EngiFlow API",
    description="The intelligent backend engine for IGDTUW's AI Tutoring Platform",
    version="1.0.0"
)

# 2. Robust CORS Configuration
# Added common development origins to prevent "blocked by CORS" errors
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000", # Common for other frontend tools
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, OPTIONS, etc.
    allow_headers=["*"],  # Allows Authorization, Content-Type, etc.
)

# 3. Request Middleware (Optional but helpful for debugging)
@app.middleware("http")
async def add_process_time_header(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# 4. Include Routers
app.include_router(syllabus.router)
app.include_router(tutor.router)
app.include_router(progress.router)
app.include_router(knowledge.router)

# 5. Health Check Endpoints
@app.get("/", tags=["Health"])
def read_root():
    return {
        "status": "online",
        "message": "EngiFlow Engine is running smoothly 🚀",
        "version": "1.0.0"
    }

@app.get("/health", tags=["Health"])
def health_check():
    # You can expand this later to check DB connectivity
    return {"status": "healthy"}