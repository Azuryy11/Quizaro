<?php

namespace App\Tests\Api;

use App\Entity\User;

final class ApiQuizTest extends ApiTestCase
{
    private ?User $owner = null;
    private ?User $otherUser = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = $this->makeUser(email: 'quiz.owner@test.local', displayName: 'Owner');
        $this->client->loginUser($this->owner);
    }

    protected function tearDown(): void
    {
        if ($this->owner instanceof User) {
            $this->purgeTestUser($this->owner);
            $this->owner = null;
        }

        if ($this->otherUser instanceof User) {
            $this->purgeTestUser($this->otherUser);
            $this->otherUser = null;
        }

        parent::tearDown();
    }

    public function testListUnauthenticated(): void
    {
        $this->client->restart(); // Clear session so request is unauthenticated

        $this->api('GET', '/api/quizzes');

        $this->assertSame(401, $this->responseCode());
    }

    public function testListEmpty(): void
    {
        $data = $this->api('GET', '/api/quizzes');

        $this->assertSame(200, $this->responseCode());
        $this->assertIsArray($data['quizzes']);
        $this->assertEmpty($data['quizzes']);
    }

    public function testCreateTrueFalseQuiz(): void
    {
        $data = $this->api('POST', '/api/quizzes', $this->buildTrueFalseQuiz('Mon Quiz Vrai/Faux'));

        $this->assertSame(201, $this->responseCode());
        $this->assertSame('Quiz créé.', $data['message']);
        $this->assertSame('Mon Quiz Vrai/Faux', $data['quiz']['title']);

        // Questions are not in the create response (inverse side not updated in memory).
        // Verify via GET that questions were persisted correctly.
        $quizId = $data['quiz']['id'];
        $show = $this->api('GET', "/api/quizzes/{$quizId}");
        $this->assertSame(200, $this->responseCode());
        $this->assertCount(1, $show['quiz']['questions']);
    }

    public function testCreateQcmQuiz(): void
    {
        $data = $this->api('POST', '/api/quizzes', $this->buildQcmQuiz('Mon Quiz QCM'));

        $this->assertSame(201, $this->responseCode());
        $this->assertSame('Quiz créé.', $data['message']);
        $this->assertSame('Mon Quiz QCM', $data['quiz']['title']);

        $quizId = $data['quiz']['id'];
        $show = $this->api('GET', "/api/quizzes/{$quizId}");
        $this->assertSame(200, $this->responseCode());
        $this->assertCount(1, $show['quiz']['questions']);
    }

    public function testGetQuiz(): void
    {
        $created = $this->api('POST', '/api/quizzes', $this->buildTrueFalseQuiz());
        $this->assertSame(201, $this->responseCode());

        $quizId = $created['quiz']['id'];

        $data = $this->api('GET', "/api/quizzes/{$quizId}");

        $this->assertSame(200, $this->responseCode());
        $this->assertSame($quizId, $data['quiz']['id']);
    }

    public function testUpdateQuiz(): void
    {
        $created = $this->api('POST', '/api/quizzes', $this->buildTrueFalseQuiz('Original'));
        $this->assertSame(201, $this->responseCode());

        $quizId = $created['quiz']['id'];

        $updated = $this->api('PUT', "/api/quizzes/{$quizId}", $this->buildTrueFalseQuiz('Modifié'));

        $this->assertSame(200, $this->responseCode());
        $this->assertSame('Modifié', $updated['quiz']['title']);
    }

    public function testDeleteQuiz(): void
    {
        $created = $this->api('POST', '/api/quizzes', $this->buildTrueFalseQuiz());
        $this->assertSame(201, $this->responseCode());

        $quizId = $created['quiz']['id'];

        $data = $this->api('DELETE', "/api/quizzes/{$quizId}");

        $this->assertSame(200, $this->responseCode());
        $this->assertSame('Quiz supprimé.', $data['message']);
    }

    public function testAccessOtherUserQuizForbidden(): void
    {
        // Owner creates a quiz
        $created = $this->api('POST', '/api/quizzes', $this->buildTrueFalseQuiz());
        $this->assertSame(201, $this->responseCode());
        $quizId = $created['quiz']['id'];

        // Switch to another user
        $this->otherUser = $this->makeUser(email: 'quiz.other@test.local');
        $this->client->loginUser($this->otherUser);

        $data = $this->api('GET', "/api/quizzes/{$quizId}");

        $this->assertSame(403, $this->responseCode());
        $this->assertArrayHasKey('message', $data);
    }

    public function testCreateQuizMissingTitle(): void
    {
        $data = $this->api('POST', '/api/quizzes', [
            'title' => '',
            'questions' => [
                ['label' => 'Test ?', 'type' => 'TRUE_FALSE', 'correctAnswer' => true],
            ],
        ]);

        $this->assertSame(400, $this->responseCode());
        $this->assertArrayHasKey('message', $data);
    }
}
