import type { PageContext, PageRenderResult } from './types'

export const renderHomePage = ({ home, isAuthenticated, status, escapeHtml }: PageContext): PageRenderResult => {
  return {
    content: `
      <section class="card">
        <h2>${escapeHtml(String(home.title ?? 'Accueil'))}</h2>
        <p>Un site de quiz en ligne pour petit et grand</p>
        <p><strong>API:</strong> ${escapeHtml(String(status.status ?? 'unknown'))}</p>
        ${isAuthenticated ? `
          <a href="#/create-quiz">Créer un quiz</a>
          <a href="#/my-quizzes" class="home-action home-action--spaced">Jouer un quiz</a>
        ` : ''}
      </section>
    `,
  }
}