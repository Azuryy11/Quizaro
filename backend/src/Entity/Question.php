<?php

namespace App\Entity;

use App\Repository\QuestionRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: QuestionRepository::class)]
class Question
{
    public const TYPE_TRUE_FALSE = 'TRUE_FALSE';
    public const TYPE_QCM = 'QCM';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'questions')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Quiz $quiz = null;

    /**
     * @var Collection<int, QuestionAnswer>
     */
    #[ORM\OneToMany(targetEntity: QuestionAnswer::class, mappedBy: 'question', orphanRemoval: true, cascade: ['persist', 'remove'])]
    private Collection $questionAnswers;

    /**
     * @var Collection<int, UserAnswer>
     */
    #[ORM\OneToMany(targetEntity: UserAnswer::class, mappedBy: 'question')]
    private Collection $userAnswers;

    #[ORM\Column(type: 'text')]
    private string $label = '';

    #[ORM\Column(length: 20)]
    private string $type = self::TYPE_TRUE_FALSE;

    #[ORM\Column]
    private int $timeLimit = 30;

    #[ORM\Column]
    private int $position = 1;

    public function __construct()
    {
        $this->userAnswers = new ArrayCollection();
        $this->questionAnswers = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getQuiz(): ?Quiz
    {
        return $this->quiz;
    }

    public function setQuiz(?Quiz $quiz): static
    {
        $this->quiz = $quiz;

        return $this;
    }

    public function getLabel(): string
    {
        return $this->label;
    }

    public function setLabel(string $label): static
    {
        $this->label = $label;

        return $this;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function setType(string $type): static
    {
        $this->type = $type;

        return $this;
    }

    public function getTimeLimit(): int
    {
        return $this->timeLimit;
    }

    public function setTimeLimit(int $timeLimit): static
    {
        $this->timeLimit = $timeLimit;

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

    /**
     * @return Collection<int, QuestionAnswer>
     */
    public function getQuestionAnswers(): Collection
    {        
        return $this->questionAnswers;
    }

    public function addQuestionAnswer(QuestionAnswer $questionAnswer): static
    {
        if (!$this->questionAnswers->contains($questionAnswer)) {
            $this->questionAnswers->add($questionAnswer);
            $questionAnswer->setQuestion($this);
        }

        return $this;
    }

    public function removeQuestionAnswer(QuestionAnswer $questionAnswer): static
    {
        $this->questionAnswers->removeElement($questionAnswer);

        return $this;
    }

    /**
     * Helper: returns answers through QuestionAnswer.
     *
     * @return Collection<int, Answer>
     */
    public function getAnswers(): Collection
    {
        $answers = $this->questionAnswers
            ->map(static fn (QuestionAnswer $questionAnswer): ?Answer => $questionAnswer->getAnswer())
            ->filter(static fn (?Answer $answer): bool => $answer !== null)
            ->toArray();

        return new ArrayCollection($answers);
    }

    /**
     * Helper: returns the first correct answer flagged in QuestionAnswer.
     */
    public function getCorrectAnswer(): ?Answer
    {
        foreach ($this->questionAnswers as $questionAnswer) {
            if ($questionAnswer->isCorrect()) {
                return $questionAnswer->getAnswer();
            }
        }

        return null;
    }

    /**
     * @return Collection<int, UserAnswer>
     */
    public function getUserAnswers(): Collection
    {
        return $this->userAnswers;
    }

    public function addUserAnswer(UserAnswer $userAnswer): static
    {
        if (!$this->userAnswers->contains($userAnswer)) {
            $this->userAnswers->add($userAnswer);
            $userAnswer->setQuestion($this);
        }
    
        return $this;
    }

    public function removeUserAnswer(UserAnswer $userAnswer): static
    {
        if ($this->userAnswers->removeElement($userAnswer)) {
            if ($userAnswer->getQuestion() === $this) {
                $userAnswer->setQuestion(null);
            }
        }

        return $this;
    }
}
