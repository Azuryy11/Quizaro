<?php

namespace App\Tests\Api;

use App\Entity\User;

final class ApiQuizSessionTest extends ApiTestCase
{
    private ?User $owner = null;
    private ?User $player = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = $this->makeUser(email: 'session.owner@test.local', displayName: 'Owner');
        $this->player = $this->makeUser(email: 'session.player@test.local', displayName: 'Player');
    }

    protected function tearDown(): void
    {
        if ($this->owner instanceof User) {
            $this->purgeTestUser($this->owner);
            $this->owner = null;
        }

        if ($this->player instanceof User) {
            $this->purgeTestUser($this->player);
            $this->player = null;
        }

        parent::tearDown();
    }

    /**
     * Owner creates a quiz and calls /play, returns [quizId, quizSessionId, playerSessionId, code, quiz payload].
     *
     * @return array{quizId: int, quizSessionId: int, playerSessionId: int, code: string, questions: array<int, mixed>}
     */
    private function ownerStartsSession(): array
    {
        $this->client->loginUser($this->owner);

        $created = $this->api('POST', '/api/quizzes', $this->buildTrueFalseQuiz('Session Quiz'));
        $this->assertSame(201, $this->responseCode(), 'Quiz creation failed');

        $quizId = (int) $created['quiz']['id'];

        $playData = $this->api('GET', "/api/quizzes/{$quizId}/play");
        $this->assertSame(200, $this->responseCode(), 'Play route failed');

        return [
            'quizId' => $quizId,
            'quizSessionId' => (int) $playData['session']['quizSessionId'],
            'playerSessionId' => (int) $playData['session']['playerSessionId'],
            'code' => (string) $playData['session']['code'],
            'questions' => (array) $playData['quiz']['questions'],
        ];
    }

    public function testPlayQuiz(): void
    {
        $this->client->loginUser($this->owner);

        $created = $this->api('POST', '/api/quizzes', $this->buildTrueFalseQuiz());
        $this->assertSame(201, $this->responseCode());

        $quizId = $created['quiz']['id'];
        $data = $this->api('GET', "/api/quizzes/{$quizId}/play");

        $this->assertSame(200, $this->responseCode());
        $this->assertArrayHasKey('session', $data);
        $this->assertArrayHasKey('quiz', $data);
        $this->assertNotEmpty($data['session']['code']);
        $this->assertIsInt($data['session']['playerSessionId']);
        $this->assertIsInt($data['session']['quizSessionId']);
        $this->assertTrue($data['session']['isOwner']);
    }

    public function testJoinWithCode(): void
    {
        $session = $this->ownerStartsSession();

        // Player joins with the code
        $this->client->loginUser($this->player);

        $data = $this->api('POST', '/api/quiz-sessions/join', ['code' => $session['code']]);

        $this->assertSame(200, $this->responseCode());
        $this->assertSame($session['quizSessionId'], $data['session']['quizSessionId']);
        $this->assertFalse($data['session']['isOwner']);
    }

    public function testJoinWithInvalidCode(): void
    {
        $this->client->loginUser($this->player);

        $data = $this->api('POST', '/api/quiz-sessions/join', ['code' => 'XXXXXX']);

        $this->assertSame(404, $this->responseCode());
        $this->assertArrayHasKey('message', $data);
    }

    public function testSubmitAnswers(): void
    {
        $session = $this->ownerStartsSession();

        // Player joins
        $this->client->loginUser($this->player);
        $joinData = $this->api('POST', '/api/quiz-sessions/join', ['code' => $session['code']]);
        $this->assertSame(200, $this->responseCode());

        $playerSessionId = (int) $joinData['session']['playerSessionId'];
        $questions = (array) $joinData['quiz']['questions'];

        // Build answer payload: pick first answer for each question
        $answers = array_map(static function (array $question): array {
            $firstAnswerId = (int) $question['answers'][0]['id'];

            return [
                'questionId' => (int) $question['id'],
                'answerIds' => [$firstAnswerId],
                'responseTimeMs' => 1000,
            ];
        }, $questions);

        $data = $this->api('POST', "/api/quizzes/{$session['quizId']}/submit", [
            'playerSessionId' => $playerSessionId,
            'quizSessionId' => $session['quizSessionId'],
            'answers' => $answers,
        ]);

        $this->assertSame(200, $this->responseCode());
        $this->assertSame('Réponses enregistrées.', $data['message']);
        $this->assertIsInt($data['result']['score']);
        $this->assertSame(count($questions), $data['result']['totalQuestions']);
    }

    public function testFinishSession(): void
    {
        $session = $this->ownerStartsSession();

        // Owner finishes the session
        $this->client->loginUser($this->owner);

        $data = $this->api('POST', "/api/quiz-sessions/{$session['quizSessionId']}/finish");

        $this->assertSame(200, $this->responseCode());
        $this->assertSame('Session terminée.', $data['message']);
        $this->assertSame('FINISHED', $data['session']['status']);
    }

    public function testGetResults(): void
    {
        $session = $this->ownerStartsSession();

        // Player joins + submits
        $this->client->loginUser($this->player);
        $joinData = $this->api('POST', '/api/quiz-sessions/join', ['code' => $session['code']]);
        $this->assertSame(200, $this->responseCode());

        $playerSessionId = (int) $joinData['session']['playerSessionId'];
        $questions = (array) $joinData['quiz']['questions'];

        $answers = array_map(static function (array $question): array {
            return [
                'questionId' => (int) $question['id'],
                'answerIds' => [(int) $question['answers'][0]['id']],
                'responseTimeMs' => 500,
            ];
        }, $questions);

        $this->api('POST', "/api/quizzes/{$session['quizId']}/submit", [
            'playerSessionId' => $playerSessionId,
            'quizSessionId' => $session['quizSessionId'],
            'answers' => $answers,
        ]);
        $this->assertSame(200, $this->responseCode());

        // Owner finishes
        $this->client->loginUser($this->owner);
        $this->api('POST', "/api/quiz-sessions/{$session['quizSessionId']}/finish");
        $this->assertSame(200, $this->responseCode());

        // Owner gets results
        $data = $this->api('GET', "/api/quiz-sessions/{$session['quizSessionId']}/results");

        $this->assertSame(200, $this->responseCode());
        $this->assertArrayHasKey('results', $data);
        $this->assertNotEmpty($data['results']);
        $this->assertSame($session['quizSessionId'], $data['session']['quizSessionId']);
    }
}
