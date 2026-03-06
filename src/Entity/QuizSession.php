<?php

namespace App\Entity;

use App\Repository\QuizSessionRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: QuizSessionRepository::class)]
class QuizSession
{
    public const STATUS_WAITING = 'WAITING';
    public const STATUS_RUNNING = 'RUNNING';
    public const STATUS_FINISHED = 'FINISHED';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'quizSessions')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Quiz $quiz = null;

    /**
     * @var Collection<int, PlayerSession>
     */
    #[ORM\OneToMany(targetEntity: PlayerSession::class, mappedBy: 'quizSession')]
    private Collection $playerSessions;

    #[ORM\Column(length: 20)]
    private string $code = '';

    #[ORM\Column]
    private \DateTimeImmutable $startedAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $endedAt = null;

    #[ORM\Column(length: 20)]
    private string $status = self::STATUS_WAITING;

    public function __construct()
    {
        $this->playerSessions = new ArrayCollection();
        $this->startedAt = new \DateTimeImmutable();
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

    /**
     * @return Collection<int, PlayerSession>
     */
    public function getPlayerSessions(): Collection
    {
        return $this->playerSessions;
    }

    public function addPlayerSession(PlayerSession $playerSession): static
    {
        if (!$this->playerSessions->contains($playerSession)) {
            $this->playerSessions->add($playerSession);
            $playerSession->setQuizSession($this);
        }

        return $this;
    }

    public function removePlayerSession(PlayerSession $playerSession): static
    {
        if ($this->playerSessions->removeElement($playerSession)) {
            if ($playerSession->getQuizSession() === $this) {
                $playerSession->setQuizSession(null);
            }
        }

        return $this;
    }

    public function getCode(): string
    {
        return $this->code;
    }

    public function setCode(string $code): static
    {
        $this->code = $code;

        return $this;
    }

    public function getStartedAt(): \DateTimeImmutable
    {
        return $this->startedAt;
    }

    public function setStartedAt(\DateTimeImmutable $startedAt): static
    {
        $this->startedAt = $startedAt;

        return $this;
    }

    public function getEndedAt(): ?\DateTimeImmutable
    {
        return $this->endedAt;
    }

    public function setEndedAt(?\DateTimeImmutable $endedAt): static
    {
        $this->endedAt = $endedAt;

        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;

        return $this;
    }
}
