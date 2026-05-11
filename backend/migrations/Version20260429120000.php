<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260429120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Allow guest player sessions by making player_session.user_id nullable and adding guest token fields';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE player_session ALTER user_id DROP NOT NULL');
        $this->addSql('ALTER TABLE player_session ADD is_guest BOOLEAN DEFAULT FALSE NOT NULL');
        $this->addSql('ALTER TABLE player_session ADD access_token_hash VARCHAR(255) DEFAULT NULL');
        $this->addSql('CREATE INDEX IDX_PLAYER_SESSION_ACCESS_TOKEN_HASH ON player_session (access_token_hash)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IDX_PLAYER_SESSION_ACCESS_TOKEN_HASH');
        $this->addSql('ALTER TABLE player_session DROP access_token_hash');
        $this->addSql('ALTER TABLE player_session DROP is_guest');
        $this->addSql('DELETE FROM player_session WHERE user_id IS NULL');
        $this->addSql('ALTER TABLE player_session ALTER user_id SET NOT NULL');
    }
}
