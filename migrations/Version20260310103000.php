<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260310103000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add owner relation to quiz_session.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE quiz_session ADD owner_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE quiz_session ADD CONSTRAINT fk_quiz_session_owner FOREIGN KEY (owner_id) REFERENCES "user" (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE INDEX idx_quiz_session_owner_id ON quiz_session (owner_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE quiz_session DROP CONSTRAINT IF EXISTS fk_quiz_session_owner');
        $this->addSql('DROP INDEX IF EXISTS idx_quiz_session_owner_id');
        $this->addSql('ALTER TABLE quiz_session DROP COLUMN IF EXISTS owner_id');
    }
}
