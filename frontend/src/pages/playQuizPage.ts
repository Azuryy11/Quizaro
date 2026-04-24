import type { PageContext, PageRenderResult } from './types'
import { consumeWarmedPlayPayload } from '../sessionWarmupCache'
import { renderTrueFalseTemplate } from './questionTemplates/typeTrueFalse'
import { renderQcmTemplate } from './questionTemplates/typeQcm'

type PlayQuizQuestion = {
  id: number
  label: string
  type: string
  timeLimit: number
  answers: Array<{ id: number; content: string }>
}

type SubmitDetail = {
  questionId: number
  answerIds: number[]
  correctAnswerIds: number[]
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms))

const readQuestions = (quiz: Record<string, unknown>): PlayQuizQuestion[] => {
  const rawQuestions = Array.isArray(quiz.questions) ? quiz.questions : []

  return rawQuestions
    .map((entry) => {
      const question = entry as Record<string, unknown>
      const id = Number(question.id)
      const label = String(question.label ?? '')
      const rawAnswers = Array.isArray(question.answers) ? question.answers : []
      const answers = rawAnswers
        .map((rawAnswer) => {
          const answer = rawAnswer as Record<string, unknown>
          return {
            id: Number(answer.id),
            content: String(answer.content ?? ''),
          }
        })
        .filter((answer) => Number.isFinite(answer.id) && answer.id > 0 && answer.content !== '')

      if (!Number.isFinite(id) || id <= 0 || label === '' || answers.length === 0) {
        return null
      }

      const type = String(question.type ?? 'TRUE_FALSE')
      const parsedTimeLimit = Number(question.timeLimit)
      const timeLimit = Number.isFinite(parsedTimeLimit) ? Math.min(300, Math.max(5, Math.trunc(parsedTimeLimit))) : 30
      return { id, label, type, timeLimit, answers }
    })
      .filter((question): question is PlayQuizQuestion => question !== null)
}

