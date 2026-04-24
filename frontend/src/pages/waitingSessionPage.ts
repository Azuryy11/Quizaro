import type { PageContext, PageRenderResult } from './types'
import QRCode from 'qrcode'

export const renderWaitingSessionPage = (
  { isAuthenticated, navigate, apiGet, apiPost, escapeHtml }: PageContext,
  quizSessionId: number,
): PageRenderResult => {
  if (!isAuthenticated) {
    return {
      content: `
        <section class="card">
          <h2>Salle d'attente</h2>
          <p>Connecte toi pour accéder à la salle d'attente.</p>
          <button id="go-login-waiting">Aller à la connexion</button>
        </section>
      `,
      mount: () => {
        document.querySelector<HTMLButtonElement>('#go-login-waiting')
          ?.addEventListener('click', () => navigate('/login'))
      },
    }
  }

  return {
    content: `
      <section class="card waiting-lobby">
        <h2>Salle d'attente</h2>
        <div id="waiting-lobby-content">
          <div class="loading-row" aria-busy="true" aria-live="polite">
            <span class="spinner" aria-hidden="true"></span>
            <span>Chargement du lobby...</span>
          </div>
        </div>
        <p id="waiting-lobby-msg"></p>
      </section>
    `,
    mount: () => {
      const content = document.querySelector<HTMLDivElement>('#waiting-lobby-content')
      const messageEl = document.querySelector<HTMLParagraphElement>('#waiting-lobby-msg')
      let pollIntervalId: number | null = null
      let hasRendered = false
      let currentQuizId = 0

      if (!content) return

      const stopPolling = (): void => {
        if (pollIntervalId !== null) {
          window.clearInterval(pollIntervalId)
          pollIntervalId = null
        }
      }

      const loadLobby = async (): Promise<void> => {
        try {
          const payload = await apiGet(`/api/quiz-sessions/${quizSessionId}/lobby`)
          const session = (payload.session as Record<string, unknown> | undefined) ?? undefined
          const quiz = (payload.quiz as Record<string, unknown> | undefined) ?? undefined

          if (!session || !quiz) {
            content.innerHTML = '<p>Lobby indisponible.</p>'
            stopPolling()
            return
          }

          const status = String(session.status ?? 'WAITING')
          const quizId = Number(quiz.id ?? 0)
          currentQuizId = quizId

          if (status === 'RUNNING') {
            stopPolling()
            navigate('/play-quiz/' + quizId)
            return
          }

          if (status === 'FINISHED') {
            stopPolling()
            content.innerHTML = '<p>Cette session est déjà terminée.</p>'
            return
          }

          const code = String(session.code ?? '')
          const isOwner = Boolean(session.isOwner)
          const playerCount = Number(session.playerCount ?? 0)
          const title = escapeHtml(String(quiz.title ?? 'Quiz'))
          const description = String(quiz.description ?? '')
          const joinUrl = `${window.location.origin}${window.location.pathname}#/join/${code}`

          if (!hasRendered) {
            hasRendered = true
            content.innerHTML = `
              <div class="lobby-quiz-info">
                <h3>${title}</h3>
                ${description ? `<p class="lobby-description">${escapeHtml(description)}</p>` : ''}
              </div>
              <div class="lobby-code-block">
                <span class="lobby-code-label">Code de session</span>
                <span class="lobby-code">${escapeHtml(code)}</span>
              </div>
              <div class="lobby-player-count">
                <span id="lobby-player-count-value">${playerCount}</span>
                <span id="lobby-player-count-label">joueur${playerCount > 1 ? 's' : ''} connecté${playerCount > 1 ? 's' : ''}</span>
              </div>
              <div class="lobby-qr">
                <img id="lobby-qr-img" alt="QR Code de la session" width="200" height="200" />
              </div>
              ${isOwner
                ? '<button id="lobby-start-btn" class="lobby-start-btn" type="button">Démarrer la session</button>'
                : '<p class="lobby-waiting-msg">En attente du démarrage par le créateur...</p>'
              }
            `

            const qrImg = content.querySelector<HTMLImageElement>('#lobby-qr-img')
            if (qrImg) {
              QRCode.toDataURL(joinUrl, { width: 200, margin: 2 })
                .then((dataUrl: string) => { qrImg.src = dataUrl })
                .catch(() => { qrImg.alt = 'QR code indisponible' })
            }

            if (isOwner) {
              const startBtn = content.querySelector<HTMLButtonElement>('#lobby-start-btn')
              startBtn?.addEventListener('click', () => {
                startBtn.disabled = true
                apiPost(`/api/quiz-sessions/${quizSessionId}/start`, {})
                  .then(() => {
                    stopPolling()
                    navigate('/play-quiz/' + currentQuizId)
                  })
                  .catch((error: unknown) => {
                    if (messageEl) messageEl.textContent = (error as Error).message
                    startBtn.disabled = false
                  })
              })
            }
          } else {
            const countEl = content.querySelector<HTMLSpanElement>('#lobby-player-count-value')
            const labelEl = content.querySelector<HTMLSpanElement>('#lobby-player-count-label')
            if (countEl) countEl.textContent = String(playerCount)
            if (labelEl) {
              labelEl.textContent = `joueur${playerCount > 1 ? 's' : ''} connecté${playerCount > 1 ? 's' : ''}`
            }
          }
        } catch (error) {
          const apiError = error as Error & { status?: number }
          if (apiError.status === 403 || apiError.status === 404) {
            stopPolling()
            content.innerHTML = `
              <div>
                <p>${escapeHtml(apiError.message)}</p>
                <button id="lobby-back-home" type="button">Retourner à l'accueil</button>
              </div>
            `
            content.querySelector<HTMLButtonElement>('#lobby-back-home')
              ?.addEventListener('click', () => navigate('/'))
            return
          }
          if (messageEl) messageEl.textContent = (error as Error).message
        }
      }

      void loadLobby()

      pollIntervalId = window.setInterval(() => {
        if (!document.body.contains(content)) {
          stopPolling()
          return
        }
        void loadLobby()
      }, 3000)

      const cleanup = (): void => stopPolling()
      window.addEventListener('hashchange', cleanup, { once: true })
      window.addEventListener('popstate', cleanup, { once: true })
    },
  }
}
