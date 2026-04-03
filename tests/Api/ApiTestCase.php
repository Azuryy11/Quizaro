<?php

namespace App\Tests\Api;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

abstract class ApiTestCase extends WebTestCase
{
    protected KernelBrowser $client;
    protected EntityManagerInterface $em;
    private UserPasswordHasherInterface $hasher;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $container = static::getContainer();
        $this->em = $container->get(EntityManagerInterface::class);
        $this->hasher = $container->get(UserPasswordHasherInterface::class);
    }

    protected function makeUser(
        ?string $email = null,
        string $password = 'P@ssword1test',
        array $roles = ['ROLE_USER'],
        ?string $displayName = null,
    ): User {
        $email ??= uniqid('qt.') . '@test.local';

        $user = new User();
        $user->setEmail($email);
        $user->setRoles($roles);
        $user->setDisplayName($displayName);
        $user->setPassword($this->hasher->hashPassword($user, $password));

        $this->em->persist($user);
        $this->em->flush();

        return $user;
    }

    /**
     * Full teardown of a test user and all related data via explicit CASCADE-safe SQL.
     */
    protected function purgeTestUser(User $user): void
    {
        $uid = $user->getId();
        if (null === $uid) {
            return;
        }

        $conn = $this->em->getConnection();

        // 1. Delete user_answers for this user's player_sessions (via subquery; user_answer.player_session_id has ON DELETE CASCADE but being explicit is safer)
        $conn->executeStatement(
            'DELETE FROM user_answer WHERE player_session_id IN (SELECT id FROM player_session WHERE user_id = :uid)',
            ['uid' => $uid],
        );

        // 2. Delete this user's player_sessions (in other people's quizzes)
        $conn->executeStatement('DELETE FROM player_session WHERE user_id = :uid', ['uid' => $uid]);

        // 3. Delete question_answers for questions in this user's quizzes (FK may not have ON DELETE CASCADE at DB level in some migrations)
        $conn->executeStatement(
            'DELETE FROM question_answer WHERE question_id IN (SELECT q.id FROM question q JOIN quiz qz ON q.quiz_id = qz.id WHERE qz.created_by_id = :uid)',
            ['uid' => $uid],
        );

        // 4. Delete quizzes (DB CASCADE: quiz → quiz_session → player_session → user_answer; quiz → question)
        $conn->executeStatement('DELETE FROM quiz WHERE created_by_id = :uid', ['uid' => $uid]);

        // 5. Delete user
        $conn->executeStatement('DELETE FROM "user" WHERE id = :uid', ['uid' => $uid]);

        $this->em->clear();
    }

    /**
     * Make a JSON API request and return the decoded response body.
     *
     * @return array<string, mixed>
     */
    protected function api(string $method, string $uri, ?array $body = null): array
    {
        $this->client->request(
            $method,
            $uri,
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_ACCEPT' => 'application/json',
            ],
            $body !== null ? (string) json_encode($body) : '',
        );

        $content = (string) $this->client->getResponse()->getContent();

        return (array) (json_decode($content, true) ?? []);
    }

    protected function responseCode(): int
    {
        return $this->client->getResponse()->getStatusCode();
    }

    /** @return array<string, mixed> */
    protected function buildTrueFalseQuiz(string $title = 'Quiz Test', bool $correctAnswer = true): array
    {
        return [
            'title' => $title,
            'questions' => [
                [
                    'label' => 'PHP est-il un langage de programmation ?',
                    'type' => 'TRUE_FALSE',
                    'correctAnswer' => $correctAnswer,
                ],
            ],
        ];
    }

    /** @return array<string, mixed> */
    protected function buildQcmQuiz(string $title = 'Quiz QCM Test'): array
    {
        return [
            'title' => $title,
            'questions' => [
                [
                    'label' => 'Quelle est la capitale de la France ?',
                    'type' => 'QCM',
                    'answers' => ['Paris', 'Lyon', 'Marseille'],
                    'correctAnswers' => [0],
                ],
            ],
        ];
    }
}
