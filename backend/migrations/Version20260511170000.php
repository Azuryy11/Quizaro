<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260511170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add indexes for quiz session cleanup filters';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_quiz_session_status_started_at ON quiz_session (status, started_at)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_quiz_session_status_ended_at ON quiz_session (status, ended_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_quiz_session_status_started_at');
        $this->addSql('DROP INDEX IF EXISTS idx_quiz_session_status_ended_at');
    }
}
