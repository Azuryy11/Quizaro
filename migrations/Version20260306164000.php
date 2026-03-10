<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260306164000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Enrich question_answer with is_correct + position and remove correct_answer_id from question.';
    }

    public function up(Schema $schema): void
    {
        // If a previous attempt created an enriched table, remove it.
        $this->addSql('DROP TABLE IF EXISTS question_answer_enriched');

        $this->addSql('ALTER TABLE question_answer ADD is_correct BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addSql('ALTER TABLE question_answer ADD position INT NOT NULL DEFAULT 1');

        // Backfill correctness using question.correct_answer_id.
        $this->addSql('UPDATE question_answer qa SET is_correct = (qa.answer_id = q.correct_answer_id) FROM question q WHERE q.id = qa.question_id');

        // Backfill position per question using a stable order.
        $this->addSql('UPDATE question_answer qa SET position = s.rn FROM (SELECT question_id, answer_id, ROW_NUMBER() OVER (PARTITION BY question_id ORDER BY answer_id) AS rn FROM question_answer) s WHERE qa.question_id = s.question_id AND qa.answer_id = s.answer_id');

        $this->addSql('ALTER TABLE question_answer ALTER COLUMN is_correct DROP DEFAULT');
        $this->addSql('ALTER TABLE question_answer ALTER COLUMN position DROP DEFAULT');

        // Drop old correct_answer_id FK and column (replaced by question_answer.is_correct).
        $this->addSql('ALTER TABLE question DROP CONSTRAINT IF EXISTS fk_b6f7494efd2e7cf7');
        $this->addSql('DROP INDEX IF EXISTS idx_b6f7494efd2e7cf7');
        $this->addSql('ALTER TABLE question DROP COLUMN IF EXISTS correct_answer_id');
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('This migration reshapes correctness source of truth into question_answer.');
    }
}
