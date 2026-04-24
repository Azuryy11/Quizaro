<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260306093000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop legacy score table (if it exists) after removing Score entity.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS score CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('Score entity/table removed.');
    }
}
