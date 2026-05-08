# TaskFlow Backend — Cloud Run Dockerfile
FROM python:3.10-slim

WORKDIR /app

ENV NO_PROXY=metadata.google.internal,169.254.169.254 \
    DEBIAN_FRONTEND=noninteractive

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app
COPY ./api ./api

EXPOSE 8080

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8080"]
