<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260306123500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add ON DELETE CASCADE to quiz/session related foreign keys to allow deleting quizzes without FK violations.';
    }

    public function up(Schema $schema): void
    {
        // quiz_session.quiz_id -> quiz.id
        $this->addSql('ALTER TABLE quiz_session DROP CONSTRAINT IF EXISTS fk_c21e7874853cd175');
        $this->addSql('ALTER TABLE quiz_session ADD CONSTRAINT fk_c21e7874853cd175 FOREIGN KEY (quiz_id) REFERENCES quiz (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        // player_session.quiz_session_id -> quiz_session.id
        $this->addSql('ALTER TABLE player_session DROP CONSTRAINT IF EXISTS fk_b1b02a912850cbe3');
        $this->addSql('ALTER TABLE player_session ADD CONSTRAINT fk_b1b02a912850cbe3 FOREIGN KEY (quiz_session_id) REFERENCES quiz_session (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        // user_answer.player_session_id -> player_session.id
        $this->addSql('ALTER TABLE user_answer DROP CONSTRAINT IF EXISTS fk_bf8f51183e9a68e2');
        $this->addSql('ALTER TABLE user_answer ADD CONSTRAINT fk_bf8f51183e9a68e2 FOREIGN KEY (player_session_id) REFERENCES player_session (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        // user_answer.question_id -> question.id
        $this->addSql('ALTER TABLE user_answer DROP CONSTRAINT IF EXISTS fk_bf8f51181e27f6bf');
        $this->addSql('ALTER TABLE user_answer ADD CONSTRAINT fk_bf8f51181e27f6bf FOREIGN KEY (question_id) REFERENCES question (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        // user_answer.answer_id -> answer.id
        $this->addSql('ALTER TABLE user_answer DROP CONSTRAINT IF EXISTS fk_bf8f5118aa334807');
        $this->addSql('ALTER TABLE user_answer ADD CONSTRAINT fk_bf8f5118aa334807 FOREIGN KEY (answer_id) REFERENCES answer (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        // question.quiz_id -> quiz.id
        $this->addSql('ALTER TABLE question DROP CONSTRAINT IF EXISTS fk_b6f7494e853cd175');
        $this->addSql('ALTER TABLE question ADD CONSTRAINT fk_b6f7494e853cd175 FOREIGN KEY (quiz_id) REFERENCES quiz (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE quiz_session DROP CONSTRAINT IF EXISTS fk_c21e7874853cd175');
        $this->addSql('ALTER TABLE quiz_session ADD CONSTRAINT fk_c21e7874853cd175 FOREIGN KEY (quiz_id) REFERENCES quiz (id) NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('ALTER TABLE player_session DROP CONSTRAINT IF EXISTS fk_b1b02a912850cbe3');
        $this->addSql('ALTER TABLE player_session ADD CONSTRAINT fk_b1b02a912850cbe3 FOREIGN KEY (quiz_session_id) REFERENCES quiz_session (id) NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('ALTER TABLE user_answer DROP CONSTRAINT IF EXISTS fk_bf8f51183e9a68e2');
        $this->addSql('ALTER TABLE user_answer ADD CONSTRAINT fk_bf8f51183e9a68e2 FOREIGN KEY (player_session_id) REFERENCES player_session (id) NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('ALTER TABLE user_answer DROP CONSTRAINT IF EXISTS fk_bf8f51181e27f6bf');
        $this->addSql('ALTER TABLE user_answer ADD CONSTRAINT fk_bf8f51181e27f6bf FOREIGN KEY (question_id) REFERENCES question (id) NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('ALTER TABLE user_answer DROP CONSTRAINT IF EXISTS fk_bf8f5118aa334807');
        $this->addSql('ALTER TABLE user_answer ADD CONSTRAINT fk_bf8f5118aa334807 FOREIGN KEY (answer_id) REFERENCES answer (id) NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('ALTER TABLE question DROP CONSTRAINT IF EXISTS fk_b6f7494e853cd175');
        $this->addSql('ALTER TABLE question ADD CONSTRAINT fk_b6f7494e853cd175 FOREIGN KEY (quiz_id) REFERENCES quiz (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
    }
}
