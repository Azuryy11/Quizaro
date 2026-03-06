<?php

namespace App\Controller;

use App\Entity\Answer;
use App\Entity\PlayerSession;
use App\Entity\Question;
use App\Entity\Quiz;
use App\Entity\QuizSession;
use App\Entity\User;
use App\Entity\UserAnswer;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class ApiQuizController extends AbstractController
{
    #[Route('/api/quizzes', name: 'api_quizzes_list', methods: ['GET'])]
    public function list(EntityManagerInterface $entityManager): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (null === $user) {
            return $this->json([
                'message' => 'Connecte-toi pour voir les quiz.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $isAdmin = in_array(User::ROLE_ADMIN, $user->getRoles(), true);
        $criteria = $isAdmin ? [] : ['createdBy' => $user];

        $quizzes = $entityManager->getRepository(Quiz::class)->findBy($criteria, ['id' => 'DESC']);

        return $this->json([
            'quizzes' => array_map(fn (Quiz $quiz): array => $this->normalizeQuiz($quiz), $quizzes),
        ]);
    }

    #[Route('/api/quizzes/{id}', name: 'api_quizzes_show', methods: ['GET'])]
    public function show(int $id, EntityManagerInterface $entityManager): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (null === $user) {
            return $this->json([
                'message' => 'Connecte-toi pour voir ce quiz.',
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

        return $this->json([
            'quiz' => $this->normalizeQuiz($quiz),
        ]);
    }

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
        $quizSession->setStatus(QuizSession::STATUS_RUNNING);

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
                'startedAt' => $quizSession->getStartedAt()->format(DATE_ATOM),
            ],
            'quiz' => $this->normalizeQuizForPlay($quiz),
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

        if (!$this->canAccessQuiz($quiz, $user)) {
            return $this->json([
                'message' => 'Accès refusé à ce quiz.',
            ], Response::HTTP_FORBIDDEN);
        }

        $payload = $this->decodeJsonPayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $playerSessionId = $payload['playerSessionId'] ?? null;
        $answersValue = $payload['answers'] ?? null;

        if (!is_int($playerSessionId)) {
            return $this->json([
                'message' => 'playerSessionId est requis.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if (!is_array($answersValue) || [] === $answersValue || !array_is_list($answersValue)) {
            return $this->json([
                'message' => 'Le champ answers doit être un tableau non vide.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $playerSession = $entityManager->getRepository(PlayerSession::class)->find($playerSessionId);
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
            $answerId = $answerPayload['answerId'] ?? null;
            $responseTimeMs = $answerPayload['responseTimeMs'] ?? 0;

            if (!is_int($questionId) || !is_int($answerId)) {
                return $this->json([
                    'message' => sprintf('questionId et answerId sont requis pour la réponse #%d.', $index + 1),
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

            $selectedAnswer = null;
            foreach ($question->getAnswers() as $answer) {
                if ($answer instanceof Answer && $answer->getId() === $answerId) {
                    $selectedAnswer = $answer;
                    break;
                }
            }

            if (!$selectedAnswer instanceof Answer) {
                return $this->json([
                    'message' => sprintf('La réponse choisie pour la question #%d est invalide.', $questionId),
                ], Response::HTTP_BAD_REQUEST);
            }

            $isCorrect = $question->getCorrectAnswer()?->getId() === $selectedAnswer->getId();

            $userAnswer = new UserAnswer();
            $userAnswer->setPlayerSession($playerSession);
            $userAnswer->setQuestion($question);
            $userAnswer->setAnswer($selectedAnswer);
            $userAnswer->setResponseTimeMs($responseTimeMs);
            $userAnswer->setIsCorrect($isCorrect);

            $entityManager->persist($userAnswer);

            ++$submitted;
            if ($isCorrect) {
                ++$score;
            }

            $details[] = [
                'questionId' => $question->getId(),
                'answerId' => $selectedAnswer->getId(),
                'isCorrect' => $isCorrect,
            ];
        }

        $playerSession->setScore($score);
        $playerSession->setFinishedAt(new \DateTimeImmutable());
        $quizSession->setStatus(QuizSession::STATUS_FINISHED);
        $quizSession->setEndedAt(new \DateTimeImmutable());

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

    #[Route('/api/quizzes', name: 'api_quizzes_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (null === $user) {
            return $this->json([
                'message' => 'Connecte-toi pour créer un quiz.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $payload = $this->decodeJsonPayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $validated = $this->validateQuizPayload($payload);
        if ($validated instanceof JsonResponse) {
            return $validated;
        }

        ['title' => $title, 'description' => $description, 'questions' => $questions] = $validated;

        $quiz = new Quiz();
        $quiz->setCreatedBy($user);
        $quiz->setTitle($title);
        $quiz->setDescription($description);

        $this->hydrateQuestions($quiz, $questions, $entityManager);

        $entityManager->persist($quiz);
        $entityManager->flush();

        return $this->json([
            'message' => 'Quiz créé.',
            'quiz' => $this->normalizeQuiz($quiz),
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/quizzes/{id}', name: 'api_quizzes_update', methods: ['PUT', 'PATCH'])]
    public function update(int $id, Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (null === $user) {
            return $this->json([
                'message' => 'Connecte-toi pour modifier un quiz.',
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

        $payload = $this->decodeJsonPayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $validated = $this->validateQuizPayload($payload);
        if ($validated instanceof JsonResponse) {
            return $validated;
        }

        ['title' => $title, 'description' => $description, 'questions' => $questions] = $validated;

        foreach ($quiz->getQuestions()->toArray() as $existingQuestion) {
            $quiz->removeQuestion($existingQuestion);
            $entityManager->remove($existingQuestion);
        }

        $quiz->setTitle($title);
        $quiz->setDescription($description);

        $this->hydrateQuestions($quiz, $questions, $entityManager);

        $entityManager->flush();

        return $this->json([
            'message' => 'Quiz mis à jour.',
            'quiz' => $this->normalizeQuiz($quiz),
        ]);
    }

    #[Route('/api/quizzes/{id}', name: 'api_quizzes_delete', methods: ['DELETE'])]
    public function delete(int $id, EntityManagerInterface $entityManager): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (null === $user) {
            return $this->json([
                'message' => 'Connecte-toi pour supprimer un quiz.',
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

        $entityManager->remove($quiz);
        $entityManager->flush();

        return $this->json([
            'message' => 'Quiz supprimé.',
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

    /**
     * @param array<string, mixed> $payload
     *
     * @return array{title: string, description: ?string, questions: array<int, array{label: string, correctAnswer: bool}>}|JsonResponse
     */
    private function validateQuizPayload(array $payload): array|JsonResponse
    {
        $titleValue = $payload['title'] ?? null;
        $descriptionValue = $payload['description'] ?? null;
        $questionsValue = $payload['questions'] ?? null;

        if (!is_string($titleValue)) {
            return $this->json([
                'message' => 'Le titre du quiz doit être une chaîne de caractères.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $title = trim($titleValue);

        if ('' === $title) {
            return $this->json([
                'message' => 'Le titre du quiz est obligatoire.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if (mb_strlen($title) > 160) {
            return $this->json([
                'message' => 'Le titre du quiz ne doit pas dépasser 160 caractères.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if (null !== $descriptionValue && !is_string($descriptionValue)) {
            return $this->json([
                'message' => 'La description doit être une chaîne de caractères.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if (!is_array($questionsValue) || [] === $questionsValue) {
            return $this->json([
                'message' => 'Le quiz doit contenir au moins une question.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if (!array_is_list($questionsValue)) {
            return $this->json([
                'message' => 'Le champ questions doit être un tableau JSON ordonné.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $normalizedQuestions = [];

        foreach ($questionsValue as $index => $questionPayload) {
            if (!is_array($questionPayload)) {
                return $this->json([
                    'message' => sprintf('Question #%d invalide.', $index + 1),
                ], Response::HTTP_BAD_REQUEST);
            }

            $labelRaw = $questionPayload['label'] ?? $questionPayload['content'] ?? null;
            $correctAnswer = $questionPayload['correctAnswer'] ?? null;

            if (!is_string($labelRaw)) {
                return $this->json([
                    'message' => sprintf('Le label de la question #%d est obligatoire.', $index + 1),
                ], Response::HTTP_BAD_REQUEST);
            }

            $label = trim($labelRaw);

            if ('' === $label) {
                return $this->json([
                    'message' => sprintf('Le label de la question #%d est obligatoire.', $index + 1),
                ], Response::HTTP_BAD_REQUEST);
            }

            if (mb_strlen($label) > 180) {
                return $this->json([
                    'message' => sprintf('Le label de la question #%d ne doit pas dépasser 180 caractères.', $index + 1),
                ], Response::HTTP_BAD_REQUEST);
            }

            if (!is_bool($correctAnswer)) {
                return $this->json([
                    'message' => sprintf('correctAnswer doit être un booléen pour la question #%d.', $index + 1),
                ], Response::HTTP_BAD_REQUEST);
            }

            $normalizedQuestions[] = [
                'label' => $label,
                'correctAnswer' => $correctAnswer,
            ];
        }

        $description = is_string($descriptionValue) ? trim($descriptionValue) : null;
        if ('' === (string) $description) {
            $description = null;
        }

        return [
            'title' => $title,
            'description' => $description,
            'questions' => $normalizedQuestions,
        ];
    }

    /**
     * @param array<int, array{label: string, correctAnswer: bool}> $questions
     */
    private function hydrateQuestions(Quiz $quiz, array $questions, EntityManagerInterface $entityManager): void
    {
        $answerTrue = $this->getOrCreateBooleanAnswer($entityManager, 'VRAI', true, 1);
        $answerFalse = $this->getOrCreateBooleanAnswer($entityManager, 'FAUX', false, 2);

        foreach ($questions as $index => $questionPayload) {
            $question = new Question();
            $question->setQuiz($quiz);
            $question->setLabel($questionPayload['label']);
            $question->setType(Question::TYPE_TRUE_FALSE);
            $question->setTimeLimit(30);
            $question->setPosition($index + 1);

            $question->addAnswer($answerTrue);
            $question->addAnswer($answerFalse);
            $question->setCorrectAnswer(true === $questionPayload['correctAnswer'] ? $answerTrue : $answerFalse);

            $entityManager->persist($question);
        }
    }

    private function getOrCreateBooleanAnswer(EntityManagerInterface $entityManager, string $content, bool $isCorrect, int $position): Answer
    {
        $answer = $entityManager->getRepository(Answer::class)->findOneBy(['content' => $content]);

        if ($answer instanceof Answer) {
            if ($answer->isCorrect() !== $isCorrect) {
                $answer->setIsCorrect($isCorrect);
            }

            if ($answer->getPosition() !== $position) {
                $answer->setPosition($position);
            }

            return $answer;
        }

        $answer = new Answer();
        $answer->setContent($content);
        $answer->setIsCorrect($isCorrect);
        $answer->setPosition($position);

        $entityManager->persist($answer);

        return $answer;
    }

    private function canAccessQuiz(Quiz $quiz, User $user): bool
    {
        return in_array(User::ROLE_ADMIN, $user->getRoles(), true)
            || $quiz->getCreatedBy()?->getId() === $user->getId();
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeQuiz(Quiz $quiz): array
    {
        $questions = $quiz->getQuestions()->toArray();

        usort(
            $questions,
            fn (Question $left, Question $right): int => (int) ($left->getPosition() ?? 0) <=> (int) ($right->getPosition() ?? 0),
        );

        $normalizedQuestions = array_map(function (Question $question): array {
            $answers = $question->getAnswers()->toArray();

            usort(
                $answers,
                fn (Answer $left, Answer $right): int => (int) ($left->getPosition() ?? 0) <=> (int) ($right->getPosition() ?? 0),
            );

            return [
                'id' => $question->getId(),
                'label' => $question->getLabel(),
                'type' => $question->getType(),
                'position' => $question->getPosition(),
                'answers' => array_map(static fn (Answer $answer): array => [
                    'id' => $answer->getId(),
                    'content' => $answer->getContent(),
                    'isCorrect' => $question->getCorrectAnswer()?->getId() === $answer->getId(),
                    'position' => $answer->getPosition(),
                ], $answers),
            ];
        }, $questions);

        return [
            'id' => $quiz->getId(),
            'title' => $quiz->getTitle(),
            'description' => $quiz->getDescription(),
            'createdAt' => $quiz->getCreatedAt()->format(DATE_ATOM),
            'createdBy' => $quiz->getCreatedBy()?->getUserIdentifier(),
            'questionsCount' => count($normalizedQuestions),
            'questions' => $normalizedQuestions,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeQuizForPlay(Quiz $quiz): array
    {
        $questions = $quiz->getQuestions()->toArray();

        usort(
            $questions,
            fn (Question $left, Question $right): int => $left->getPosition() <=> $right->getPosition(),
        );

        return [
            'id' => $quiz->getId(),
            'title' => $quiz->getTitle(),
            'description' => $quiz->getDescription(),
            'questions' => array_map(function (Question $question): array {
                $answers = $question->getAnswers()->toArray();
                usort(
                    $answers,
                    fn (Answer $left, Answer $right): int => $left->getPosition() <=> $right->getPosition(),
                );

                return [
                    'id' => $question->getId(),
                    'label' => $question->getLabel(),
                    'type' => $question->getType(),
                    'timeLimit' => $question->getTimeLimit(),
                    'position' => $question->getPosition(),
                    'answers' => array_map(static fn (Answer $answer): array => [
                        'id' => $answer->getId(),
                        'content' => $answer->getContent(),
                        'position' => $answer->getPosition(),
                    ], $answers),
                ];
            }, $questions),
        ];
    }

}
