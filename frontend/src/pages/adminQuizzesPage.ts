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

        return `
          <div class="card card--spaced">
            <h3>${title}</h3>
            <p><strong>Description :</strong> ${description}</p>
            <p><strong>ID :</strong> ${quizId}</p>
            <p><strong>Propriétaire :</strong> ${createdBy}</p>
            <p><strong>Questions :</strong> ${Number.isFinite(questionsCount) ? questionsCount : '-'}</p>
            <button type="button" data-delete-quiz="${quizId}">Supprimer</button>
          </div>
        `
      }

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

        const confirmed = window.confirm('Supprimer ce quiz ? Cette action est irréversible.')
        if (!confirmed) {
          return
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
          }
        })()
      })

      void loadQuizzes()
    },
  }
}
