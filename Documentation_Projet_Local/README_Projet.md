# Quizaro

Derniere mise a jour: 01/05/2026

## Presentation

Quizaro est une application de quiz multi-joueurs basee sur:

- un backend Symfony (API + vues Twig),
- un frontend Vite en TypeScript pour l'experience de jeu,
- une base PostgreSQL,
- un environnement Docker Compose pour le developpement local.

## Demarrage rapide

Depuis `symfony-docker/`:

```powershell
docker compose up -d
```

Depuis `symfony-docker/frontend/`:

```powershell
npm install
npm run dev
```

## Parcours session quiz

1. Le createur lance une session de quiz.
2. Les joueurs rejoignent via code de session.
3. La salle d'attente (lobby) affiche le code, le nombre de joueurs et la liste des pseudos.
4. Le createur demarre la session.
5. Les joueurs repondent et les resultats sont calcules par `PlayerSession`.

## Point API notable (lobby)

Route: `GET /api/quiz-sessions/{id}/lobby`

Le payload `session` contient notamment:

- `quizSessionId`
- `code`
- `status`
- `isOwner`
- `playerCount`
- `players` (liste ordonnee des pseudos)
- `startedAt`

La liste `players` est ordonnee par date d'arrivee (`joinedAt`) et contient les pseudos de tous les participants de la session.

## Emplacements clefs du code

- Backend API session quiz: `backend/src/Controller/ApiQuizSessionController.php`
- Entite joueur en session: `backend/src/Entity/PlayerSession.php`
- Page lobby frontend: `frontend/src/pages/waitingSessionPage.ts`
- Styles lobby frontend: `frontend/src/style.css`