import type { PageContext, PageRenderResult } from './types'

export const renderMyQuizzesPage = ({ isAuthenticated, navigate, apiGet, apiDelete, escapeHtml }: PageContext): PageRenderResult => {
  if (!isAuthenticated) {
    return {
      content: `
        <section class="card">
          <h2>Mes quiz</h2>
          <p>Connecte toi pour voir tes quiz.</p>
          <button id="go-login-my-quizzes">Aller à la connexion</button>
        </section>
      `,
      mount: () => {
        const goLoginButton = document.querySelector<HTMLButtonElement>('#go-login-my-quizzes')
        if (goLoginButton) {
          goLoginButton.addEventListener('click', () => navigate('/login'))
        }
      },
    }
  }

  return {
    content: `
      <section class="card">
        <h2>Mes quiz</h2>
        <p id="my-quizzes-msg"></p>
        <div id="my-quizzes-list">Chargement...</div>
      </section>
    `,
    mount: () => {
      const listContainer = document.querySelector<HTMLDivElement>('#my-quizzes-list')
      const message = document.querySelector<HTMLParagraphElement>('#my-quizzes-msg')

      if (!listContainer) {
        return
      }

      const loadQuizzes = async (): Promise<void> => {
        try {
          const response = await apiGet('/api/quizzes')
          const quizzes = Array.isArray(response.quizzes) ? response.quizzes : []

          if (quizzes.length === 0) {
            listContainer.innerHTML = '<p>Aucun quiz disponible.</p>'
            return
          }

          listContainer.innerHTML = quizzes
            .map((rawQuiz) => {
              const quiz = rawQuiz as Record<string, unknown>
              const quizId = Number(quiz.id ?? 0)
              const quizTitle = escapeHtml(String(quiz.title ?? 'Quiz sans titre'))
              const questionsCount = Number(quiz.questionsCount ?? 0)

              return `
                <div class="card card--spaced">
                  <h3>${quizTitle}</h3>
                  <p>${questionsCount} question(s)</p>
                  <button type="button" data-play-quiz="${quizId}">Jouer</button>
                  <button type="button" data-edit-quiz="${quizId}">Modifier</button>
                  <button type="button" data-delete-quiz="${quizId}">Supprimer</button>
                </div>
              `
            })
            .join('')
        } catch (error) {
          listContainer.innerHTML = `<p>Erreur de chargement (${escapeHtml((error as Error).message)})</p>`
        }
      }

      listContainer.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null
        const playButton = target?.closest<HTMLButtonElement>('[data-play-quiz]')
        if (playButton) {
          const quizId = Number(playButton.getAttribute('data-play-quiz') ?? '0')
          if (!Number.isFinite(quizId) || quizId <= 0) {
            if (message) {
              message.textContent = 'Quiz invalide.'
            }
            return
          }

          navigate(`/play-quiz/${quizId}`)
          return
        }

        const editButton = target?.closest<HTMLButtonElement>('[data-edit-quiz]')
        if (editButton) {
          const quizId = Number(editButton.getAttribute('data-edit-quiz') ?? '0')
          if (!Number.isFinite(quizId) || quizId <= 0) {
            if (message) {
              message.textContent = 'Quiz invalide.'
            }
            return
          }

          navigate(`/edit-quiz/${quizId}`)
          return
        }

        const deleteButton = target?.closest<HTMLButtonElement>('[data-delete-quiz]')
        if (deleteButton) {
          const quizId = Number(deleteButton.getAttribute('data-delete-quiz') ?? '0')
          if (!Number.isFinite(quizId) || quizId <= 0) {
            if (message) {
              message.textContent = 'Quiz invalide.'
            }
            return
          }

          const confirmed = window.confirm('Etes-vous sûr de vouloir supprimer ce quiz ?')
          if (!confirmed) {
            return
          }

          void (async () => {
            if (message) {
              message.textContent = 'Suppression en cours...'
            }
            try {
              await apiDelete(`/api/quizzes/${quizId}`)
              if (message) {
                message.textContent = 'Quiz supprimé'
              }
              await loadQuizzes()
            } catch (error) {
              if (message) {
                message.textContent = `Erreur: ${(error as Error).message}`
              }
            }
          })()
        }
      })

      void loadQuizzes()
    },
  }
}
