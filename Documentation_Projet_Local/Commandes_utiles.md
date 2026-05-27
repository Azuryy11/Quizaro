# Commandes utiles

Derniere mise a jour: 01/05/2026

## Docker Compose

Depuis le dossier `symfony-docker` :

```powershell
docker compose up -d
docker compose down
docker compose ps
```

## Symfony

```powershell
docker compose exec php php bin/console
docker compose exec php php bin/console cache:clear
docker compose exec php php bin/console doctrine:migrations:migrate
docker compose exec php php bin/console debug:router
```

## Composer

```powershell
docker compose exec php composer install
docker compose exec php composer update
```

## Tests PHP

```powershell
docker compose exec php php bin/phpunit
```

## Verifications rapides

```powershell
# Lint PHP du controleur principal de session
Set-Location symfony-docker/backend
php -l src/Controller/ApiQuizSessionController.php

# Build frontend de verification
Set-Location ../frontend
npm run build
```

## Frontend Vite

Depuis le dossier `symfony-docker/frontend` :

```powershell
npm install
npm run dev
npm run build
npm run preview
```

## Base de données

```powershell
docker compose exec database psql -U app -d app
```

Les identifiants exacts peuvent varier selon les variables d'environnement du projet.

## Accès utiles en développement

- Application : `https://localhost`
- Adminer : `http://localhost:8080`
- Mailpit : port exposé `8025`