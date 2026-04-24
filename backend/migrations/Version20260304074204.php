<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260304074204 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE answer ADD question_id INT DEFAULT NULL');
        $this->addSql('DROP INDEX IF EXISTS uniq_answer_false_singleton');
        $this->addSql('DROP INDEX IF EXISTS uniq_answer_true_singleton');

        $this->addSql("INSERT INTO answer (question_id, content, is_correct, position)
            SELECT q.id, 'VRAI', CASE WHEN ca.content = 'VRAI' THEN true ELSE false END, 1
            FROM question q
            LEFT JOIN answer ca ON ca.id = q.correct_answer_id");
        $this->addSql("INSERT INTO answer (question_id, content, is_correct, position)
            SELECT q.id, 'FAUX', CASE WHEN ca.content = 'FAUX' THEN true ELSE false END, 2
            FROM question q
            LEFT JOIN answer ca ON ca.id = q.correct_answer_id");

                $this->addSql("UPDATE user_answer ua
                        SET answer_id = a.id
                        FROM answer a
                        WHERE a.question_id = ua.question_id
                            AND a.content = (SELECT old_answer.content FROM answer old_answer WHERE old_answer.id = ua.answer_id)");

                $this->addSql('ALTER TABLE question DROP CONSTRAINT fk_b6f7494efd2e7cf7');
                $this->addSql('DROP INDEX idx_b6f7494efd2e7cf7');

        $this->addSql('ALTER TABLE question_answer DROP CONSTRAINT fk_dd80652d1e27f6bf');
        $this->addSql('ALTER TABLE question_answer DROP CONSTRAINT fk_dd80652daa334807');
        $this->addSql('DROP TABLE question_answer');

        $this->addSql('DELETE FROM answer WHERE question_id IS NULL');

        $this->addSql('ALTER TABLE answer ALTER question_id SET NOT NULL');
        $this->addSql('ALTER TABLE answer ALTER position SET NOT NULL');
        $this->addSql('ALTER TABLE answer ADD CONSTRAINT FK_DADD4A251E27F6BF FOREIGN KEY (question_id) REFERENCES question (id) NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_DADD4A251E27F6BF ON answer (question_id)');

        $this->addSql('ALTER TABLE question DROP correct_answer_id');
        $this->addSql('UPDATE question SET position = 1 WHERE position IS NULL');
        $this->addSql('ALTER TABLE question ALTER position SET NOT NULL');
        $this->addSql('ALTER TABLE question ADD time_limit INT DEFAULT 30 NOT NULL');

        $this->addSql("ALTER TABLE player_session ADD nickname VARCHAR(80) DEFAULT '' NOT NULL");
        $this->addSql('ALTER TABLE player_session ALTER quiz_session_id SET NOT NULL');
        $this->addSql('ALTER TABLE player_session ALTER user_id SET NOT NULL');

        $this->addSql("ALTER TABLE quiz_session ADD status VARCHAR(20) DEFAULT 'WAITING' NOT NULL");
        $this->addSql('ALTER TABLE quiz_session ALTER quiz_id SET NOT NULL');

        $this->addSql('ALTER TABLE user_answer ADD response_time_ms INT DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE user_answer ADD is_correct BOOLEAN DEFAULT false NOT NULL');
        $this->addSql('ALTER TABLE user_answer ALTER player_session_id SET NOT NULL');
        $this->addSql('ALTER TABLE user_answer ALTER question_id SET NOT NULL');
        $this->addSql('ALTER TABLE user_answer ALTER answer_id SET NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('This migration transforms answer ownership and cannot be safely reversed automatically.');
    }
}
