import type { PageContext, PageRenderResult } from './types'

export const renderAdminQuizzesPage = ({ isAuthenticated, me, escapeHtml, navigate, apiGet, apiDelete }: PageContext): PageRenderResult => {
  if (!isAuthenticated) {
    return {
      content: `
        <section class="card">
          <h2>Gestion des quiz</h2>
          <p>Tu dois te connecter pour accéder à cette page.</p>
          <button id="go-login-admin-quizzes">Aller à la connexion</button>
        </section>
      `,
      mount: () => {
        const goLoginButton = document.querySelector<HTMLButtonElement>('#go-login-admin-quizzes')
        goLoginButton?.addEventListener('click', () => navigate('/login'))
      },
    }
  }

  const user = me.user as Record<string, unknown>
  const roles = Array.isArray(user.roles) ? user.roles.map((role) => String(role)) : []
  const isAdmin = roles.includes('ROLE_ADMIN')

  if (!isAdmin) {
    return {
      content: `
        <section class="card">
          <h2>Gestion des quiz</h2>
          <p>Accès refusé : cette page est réservée aux administrateurs.</p>
          <button id="back-admin-home">Retour à l'administration</button>
        </section>
      `,
      mount: () => {
        const backButton = document.querySelector<HTMLButtonElement>('#back-admin-home')
        backButton?.addEventListener('click', () => navigate('/admin'))
      },
    }
  }

  return {
    content: `
      <section class="card">
        <h2>Gestion des quiz (admin)</h2>
        <p id="admin-quizzes-msg"></p>
        <div id="admin-quizzes-list">Chargement...</div>
        <button id="admin-quizzes-back" type="button" class="play-quiz-submit">Retour à l'administration</button>
      </section>
    `,
    mount: () => {
      const listContainer = document.querySelector<HTMLDivElement>('#admin-quizzes-list')
      const message = document.querySelector<HTMLParagraphElement>('#admin-quizzes-msg')
      const backButton = document.querySelector<HTMLButtonElement>('#admin-quizzes-back')

      backButton?.addEventListener('click', () => navigate('/admin'))

      if (!listContainer) {
        return
      }

      const renderQuizCard = (quiz: Record<string, unknown>): string => {
        const quizId = Number(quiz.id ?? 0)
        const title = escapeHtml(String(quiz.title ?? 'Quiz'))
        const description = escapeHtml(String(quiz.description ?? ''))
        const createdBy = escapeHtml(String(quiz.createdBy ?? 'Inconnu'))
        const questionsCount = Number(quiz.questionsCount ?? 0)
        const questions = Array.isArray(quiz.questions) ? quiz.questions : []

        const questionsHtml = questions.length === 0
          ? '<p class="admin-quiz-empty">Aucune question trouvée pour ce quiz.</p>'
          : questions
              .map((rawQuestion, questionIndex) => {
                const question = rawQuestion as Record<string, unknown>
                const label = escapeHtml(String(question.label ?? 'Question sans titre'))
                const type = escapeHtml(String(question.type ?? 'INCONNU'))
                const answers = Array.isArray(question.answers) ? question.answers : []

                const answersHtml = answers.length === 0
                  ? '<li class="admin-quiz-answer">Aucune réponse</li>'
                  : answers
                      .map((rawAnswer) => {
                        const answer = rawAnswer as Record<string, unknown>
                        const content = escapeHtml(String(answer.content ?? 'Réponse vide'))
                        const isCorrect = Boolean(answer.isCorrect)

                        return `
                          <li class="admin-quiz-answer${isCorrect ? ' admin-quiz-answer--correct' : ''}">
                            ${content}${isCorrect ? ' <strong>(bonne réponse)</strong>' : ''}
                          </li>
                        `
                      })
                      .join('')

                return `
                  <div class="admin-quiz-question">
                    <p><strong>Q${questionIndex + 1} (${type}) :</strong> ${label}</p>
                    <ul class="admin-quiz-answer-list">
                      ${answersHtml}
                    </ul>
                  </div>
                `
              })
              .join('')

        return `
          <div class="card card--spaced">
            <h3>${title}</h3>
            <p><strong>Description :</strong> ${description}</p>
            <p><strong>ID :</strong> ${quizId}</p>
            <p><strong>Propriétaire :</strong> ${createdBy}</p>
            <p><strong>Questions :</strong> ${Number.isFinite(questionsCount) ? questionsCount : '-'}</p>
            <details class="admin-quiz-details">
              <summary>Voir les questions</summary>
              <div class="admin-quiz-details-content">
                ${questionsHtml}
              </div>
            </details>
            <button type="button" data-delete-quiz="${quizId}" data-confirm-delete="0">Supprimer</button>
          </div>
        `
      }

      const pendingDeleteTimeouts = new Map<number, number>()

      const loadQuizzes = async (): Promise<void> => {
        try {
          const response = await apiGet('/api/quizzes')
          const quizzes = Array.isArray(response.quizzes) ? response.quizzes : []

          if (quizzes.length === 0) {
            listContainer.innerHTML = '<p>Aucun quiz.</p>'
            return
          }

          listContainer.innerHTML = quizzes.map((entry) => renderQuizCard(entry as Record<string, unknown>)).join('')
        } catch (error) {
          listContainer.innerHTML = `<p>Impossible de charger les quiz (${escapeHtml((error as Error).message)})</p>`
        }
      }

      listContainer.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null
        const deleteButton = target?.closest<HTMLButtonElement>('[data-delete-quiz]')
        if (!deleteButton) {
          return
        }

        const quizId = Number(deleteButton.getAttribute('data-delete-quiz') ?? '0')
        if (!Number.isFinite(quizId) || quizId <= 0) {
          message && (message.textContent = 'Quiz invalide.')
          return
        }

        const confirmDelete = deleteButton.getAttribute('data-confirm-delete') === '1'
        if (!confirmDelete) {
          const existingTimeoutId = pendingDeleteTimeouts.get(quizId)
          if (typeof existingTimeoutId === 'number') {
            window.clearTimeout(existingTimeoutId)
          }

          deleteButton.setAttribute('data-confirm-delete', '1')
          deleteButton.textContent = 'Cliquer encore pour supprimer'
          message && (message.textContent = 'Confirme la suppression avec un second clic.')

          const timeoutId = window.setTimeout(() => {
            deleteButton.setAttribute('data-confirm-delete', '0')
            deleteButton.textContent = 'Supprimer'
            pendingDeleteTimeouts.delete(quizId)
          }, 5000)

          pendingDeleteTimeouts.set(quizId, timeoutId)
          return
        }

        const existingTimeoutId = pendingDeleteTimeouts.get(quizId)
        if (typeof existingTimeoutId === 'number') {
          window.clearTimeout(existingTimeoutId)
          pendingDeleteTimeouts.delete(quizId)
        }

        void (async () => {
          deleteButton.disabled = true
          message && (message.textContent = 'Suppression en cours...')
          try {
            await apiDelete(`/api/quizzes/${quizId}`)
            message && (message.textContent = 'Quiz supprimé ✅')
            await loadQuizzes()
          } catch (error) {
            message && (message.textContent = `Erreur: ${(error as Error).message}`)
            deleteButton.disabled = false
            deleteButton.setAttribute('data-confirm-delete', '0')
            deleteButton.textContent = 'Supprimer'
          }
        })()
      })

      void loadQuizzes()
    },
  }
}
