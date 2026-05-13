<?php

namespace App\Service;

use App\Repository\QuizSessionRepository;
use Doctrine\ORM\EntityManagerInterface;

final class QuizSessionCleanupService
{
    public function __construct(
        private readonly QuizSessionRepository $repository,
        private readonly EntityManagerInterface $entityManager,
    ) {}

    public function run(bool $dryRun = false): array
    {
        $now = new \DateTimeImmutable();
        $waitingCutoff = $now->modify('-24 hours');
        $runningCutoff = $now->modify('-2 hours');
        $finishedCutoff = $now->modify('-7 days');

        $wouldDeleteWaiting = $this->repository->countWaitingOlderThan($waitingCutoff);
        $wouldFinishRunning = $this->repository->countRunningOlderThan($runningCutoff);
        $wouldDeleteFinished = $this->repository->countFinishedOlderThan($finishedCutoff);

        if ($dryRun) {
            return [
                'dryRun' => true,
                'waitingDeleted' => 0,
                'runningFinished' => 0,
                'finishedDeleted' => 0,
                'wouldDeleteWaiting' => $wouldDeleteWaiting,
                'wouldFinishRunning' => $wouldFinishRunning,
                'wouldDeleteFinished' => $wouldDeleteFinished,
            ];
        }

        $runningFinished = 0;
        $waitingDeleted = 0;
        $finishedDeleted = 0;

        $this->entityManager->wrapInTransaction(function () use (
            &$runningFinished,
            &$waitingDeleted,
            &$finishedDeleted,
            $runningCutoff,
            $waitingCutoff,
            $finishedCutoff,
            $now
        ): void {
            $runningFinished = $this->repository->markRunningOlderThanAsFinished($runningCutoff, $now);
            $waitingDeleted = $this->repository->deleteWaitingOlderThan($waitingCutoff);
            $finishedDeleted = $this->repository->deleteFinishedOlderThan($finishedCutoff);
        });

        return [
            'dryRun' => false,
            'waitingDeleted' => $waitingDeleted,
            'runningFinished' => $runningFinished,
            'finishedDeleted' => $finishedDeleted,
            'wouldDeleteWaiting' => $wouldDeleteWaiting,
            'wouldFinishRunning' => $wouldFinishRunning,
            'wouldDeleteFinished' => $wouldDeleteFinished,
        ];
    }
}