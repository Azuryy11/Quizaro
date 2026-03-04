<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/users')]
#[IsGranted(User::ROLE_ADMIN)]
final class ApiAdminUserController extends AbstractController
{
    #[Route('', name: 'api_admin_users_index', methods: ['GET'])]
    public function index(UserRepository $userRepository): JsonResponse
    {
        $users = $userRepository->findBy([], ['id' => 'ASC']);

        return $this->json([
            'users' => array_map(static fn (User $user): array => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'displayName' => $user->getDisplayName(),
                'roles' => $user->getRoles(),
            ], $users),
        ]);
    }

    #[Route('/{id}/promote', name: 'api_admin_users_promote', methods: ['POST'])]
    public function promote(User $user, EntityManagerInterface $entityManager): JsonResponse
    {
        $roles = $user->getRoles();
        if (!in_array(User::ROLE_ADMIN, $roles, true)) {
            $roles[] = User::ROLE_ADMIN;
            $user->setRoles($roles);
            $entityManager->flush();
        }

        return $this->json([
            'message' => 'Utilisateur promu admin.',
            'user' => [
                'id' => $user->getId(),
                'roles' => $user->getRoles(),
            ],
        ]);
    }

    #[Route('/{id}/demote', name: 'api_admin_users_demote', methods: ['POST'])]
    public function demote(User $user, EntityManagerInterface $entityManager): JsonResponse
    {
        $currentUser = $this->getUser();
        if ($currentUser instanceof User && $currentUser->getId() === $user->getId()) {
            return $this->json([
                'message' => 'Tu ne peux pas retirer ton propre rôle admin.',
            ], 400);
        }

        $roles = array_values(array_filter(
            $user->getRoles(),
            static fn (string $role): bool => User::ROLE_ADMIN !== $role
        ));

        $user->setRoles($roles);
        $entityManager->flush();

        return $this->json([
            'message' => 'Utilisateur rétrogradé en rôle user.',
            'user' => [
                'id' => $user->getId(),
                'roles' => $user->getRoles(),
            ],
        ]);
    }
}
