# Technologies utilisées dans Quizaro

Derniere mise a jour: 01/05/2026

## Infrastructure et environnement

- Docker : conteneurisation du projet.
- Docker Compose : orchestration des services via `compose.yaml`.
- FrankenPHP : serveur d'application PHP et serveur web.
- Caddy : configuration web embarquée avec FrankenPHP.
- PostgreSQL : base de données principale.
- Adminer : interface d'administration de la base de données.

## Backend

- PHP 8.4 : langage principal côté serveur.
- Symfony 8 : framework backend principal.
- Symfony Security : authentification et sécurité.
- Symfony Form : gestion des formulaires.
- Symfony Validator : validation des données.
- Symfony Twig Bundle : rendu des vues serveur.
- Symfony Mailer et Notifier : services de communication.
- Symfony Console : commandes CLI.
- Symfony Asset Mapper : gestion des assets côté Symfony.
- Symfony Stimulus Bundle : intégration Stimulus.
- Symfony UX Turbo : navigation améliorée côté client.

## Données et persistance

- Doctrine ORM : mapping objet-relationnel.
- Doctrine Migrations : gestion de l'évolution du schéma.
- Doctrine DBAL : couche d'accès base de données.
- Mapping par attributs PHP : configuration des entités.

## Frontend

- HTML : structure des pages.
- CSS : styles de l'application.
- JavaScript : scripts côté client.
- TypeScript : frontend Vite dédié dans le dossier `frontend`.
- Vite : serveur de développement et build frontend.
- Modules ES : chargement moderne du code frontend.
- Stimulus : contrôleurs JavaScript côté Symfony.
- Turbo : navigation et mise à jour d'interface.
- Feather Icons : bibliothèque d'icônes.
- QRCode (`qrcode`) : generation du QR code de session dans le lobby.

## Templates et rendu

- Twig : moteur de templates côté Symfony.
- Importmap : chargement de modules JavaScript côté application Symfony.

## Outils de qualité et développement

- Git : gestion de version.
- GitHub : hébergement du dépôt et collaboration.
- Composer : gestionnaire de dépendances PHP.
- npm : gestionnaire de dépendances frontend.
- PHPUnit 13 : tests PHP.
- Xdebug : débogage en environnement de développement Docker.
- Monolog : journalisation applicative.

## Documentation et modélisation

- Mermaid : diagrammes, notamment pour le schéma de base de données.
- UML : modélisation fonctionnelle et technique.
- MLD : modélisation de données.

## Résumé de l'architecture

Le projet repose sur un backend Symfony en PHP exécuté dans Docker avec FrankenPHP, une base PostgreSQL, un frontend Vite en TypeScript/JavaScript, ainsi que des vues Twig et des assets gérés via Asset Mapper, Stimulus, Turbo et Importmap.

## Services détectés dans l'environnement

- `php` : service applicatif principal.
- `database` : conteneur PostgreSQL.
- `adminer` : interface de gestion SQL.
- `mailer` : service Mailpit pour tester les emails en développement.