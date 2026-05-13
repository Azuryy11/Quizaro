<?php

namespace App\Command;

use App\Service\QuizSessionCleanupService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
	name: 'app:cleanup-quiz-sessions',
	description: 'Nettoie les sessions WAITING/RUNNING/FINISHED obsoletes.',
)]
final class CleanupQuizSessionsCommand extends Command
{
	public function __construct(private readonly QuizSessionCleanupService $cleanupService)
	{
		parent::__construct();
	}

	protected function configure(): void
	{
		$this->addOption('dry-run', null, InputOption::VALUE_NONE, 'Simulation sans modification BDD');
	}

	protected function execute(InputInterface $input, OutputInterface $output): int
	{
		$io = new SymfonyStyle($input, $output);
		$dryRun = (bool) $input->getOption('dry-run');

		$result = $this->cleanupService->run($dryRun);

		if ($dryRun) {
			$io->title('Dry run');
			$io->listing([
				'WAITING > 24h a supprimer : '.$result['wouldDeleteWaiting'],
				'RUNNING > 2h a terminer : '.$result['wouldFinishRunning'],
				'FINISHED > 7j a supprimer : '.$result['wouldDeleteFinished'],
			]);

			return Command::SUCCESS;
		}

		$io->success('Cleanup execute');
		$io->listing([
			'WAITING supprimees : '.$result['waitingDeleted'],
			'RUNNING passees FINISHED : '.$result['runningFinished'],
			'FINISHED supprimees : '.$result['finishedDeleted'],
		]);

		return Command::SUCCESS;
	}
}
