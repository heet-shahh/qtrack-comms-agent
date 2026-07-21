"""Native starter API.

A minimal FastAPI app the builder agent grows. In dev it runs as a plain
`uvicorn` process behind the vite dev server (which proxies /api here). In the
published image there is no vite — the compiled frontend sits in app/static and
this app serves it too (see the fallback at the bottom).
"""

from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env (holds RETELL_API_KEY) before the router reads it at import.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI

from .retell import router as retell_router

app = FastAPI(title="reflect-app")

# Voice adapter: /api/health, /api/voices, /api/web-call, /api/call/{id}.
app.include_router(retell_router)


@app.get("/api/hello")
def hello():
    return {"message": "Hello from ryureflect 👋"}


# Published-mode SPA serving: app/static only exists in the publish image (the
# Dockerfile copies the vite build there), so this is a no-op in dev. A 404
# handler (rather than a catch-all route) keeps it order-independent — API
# routes added anywhere in the app always win.
_STATIC = Path(__file__).resolve().parent / "static"
if _STATIC.is_dir():
    from fastapi.responses import FileResponse, JSONResponse

    @app.exception_handler(404)
    async def _spa_fallback(request, exc):
        path = request.url.path
        if request.method == "GET" and not path.startswith("/api"):
            file = (_STATIC / path.lstrip("/")).resolve()
            if file.is_file() and file.is_relative_to(_STATIC):
                return FileResponse(file)
            return FileResponse(_STATIC / "index.html")
        return JSONResponse({"detail": "Not Found"}, status_code=404)
