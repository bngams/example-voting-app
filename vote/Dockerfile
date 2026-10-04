# Fork pédagogique du service "vote" (dockersamples/example-voting-app).
# Une seule recette pour toutes les versions : seule APP_VERSION change.
#   docker build --build-arg APP_VERSION=2.0 -t ghcr.io/bngams/kube-vote:2.0 .
FROM python:3.11-slim

WORKDIR /usr/local/app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ARG APP_VERSION=1.0
ENV APP_VERSION=${APP_VERSION}

EXPOSE 80

CMD ["gunicorn", "app:app", "-b", "0.0.0.0:80", "--log-file", "-", "--access-logfile", "-", "--workers", "2", "--keep-alive", "0"]
