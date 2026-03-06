<?php

namespace App\Controller;

use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class ApiController extends AbstractController
{
    #[Route('/api/status', name: 'api_status', methods: ['GET'])]
    public function status(): JsonResponse
    {
        $user = $this->getUser();

        return $this->json([
            'app' => 'Quizaro API',
            'status' => 'ok',
            'authenticated' => null !== $user,
            'user' => $user?->getUserIdentifier(),
            'time' => (new \DateTimeImmutable())->format(DATE_ATOM),
        ]);
    }

    #[Route('/api/home', name: 'api_home', methods: ['GET'])]
    public function home(): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        return $this->json([
            'title' => 'Bienvenue sur Quizaro',
            'authenticated' => null !== $user,
            'cta' => null !== $user
                ? 'Accède à ton profil.'
                : 'Créer un compte ou se connecter.',
        ]);
    }

    #[Route('/api/profile', name: 'api_profile_data', methods: ['GET'])]
    public function profileData(): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (null === $user) {
            return $this->json([
                'authenticated' => false,
                'message' => 'Connecte-toi pour accéder au profil.',
            ]);
        }

        return $this->json([
            'authenticated' => true,
            'email' => $user->getEmail(),
            'displayName' => $user->getDisplayName() ?: 'Non défini',
            'roles' => $user->getRoles(),
            'quizzesCount' => $user->getQuizzes()->count(),
            'scoresCount' => 0,
        ]);
    }
}
