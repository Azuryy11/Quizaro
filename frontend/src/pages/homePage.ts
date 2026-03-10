import type { PageContext, PageRenderResult } from './types'
import { warmPlayPayload } from '../sessionWarmupCache'

export const renderHomePage = ({ home, isAuthenticated, status, escapeHtml, apiPost, navigate }: PageContext): PageRenderResult => {
  return {
    content: `
      <section class="card">
        <h2>${escapeHtml(String(home.title ?? 'Accueil'))}</h2>
        <p>Un site de quiz en ligne pour petit et grand</p>
        <p><strong>API:</strong> ${escapeHtml(String(status.status ?? 'unknown'))}</p>
        ${isAuthenticated ? `
          <a href="#/create-quiz">Créer un quiz</a>
          <a href="#/my-quizzes" class="home-action home-action--spaced">Jouer un quiz</a>

          <hr>

          <h3>Rejoindre une session avec un code</h3>
          <form id="join-session-form" class="home-join-session" autocomplete="off">
            <label for="join-session-code">Code de session</label>
            <input id="join-session-code" name="code" type="text" inputmode="latin" maxlength="20" placeholder="ABC123" required>
            <button id="join-session-submit" type="submit">Rejoindre</button>
          </form>
          <p id="join-session-msg" aria-live="polite"></p>
        ` : ''}
      </section>
    `,
    mount: isAuthenticated
      ? () => {
          const form = document.querySelector<HTMLFormElement>('#join-session-form')
          const codeInput = document.querySelector<HTMLInputElement>('#join-session-code')
          const submitButton = document.querySelector<HTMLButtonElement>('#join-session-submit')
          const message = document.querySelector<HTMLParagraphElement>('#join-session-msg')

          if (!form || !codeInput) {
            return
          }

          const setMessage = (text: string): void => {
            if (message) {
              message.textContent = text
            }
          }

          form.addEventListener('submit', async (event) => {
            event.preventDefault()

            const code = codeInput.value.trim().toUpperCase()
            if (!code) {
              setMessage('Entre un code de session.')
              return
            }

            if (submitButton) {
              submitButton.disabled = true
            }
            setMessage('Connexion à la session...')

            try {
              const result = await apiPost('/api/quiz-sessions/join', { code })
              const quiz = (result.quiz as Record<string, unknown> | undefined) ?? undefined
              const quizId = Number(quiz?.id ?? 0)

              if (!Number.isFinite(quizId) || quizId <= 0) {
                setMessage('Session invalide (quiz introuvable).')
                return
              }

              warmPlayPayload(quizId, result)
              navigate(`/play-quiz/${quizId}`)
            } catch (error) {
              setMessage((error as Error).message)
            } finally {
              if (submitButton) {
                submitButton.disabled = false
              }
            }
          })
        }
      : undefined,
  }
}