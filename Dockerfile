# Publish image for this app: the frontend is compiled to static files and
# served by the FastAPI backend on :8000 (single container, no dev servers).
# Dependency changes flow through package.json / requirements.txt automatically;
# this file only needs editing when the app grows a system-level need
# (an OS package, a database, an extra process).

FROM node:22-slim AS fe
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /srv
COPY backend/requirements.txt ./
RUN uv pip install --system --no-cache -r requirements.txt
COPY backend/ ./
# app.main serves this dir as the SPA when present (see backend/app/main.py).
COPY --from=fe /fe/dist ./app/static
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
