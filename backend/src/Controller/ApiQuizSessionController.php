<?php

namespace App\Controller;

use App\Entity\Answer;
use App\Entity\PlayerSession;
use App\Entity\Question;
use App\Entity\QuestionAnswer;
use App\Entity\Quiz;
use App\Entity\QuizSession;
use App\Entity\User;
use App\Entity\UserAnswer;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class ApiQuizSessionController extends AbstractController
{
    #[Route('/api/quizzes/{id}/play', name: 'api_quizzes_play', methods: ['GET'])]
    public function play(int $id, EntityManagerInterface $entityManager): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (null === $user) {
            return $this->json([
                'message' => 'Connecte-toi pour jouer ce quiz.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $quiz = $entityManager->getRepository(Quiz::class)->find($id);

        if (!$quiz instanceof Quiz) {
            return $this->json([
                'message' => 'Quiz introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        if (!$this->canAccessQuiz($quiz, $user)) {
            return $this->json([
                'message' => 'Accès refusé à ce quiz.',
            ], Response::HTTP_FORBIDDEN);
        }

        $quizSession = new QuizSession();
        $quizSession->setQuiz($quiz);
        $quizSession->setCode(strtoupper(substr(bin2hex(random_bytes(3)), 0, 6)));
        $quizSession->setStatus(QuizSession::STATUS_WAITING);
        $quizSession->setOwner($user);

        $playerSession = new PlayerSession();
        $playerSession->setQuizSession($quizSession);
        $playerSession->setUser($user);
        $playerSession->setNickname($user->getDisplayName() ?: $user->getUserIdentifier());

        $entityManager->persist($quizSession);
        $entityManager->persist($playerSession);
        $entityManager->flush();

        return $this->json([
            'session' => [
                'playerSessionId' => $playerSession->getId(),
                'quizSessionId' => $quizSession->getId(),
                'code' => $quizSession->getCode(),
                'status' => $quizSession->getStatus(),
                'isOwner' => true,
                'playerCount' => $quizSession->getPlayerSessions()->count(),
                'startedAt' => $quizSession->getStartedAt()->format(DATE_ATOM),
                'quizTitle' => $quiz->getTitle(),
                'quizDescription' => $quiz->getDescription(),
                'quizId' => $quiz->getId(),
            ],
            'quiz' => $this->normalizeQuizForPlay($quiz),
        ]);
    }

    #[Route('/api/quiz-sessions/join', name: 'api_quiz_sessions_join', methods: ['POST'])]
    public function joinSession(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (null === $user) {
            return $this->json([
                'message' => 'Connecte-toi pour rejoindre une session.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $payload = $this->decodeJsonPayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $codeValue = $payload['code'] ?? null;
        if (!is_string($codeValue)) {
            return $this->json([
                'message' => 'Le code de session est requis.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $code = strtoupper(trim($codeValue));
        if ('' === $code) {
            return $this->json([
                'message' => 'Le code de session est requis.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $quizSession = $entityManager->getRepository(QuizSession::class)->findOneBy(['code' => $code]);

        if (!$quizSession instanceof QuizSession) {
            return $this->json([
                'message' => 'Session introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        if (QuizSession::STATUS_FINISHED === $quizSession->getStatus()) {
            return $this->json([
                'message' => 'Cette session est terminée.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $quiz = $quizSession->getQuiz();
        if (!$quiz instanceof Quiz) {
            return $this->json([
                'message' => 'Quiz introuvable pour cette session.',
            ], Response::HTTP_NOT_FOUND);
        }

        $playerSession = $entityManager->getRepository(PlayerSession::class)->findOneBy([
            'quizSession' => $quizSession,
            'user' => $user,
        ]);

        if (!$playerSession instanceof PlayerSession) {
            $playerSession = new PlayerSession();
            $playerSession->setQuizSession($quizSession);
            $playerSession->setUser($user);
            $playerSession->setNickname($user->getDisplayName() ?: $user->getUserIdentifier());

            $entityManager->persist($playerSession);
            $entityManager->flush();
        }

        return $this->json([
            'session' => [
                'playerSessionId' => $playerSession->getId(),
                'quizSessionId' => $quizSession->getId(),
                'code' => $quizSession->getCode(),
                'status' => $quizSession->getStatus(),
                'isOwner' => $quizSession->getOwner()?->getId() === $user->getId(),
                'playerCount' => $quizSession->getPlayerSessions()->count(),
                'startedAt' => $quizSession->getStartedAt()->format(DATE_ATOM),
                'quizTitle' => $quiz->getTitle(),
                'quizDescription' => $quiz->getDescription(),
                'quizId' => $quiz->getId(),
            ],
            'quiz' => $this->normalizeQuizForPlay($quiz),
        ]);
    }

    #[Route('/api/quiz-sessions/{id}/lobby', name: 'api_quiz_sessions_lobby', methods: ['GET'])]
    public function getLobby(int $id, EntityManagerInterface $entityManager): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (null === $user) {
            return $this->json([
                'message' => 'Connecte-toi pour accéder au lobby.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $quizSession = $entityManager->getRepository(QuizSession::class)->find($id);
        if (!$quizSession instanceof QuizSession) {
            return $this->json([
                'message' => 'Session introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        $isOwner = $quizSession->getOwner()?->getId() === $user->getId();
        $playerSession = $entityManager->getRepository(PlayerSession::class)->findOneBy([
            'quizSession' => $quizSession,
            'user' => $user,
        ]);

        if (!$isOwner && !($playerSession instanceof PlayerSession)) {
            return $this->json([
                'message' => 'Accès refusé à ce lobby.',
            ], Response::HTTP_FORBIDDEN);
        }

        $quiz = $quizSession->getQuiz();
        if (!$quiz instanceof Quiz) {
            return $this->json([
                'message' => 'Quiz introuvable pour cette session.',
            ], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'session' => [
                'quizSessionId' => $quizSession->getId(),
                'code' => $quizSession->getCode(),
                'status' => $quizSession->getStatus(),
                'isOwner' => $isOwner,
                'playerCount' => $quizSession->getPlayerSessions()->count(),
                'startedAt' => $quizSession->getStartedAt()->format(DATE_ATOM),
            ],
            'quiz' => [
                'id' => $quiz->getId(),
                'title' => $quiz->getTitle(),
                'description' => $quiz->getDescription(),
            ],
        ]);
    }

    #[Route('/api/quiz-sessions/{id}/start', name: 'api_quiz_sessions_start', methods: ['POST'])]
    public function startSession(int $id, EntityManagerInterface $entityManager): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (null === $user) {
            return $this->json([
                'message' => 'Connecte-toi pour démarrer une session.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $quizSession = $entityManager->getRepository(QuizSession::class)->find($id);
        if (!$quizSession instanceof QuizSession) {
            return $this->json([
                'message' => 'Session introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        if ($quizSession->getOwner()?->getId() !== $user->getId()) {
            return $this->json([
                'message' => 'Seul le propriétaire peut démarrer la session.',
            ], Response::HTTP_FORBIDDEN);
        }

        if (QuizSession::STATUS_FINISHED === $quizSession->getStatus()) {
            return $this->json([
                'message' => 'Cette session est terminée.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if (QuizSession::STATUS_RUNNING === $quizSession->getStatus()) {
            return $this->json([
                'message' => 'La session est déjà en cours.',
                'session' => [
                    'quizSessionId' => $quizSession->getId(),
                    'status' => $quizSession->getStatus(),
                ],
            ]);
        }

        $quizSession->setStatus(QuizSession::STATUS_RUNNING);
        $entityManager->flush();

        return $this->json([
            'message' => 'Session démarrée.',
            'session' => [
                'quizSessionId' => $quizSession->getId(),
                'status' => $quizSession->getStatus(),
            ],
        ]);
    }

    #[Route('/api/quiz-sessions/{id}/finish', name: 'api_quiz_sessions_finish', methods: ['POST'])]
    public function finishSession(int $id, EntityManagerInterface $entityManager): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (null === $user) {
            return $this->json([
                'message' => 'Connecte-toi pour finir une session.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $quizSession = $entityManager->getRepository(QuizSession::class)->find($id);
        if (!$quizSession instanceof QuizSession) {
            return $this->json([
                'message' => 'Session introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        if ($quizSession->getOwner()?->getId() !== $user->getId()) {
            return $this->json([
                'message' => 'Seul le propriétaire peut finir la session.',
            ], Response::HTTP_FORBIDDEN);
        }

        if (QuizSession::STATUS_FINISHED === $quizSession->getStatus()) {
            return $this->json([
                'message' => 'La session est déjà terminée.',
                'session' => [
                    'quizSessionId' => $quizSession->getId(),
                    'status' => $quizSession->getStatus(),
                    'endedAt' => $quizSession->getEndedAt()?->format(DATE_ATOM),
                ],
            ]);
        }

        $quizSession->setStatus(QuizSession::STATUS_FINISHED);
        $quizSession->setEndedAt(new \DateTimeImmutable());

        $entityManager->flush();

        return $this->json([
            'message' => 'Session terminée.',
            'session' => [
                'quizSessionId' => $quizSession->getId(),
                'status' => $quizSession->getStatus(),
                'endedAt' => $quizSession->getEndedAt()?->format(DATE_ATOM),
            ],
        ]);
    }

    #[Route('/api/quiz-sessions/{id}/results', name: 'api_quiz_sessions_results', methods: ['GET'])]
    public function getResults(int $id, EntityManagerInterface $entityManager): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (null === $user) {
            return $this->json([
                'message' => 'Connecte-toi pour voir les résultats d\'une session.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $quizSession = $entityManager->getRepository(QuizSession::class)->find($id);
        if (!$quizSession instanceof QuizSession) {
            return $this->json([
                'message' => 'Session introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }
        $isAdmin = in_array(User::ROLE_ADMIN, $user->getRoles(), true);
        $viewerPlayerSession = $entityManager->getRepository(PlayerSession::class)->findOneBy([
            'quizSession' => $quizSession,
            'user' => $user,
        ]);

        if (!$isAdmin && !($viewerPlayerSession instanceof PlayerSession)) {
            return $this->json([
                'message' => 'Accès refusé aux résultats de cette session.',
            ], Response::HTTP_FORBIDDEN);
        }

        $quiz = $quizSession->getQuiz();
        if (!$quiz instanceof Quiz) {
            return $this->json([
                'message' => 'Quiz introuvable pour cette session.',
            ], Response::HTTP_NOT_FOUND);
        }

        $totalQuestions = count($quiz->getQuestions());

        $results = [];
        foreach ($quizSession->getPlayerSessions() as $playerSession) {
            if (!$playerSession instanceof PlayerSession) {
                continue;
            }

            $finishedAt = $playerSession->getFinishedAt();

            $results[] = [
                'playerSessionId' => $playerSession->getId(),
                'nickname' => $playerSession->getNickname(),
                'score' => $playerSession->getScore(),
                'submitted' => count($playerSession->getUserAnswers()),
                'finishedAt' => $finishedAt?->format(DATE_ATOM),
                'isMe' => $playerSession->getUser()?->getId() === $user->getId(),
                '_finishedAtTs' => $finishedAt?->getTimestamp() ?? PHP_INT_MAX,
            ];
        }

        usort(
            $results,
            static fn (array $a, array $b): int => ($b['score'] <=> $a['score']) ?: ($a['_finishedAtTs'] <=> $b['_finishedAtTs']),
        );

        foreach ($results as $index => &$result) {
            $result['rank'] = $index + 1;
            unset($result['_finishedAtTs']);
        }
        unset($result);

        return $this->json([
            'session' => [
                'quizSessionId' => $quizSession->getId(),
                'code' => $quizSession->getCode(),
                'status' => $quizSession->getStatus(),
                'isOwner' => $quizSession->getOwner()?->getId() === $user->getId(),
                'startedAt' => $quizSession->getStartedAt()->format(DATE_ATOM),
                'endedAt' => $quizSession->getEndedAt()?->format(DATE_ATOM),
            ],
            'quiz' => [
                'id' => $quiz->getId(),
                'title' => $quiz->getTitle(),
                'totalQuestions' => $totalQuestions,
            ],
            'results' => $results,
        ]);
    }

    #[Route('/api/quizzes/{id}/submit', name: 'api_quizzes_submit', methods: ['POST'])]
    public function submit(int $id, Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (null === $user) {
            return $this->json([
                'message' => 'Connecte-toi pour envoyer tes réponses.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $quiz = $entityManager->getRepository(Quiz::class)->find($id);

        if (!$quiz instanceof Quiz) {
            return $this->json([
                'message' => 'Quiz introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        $payload = $this->decodeJsonPayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $playerSessionId = $payload['playerSessionId'] ?? null;
        $quizSessionId = $payload['quizSessionId'] ?? null;
        $answersValue = $payload['answers'] ?? null;

        if (!is_int($playerSessionId)) {
            return $this->json([
                'message' => 'playerSessionId est requis.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if (null !== $quizSessionId && !is_int($quizSessionId)) {
            return $this->json([
                'message' => 'quizSessionId doit être un entier.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if (!is_array($answersValue) || [] === $answersValue || !array_is_list($answersValue)) {
            return $this->json([
                'message' => 'Le champ answers doit être un tableau non vide.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $playerSession = $entityManager->getRepository(PlayerSession::class)->find($playerSessionId);
        if (!$playerSession instanceof PlayerSession && is_int($quizSessionId)) {
            $quizSessionForLookup = $entityManager->getRepository(QuizSession::class)->find($quizSessionId);
            if ($quizSessionForLookup instanceof QuizSession) {
                $playerSession = $entityManager->getRepository(PlayerSession::class)->findOneBy([
                    'quizSession' => $quizSessionForLookup,
                    'user' => $user,
                ]);
            }
        }

        if (!$playerSession instanceof PlayerSession) {
            return $this->json([
                'message' => 'Session joueur introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        if ($playerSession->getUser()?->getId() !== $user->getId()) {
            return $this->json([
                'message' => 'Cette session ne t\'appartient pas.',
            ], Response::HTTP_FORBIDDEN);
        }

        $quizSession = $playerSession->getQuizSession();
        if (!$quizSession instanceof QuizSession || $quizSession->getQuiz()?->getId() !== $quiz->getId()) {
            return $this->json([
                'message' => 'Cette session ne correspond pas à ce quiz.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if (QuizSession::STATUS_FINISHED === $quizSession->getStatus()) {
            return $this->json([
                'message' => 'Cette session est terminée.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if (null !== $playerSession->getFinishedAt()) {
            return $this->json([
                'message' => 'Cette session est déjà terminée.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $questions = $quiz->getQuestions()->toArray();
        $questionMap = [];

        foreach ($questions as $question) {
            if ($question instanceof Question && null !== $question->getId()) {
                $questionMap[$question->getId()] = $question;
            }
        }

        if ([] === $questionMap) {
            return $this->json([
                'message' => 'Ce quiz ne contient aucune question.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $score = 0;
        $submitted = 0;
        $details = [];

        foreach ($answersValue as $index => $answerPayload) {
            if (!is_array($answerPayload)) {
                return $this->json([
                    'message' => sprintf('Réponse #%d invalide.', $index + 1),
                ], Response::HTTP_BAD_REQUEST);
            }

            $questionId = $answerPayload['questionId'] ?? null;
            $answerIds = $answerPayload['answerIds'] ?? null;
            $responseTimeMs = $answerPayload['responseTimeMs'] ?? 0;

            if (!is_int($questionId) || !is_array($answerIds) || !array_is_list($answerIds)) {
                return $this->json([
                    'message' => sprintf('questionId et answerIds sont requis pour la réponse #%d.', $index + 1),
                ], Response::HTTP_BAD_REQUEST);
            }

            foreach ($answerIds as $answerId) {
                if (!is_int($answerId) || $answerId <= 0) {
                    return $this->json([
                        'message' => sprintf('answerIds doit être un tableau d\'entiers positifs pour la réponse #%d.', $index + 1),
                    ], Response::HTTP_BAD_REQUEST);
                }
            }

            $selectedAnswerIds = array_values(array_unique($answerIds));
            if (count($selectedAnswerIds) !== count($answerIds)) {
                return $this->json([
                    'message' => sprintf('answerIds ne doit pas contenir de doublons pour la réponse #%d.', $index + 1),
                ], Response::HTTP_BAD_REQUEST);
            }

            if (!is_int($responseTimeMs) || $responseTimeMs < 0) {
                return $this->json([
                    'message' => sprintf('responseTimeMs doit être un entier positif pour la réponse #%d.', $index + 1),
                ], Response::HTTP_BAD_REQUEST);
            }

            $question = $questionMap[$questionId] ?? null;
            if (!$question instanceof Question) {
                return $this->json([
                    'message' => sprintf('Question #%d introuvable dans ce quiz.', $questionId),
                ], Response::HTTP_BAD_REQUEST);
            }

            $answerMap = [];
            $correctAnswerIds = [];

            foreach ($question->getQuestionAnswers() as $questionAnswer) {
                if (!$questionAnswer instanceof QuestionAnswer) {
                    continue;
                }

                $answer = $questionAnswer->getAnswer();
                if (!$answer instanceof Answer) {
                    continue;
                }

                $answerId = $answer->getId();
                if (!is_int($answerId) || $answerId <= 0) {
                    continue;
                }

                $answerMap[$answerId] = $answer;
                if ($questionAnswer->isCorrect()) {
                    $correctAnswerIds[] = $answerId;
                }
            }

            if ([] === $selectedAnswerIds) {
                sort($correctAnswerIds);
                $details[] = [
                    'questionId' => $question->getId(),
                    'answerIds' => [],
                    'correctAnswerIds' => $correctAnswerIds,
                    'isCorrect' => false,
                ];
                ++$submitted;
                continue;
            }

            foreach ($selectedAnswerIds as $selectedAnswerId) {
                if (!isset($answerMap[$selectedAnswerId])) {
                    return $this->json([
                        'message' => sprintf('La réponse choisie pour la question #%d est invalide.', $questionId),
                    ], Response::HTTP_BAD_REQUEST);
                }
            }

            sort($selectedAnswerIds);
            sort($correctAnswerIds);
            $isCorrect = $selectedAnswerIds === $correctAnswerIds;

            foreach ($selectedAnswerIds as $selectedAnswerId) {
                $userAnswer = new UserAnswer();
                $userAnswer->setPlayerSession($playerSession);
                $userAnswer->setQuestion($question);
                $userAnswer->setAnswer($answerMap[$selectedAnswerId]);
                $userAnswer->setResponseTimeMs($responseTimeMs);
                $userAnswer->setIsCorrect($isCorrect);

                $entityManager->persist($userAnswer);
            }

            ++$submitted;
            if ($isCorrect) {
                ++$score;
            }

            $details[] = [
                'questionId' => $question->getId(),
                'answerIds' => $selectedAnswerIds,
                'correctAnswerIds' => $correctAnswerIds,
                'isCorrect' => $isCorrect,
            ];
        }

        $playerSession->setScore($score);
        $playerSession->setFinishedAt(new \DateTimeImmutable());

        $entityManager->flush();

        return $this->json([
            'message' => 'Réponses enregistrées.',
            'result' => [
                'score' => $score,
                'submitted' => $submitted,
                'totalQuestions' => count($questionMap),
                'details' => $details,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>|JsonResponse
     */
    private function decodeJsonPayload(Request $request): array|JsonResponse
    {
        $payload = json_decode($request->getContent(), true);

        if (!is_array($payload)) {
            return $this->json([
                'message' => 'Payload JSON invalide.',
            ], Response::HTTP_BAD_REQUEST);
        }

        return $payload;
    }

    private function canAccessQuiz(Quiz $quiz, User $user): bool
    {
        return in_array(User::ROLE_ADMIN, $user->getRoles(), true)
            || $quiz->getCreatedBy()?->getId() === $user->getId();
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeQuizForPlay(Quiz $quiz): array
    {
        $questions = $quiz->getQuestions()->toArray();

        usort(
            $questions,
            static fn (Question $left, Question $right): int => $left->getPosition() <=> $right->getPosition(),
        );

        return [
            'id' => $quiz->getId(),
            'title' => $quiz->getTitle(),
            'description' => $quiz->getDescription(),
            'questions' => array_map(static function (Question $question): array {
                $questionAnswers = $question->getQuestionAnswers()->toArray();

                usort(
                    $questionAnswers,
                    static fn (QuestionAnswer $left, QuestionAnswer $right): int => $left->getPosition() <=> $right->getPosition(),
                );

                return [
                    'id' => $question->getId(),
                    'label' => $question->getLabel(),
                    'type' => $question->getType(),
                    'timeLimit' => $question->getTimeLimit(),
                    'position' => $question->getPosition(),
                    'answers' => array_map(static function (QuestionAnswer $questionAnswer): array {
                        $answer = $questionAnswer->getAnswer();

                        return [
                            'id' => $answer?->getId(),
                            'content' => $answer?->getContent() ?? '',
                            'position' => $questionAnswer->getPosition(),
                        ];
                    }, $questionAnswers),
                ];
            }, $questions),
        ];
    }
}
