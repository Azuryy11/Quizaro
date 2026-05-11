import type { PageContext, PageRenderResult } from './types'

export const renderJoinPage = (
  { isAuthenticated, navigate, apiPost, escapeHtml }: PageContext,
  code: string,
): PageRenderResult => {
  return {
    content: `
      <section class="card">
        <h2>Rejoindre une session</h2>
        <p>Code : ${escapeHtml(code.toUpperCase())}</p>
        ${isAuthenticated ? '' : `
          <label for="join-guest-nickname">Pseudo</label>
          <input id="join-guest-nickname" type="text" minlength="2" maxlength="30" placeholder="Ton pseudo" required>
        `}
        <button id="join-now-btn" type="button">Rejoindre</button>
        <p id="join-msg"></p>
      </section>
    `,
    mount: () => {
      const msgEl = document.querySelector<HTMLParagraphElement>('#join-msg')
      const joinButton = document.querySelector<HTMLButtonElement>('#join-now-btn')
      const nicknameInput = document.querySelector<HTMLInputElement>('#join-guest-nickname')

      const setMessage = (text: string): void => {
        if (msgEl) {
          msgEl.textContent = text
        }
      }

      joinButton?.addEventListener('click', async () => {
        joinButton.disabled = true
        setMessage('Connexion en cours...')

        try {
          const payload: Record<string, unknown> = { code: code.toUpperCase() }

          if (!isAuthenticated) {
            const nickname = (nicknameInput?.value ?? '').trim()
            if (nickname.length < 2 || nickname.length > 30) {
              setMessage('Pseudo requis (2 à 30 caractères).')
              joinButton.disabled = false
              return
            }

            payload.nickname = nickname
          }

          const result = await apiPost('/api/quiz-sessions/join', payload)
          const session = (result.session as Record<string, unknown> | undefined) ?? undefined
          const quizSessionId = Number(session?.quizSessionId ?? 0)
          const quizId = Number(session?.quizId ?? 0)
          const sessionCode = String(session?.code ?? '').trim()
          const playerSessionId = Number(session?.playerSessionId ?? 0)
          const playerToken = String(session?.playerToken ?? '').trim()

          if (playerToken !== '') {
            window.sessionStorage.setItem('guestPlayerToken', playerToken)
          }

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
          setMessage(escapeHtml((error as Error).message))
          joinButton.disabled = false
        }
      })
    },
  }
}
