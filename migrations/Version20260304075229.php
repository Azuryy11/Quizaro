<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260304075229 extends AbstractMigration
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

        $this->addSql('ALTER TABLE question ADD correct_answer_id INT DEFAULT NULL');

        $this->addSql('INSERT INTO question_answer (question_id, answer_id) SELECT question_id, id FROM answer ON CONFLICT DO NOTHING');

        $this->addSql("UPDATE question_answer SET answer_id = (SELECT MIN(id) FROM answer WHERE content = 'VRAI') WHERE answer_id IN (SELECT id FROM answer WHERE content = 'VRAI' AND id <> (SELECT MIN(id) FROM answer WHERE content = 'VRAI'))");
        $this->addSql("UPDATE question_answer SET answer_id = (SELECT MIN(id) FROM answer WHERE content = 'FAUX') WHERE answer_id IN (SELECT id FROM answer WHERE content = 'FAUX' AND id <> (SELECT MIN(id) FROM answer WHERE content = 'FAUX'))");

        $this->addSql("UPDATE user_answer SET answer_id = (SELECT MIN(id) FROM answer WHERE content = 'VRAI') WHERE answer_id IN (SELECT id FROM answer WHERE content = 'VRAI' AND id <> (SELECT MIN(id) FROM answer WHERE content = 'VRAI'))");
        $this->addSql("UPDATE user_answer SET answer_id = (SELECT MIN(id) FROM answer WHERE content = 'FAUX') WHERE answer_id IN (SELECT id FROM answer WHERE content = 'FAUX' AND id <> (SELECT MIN(id) FROM answer WHERE content = 'FAUX'))");

        $this->addSql("UPDATE question q SET correct_answer_id = CASE
            WHEN EXISTS (SELECT 1 FROM answer a WHERE a.question_id = q.id AND a.content = 'VRAI' AND a.is_correct = true) THEN (SELECT MIN(id) FROM answer WHERE content = 'VRAI')
            WHEN EXISTS (SELECT 1 FROM answer a WHERE a.question_id = q.id AND a.content = 'FAUX' AND a.is_correct = true) THEN (SELECT MIN(id) FROM answer WHERE content = 'FAUX')
            ELSE (SELECT MIN(id) FROM answer WHERE content = 'FAUX')
        END");

        $this->addSql("DELETE FROM answer WHERE content = 'VRAI' AND id <> (SELECT MIN(id) FROM answer WHERE content = 'VRAI')");
        $this->addSql("DELETE FROM answer WHERE content = 'FAUX' AND id <> (SELECT MIN(id) FROM answer WHERE content = 'FAUX')");

        $this->addSql("CREATE UNIQUE INDEX UNIQ_ANSWER_TRUE_SINGLETON ON answer (content) WHERE content = 'VRAI'");
        $this->addSql("CREATE UNIQUE INDEX UNIQ_ANSWER_FALSE_SINGLETON ON answer (content) WHERE content = 'FAUX'");

        $this->addSql('ALTER TABLE answer DROP CONSTRAINT fk_dadd4a251e27f6bf');
        $this->addSql('DROP INDEX idx_dadd4a251e27f6bf');
        $this->addSql('ALTER TABLE answer DROP question_id');
        $this->addSql('ALTER TABLE question ALTER correct_answer_id SET NOT NULL');
        $this->addSql('ALTER TABLE question ADD CONSTRAINT FK_B6F7494EFD2E7CF7 FOREIGN KEY (correct_answer_id) REFERENCES answer (id) NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_B6F7494EFD2E7CF7 ON question (correct_answer_id)');
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('This migration consolidates answer rows and cannot be safely reversed automatically.');
    }
}
