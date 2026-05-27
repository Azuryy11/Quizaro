# Architecture du projet Quizaro

Derniere mise a jour: 01/05/2026

## Vue d'ensemble

Le projet est organisé autour d'un backend Symfony exécuté dans Docker et d'un frontend Vite séparé pour l'interface moderne côté client.

## Composants principaux

- Backend Symfony : logique métier, sécurité, formulaires, vues Twig et API.
- Base PostgreSQL : stockage persistant des données.
- Frontend Vite : interface TypeScript/JavaScript avec proxy vers le backend.
- Docker Compose : orchestration des services de développement.

## Modules applicatifs notables

- Authentification: sessions Symfony + endpoints API d'auth.
- Gestion quiz: entites `Quiz`, `Question`, `Answer`, `QuestionAnswer`.
- Sessions de jeu: entites `QuizSession`, `PlayerSession`, `UserAnswer`.
- Lobby temps reel (polling): page frontend `waitingSessionPage.ts` + endpoint lobby API.

## Services Docker identifiés

- `php` : application Symfony sous FrankenPHP.
- `database` : PostgreSQL.
- `adminer` : administration de la base.
- `mailer` : Mailpit pour les tests email en local.

## Flux applicatif simplifié

1. Le navigateur charge soit l'application Symfony, soit le frontend Vite en développement.
2. Le frontend envoie ses requêtes vers le backend via les routes proxifiées.
3. Symfony traite les contrôleurs, la sécurité et l'accès aux données.
4. Doctrine communique avec PostgreSQL.
5. Les réponses sont renvoyées en HTML, JSON ou via les mécanismes Turbo selon le cas d'usage.

## Flux lobby (salle d'attente)

1. Le frontend appelle periodiquement `GET /api/quiz-sessions/{id}/lobby`.
2. Le backend verifie les droits (proprietaire, joueur connecte ou joueur invite via token).
3. Le backend renvoie l'etat de session (`WAITING`, `RUNNING`, `FINISHED`) et la liste des pseudos presentes (`session.players`).
4. Le frontend met a jour le compteur et la liste des pseudos sans recharger la page.
5. Quand l'etat passe a `RUNNING`, le frontend redirige automatiquement vers la page de jeu.

## Sécurité identifiée

- Authentification par formulaire Symfony.
- Fournisseur utilisateur basé sur l'entité `User` avec l'email comme identifiant.
- Zone `/admin` protégée par le rôle `ROLE_ADMIN`.
- Routes `/api/auth` rendues accessibles publiquement pour l'authentification.
- Acces lobby controle aussi pour les invites via token joueur (`X-Player-Token`).

## Développement local

- Mode développement Docker avec montage du code source.
- Xdebug disponible mais désactivable selon la variable d'environnement.
- Vite configuré avec proxy HTTPS vers `https://localhost`.