<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260303091903 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE answer ADD content VARCHAR(10) NOT NULL');
        $this->addSql('ALTER TABLE answer ADD is_correct BOOLEAN NOT NULL');
        $this->addSql('ALTER TABLE answer ADD position INT DEFAULT NULL');
        $this->addSql('ALTER TABLE question ADD position INT DEFAULT NULL');
        $this->addSql('ALTER TABLE quiz ADD description TEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE quiz ALTER title SET NOT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE answer DROP content');
        $this->addSql('ALTER TABLE answer DROP is_correct');
        $this->addSql('ALTER TABLE answer DROP position');
        $this->addSql('ALTER TABLE question DROP position');
        $this->addSql('ALTER TABLE quiz DROP description');
        $this->addSql('ALTER TABLE quiz ALTER title DROP NOT NULL');
    }
}
