import type { PageContext, PageRenderResult } from './types'

export const renderHomePage = ({ home, status, escapeHtml }: PageContext): PageRenderResult => {
  return {
    content: `
      <section class="card">
        <h2>${escapeHtml(String(home.title ?? 'Accueil'))}</h2>
        <p>Un site de quiz en ligne pour petit et grand</p>
        <p><strong>API:</strong> ${escapeHtml(String(status.status ?? 'unknown'))}</p>
      </section>
      <a href="#/create-quiz">Créer un quiz</a>
      <a href="#/my-quizzes" style="margin-left: 1rem;">Jouer un quiz</a>
    `,
  }
}