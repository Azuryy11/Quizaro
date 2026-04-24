<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260304071527 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE question_answer (question_id INT NOT NULL, answer_id INT NOT NULL, PRIMARY KEY (question_id, answer_id))');
        $this->addSql('CREATE INDEX IDX_DD80652D1E27F6BF ON question_answer (question_id)');
        $this->addSql('CREATE INDEX IDX_DD80652DAA334807 ON question_answer (answer_id)');
        $this->addSql('ALTER TABLE question_answer ADD CONSTRAINT FK_DD80652D1E27F6BF FOREIGN KEY (question_id) REFERENCES question (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE question_answer ADD CONSTRAINT FK_DD80652DAA334807 FOREIGN KEY (answer_id) REFERENCES answer (id) ON DELETE CASCADE');

        $this->addSql("INSERT INTO answer (content, is_correct, position) SELECT 'VRAI', true, 1 WHERE NOT EXISTS (SELECT 1 FROM answer WHERE content = 'VRAI')");
        $this->addSql("INSERT INTO answer (content, is_correct, position) SELECT 'FAUX', false, 2 WHERE NOT EXISTS (SELECT 1 FROM answer WHERE content = 'FAUX')");

        $this->addSql('ALTER TABLE question ADD correct_answer_id INT DEFAULT NULL');
        $this->addSql('CREATE INDEX IDX_B6F7494EFD2E7CF7 ON question (correct_answer_id)');

        $this->addSql("UPDATE question q SET correct_answer_id = (SELECT a_true.id FROM answer a_true WHERE a_true.content = 'VRAI' ORDER BY a_true.id ASC LIMIT 1) WHERE EXISTS (SELECT 1 FROM answer a WHERE a.question_id = q.id AND a.content = 'VRAI' AND a.is_correct = true)");
        $this->addSql("UPDATE question q SET correct_answer_id = (SELECT a_false.id FROM answer a_false WHERE a_false.content = 'FAUX' ORDER BY a_false.id ASC LIMIT 1) WHERE correct_answer_id IS NULL");

        $this->addSql("INSERT INTO question_answer (question_id, answer_id) SELECT q.id, a_true.id FROM question q CROSS JOIN (SELECT id FROM answer WHERE content = 'VRAI' ORDER BY id ASC LIMIT 1) a_true ON CONFLICT DO NOTHING");
        $this->addSql("INSERT INTO question_answer (question_id, answer_id) SELECT q.id, a_false.id FROM question q CROSS JOIN (SELECT id FROM answer WHERE content = 'FAUX' ORDER BY id ASC LIMIT 1) a_false ON CONFLICT DO NOTHING");

        $this->addSql("UPDATE user_answer ua SET answer_id = (SELECT a_true.id FROM answer a_true WHERE a_true.content = 'VRAI' ORDER BY a_true.id ASC LIMIT 1) WHERE ua.answer_id IN (SELECT a.id FROM answer a WHERE a.content = 'VRAI' AND a.id <> (SELECT id FROM answer WHERE content = 'VRAI' ORDER BY id ASC LIMIT 1))");
        $this->addSql("UPDATE user_answer ua SET answer_id = (SELECT a_false.id FROM answer a_false WHERE a_false.content = 'FAUX' ORDER BY a_false.id ASC LIMIT 1) WHERE ua.answer_id IN (SELECT a.id FROM answer a WHERE a.content = 'FAUX' AND a.id <> (SELECT id FROM answer WHERE content = 'FAUX' ORDER BY id ASC LIMIT 1))");

        $this->addSql("DELETE FROM answer WHERE content = 'VRAI' AND id <> (SELECT id FROM answer WHERE content = 'VRAI' ORDER BY id ASC LIMIT 1)");
        $this->addSql("DELETE FROM answer WHERE content = 'FAUX' AND id <> (SELECT id FROM answer WHERE content = 'FAUX' ORDER BY id ASC LIMIT 1)");

        $this->addSql("CREATE UNIQUE INDEX UNIQ_ANSWER_TRUE_SINGLETON ON answer (content) WHERE content = 'VRAI'");
        $this->addSql("CREATE UNIQUE INDEX UNIQ_ANSWER_FALSE_SINGLETON ON answer (content) WHERE content = 'FAUX'");

        $this->addSql('ALTER TABLE answer DROP CONSTRAINT fk_dadd4a251e27f6bf');
        $this->addSql('DROP INDEX idx_dadd4a251e27f6bf');
        $this->addSql('ALTER TABLE answer DROP question_id');
        $this->addSql('ALTER TABLE question ALTER quiz_id SET NOT NULL');
        $this->addSql('ALTER TABLE question ALTER correct_answer_id SET NOT NULL');
        $this->addSql('ALTER TABLE question ADD CONSTRAINT FK_B6F7494EFD2E7CF7 FOREIGN KEY (correct_answer_id) REFERENCES answer (id) NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS UNIQ_ANSWER_TRUE_SINGLETON');
        $this->addSql('DROP INDEX IF EXISTS UNIQ_ANSWER_FALSE_SINGLETON');
        $this->addSql('ALTER TABLE question_answer DROP CONSTRAINT FK_DD80652D1E27F6BF');
        $this->addSql('ALTER TABLE question_answer DROP CONSTRAINT FK_DD80652DAA334807');
        $this->addSql('DROP TABLE question_answer');
        $this->addSql('ALTER TABLE answer ADD question_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE answer ADD CONSTRAINT fk_dadd4a251e27f6bf FOREIGN KEY (question_id) REFERENCES question (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE INDEX idx_dadd4a251e27f6bf ON answer (question_id)');
        $this->addSql('ALTER TABLE question DROP CONSTRAINT FK_B6F7494EFD2E7CF7');
        $this->addSql('DROP INDEX IDX_B6F7494EFD2E7CF7');
        $this->addSql('ALTER TABLE question DROP correct_answer_id');
        $this->addSql('ALTER TABLE question ALTER quiz_id DROP NOT NULL');
    }
}
