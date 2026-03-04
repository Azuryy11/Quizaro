import type { PageContext, PageRenderResult } from './types'

export const renderProfilePage = ({ isAuthenticated, me, escapeHtml, navigate }: PageContext): PageRenderResult => {
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
  return {
    content: `
      <section class="card">
        <h3>Bienvenue sur ton profil ${escapeHtml(String(user.displayName ?? ''))} !</h3>
        <ul>
          <p><strong>Pseudo :</strong> ${escapeHtml(String(user.displayName ?? ''))}</p>
          <p><strong>Email :</strong> ${escapeHtml(String(user.email ?? ''))}</p>
          <p><strong>Rôle :</strong> ${escapeHtml(String((user.roles as string[] ?? []).join(', ')))}</p>
          <p><strong>Quiz créés :</strong> ${escapeHtml(String(user.quizzesCount ?? 0))}</p>
          <p><strong>Score :</strong> ${escapeHtml(String(user.scoresCount ?? 0))}</p>
        </ul>

        <div class="profile-actions">
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
      const openMyQuizzesButton = document.querySelector<HTMLButtonElement>('#open-my-quizzes')
      if (openMyQuizzesButton) {
        openMyQuizzesButton.addEventListener('click', () => {
          navigate('/my-quizzes')
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