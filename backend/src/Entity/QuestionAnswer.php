<?php

namespace App\Entity;

use App\Repository\QuestionAnswerRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: QuestionAnswerRepository::class)]
#[ORM\Table(name: 'question_answer')]
class QuestionAnswer
{
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Question::class, inversedBy: 'questionAnswers')]
    #[ORM\JoinColumn(name: 'question_id', nullable: false, onDelete: 'CASCADE')]
    private ?Question $question = null;

    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Answer::class, inversedBy: 'questionAnswers')]
    #[ORM\JoinColumn(name: 'answer_id', nullable: false, onDelete: 'CASCADE')]
    private ?Answer $answer = null;

    #[ORM\Column(name: 'is_correct')]
    private bool $isCorrect = false;

    #[ORM\Column]
    private int $position = 1;

    public function getQuestion(): ?Question
    {
        return $this->question;
    }

    public function setQuestion(?Question $question): static
    {
        $this->question = $question;

        return $this;
    }

    public function getAnswer(): ?Answer
    {
        return $this->answer;
    }

    public function setAnswer(?Answer $answer): static
    {
        $this->answer = $answer;

        return $this;
    }

    public function isCorrect(): bool
    {
        return $this->isCorrect;
    }

    public function setIsCorrect(bool $isCorrect): static
    {
        $this->isCorrect = $isCorrect;

        return $this;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): static
    {
        $this->position = $position;

        return $this;
    }
}
