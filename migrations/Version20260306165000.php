<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260306165000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Drop obsolete is_correct and position columns from answer table.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE answer DROP COLUMN IF EXISTS is_correct');
        $this->addSql('ALTER TABLE answer DROP COLUMN IF EXISTS position');
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('Cannot restore dropped answer columns safely.');
    }
}
