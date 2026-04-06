<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260403144152 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Fix answer.content column length from VARCHAR(20) to VARCHAR(255)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE answer ALTER COLUMN content TYPE VARCHAR(255)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE answer ALTER COLUMN content TYPE VARCHAR(20)');
    }
}
