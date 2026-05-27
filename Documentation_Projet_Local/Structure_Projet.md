# Structure du projet

Derniere mise a jour: 01/05/2026

## Racine du workspace

- `symfony-docker/` : application principale.
- `Documentation_Projet_Local/` : dossier documentaire local centralisé.
- `Quizaro_Logo.avif` : ressource graphique a la racine du workspace.
- `Dossier_Pro/` : dossier annexe (selon l'avancement du projet).

## Dossier Symfony principal

- `backend/` : application Symfony complete (code, config, migrations, templates, tests).
- `frontend/` : application Vite (TypeScript, pages, composants, styles).
- `frankenphp/` : configuration Caddy/FrankenPHP (niveau environnement).
- `compose.yaml` et `compose.override.yaml` : orchestration Docker locale.
- `README.md` : README du sous-projet `symfony-docker`.

## Détails utiles

### Backend

- `backend/src/Controller/` : contrôleurs web et API.
- `backend/src/Entity/` : entités Doctrine.
- `backend/src/Repository/` : accès aux données.
- `backend/src/Form/` : formulaires Symfony.
- `backend/src/Command/` : commandes console.
- `backend/config/` : configuration Symfony.
- `backend/migrations/` : migrations Doctrine.
- `backend/templates/` : vues Twig.

### Frontend

- `frontend/src/pages/` : pages ou vues frontend.
- `frontend/src/components/` : composants réutilisables.
- `frontend/src/utils/` : helpers.
- `frontend/src/types/` : types TypeScript.
- `frontend/src/style.css` : styles globaux de l'application frontend.
- `frontend/src/main.ts` : point d'entree de l'application frontend.

## Logique de séparation

Le projet mélange une partie Symfony classique avec Twig et une partie frontend dédiée sous Vite. Cette séparation permet d'avoir un backend structuré et une interface plus dynamique côté client.