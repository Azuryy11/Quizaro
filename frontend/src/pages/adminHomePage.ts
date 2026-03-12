import type { PageContext, PageRenderResult } from './types'

export const renderAdminHomePage = ({ isAuthenticated, me, navigate }: PageContext): PageRenderResult => {
  if (!isAuthenticated) {
    return {
      content: `
        <section class="card">
          <h2>Administration</h2>
          <p>Tu dois te connecter pour accéder à cette page.</p>
          <button id="go-login-admin">Aller à la connexion</button>
        </section>
      `,
      mount: () => {
        const goLoginButton = document.querySelector<HTMLButtonElement>('#go-login-admin')
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
          <h2>Administration</h2>
          <p>Accès refusé : cette page est réservée aux administrateurs.</p>
          <button id="back-profile-admin">Retour au profil</button>
        </section>
      `,
      mount: () => {
        const backProfileButton = document.querySelector<HTMLButtonElement>('#back-profile-admin')
        backProfileButton?.addEventListener('click', () => navigate('/profile'))
      },
    }
  }

  return {
    content: `
      <section class="card">
        <h2>Administration</h2>
        <p>Choisis une section :</p>
        <div class="profile-actions">
          <button id="admin-manage-users" type="button">Gérer les utilisateurs</button>
          <button id="admin-manage-quizzes" type="button">Gérer les quiz</button>
        </div>
        <button id="admin-back-profile" type="button" class="play-quiz-submit">Retour au profil</button>
      </section>
    `,
    mount: () => {
      const manageUsers = document.querySelector<HTMLButtonElement>('#admin-manage-users')
      const manageQuizzes = document.querySelector<HTMLButtonElement>('#admin-manage-quizzes')
      const backProfile = document.querySelector<HTMLButtonElement>('#admin-back-profile')

      manageUsers?.addEventListener('click', () => navigate('/admin/users'))
      manageQuizzes?.addEventListener('click', () => navigate('/admin/quizzes'))
      backProfile?.addEventListener('click', () => navigate('/profile'))
    },
  }
}
