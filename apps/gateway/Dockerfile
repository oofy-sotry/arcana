# LLM 게이트웨이와 요약 워커가 함께 쓰는 이미지 — 워커는 compose에서 command만 바꾼다
# docker build apps/gateway
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY arcana_gateway arcana_gateway
COPY config config
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin gateway
USER gateway
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=2)"
CMD ["uvicorn", "arcana_gateway.main:build_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
