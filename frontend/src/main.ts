import './style.css'
import { renderNav } from './components/navbar'
import { renderHomePage } from './pages/homePage'
import { renderLoginPage } from './pages/loginPage'
import { renderAdminUsersPage } from './pages/adminUsersPage'
import { renderProfilePage } from './pages/profilePage'
import { renderRegisterPage } from './pages/registerPage'
import { renderCreateQuizPage } from './pages/createQuizPage'
import { renderPlayQuizPage } from './pages/playQuizPage'
import { renderMyQuizzesPage } from './pages/myQuizzesPage'
import { renderEditQuizPage } from './pages/editQuizPage'
import type { PageContext, PageRenderResult } from './pages/types'

const app = document.querySelector<HTMLDivElement>('#app')
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
const buildApiUrl = (path: string): string => (apiBaseUrl ? `${apiBaseUrl}${path}` : path)

const parseJsonResponse = async (response: Response): Promise<Record<string, unknown>> => {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  const body = await response.text()

  if (!contentType.includes('application/json')) {
    throw new Error('Réponse non JSON (vérifie URL/proxy API)')
  }

  return JSON.parse(body) as Record<string, unknown>
}

const fetchApi = async (path: string): Promise<Record<string, unknown>> => {
  try {
    return await fetch(path, { credentials: 'include' }).then(parseJsonResponse)
  } catch (error) {
    if (!apiBaseUrl) {
      throw error
    }

    return fetch(buildApiUrl(path), { credentials: 'include' }).then(parseJsonResponse)
  }
}

const fetchApiJson = async (
  path: string,
  options: Omit<RequestInit, 'credentials'>,
): Promise<Record<string, unknown>> => {
  const request = (url: string) => fetch(url, { ...options, credentials: 'include' }).then(parseJsonResponse)

  try {
    return await request(path)
  } catch (error) {
    if (!apiBaseUrl) {
      throw error
    }

    return request(buildApiUrl(path))
  }
}

const navigate = (route: string): void => {
  window.location.hash = route
}

const currentRoute = (): string => {
  const hash = window.location.hash.replace(/^#/, '')
  return hash || '/'
}

const renderPageByRoute = (route: string, context: PageContext): PageRenderResult => {
  const maybeUser = context.me.user
  const user = maybeUser && typeof maybeUser === 'object' ? (maybeUser as Record<string, unknown>) : null
  const roles = user && Array.isArray(user.roles) ? user.roles.map((role) => String(role)) : []
  const isAdmin = roles.includes('ROLE_ADMIN')

  if (route === '/login') {
    return renderLoginPage(context)
  }

  if (route === '/register') {
    return renderRegisterPage(context)
  }

  if (route === '/profile') {
    return renderProfilePage(context)
  }

  if (route === '/create-quiz') {
    return renderCreateQuizPage(context)
  }

  if (route === '/my-quizzes') {
    return renderMyQuizzesPage(context)
  }

  const editRouteMatch = route.match(/^\/edit-quiz\/(\d+)$/)
  if (editRouteMatch) {
    const quizId = Number(editRouteMatch[1])
    return renderEditQuizPage(context, quizId)
  }

  const playRouteMatch = route.match(/^\/play-quiz\/(\d+)$/)
  if (playRouteMatch) {
    const quizId = Number(playRouteMatch[1])
    return renderPlayQuizPage(context, quizId)
  }

  if (route === '/admin/users') {
    if (!context.isAuthenticated || !isAdmin) {
      return {
        content: `
          <section class="card">
            <h2>Accès refusé</h2>
            <p>Cette page est réservée aux administrateurs.</p>
          </section>
        `,
      }
    }

    return renderAdminUsersPage(context)
  }

  return renderHomePage(context)
}

const apiPost = async (path: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> => {
  return fetchApiJson(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

const apiPut = async (path: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
  fetchApiJson(path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

const apiDelete = async (path: string): Promise<Record<string, unknown>> =>
  fetchApiJson(path, {
    method: 'DELETE',
  })

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

if (app) {
  const render = async (): Promise<void> => {
    let me: Record<string, unknown>
    let status: Record<string, unknown>
    let home: Record<string, unknown>

    try {
      ;[me, status, home] = await Promise.all([
        fetchApi('/api/auth/me'),
        fetchApi('/api/status'),
        fetchApi('/api/home'),
      ])
    } catch (error) {
      app.innerHTML = `<p>Backend non joignable ❌ (${escapeHtml((error as Error).message)})</p>`
      return
    }

    const isAuthenticated = Boolean(me.authenticated)
    const route = currentRoute()

    const pageContext: PageContext = {
      isAuthenticated,
      me,
      home,
      status,
      escapeHtml,
      navigate,
      apiGet: fetchApi,
      apiPost,
      apiPut,
      apiDelete,
    }
    const page = renderPageByRoute(route, pageContext)

    app.innerHTML = `
      <div>
        ${renderNav(isAuthenticated)}
        ${page.content}
      </div>
    `

    page.mount?.()

    const logoutButton = document.querySelector<HTMLElement>('#logout-btn')
    if (logoutButton) {
      logoutButton.addEventListener('click', async () => {
        await apiPost('/api/auth/logout', {})
        navigate('/')
      })
    }

  }

  window.addEventListener('hashchange', () => {
    void render()
  })

  void render()
}
