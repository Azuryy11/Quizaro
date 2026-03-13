import type { PageContext, PageRenderResult } from './types'
import { consumeWarmedPlayPayload } from '../sessionWarmupCache'

type PlayQuizQuestion = {
  id: number
  label: string
  answers: Array<{ id: number; content: string }>
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

      return { id, label, answers }
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

          const title = escapeHtml(String(quiz.title ?? 'Quiz'))
          const questions = readQuestions(quiz)
          let currentIndex = 0
          let selectedAnswers: Map<number, number> = new Map()

          if (questions.length === 0) {
            container.innerHTML = '<p>Ce quiz ne contient aucune question.</p>'
            return
          }

          container.innerHTML = `
            <h3>${title}</h3>
            ${sessionCode ? '<div class="session-code-banner">Code de session : ' + escapeHtml(sessionCode) + '</div>' : 'Aucun code généré'}
             
           <form id="play-quiz-form">
              <p id="play-quiz-progress"></p>
              <div id="play-quiz-current-question"></div>
              <button id="play-quiz-next-btn" class="play-quiz-submit" type="button" disabled>Suivant</button>
            </form>
          `

          const form = document.querySelector<HTMLFormElement>('#play-quiz-form')
          const progress = document.querySelector<HTMLParagraphElement>('#play-quiz-progress')
          const currentQuestionContainer = document.querySelector<HTMLDivElement>('#play-quiz-current-question')
          const nextButton = document.querySelector<HTMLButtonElement>('#play-quiz-next-btn')

          if (!form || !progress || !currentQuestionContainer || !nextButton) {
            return
          }

          const submitQuiz = async (): Promise<void> => {
            const answers = questions.map((question) => ({
              questionId: question.id,
              answerId: Number(selectedAnswers.get(question.id) ?? 0),
              responseTimeMs: 0,
            }))

          if (answers.some((answer) => !Number.isFinite(answer.answerId) || answer.answerId <= 0)) {
            if (message) {
              message.textContent = 'Réponds à toutes les questions avant de valider.'
            }
            return
          }

          try {
            await apiPost(`/api/quizzes/${quizId}/submit`, {
              playerSessionId,
              quizSessionId,
              answers,
            })

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

          progress.textContent = `Question ${currentIndex + 1}/${questions.length}`

          currentQuestionContainer.innerHTML = `
            <fieldset class="card play-quiz-question">
              <legend>Question ${currentIndex + 1}</legend>
              <p>${escapeHtml(question.label)}</p>
              <div class="answer-options">
                ${question.answers
                  .map(
                    (answer) => `
                      <label class="answer-option">
                        <input type="radio" name="current-question-${question.id}" value="${answer.id}">
                        <span class="answer-option__text">${escapeHtml(answer.content)}</span>
                      </label>
                    `,
                  )
                  .join('')}
              </div>
            </fieldset>
          `

          const savedAnswerId = selectedAnswers.get(question.id)
          if (Number.isFinite(savedAnswerId)) {
            const savedInput = currentQuestionContainer.querySelector<HTMLInputElement>(`input[value="${savedAnswerId}"]`)
            if (savedInput) {
              savedInput.checked = true
            }
          }

          const radioInputs = currentQuestionContainer.querySelectorAll<HTMLInputElement>('input[type="radio"]')
          radioInputs.forEach((input) => {
            input.addEventListener('change', () => {
              selectedAnswers.set(question.id, Number(input.value))
              nextButton.disabled = false
              if (message) {
                message.textContent = ''
              }
            })
          })

          nextButton.textContent = currentIndex === questions.length - 1 ? 'Terminer' : 'Suivant'
          nextButton.disabled = !selectedAnswers.has(question.id)
        }

        nextButton.addEventListener('click', async () => {
          const currentQuestion = questions[currentIndex]
          if (!currentQuestion) {
            return
          }

          const selected = selectedAnswers.get(currentQuestion.id)
          if (selected === undefined || selected <= 0) {
            if (message) {
              message.textContent = 'Choisis une réponse pour continuer.'
            }
            return
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

          container.innerHTML = `<p>Impossible de charger ce quiz (${escapeHtml((error as Error).message)})</p>`
        }
      }

      void loadQuiz()
    },
  }
}
