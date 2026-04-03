<?php

namespace App\Controller;

use App\Entity\Answer;
use App\Entity\Question;
use App\Entity\QuestionAnswer;
use App\Entity\Quiz;
use App\Entity\User;
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
     * @return array{title: string, description: ?string, questions: array<int, array{label: string, type: string, answers: array<int, string>, correctIndexes: array<int, int>}>}|JsonResponse
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

            $typeRaw = $questionPayload['type'] ?? Question::TYPE_TRUE_FALSE;
            if (!is_string($typeRaw)) {
                return $this->json([
                    'message' => sprintf('Le type de la question #%d est invalide.', $index + 1),
                ], Response::HTTP_BAD_REQUEST);
            }

            $type = strtoupper(trim($typeRaw));
            if (!in_array($type, [Question::TYPE_TRUE_FALSE, Question::TYPE_QCM], true)) {
                return $this->json([
                    'message' => sprintf('Le type de la question #%d doit être TRUE_FALSE ou QCM.', $index + 1),
                ], Response::HTTP_BAD_REQUEST);
            }

            if (Question::TYPE_TRUE_FALSE === $type) {
                $correctAnswer = $questionPayload['correctAnswer'] ?? null;

                if (!is_bool($correctAnswer)) {
                    return $this->json([
                        'message' => sprintf('correctAnswer doit être un booléen pour la question #%d.', $index + 1),
                    ], Response::HTTP_BAD_REQUEST);
                }

                $normalizedQuestions[] = [
                    'label' => $label,
                    'type' => Question::TYPE_TRUE_FALSE,
                    'answers' => ['VRAI', 'FAUX'],
                    'correctIndexes' => [$correctAnswer ? 0 : 1],
                ];

                continue;
            }

            $answersRaw = $questionPayload['answers'] ?? null;
            $correctIndexesRaw = $questionPayload['correctAnswers'] ?? null;

            if (!is_array($answersRaw) || [] === $answersRaw || !array_is_list($answersRaw)) {
                return $this->json([
                    'message' => sprintf('answers doit être un tableau non vide pour la question QCM #%d.', $index + 1),
                ], Response::HTTP_BAD_REQUEST);
            }

            $answers = [];
            foreach ($answersRaw as $answerIndex => $answerValue) {
                if (!is_string($answerValue)) {
                    return $this->json([
                        'message' => sprintf('La réponse #%d de la question #%d est invalide.', $answerIndex + 1, $index + 1),
                    ], Response::HTTP_BAD_REQUEST);
                }

                $answerContent = trim($answerValue);
                if ('' === $answerContent) {
                    return $this->json([
                        'message' => sprintf('La réponse #%d de la question #%d est vide.', $answerIndex + 1, $index + 1),
                    ], Response::HTTP_BAD_REQUEST);
                }

                if (mb_strlen($answerContent) > 255) {
                    return $this->json([
                        'message' => sprintf('La réponse #%d de la question #%d dépasse 255 caractères.', $answerIndex + 1, $index + 1),
                    ], Response::HTTP_BAD_REQUEST);
                }

                $answers[] = $answerContent;
            }

            if (count($answers) < 2) {
                return $this->json([
                    'message' => sprintf('La question QCM #%d doit avoir au moins 2 réponses.', $index + 1),
                ], Response::HTTP_BAD_REQUEST);
            }

            if (count(array_unique($answers)) !== count($answers)) {
                return $this->json([
                    'message' => sprintf('La question QCM #%d contient des réponses en doublon.', $index + 1),
                ], Response::HTTP_BAD_REQUEST);
            }

            if (!is_array($correctIndexesRaw) || [] === $correctIndexesRaw || !array_is_list($correctIndexesRaw)) {
                return $this->json([
                    'message' => sprintf('correctAnswers doit être un tableau non vide pour la question QCM #%d.', $index + 1),
                ], Response::HTTP_BAD_REQUEST);
            }

            $correctIndexes = [];
            foreach ($correctIndexesRaw as $correctIndex) {
                if (!is_int($correctIndex)) {
                    return $this->json([
                        'message' => sprintf('Les index de correctAnswers doivent être des entiers pour la question #%d.', $index + 1),
                    ], Response::HTTP_BAD_REQUEST);
                }

                if ($correctIndex < 0 || $correctIndex >= count($answers)) {
                    return $this->json([
                        'message' => sprintf('Un index de correctAnswers est hors limites pour la question #%d.', $index + 1),
                    ], Response::HTTP_BAD_REQUEST);
                }

                $correctIndexes[] = $correctIndex;
            }

            $correctIndexes = array_values(array_unique($correctIndexes));
            sort($correctIndexes);

            $normalizedQuestions[] = [
                'label' => $label,
                'type' => Question::TYPE_QCM,
                'answers' => $answers,
                'correctIndexes' => $correctIndexes,
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
     * @param array<int, array{label: string, type: string, answers: array<int, string>, correctIndexes: array<int, int>}> $questions
     */
    private function hydrateQuestions(Quiz $quiz, array $questions, EntityManagerInterface $entityManager): void
    {
        $answerTrue = $this->getOrCreateBooleanAnswer($entityManager, 'VRAI');
        $answerFalse = $this->getOrCreateBooleanAnswer($entityManager, 'FAUX');

        foreach ($questions as $index => $questionPayload) {
            $question = new Question();
            $question->setQuiz($quiz);
            $question->setLabel($questionPayload['label']);
            $question->setType($questionPayload['type']);
            $question->setTimeLimit(30);
            $question->setPosition($index + 1);

            if (Question::TYPE_TRUE_FALSE === $questionPayload['type']) {
                $isTrueCorrect = in_array(0, $questionPayload['correctIndexes'], true);

                $question->addQuestionAnswer(
                    (new QuestionAnswer())
                        ->setAnswer($answerTrue)
                        ->setPosition(1)
                        ->setIsCorrect($isTrueCorrect),
                );

                $question->addQuestionAnswer(
                    (new QuestionAnswer())
                        ->setAnswer($answerFalse)
                        ->setPosition(2)
                        ->setIsCorrect(!$isTrueCorrect),
                );

                $entityManager->persist($question);
                continue;
            }

            foreach ($questionPayload['answers'] as $answerIndex => $answerContent) {
                $answer = new Answer();
                $answer->setContent($answerContent);
                $entityManager->persist($answer);

                $question->addQuestionAnswer(
                    (new QuestionAnswer())
                        ->setAnswer($answer)
                        ->setPosition($answerIndex + 1)
                        ->setIsCorrect(in_array($answerIndex, $questionPayload['correctIndexes'], true)),
                );
            }

            $entityManager->persist($question);
        }
    }

    private function getOrCreateBooleanAnswer(EntityManagerInterface $entityManager, string $content): Answer
    {
        $answer = $entityManager->getRepository(Answer::class)->findOneBy(['content' => $content]);

        if ($answer instanceof Answer) {
            return $answer;
        }

        $answer = new Answer();
        $answer->setContent($content);
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
            $questionAnswers = $question->getQuestionAnswers()->toArray();

            usort(
                $questionAnswers,
                static fn (QuestionAnswer $left, QuestionAnswer $right): int => $left->getPosition() <=> $right->getPosition(),
            );

            return [
                'id' => $question->getId(),
                'label' => $question->getLabel(),
                'type' => $question->getType(),
                'position' => $question->getPosition(),
                'answers' => array_map(static function (QuestionAnswer $questionAnswer): array {
                    $answer = $questionAnswer->getAnswer();

                    return [
                        'id' => $answer?->getId(),
                        'content' => $answer?->getContent() ?? '',
                        'isCorrect' => $questionAnswer->isCorrect(),
                        'position' => $questionAnswer->getPosition(),
                    ];
                }, $questionAnswers),
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

}
