import type { PageContext, PageRenderResult } from './types'

export const renderAdminUsersPage = ({ isAuthenticated, me, escapeHtml, navigate, apiGet, apiPost }: PageContext): PageRenderResult => {
  if (!isAuthenticated) {
    return {
      content: `
        <section class="card">
          <h2>Gestion des utilisateurs</h2>
          <p>Tu dois te connecter pour accéder à cette page.</p>
          <button id="go-login-admin-users">Aller à la connexion</button>
        </section>
      `,
      mount: () => {
        const goLoginButton = document.querySelector<HTMLButtonElement>('#go-login-admin-users')
        goLoginButton?.addEventListener('click', () => navigate('/login'))
      },
    }
  }

  const user = me.user as Record<string, unknown>
  const userId = Number(user.id ?? 0)
  const roles = Array.isArray(user.roles) ? user.roles.map((role) => String(role)) : []
  const isAdmin = roles.includes('ROLE_ADMIN')

  if (!isAdmin) {
    return {
      content: `
        <section class="card">
          <h2>Gestion des utilisateurs</h2>
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
        <h2>Gestion des utilisateurs (admin)</h2>
        <p id="admin-users-msg"></p>
        <div id="admin-users-list">Chargement...</div>
        <button id="admin-users-back" type="button" class="play-quiz-submit">Retour à l'administration</button>
      </section>
    `,
    mount: () => {
      const listContainer = document.querySelector<HTMLDivElement>('#admin-users-list')
      const message = document.querySelector<HTMLParagraphElement>('#admin-users-msg')
      const backButton = document.querySelector<HTMLButtonElement>('#admin-users-back')

      backButton?.addEventListener('click', () => navigate('/admin'))

      if (!listContainer) {
        return
      }

      const buildRow = (adminUser: Record<string, unknown>): string => {
        const adminUserId = Number(adminUser.id ?? 0)
        const adminUserEmail = escapeHtml(String(adminUser.email ?? ''))
        const adminUserName = escapeHtml(String(adminUser.displayName ?? '-'))
        const adminUserRoles = Array.isArray(adminUser.roles) ? adminUser.roles.map((role) => String(role)) : []
        const targetIsAdmin = adminUserRoles.includes('ROLE_ADMIN')
        const isSelf = adminUserId === userId

        return `
          <tr>
            <td>${adminUserId}</td>
            <td>${adminUserEmail}</td>
            <td>${adminUserName}</td>
            <td>${escapeHtml(adminUserRoles.join(', '))}</td>
            <td>${targetIsAdmin ? 'Oui' : 'Non'}</td>
            <td>
              ${targetIsAdmin
                ? `<button class="role-btn" data-action="demote" data-user-id="${adminUserId}" ${isSelf ? 'disabled' : ''}>Retirer admin</button>`
                : `<button class="role-btn" data-action="promote" data-user-id="${adminUserId}">Passer admin</button>`}
            </td>
          </tr>
        `
      }

      const loadUsers = async (): Promise<void> => {
        try {
          const response = await apiGet('/api/admin/users')
          const users = Array.isArray(response.users) ? response.users : []

          if (users.length === 0) {
            listContainer.innerHTML = '<p>Aucun utilisateur.</p>'
            return
          }

          listContainer.innerHTML = `
            <table class="admin-users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Pseudo</th>
                  <th>Rôles</th>
                  <th>Admin</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${users.map((entry) => buildRow(entry as Record<string, unknown>)).join('')}
              </tbody>
            </table>
          `
        } catch (error) {
          listContainer.innerHTML = `<p>Impossible de charger les utilisateurs (${escapeHtml((error as Error).message)})</p>`
        }
      }

      listContainer.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null
        const button = target?.closest<HTMLButtonElement>('.role-btn')
        if (!button) {
          return
        }

        const action = button.getAttribute('data-action')
        const targetUserId = button.getAttribute('data-user-id')
        if (!action || !targetUserId) {
          return
        }

        void (async () => {
          button.disabled = true
          message && (message.textContent = 'Mise à jour en cours...')

          try {
            await apiPost(`/api/admin/users/${targetUserId}/${action}`, {})
            message && (message.textContent = action === 'promote' ? 'Utilisateur promu admin ✅' : 'Utilisateur rétrogradé ✅')
            await loadUsers()
          } catch (error) {
            message && (message.textContent = `Erreur: ${(error as Error).message}`)
            button.disabled = false
          }
        })()
      })

      void loadUsers()
    },
  }
}
