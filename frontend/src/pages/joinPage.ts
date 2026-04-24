import type { PageContext, PageRenderResult } from './types'

export const renderJoinPage = (
  { isAuthenticated, navigate, apiPost, escapeHtml }: PageContext,
  code: string,
): PageRenderResult => {
  if (!isAuthenticated) {
    return {
      content: `
        <section class="card">
          <h2>Rejoindre une session</h2>
          <p>Connecte toi pour rejoindre cette session.</p>
          <button id="go-login-join">Aller à la connexion</button>
        </section>
      `,
      mount: () => {
        document.querySelector<HTMLButtonElement>('#go-login-join')
          ?.addEventListener('click', () => navigate('/login'))
      },
    }
  }

  return {
    content: `
      <section class="card">
        <h2>Rejoindre la session...</h2>
        <div class="loading-row" aria-busy="true" aria-live="polite">
          <span class="spinner" aria-hidden="true"></span>
          <span>Connexion en cours...</span>
        </div>
        <p id="join-msg"></p>
      </section>
    `,
    mount: () => {
      const msgEl = document.querySelector<HTMLParagraphElement>('#join-msg')

      const doJoin = async (): Promise<void> => {
        try {
          const result = await apiPost('/api/quiz-sessions/join', { code: code.toUpperCase() })
          const session = (result.session as Record<string, unknown> | undefined) ?? undefined
          const quizSessionId = Number(session?.quizSessionId ?? 0)
          const quizId = Number(session?.quizId ?? 0)
          const sessionCode = String(session?.code ?? '').trim()
          const playerSessionId = Number(session?.playerSessionId ?? 0)

          if (Number.isFinite(quizId) && quizId > 0 && sessionCode !== '') {
            window.sessionStorage.setItem(
              `activeQuizSession:${quizId}`,
              JSON.stringify({ quizId, quizSessionId, playerSessionId, code: sessionCode }),
            )
          }

          if (Number.isFinite(quizSessionId) && quizSessionId > 0) {
            navigate('/waiting-session/' + quizSessionId)
          } else {
            navigate('/')
          }
        } catch (error) {
          if (msgEl) msgEl.textContent = escapeHtml((error as Error).message)
        }
      }

      void doJoin()
    },
  }
}
