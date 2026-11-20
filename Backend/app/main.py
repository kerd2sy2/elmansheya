from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, fallback, notifications, reports

@asynccontextmanager
async def lifespan(app: FastAPI):
    # إنشاء عميل HTTP غير متزامن مجمع الاتصالات لجميع طلبات الأبستريم
    app.state.http_client = httpx.AsyncClient(timeout=180.0)
    yield
    await app.state.http_client.aclose()

app = FastAPI(
    title="بوابة قرية المنشية الذكية | Elmansheya API Gateway",
    description="بوابة الخدمات الذكية والتوثيق والإشعارات الفورية لقرية المنشية",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# تفعيل الـ CORS الكامل لجميع المنصات
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "elmansheya-gateway-fastapi",
        "version": "2.0.0",
        "architecture": "modular"
    }

# تسجيل الموجهات المعيارية
app.include_router(notifications.router)
app.include_router(reports.router)
app.include_router(auth.router)

# تسجيل البوابة العكسية للأبستريم في النهاية لمعالجة باقي المسارات
app.include_router(fallback.router)
