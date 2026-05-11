import type { PageContext, PageRenderResult } from './types'

type ResultRow = {
  rank: number
  nickname: string
  score: number
  submitted: number
  finishedAt: string | null
  isMe: boolean
}

export const renderResultsPage = ({ navigate, apiGet, apiPost, escapeHtml }: PageContext, quizSessionId: number): PageRenderResult => {
  return {
    content: `
        <section class="results-page">
          <header class="results-page-header">
            <h2>TABLEAU DES SCORES</h2>
          </header>
          <p id="results-page-message" class="results-page-message"></p>
          <div id="results-page-content">
            <div class="loading-row" aria-busy="true" aria-live="polite">
              <span class="spinner" aria-hidden="true"></span>
              <span>Chargement des résultats...</span>
            </div>
          </div>
        </section>
      `,
    mount: () => {
      const message = document.querySelector<HTMLParagraphElement>('#results-page-message')
      const content = document.querySelector<HTMLDivElement>('#results-page-content')
      let resultsPollIntervalId: number | null = null
      let isLoadingResults = false

      if (!content) {
        return
      }

      const HOME_REDIRECT_SECONDS = 5
      let countdownIntervalId: number | null = null
      let redirectTimeoutId: number | null = null
      let redirectScheduled = false

      const clearRedirectTimers = (): void => {
        if (countdownIntervalId !== null) {
            window.clearInterval(countdownIntervalId)
            countdownIntervalId = null
        }
        if (redirectTimeoutId !== null) {
            window.clearTimeout(redirectTimeoutId)
            redirectTimeoutId = null
        }
        redirectScheduled = false
    }
    const scheduleRedirect = (seconds: number): void => {
        if (redirectScheduled) {
            return
        }
        redirectScheduled = true
        let remaining = seconds

        if (message) {
            message.textContent = `Session terminée. Retour à l'accueil dans ${remaining}s...`
        }

        countdownIntervalId = window.setInterval(() => {
            if (!document.body.contains(content)) {
                clearRedirectTimers()
                return
            }

            remaining -= 1
            if (remaining <= 0) {
                return
            }

            if (message) {
                message.textContent = `Session terminée. Retour à l'accueil dans ${remaining}s...`
            }
        }, 1000)

        redirectTimeoutId = window.setTimeout(() => {
            clearRedirectTimers()
            navigate('/')
        }, seconds * 1000)
    }

      const sessionId = quizSessionId
      if (!Number.isFinite(sessionId) || sessionId <= 0) {
        content.innerHTML = '<p>Aucun tableau de disponible (pas de session)</p>'
        return
      }

      const loadResults = async (): Promise<void> => {
        if (isLoadingResults) {
          return
        }

        isLoadingResults = true
        try {
          const payload = await apiGet(`/api/quiz-sessions/${sessionId}/results`)
          const session = (payload.session as Record<string, unknown> | undefined) ?? undefined
          const quiz = (payload.quiz as Record<string, unknown> | undefined) ?? undefined
          const rawResults = Array.isArray(payload.results) ? payload.results : []

          if (!session || !quiz) {
            content.innerHTML = '<p>Résultats indisponibles.</p>'
            return
          }

          const totalQuestions = Number(quiz.totalQuestions ?? 0)
          const quizId = Number(quiz.id ?? 0)
          const quizTitle = escapeHtml(String(quiz.title ?? 'Quiz'))
          const sessionCode = escapeHtml(String(session.code ?? ''))
          const sessionStatusRaw = String(session.status ?? 'INCONNU')
          const sessionStatus = escapeHtml(sessionStatusRaw)
          const sessionStatusClass = sessionStatusRaw === 'FINISHED'
            ? 'results-status-chip results-status-chip--done'
            : sessionStatusRaw === 'RUNNING'
              ? 'results-status-chip results-status-chip--running'
              : 'results-status-chip results-status-chip--waiting'
          const isOwner = Boolean(session.isOwner)
          const reviewStorageKey = `reviewQuizSession:${sessionId}`
          const hasReview = window.sessionStorage.getItem(reviewStorageKey) !== null
          const canReview = sessionStatusRaw !== 'FINISHED' && hasReview

          const results = rawResults.map((entry) => {
            const result = entry as Record<string, unknown>

            return {
              rank: Number(result.rank ?? 0),
              nickname: String(result.nickname ?? 'Joueur'),
              score: Number(result.score ?? 0),
              submitted: Number(result.submitted ?? 0),
              finishedAt: result.finishedAt ? String(result.finishedAt) : null,
              isMe: Boolean(result.isMe),
            } satisfies ResultRow
          })

          const rowsHtml = results.length > 0
            ? results
                .map((result) => {
                  const percentage = totalQuestions > 0 ? Math.round((result.score / totalQuestions) * 100) : 0
                  const statusLabel = result.finishedAt ? 'Terminé' : 'En attente'
                  const statusClass = result.finishedAt ? 'results-status results-status--done' : 'results-status results-status--waiting'
                  const nickname = escapeHtml(result.nickname)
                  const nicknameCell = result.isMe ? `<strong>${nickname}</strong>` : nickname

                  return `
                    <tr${result.isMe ? ' class="current-user-row"' : ''}>
                      <td>${result.rank}</td>
                      <td>${nicknameCell}</td>
                      <td>${result.score}/${totalQuestions}</td>
                      <td>${percentage}%</td>
                      <td><span class="${statusClass}">${statusLabel}</span></td>
                    </tr>
                  `
                })
                .join('')
            : '<tr><td colspan="5" class="results-empty-row">Aucun résultat disponible.</td></tr>'

          content.innerHTML = `
            <div class="results-session-card">
              <h3 class="results-session-title">${quizTitle}</h3>
              <p class="results-session-code">Code : ${sessionCode || 'Aucun code'}</p>
              <p class="results-session-status">Statut : <span class="${sessionStatusClass}">${sessionStatus}</span></p>
            </div>

            <div class="results-table-card">
              <div class="results-table-scroll">
                <table class="results-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Joueur</th>
                      <th>Score</th>
                      <th>%</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="results-actions">
              ${canReview
                ? '<button id="go-review-session" class="play-quiz-submit" type="button">Voir les réponses</button>'
                : ''}
              ${isOwner && Number.isFinite(quizSessionId) && quizSessionId > 0
                ? '<button id="finish-quiz-session" class="play-quiz-submit" type="button">Finir la session</button>'
                : ''}
            </div>
          `

          const reviewButton = content.querySelector<HTMLButtonElement>('#go-review-session')
          if (reviewButton) {
            reviewButton.addEventListener('click', () => {
              navigate('/review/' + sessionId)
            })
          }

          const finishButton = content.querySelector<HTMLButtonElement>('#finish-quiz-session')
          if (finishButton) {
            finishButton.addEventListener('click', async () => {
              finishButton.disabled = true
              try {
                const finishResult = await apiPost(`/api/quiz-sessions/${sessionId}/finish`, {})
                const finishSession = (finishResult.session as Record<string, unknown> | undefined) ?? undefined
                const status = String(finishSession?.status ?? 'FINISHED')
                if (message) {
                  message.textContent = `Session terminée (${status}).`
                }

                void loadResults()
              } catch (error) {
                if (message) {
                  message.textContent = (error as Error).message
                }
                finishButton.disabled = false
              }
            })
          }
          

          if (sessionStatusRaw === 'FINISHED') {
            window.sessionStorage.removeItem(reviewStorageKey)
            if (Number.isFinite(quizId) && quizId > 0) {
              window.sessionStorage.removeItem(`activeQuizSession:${quizId}`)
            }
            if (resultsPollIntervalId !== null) {
              window.clearInterval(resultsPollIntervalId)
              resultsPollIntervalId = null
            }
            scheduleRedirect(HOME_REDIRECT_SECONDS)
          } else {
            clearRedirectTimers()
          }
        } catch (error) {
          const apiError = error as Error & { status?: number }
          if (apiError.status === 403) {
            content.innerHTML = `
              <div class="card">
                <h3>Accès refusé</h3>
                <p>Tu n'as pas le droit d'accéder à cette session de quiz.</p>
                <button id="return-home-results-403" class="play-quiz-submit" type="button">Retourner à l'accueil</button>
              </div>
            `
            const returnButton = content.querySelector<HTMLButtonElement>('#return-home-results-403')
            if (returnButton) {
              returnButton.addEventListener('click', () => navigate('/'))
            }
            if (resultsPollIntervalId !== null) {
              window.clearInterval(resultsPollIntervalId)
              resultsPollIntervalId = null
            }
            return
          }
          if (message) {
            message.textContent = (error as Error).message
          }
          content.innerHTML = '<p>Impossible de charger les résultats.</p>'
        } finally {
          isLoadingResults = false
        }
      }

      void loadResults()

      resultsPollIntervalId = window.setInterval(() => {
        if (!document.body.contains(content)) {
          if (resultsPollIntervalId !== null) {
            window.clearInterval(resultsPollIntervalId)
            resultsPollIntervalId = null
          }
          return
        }

        void loadResults()
    }, 3000)

    const cleanup = (): void => {
        clearRedirectTimers()
        if (resultsPollIntervalId !== null) {
      window.clearInterval(resultsPollIntervalId)
      resultsPollIntervalId = null
        }
    }

    window.addEventListener('hashchange', cleanup, { once: true })
    window.addEventListener('popstate', cleanup, { once: true })
  }
  }
}
