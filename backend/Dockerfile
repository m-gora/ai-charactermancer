FROM python:3.12-slim

WORKDIR /app

# Copy source before installing so the editable install registers correctly
COPY pyproject.toml .
COPY src/ src/
RUN pip install --no-cache-dir -e .

ENV PYTHONPATH=/app/src

EXPOSE 8000

CMD ["uvicorn", "character_backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
