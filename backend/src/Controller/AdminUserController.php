<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/admin/users')]
#[IsGranted(User::ROLE_ADMIN)]
final class AdminUserController extends AbstractController
{
    #[Route('', name: 'admin_users_index', methods: ['GET'])]
    public function index(UserRepository $userRepository): Response
    {
        return $this->render('admin/users/index.html.twig', [
            'users' => $userRepository->findBy([], ['id' => 'ASC']),
        ]);
    }

    #[Route('/{id}/promote', name: 'admin_users_promote', methods: ['POST'])]
    public function promote(User $user, Request $request, EntityManagerInterface $entityManager): RedirectResponse
    {
        if (!$this->isCsrfTokenValid('admin_users_promote_'.$user->getId(), (string) $request->request->get('_token'))) {
            $this->addFlash('error', 'Token CSRF invalide.');

            return $this->redirectToRoute('admin_users_index');
        }

        $roles = $user->getRoles();
        if (!in_array(User::ROLE_ADMIN, $roles, true)) {
            $roles[] = User::ROLE_ADMIN;
            $user->setRoles($roles);
            $entityManager->flush();
            $this->addFlash('success', sprintf('%s est maintenant admin.', $user->getEmail()));
        }

        return $this->redirectToRoute('admin_users_index');
    }

    #[Route('/{id}/demote', name: 'admin_users_demote', methods: ['POST'])]
    public function demote(User $user, Request $request, EntityManagerInterface $entityManager): RedirectResponse
    {
        if (!$this->isCsrfTokenValid('admin_users_demote_'.$user->getId(), (string) $request->request->get('_token'))) {
            $this->addFlash('error', 'Token CSRF invalide.');

            return $this->redirectToRoute('admin_users_index');
        }

        $currentUser = $this->getUser();
        if ($currentUser instanceof User && $currentUser->getId() === $user->getId()) {
            $this->addFlash('error', 'Tu ne peux pas retirer ton propre rôle admin.');

            return $this->redirectToRoute('admin_users_index');
        }

        $roles = array_values(array_filter(
            $user->getRoles(),
            static fn (string $role): bool => User::ROLE_ADMIN !== $role
        ));

        $user->setRoles($roles);
        $entityManager->flush();
        $this->addFlash('success', sprintf('%s repasse utilisateur classique.', $user->getEmail()));

        return $this->redirectToRoute('admin_users_index');
    }
}
