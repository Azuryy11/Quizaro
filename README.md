# Quizaro

Stack locale du projet Quizaro: backend Symfony + frontend Vite + PostgreSQL via Docker Compose.

## Lancer le projet

Depuis ce dossier:

```powershell
docker compose up -d
```

Frontend Vite (dans un second terminal):

```powershell
Set-Location frontend
npm install
npm run dev
```

## Services

- `php`: application Symfony (FrankenPHP)
- `database`: PostgreSQL
- `adminer`: interface SQL locale
- `mailer`: Mailpit (dev)

## Dossiers principaux

- `backend/`: application Symfony (API, entities, migrations, templates)
- `frontend/`: application TypeScript (pages, composants, styles)
- `frankenphp/`: configuration serveur

## Session quiz et lobby

- Endpoint lobby: `GET /api/quiz-sessions/{id}/lobby`
- Le payload lobby expose `playerCount` et `players` (liste des pseudos)
- La page `frontend/src/pages/waitingSessionPage.ts` affiche la liste des pseudos en salle d'attente

## Verifications rapides

```powershell
# Backend
Set-Location backend
php -l src/Controller/ApiQuizSessionController.php

# Frontend
Set-Location ../frontend
npm run build
```