export const renderPlayQuizPage = ({ isAuthenticated, navigate, apiGet, apiPost, escapeHtml }: PageContext, quizId: number): PageRenderResult => {
  if (!isAuthenticated) {
    return {
      content: `
        <section class="card">
          <h2>Tester un quiz</h2>
          <p>Connecte toi pour répondre à un quiz.</p>
          <button id="go-login-play-quiz">Aller à la connexion</button>
        </section>
      `,
      mount: () => {
        const goLoginButton = document.querySelector<HTMLButtonElement>('#go-login-play-quiz')
        if (goLoginButton) {
          goLoginButton.addEventListener('click', () => navigate('/login'))
        }
      },
    }
  }

  return {
    content: `
      <section class="card">
        <h2>Répondre au quiz</h2>
        <div id="play-quiz-container">
          <div class="loading-row" aria-busy="true" aria-live="polite">
            <span class="spinner" aria-hidden="true"></span>
            <span>Préparation de la session...</span>
          </div>
        </div>
        <p id="play-quiz-msg"></p>
      </section>
    `,
    mount: () => {
      const container = document.querySelector<HTMLDivElement>('#play-quiz-container')
      const message = document.querySelector<HTMLParagraphElement>('#play-quiz-msg')

      if (!container) {
        return
      }

      const loadQuiz = async (): Promise<void> => {
        const minimumDelay = sleep(1000)
        const storageKey = `activeQuizSession:${quizId}`

        try {
          const warmedResult = consumeWarmedPlayPayload(quizId)
          const storedSessionRaw = window.sessionStorage.getItem(storageKey)
          let storedSession: Record<string, unknown> | null = null
          if (storedSessionRaw) {
            try {
              storedSession = JSON.parse(storedSessionRaw) as Record<string, unknown>
            } catch {
              window.sessionStorage.removeItem(storageKey)
            }
          }
          const storedCode = String(storedSession?.code ?? '').trim()

          let result: Record<string, unknown>

          if (warmedResult) {
            result = warmedResult
          } else if (storedCode !== '') {
            try {
              result = await apiPost('/api/quiz-sessions/join', { code: storedCode })
            } catch {
              window.sessionStorage.removeItem(storageKey)
              result = await apiGet(`/api/quizzes/${quizId}/play`)
            }
          } else {
            result = await apiGet(`/api/quizzes/${quizId}/play`)
          }

          await minimumDelay

          if (!document.body.contains(container)) {
            return
          }

          const quiz = (result.quiz as Record<string, unknown> | undefined) ?? undefined
          const session = (result.session as Record<string, unknown> | undefined) ?? undefined
          const playerSessionId = Number(session?.playerSessionId ?? 0)
          const sessionCode = String(session?.code ?? '').trim()
          const quizSessionId = Number(session?.quizSessionId ?? 0)
          const sessionStatus = String(session?.status ?? 'RUNNING')

          if (!quiz) {
            container.innerHTML = '<p>Quiz introuvable.</p>'
            return
          }

          if (!Number.isFinite(playerSessionId) || playerSessionId <= 0) {
            container.innerHTML = '<p>Session de jeu invalide.</p>'
            return
          }

          if (sessionCode !== '' && Number.isFinite(quizSessionId) && quizSessionId > 0) {
            window.sessionStorage.setItem(
              storageKey,
              JSON.stringify({
                quizId,
                quizSessionId,
                playerSessionId,
                code: sessionCode,
              }),
            )
          }

          if (sessionStatus === 'WAITING' && Number.isFinite(quizSessionId) && quizSessionId > 0) {
            navigate('/waiting-session/' + quizSessionId)
            return
          }

          const title = escapeHtml(String(quiz.title ?? 'Quiz'))
          const questions = readQuestions(quiz)
          let currentIndex = 0
          let selectedAnswers: Map<number, number[]> = new Map()
          let timerId: number | null = null
          let questionStartedAtMs = 0
          const responseTimes = new Map<number, number>()

          if (questions.length === 0) {
            container.innerHTML = '<p>Ce quiz ne contient aucune question.</p>'
            return
          }

          container.innerHTML = `
            <h3>${title}</h3>
            ${sessionCode ? '<div class="session-code-banner">Code de session : ' + escapeHtml(sessionCode) + '</div>' : 'Aucun code généré'}
             
           <form id="play-quiz-form">
              <p id="play-quiz-progress"></p>
              <p id="play-quiz-timer"></p>
              <div id="play-quiz-current-question"></div>
              <button id="play-quiz-next-btn" class="play-quiz-submit" type="button" disabled>Suivant</button>
            </form>
          `

          const form = document.querySelector<HTMLFormElement>('#play-quiz-form')
          const progress = document.querySelector<HTMLParagraphElement>('#play-quiz-progress')
          const currentQuestionContainer = document.querySelector<HTMLDivElement>('#play-quiz-current-question')
          const nextButton = document.querySelector<HTMLButtonElement>('#play-quiz-next-btn')
          const timerEl = document.querySelector<HTMLParagraphElement>('#play-quiz-timer')

          if (!form || !progress || !currentQuestionContainer || !nextButton) {
            return
          }

          const submitQuiz = async (): Promise<void> => {
            if (timerId !== null) {
              window.clearInterval(timerId)
              timerId = null
            }
            const answers = questions.map((question) => ({
              questionId: question.id,
              answerIds: selectedAnswers.get(question.id) ?? [],
              responseTimeMs: responseTimes.get(question.id) ?? question.timeLimit * 1000,
            }))

          try {
            const submitResult = await apiPost(`/api/quizzes/${quizId}/submit`, {
              playerSessionId,
              quizSessionId,
              answers,
            })

            const rawResult = (submitResult.result as Record<string, unknown> | undefined) ?? undefined
            const rawDetails = Array.isArray(rawResult?.details) ? rawResult.details : []
            const normalizedDetails = rawDetails
              .map((entry) => {
                const detail = entry as Record<string, unknown>
                const questionId = Number(detail.questionId)
                const answerIds = Array.isArray(detail.answerIds)
                  ? detail.answerIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
                  : []
                const correctAnswerIds = Array.isArray(detail.correctAnswerIds)
                  ? detail.correctAnswerIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
                  : []

                if (!Number.isFinite(questionId) || questionId <= 0) {
                  return null
                }

                return {
                  questionId,
                  answerIds,
                  correctAnswerIds,
                } satisfies SubmitDetail
              })
              .filter((detail): detail is SubmitDetail => detail !== null)

            window.sessionStorage.setItem(
              `reviewQuizSession:${quizSessionId}`,
              JSON.stringify({
                quizSessionId,
                quizId,
                title: String(quiz.title ?? 'Quiz'),
                questions,
                details: normalizedDetails,
                submittedAt: new Date().toISOString(),
              }),
            )

            navigate('/results/' + quizSessionId)
            return
          } catch (error) {
            if (message) {
              message.textContent = `${(error as Error).message}`
            }
          }

          const existingReturnButton = document.querySelector<HTMLButtonElement>('#play-quiz-return-home')
          existingReturnButton?.remove()

          const returnButton = document.createElement('button')
          returnButton.id = 'play-quiz-return-home'
          returnButton.className = 'play-quiz-submit'
          returnButton.type = 'button'
          returnButton.textContent = "Retourner à l'accueil"
          returnButton.addEventListener('click', () => {
            navigate('/')
          })

          if (message) {
            message.insertAdjacentElement('afterend', returnButton)
          } else {
            container.appendChild(returnButton)
          }
        }

        const renderCurrentQuestion = (): void => {
          const question = questions[currentIndex]
          if (!question) {
            return
          }

          if (timerId !== null) {
            window.clearInterval(timerId)
            timerId = null
          }

          questionStartedAtMs = Date.now()
          let remainingSeconds = question.timeLimit
          if (timerEl) {
            timerEl.textContent = `Temps restant : ${remainingSeconds}s`
          }

          timerId = window.setInterval(() => {
            remainingSeconds -= 1
            if (timerEl) {
              timerEl.textContent = `Temps restant : ${Math.max(0, remainingSeconds)}s`
            }
            if (remainingSeconds <= 0) {
              if (timerId !== null) {
                window.clearInterval(timerId)
                timerId = null
              }
              const elapsed = Math.min(Date.now() - questionStartedAtMs, question.timeLimit * 1000)
              responseTimes.set(question.id, elapsed)
              if (currentIndex < questions.length - 1) {
                currentIndex += 1
                renderCurrentQuestion()
                return
              }
              void submitQuiz()
            }
          }, 1000)

          progress.textContent = `Question ${currentIndex + 1}/${questions.length}`

          const template = question.type === 'QCM' ? renderQcmTemplate : renderTrueFalseTemplate
          const { html, mount, restoreSelection } = template(question, escapeHtml)

          currentQuestionContainer.innerHTML = `
            <fieldset class="card play-quiz-question">
              <legend>Question ${currentIndex + 1}</legend>
              <p>${escapeHtml(question.label)}</p>
              ${html}
            </fieldset>
          `

          mount(currentQuestionContainer, (answerIds) => {
            selectedAnswers.set(question.id, answerIds)
            nextButton.disabled = answerIds.length === 0
            if (message) message.textContent = ''
          })
          restoreSelection(currentQuestionContainer, selectedAnswers.get(question.id) ?? [])

          nextButton.textContent = currentIndex === questions.length - 1 ? 'Terminer' : 'Suivant'
          const selected = selectedAnswers.get(question.id) ?? []
          nextButton.disabled = selected.length === 0
        }

        nextButton.addEventListener('click', async () => {
          const currentQuestion = questions[currentIndex]
          if (!currentQuestion) {
            return
          }

          const selected = selectedAnswers.get(currentQuestion.id)
          if (!selected || selected.length === 0) {
            if (message) {
              message.textContent = 'Choisis une réponse pour continuer.'
            }
            return
          }

          const elapsed = Math.min(Date.now() - questionStartedAtMs, currentQuestion.timeLimit * 1000)
          responseTimes.set(currentQuestion.id, elapsed)

          if (timerId !== null) {
            window.clearInterval(timerId)
            timerId = null
          }

          if (currentIndex < questions.length - 1) {
            currentIndex += 1
            renderCurrentQuestion()
            return
          }

          await submitQuiz()
        })

        renderCurrentQuestion()
        } catch (error) {
          await minimumDelay

          if (!document.body.contains(container)) {
            return
          }

          const apiError = error as Error & { status?: number }
          if (apiError.status === 403) {
            container.innerHTML = `
              <div class="card">
                <h3>Accès refusé</h3>
                <p>Tu n'as pas le droit d'accéder à ce quiz.</p>
                <button id="return-home-403" class="play-quiz-submit" type="button">Retourner à l'accueil</button>
              </div>
            `
            const returnButton = container.querySelector<HTMLButtonElement>('#return-home-403')
            if (returnButton) {
              returnButton.addEventListener('click', () => navigate('/'))
            }
            return
          }

          container.innerHTML = `<p>Impossible de charger ce quiz (${escapeHtml((error as Error).message)})</p>`
        }
      }

      void loadQuiz()
    },
  }
}
