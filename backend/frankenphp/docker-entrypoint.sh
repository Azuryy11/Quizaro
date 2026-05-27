#!/bin/sh
set -e

if [ "$1" = 'frankenphp' ] || [ "$1" = 'php' ] || [ "$1" = 'bin/console' ]; then
	# Install the project the first time PHP is started
	# After the installation, the following block can be deleted
	if [ ! -f composer.json ]; then
		rm -Rf tmp/
		composer create-project "symfony/skeleton $SYMFONY_VERSION" tmp --stability="$STABILITY" --prefer-dist --no-progress --no-interaction --no-install

		cd tmp
		cp -Rp . ..
		cd -
		rm -Rf tmp/

		composer require "php:>=$PHP_VERSION"
		composer config --json extra.symfony.docker 'true'

		if grep -q ^DATABASE_URL= .env; then
			echo 'To finish the installation please press Ctrl+C to stop Docker Compose and run: docker compose up --build --wait'
			sleep infinity
		fi
	fi

	if [ -z "$(ls -A 'vendor/' 2>/dev/null)" ]; then
		composer install --prefer-source --no-progress --no-interaction
	fi

	# Skip non-essential bin/console startup check: if console hangs, web server never starts.

	if grep -q ^DATABASE_URL= .env; then
		echo 'Waiting for database to be ready...'
		ATTEMPTS_LEFT_TO_REACH_DATABASE=60
		until [ $ATTEMPTS_LEFT_TO_REACH_DATABASE -eq 0 ] || DATABASE_ERROR=$(php bin/console dbal:run-sql -q "SELECT 1" 2>&1); do
			if [ $? -eq 255 ]; then
				# If the Doctrine command exits with 255, an unrecoverable error occurred
				ATTEMPTS_LEFT_TO_REACH_DATABASE=0
				break
			fi
			sleep 1
			ATTEMPTS_LEFT_TO_REACH_DATABASE=$((ATTEMPTS_LEFT_TO_REACH_DATABASE - 1))
			echo "Still waiting for database to be ready... Or maybe the database is not reachable. $ATTEMPTS_LEFT_TO_REACH_DATABASE attempts left."
		done

		if [ $ATTEMPTS_LEFT_TO_REACH_DATABASE -eq 0 ]; then
			echo 'The database is not up or not reachable:'
			echo "$DATABASE_ERROR"
			exit 1
		else
			echo 'The database is now ready and reachable'
		fi

		if [ "${AUTO_DB_MIGRATE:-1}" != '1' ]; then
			echo 'Skipping automatic database migration at startup (AUTO_DB_MIGRATE != 1)'
		elif [ "$(find ./migrations -iname '*.php' -print -quit)" ]; then
			QUIZ_SESSION_TABLE_EXISTS=$(php -r '
				$url = getenv("DATABASE_URL");
				if (!$url) {
					fwrite(STDERR, "DATABASE_URL is not defined\n");
					exit(1);
				}

				$parts = parse_url($url);
				if ($parts === false || !isset($parts["host"], $parts["path"])) {
					fwrite(STDERR, "DATABASE_URL is invalid\n");
					exit(1);
				}

				$dbname = ltrim($parts["path"], "/");
				$dsn = sprintf(
					"pgsql:host=%s;port=%s;dbname=%s",
					$parts["host"],
					$parts["port"] ?? 5432,
					$dbname
				);

				$pdo = new PDO(
					$dsn,
					rawurldecode($parts["user"] ?? ""),
					rawurldecode($parts["pass"] ?? ""),
					[PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
				);

				$sql = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = current_schema()"
					. " AND table_name = " . chr(39) . "quiz_session" . chr(39);

				echo (string) $pdo->query($sql)->fetchColumn();
			')

			if [ "$QUIZ_SESSION_TABLE_EXISTS" = '0' ]; then
				echo 'Fresh database detected, bootstrapping schema from current entity metadata'
				php bin/console doctrine:schema:update --force --complete --no-interaction
				php bin/console doctrine:migrations:sync-metadata-storage --no-interaction
				php bin/console doctrine:migrations:version --add --all --no-interaction
			else
				php bin/console doctrine:migrations:migrate --no-interaction --all-or-nothing
			fi
		fi
	fi

	echo 'PHP app ready!'
fi

exec docker-php-entrypoint "$@"
