<?php

namespace App\Command;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:user:role',
    description: 'Attribue ou retire ROLE_ADMIN à un utilisateur.',
)]
final class UserRoleCommand extends Command
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::REQUIRED, 'Email de l\'utilisateur')
            ->addOption('remove-admin', null, InputOption::VALUE_NONE, 'Retire ROLE_ADMIN au lieu de l\'ajouter');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $email = trim((string) $input->getArgument('email'));
        if ('' === $email) {
            $io->error('Email requis.');

            return Command::INVALID;
        }

        $user = $this->userRepository->findOneBy(['email' => $email]);
        if (!$user instanceof User) {
            $io->error(sprintf('Aucun utilisateur trouvé pour "%s".', $email));

            return Command::FAILURE;
        }

        $roles = $user->getRoles();
        $removeAdmin = (bool) $input->getOption('remove-admin');

        if ($removeAdmin) {
            $roles = array_values(array_filter($roles, static fn (string $role): bool => User::ROLE_ADMIN !== $role));
        } elseif (!in_array(User::ROLE_ADMIN, $roles, true)) {
            $roles[] = User::ROLE_ADMIN;
        }

        $user->setRoles($roles);
        $this->entityManager->flush();

        $io->success(sprintf(
            'Rôles de %s : %s',
            $user->getEmail(),
            implode(', ', $user->getRoles())
        ));

        return Command::SUCCESS;
    }
}
