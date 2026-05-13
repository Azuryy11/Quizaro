<?php

namespace App\Repository;

use App\Entity\QuizSession;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<QuizSession>
 */
class QuizSessionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, QuizSession::class);
    }

    public function countWaitingOlderThan(\DateTimeImmutable $cutoff): int
    {
        return (int) $this->createQueryBuilder('s')
            ->select('COUNT(s.id)')
            ->andWhere('s.status = :status')
            ->andWhere('s.startedAt < :cutoff')
            ->setParameter('status', QuizSession::STATUS_WAITING)
            ->setParameter('cutoff', $cutoff)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function deleteWaitingOlderThan(\DateTimeImmutable $cutoff): int
    {
        return (int) $this->createQueryBuilder('s')
            ->delete()
            ->andWhere('s.status = :status')
            ->andWhere('s.startedAt < :cutoff')
            ->setParameter('status', QuizSession::STATUS_WAITING)
            ->setParameter('cutoff', $cutoff)
            ->getQuery()
            ->execute();
    }

    public function countRunningOlderThan(\DateTimeImmutable $cutoff): int
    {
        return (int) $this->createQueryBuilder('s')
            ->select('COUNT(s.id)')
            ->andWhere('s.status = :status')
            ->andWhere('s.startedAt < :cutoff')
            ->setParameter('status', QuizSession::STATUS_RUNNING)
            ->setParameter('cutoff', $cutoff)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function markRunningOlderThanAsFinished(\DateTimeImmutable $cutoff, \DateTimeImmutable $now): int
    {
        return (int) $this->createQueryBuilder('s')
            ->update()
            ->set('s.status', ':newStatus')
            ->set('s.endedAt', ':endedAt')
            ->andWhere('s.status = :oldStatus')
            ->andWhere('s.startedAt < :cutoff')
            ->setParameter('newStatus', QuizSession::STATUS_FINISHED)
            ->setParameter('oldStatus', QuizSession::STATUS_RUNNING)
            ->setParameter('endedAt', $now)
            ->setParameter('cutoff', $cutoff)
            ->getQuery()
            ->execute();
    }

    public function countFinishedOlderThan(\DateTimeImmutable $cutoff): int
    {
        return (int) $this->createQueryBuilder('s')
            ->select('COUNT(s.id)')
            ->andWhere('s.status = :status')
            ->andWhere('s.endedAt IS NOT NULL')
            ->andWhere('s.endedAt < :cutoff')
            ->setParameter('status', QuizSession::STATUS_FINISHED)
            ->setParameter('cutoff', $cutoff)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function deleteFinishedOlderThan(\DateTimeImmutable $cutoff): int
    {
        return (int) $this->createQueryBuilder('s')
            ->delete()
            ->andWhere('s.status = :status')
            ->andWhere('s.endedAt IS NOT NULL')
            ->andWhere('s.endedAt < :cutoff')
            ->setParameter('status', QuizSession::STATUS_FINISHED)
            ->setParameter('cutoff', $cutoff)
            ->getQuery()
            ->execute();
    }

}
