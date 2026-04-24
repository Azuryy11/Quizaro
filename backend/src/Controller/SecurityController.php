<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class SecurityController extends AbstractController
{
    #[Route('/login', name: 'app_login')]
    public function login(#[Autowire('%env(default::FRONTEND_URL)%')] string $frontendUrl): Response
    {
        return $this->redirect(rtrim($frontendUrl, '/').'/#/login');
    }

    #[Route('/logout', name: 'app_logout')]
    public function logout(): void
    {
        throw new \LogicException('This method is intercepted by the firewall logout.');
    }
}
