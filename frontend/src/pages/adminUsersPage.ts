import type { PageContext, PageRenderResult } from './types'

export const renderAdminUsersPage = ({ isAuthenticated, me, escapeHtml, navigate, apiGet, apiPost }: PageContext): PageRenderResult => {
  if (!isAuthenticated) {
    return {
      content: `
        <section class="card">
          <h2>Gestion des utilisateurs</h2>
          <p>Tu dois te connecter pour accéder à cette page.</p>
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
  const userId = Number(user.id ?? 0)
  const roles = Array.isArray(user.roles) ? user.roles.map((role) => String(role)) : []
  const isAdmin = roles.includes('ROLE_ADMIN')

  if (!isAdmin) {
    return {
      content: `
        <section class="card">
          <h2>Gestion des utilisateurs</h2>
          <p>Accès refusé : cette page est réservée aux administrateurs.</p>
          <button id="back-profile">Retour au profil</button>
        </section>
      `,
      mount: () => {
        const backProfileButton = document.querySelector<HTMLButtonElement>('#back-profile')
        if (backProfileButton) {
          backProfileButton.addEventListener('click', () => navigate('/profile'))
        }
      },
    }
  }

  return {
    content: `
      <section class="card">
        <h2>Gestion des utilisateurs (admin)</h2>
        <p id="admin-users-msg"></p>
        <div id="admin-users-list">Chargement des utilisateurs...</div>
      </section>
    `,
    mount: () => {
      const listContainer = document.querySelector<HTMLDivElement>('#admin-users-list')
      const message = document.querySelector<HTMLParagraphElement>('#admin-users-msg')

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
                ${users.map((adminUser) => buildRow(adminUser as Record<string, unknown>)).join('')}
              </tbody>
            </table>
          `
        } catch (error) {
          listContainer.innerHTML = `<p>Impossible de charger les utilisateurs (${escapeHtml((error as Error).message)})</p>`
        }
      }

      listContainer.addEventListener('click', async (event) => {
        const target = event.target as HTMLElement
        const button = target.closest<HTMLButtonElement>('.role-btn')

        if (!button) {
          return
        }

        const action = button.getAttribute('data-action')
        const targetUserId = button.getAttribute('data-user-id')
        if (!action || !targetUserId) {
          return
        }

        button.disabled = true

        try {
          await apiPost(`/api/admin/users/${targetUserId}/${action}`, {})
          if (message) {
            message.textContent = action === 'promote' ? 'Utilisateur promu admin ✅' : 'Utilisateur rétrogradé ✅'
          }
          await loadUsers()
        } catch (error) {
          if (message) {
            message.textContent = `Erreur: ${(error as Error).message}`
          }
          button.disabled = false
        }
      })

      void loadUsers()
    },
  }
}
