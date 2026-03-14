FROM python:3.12-slim

WORKDIR /app

# Install build tools for lxml
RUN apt-get update && apt-get install -y --no-install-recommends \
    libxml2-dev libxslt-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
COPY src/ ./src/

RUN pip install --no-cache-dir -e .

# Ensure the package is importable even when src/ is overridden by a bind mount
ENV PYTHONPATH=/app/src

ENTRYPOINT ["pf1-ingest"]
