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

        try {
          const warmedResult = consumeWarmedPlayPayload(quizId)
          const result = warmedResult ?? (await apiGet(`/api/quizzes/${quizId}/play`))

          await minimumDelay

          if (!document.body.contains(container)) {
            return
          }

          const quiz = (result.quiz as Record<string, unknown> | undefined) ?? undefined
          const session = (result.session as Record<string, unknown> | undefined) ?? undefined
          const playerSessionId = Number(session?.playerSessionId ?? 0)
          const sessionCode = String(session?.code ?? '').trim()

          if (!quiz) {
            container.innerHTML = '<p>Quiz introuvable.</p>'
            return
          }

          if (!Number.isFinite(playerSessionId) || playerSessionId <= 0) {
            container.innerHTML = '<p>Session de jeu invalide.</p>'
            return
          }

          const title = escapeHtml(String(quiz.title ?? 'Quiz'))
          const questions = readQuestions(quiz)

          if (questions.length === 0) {
            container.innerHTML = '<p>Ce quiz ne contient aucune question.</p>'
            return
          }

          container.innerHTML = `
            <h3>${title}</h3>
            ${sessionCode ? '<div class="session-code-banner">Code de session : ' + escapeHtml(sessionCode) + '</div>' : 'Aucun code généré'}
           <form id="play-quiz-form">
              ${questions
                .map(
                  (question, index) => `
                    <fieldset class="card play-quiz-question">
                      <legend>Question ${index + 1}</legend>
                      <p>${escapeHtml(question.label)}</p>
                      <div class="answer-options">
                        ${question.answers
                          .map(
                            (answer) => `
                              <label class="answer-option">
                                <input type="radio" name="question-${question.id}" value="${answer.id}" required>
                                <span class="answer-option__text">${escapeHtml(answer.content)}</span>
                              </label>
                            `,
                          )
                          .join('')}
                      </div>
                    </fieldset>
                  `,
                )
                .join('')}
              <button class="play-quiz-submit" type="submit">Valider mes réponses</button>
            </form>
          `

          const form = document.querySelector<HTMLFormElement>('#play-quiz-form')
          if (!form) {
            return
          }

          form.addEventListener('submit', async (event) => {
            event.preventDefault()

            const formData = new FormData(form)
            const answers = questions.map((question) => ({
              questionId: question.id,
              answerId: Number(formData.get(`question-${question.id}`)),
              responseTimeMs: 0,
            }))

            if (answers.some((answer) => !Number.isFinite(answer.answerId) || answer.answerId <= 0)) {
              if (message) {
                message.textContent = 'Réponds à toutes les questions avant de valider.'
              }
              return
            }

            try {
              const submitResult = await apiPost(`/api/quizzes/${quizId}/submit`, {
                playerSessionId,
                answers,
              })
              const resultPayload = (submitResult.result as Record<string, unknown> | undefined) ?? undefined
              const score = Number(resultPayload?.score ?? 0)
              const total = Number(resultPayload?.totalQuestions ?? questions.length)
              const percentage = total > 0 ? (score / total) * 100 : 0

              if (message) {
                message.textContent = `Résultat: ${score}/${total}${percentage >= 50 ? ' ✅' : '❌'}`
              }
            } catch (error) {
              if (message) {
                message.textContent = `Erreur: ${(error as Error).message}`
              }
            }
          })
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
