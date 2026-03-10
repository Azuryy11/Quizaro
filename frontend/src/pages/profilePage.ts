import type { PageContext, PageRenderResult } from './types'

export const renderProfilePage = ({ isAuthenticated, me, escapeHtml, navigate, apiGet, apiDelete }: PageContext): PageRenderResult => {
  if (!isAuthenticated) {
    return {
      content: `
        <section class="card">
          <h2>Profil</h2>
          <p>Tu dois te connecter pour voir ton profil.</p>
          <button id="go-login">Aller à la connexion</button>
        </section>
      `,
      mount: () => {
        const goLoginButton = document.querySelector<HTMLButtonElement>('#go-login')
        if (goLoginButton) {
          goLoginButton.addEventListener('click', () => navigate('/login'))
        }
      },
    }
  }

  const user = me.user as Record<string, unknown>
  const roles = Array.isArray(user.roles) ? user.roles.map((role) => String(role)) : []
  const isAdmin = roles.includes('ROLE_ADMIN')
  const quizzesCount = Number(user.quizzesCount ?? NaN)
  const hasQuizzesCount = Number.isFinite(quizzesCount)
  const quizzesLabel = quizzesCount > 1 ? 'Quiz créés' : 'Quiz créé'
  return {
    content: `
      <section class="card">
        <h3>Bienvenue sur ton profil ${escapeHtml(String(user.displayName ?? ''))} !</h3>
        <div class="profile-details">
          <p><strong>Pseudo :</strong> ${escapeHtml(String(user.displayName ?? ''))}</p>
          <p><strong>Email :</strong> ${escapeHtml(String(user.email ?? ''))}</p>
          <p><strong>Rôle :</strong> ${escapeHtml(String(((user.roles as unknown[]) ?? []).join(', ')))}</p>
          ${hasQuizzesCount ? `<p><strong>${quizzesLabel} :</strong> ${escapeHtml(String(quizzesCount))}</p>` : ''}
        </div>

        <div class="profile-actions">
          <button id="create-quiz">Créer un quiz</button>
          <button id="open-my-quizzes">Mes quiz</button>
        </div>

        ${isAdmin
          ? `
            <div class="profile-admin-action">
              <button id="open-admin-users">Gérer les utilisateurs</button>
            </div>
          `
          : ''}
      </section>
    `,
    mount: () => {
      const listContainer = document.querySelector<HTMLDivElement>('#profile-quizzes-list')
      const listMessage = document.querySelector<HTMLParagraphElement>('#profile-quizzes-msg')

      const loadQuizzes = async (): Promise<void> => {
        if (!listContainer) {
          return
        }

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
                  <button type="button" data-edit-quiz="${quizId}">Modifier</button>
                  <button type="button" data-delete-quiz="${quizId}">Supprimer</button>
                </div>
              `
            })
            .join('')
        } catch (error) {
          if (listContainer) {
            listContainer.innerHTML = `<p>Erreur de chargement (${escapeHtml((error as Error).message)})</p>`
          }
        }
      }

      if (listContainer) {
        listContainer.addEventListener('click', (event) => {
          const target = event.target as HTMLElement | null

          const editButton = target?.closest<HTMLButtonElement>('[data-edit-quiz]')
          if (editButton) {
            const quizId = Number(editButton.getAttribute('data-edit-quiz') ?? '0')
            if (!Number.isFinite(quizId) || quizId <= 0) {
              if (listMessage) {
                listMessage.textContent = 'Quiz invalide.'
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
              if (listMessage) {
                listMessage.textContent = 'Quiz invalide.'
              }
              return
            }

            const confirmed = window.confirm('Supprimer ce quiz ? Cette action est irréversible.')
            if (!confirmed) {
              return
            }

            void (async () => {
              if (listMessage) {
                listMessage.textContent = 'Suppression en cours...'
              }
              try {
                await apiDelete(`/api/quizzes/${quizId}`)
                if (listMessage) {
                  listMessage.textContent = 'Quiz supprimé.'
                }
                await loadQuizzes()
              } catch (error) {
                if (listMessage) {
                  listMessage.textContent = `Erreur: ${(error as Error).message}`
                }
              }
            })()
          }
        })

        void loadQuizzes()
      }

      const openMyQuizzesButton = document.querySelector<HTMLButtonElement>('#open-my-quizzes')
      if (openMyQuizzesButton) {
        openMyQuizzesButton.addEventListener('click', () => {
          navigate('/my-quizzes')
        })
      }
      const createQuizButton = document.querySelector<HTMLButtonElement>('#create-quiz')
      if (createQuizButton) {
        createQuizButton.addEventListener('click', () => {
          navigate('/create-quiz')
        })
      }

      if (isAdmin) {
        const openAdminUsersButton = document.querySelector<HTMLButtonElement>('#open-admin-users')
        if (openAdminUsersButton) {
          openAdminUsersButton.addEventListener('click', () => {
            const adminUrl = `${window.location.origin}${window.location.pathname}#/admin/users`
            window.open(adminUrl, '_blank', 'noopener')
          })
        }
      }
    },
  }
}