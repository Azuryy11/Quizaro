<?php

namespace App\Entity;

use App\Repository\AnswerRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AnswerRepository::class)]
class Answer
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    /**
     * @var Collection<int, UserAnswer>
     */
    #[ORM\OneToMany(targetEntity: UserAnswer::class, mappedBy: 'answer')]
    private Collection $userAnswers;

    /**
     * @var Collection<int, QuestionAnswer>
     */
    #[ORM\OneToMany(targetEntity: QuestionAnswer::class, mappedBy: 'answer', orphanRemoval: true, cascade: ['persist', 'remove'])]
    private Collection $questionAnswers;

    #[ORM\Column(length: 255)]
    private string $content = '';

    public function __construct()
    {
        $this->userAnswers = new ArrayCollection();
        $this->questionAnswers = new ArrayCollection();
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
            $questionAnswer->setAnswer($this);
        }

        return $this;
    }

    public function removeQuestionAnswer(QuestionAnswer $questionAnswer): static
    {
        $this->questionAnswers->removeElement($questionAnswer);

        return $this;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getContent(): string
    {
        return $this->content;
    }

    public function setContent(string $content): static
    {
        $this->content = $content;

        return $this;
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
            $userAnswer->setAnswer($this);
        }

        return $this;
    }

    public function removeUserAnswer(UserAnswer $userAnswer): static
    {
        if ($this->userAnswers->removeElement($userAnswer)) {
            if ($userAnswer->getAnswer() === $this) {
                $userAnswer->setAnswer(null);
            }
        }

        return $this;
    }
}
