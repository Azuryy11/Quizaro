import type { PageContext, PageRenderResult } from './types'

type ReviewAnswer = {
  id: number
  content: string
}

type ReviewQuestion = {
  id: number
  label: string
  type: string
  answers: ReviewAnswer[]
}

type ReviewDetail = {
  questionId: number
  answerIds: number[]
  correctAnswerIds: number[]
}

type ReviewPayload = {
  quizSessionId: number
  quizId: number
  title: string
  questions: ReviewQuestion[]
  details: ReviewDetail[]
}

const normalizeReviewPayload = (value: unknown): ReviewPayload | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const payload = value as Record<string, unknown>
  const quizSessionId = Number(payload.quizSessionId)
  const quizId = Number(payload.quizId)
  const title = String(payload.title ?? 'Quiz')
  const questionsValue = Array.isArray(payload.questions) ? payload.questions : []
  const detailsValue = Array.isArray(payload.details) ? payload.details : []

  if (!Number.isFinite(quizSessionId) || quizSessionId <= 0 || !Number.isFinite(quizId) || quizId <= 0) {
    return null
  }

  const questions = questionsValue
    .map((entry) => {
      const question = entry as Record<string, unknown>
      const id = Number(question.id)
      const label = String(question.label ?? '')
      const type = String(question.type ?? 'TRUE_FALSE')
      const answersValue = Array.isArray(question.answers) ? question.answers : []
      const answers = answersValue
        .map((answerEntry) => {
          const answer = answerEntry as Record<string, unknown>
          const answerId = Number(answer.id)
          const content = String(answer.content ?? '')

          if (!Number.isFinite(answerId) || answerId <= 0 || content === '') {
            return null
          }

          return {
            id: answerId,
            content,
          } satisfies ReviewAnswer
        })
        .filter((answer): answer is ReviewAnswer => answer !== null)

      if (!Number.isFinite(id) || id <= 0 || label === '' || answers.length === 0) {
        return null
      }

      return {
        id,
        label,
        type,
        answers,
      } satisfies ReviewQuestion
    })
    .filter((question): question is ReviewQuestion => question !== null)

  const details = detailsValue
    .map((entry) => {
      const detail = entry as Record<string, unknown>
      const questionId = Number(detail.questionId)
      const answerIds = Array.isArray(detail.answerIds)
        ? detail.answerIds.map((idValue) => Number(idValue)).filter((idValue) => Number.isFinite(idValue) && idValue > 0)
        : []
      const correctAnswerIds = Array.isArray(detail.correctAnswerIds)
        ? detail.correctAnswerIds
            .map((idValue) => Number(idValue))
            .filter((idValue) => Number.isFinite(idValue) && idValue > 0)
        : []

      if (!Number.isFinite(questionId) || questionId <= 0) {
        return null
      }

      return {
        questionId,
        answerIds,
        correctAnswerIds,
      } satisfies ReviewDetail
    })
    .filter((detail): detail is ReviewDetail => detail !== null)

  if (questions.length === 0 || details.length === 0) {
    return null
  }

  return {
    quizSessionId,
    quizId,
    title,
    questions,
    details,
  }
}

export const renderReviewPage = ({ isAuthenticated, navigate, escapeHtml }: PageContext, quizSessionId: number): PageRenderResult => {
  if (!isAuthenticated) {
    return {
      content: `
        <section class="card">
          <h2>Relecture des réponses</h2>
          <p>Connecte toi pour voir cette page.</p>
          <button id="go-login-review">Aller à la connexion</button>
        </section>
      `,
      mount: () => {
        const goLoginButton = document.querySelector<HTMLButtonElement>('#go-login-review')
        goLoginButton?.addEventListener('click', () => navigate('/login'))
      },
    }
  }

  return {
    content: `
      <section class="card">
        <h2>Relecture des réponses</h2>
        <p id="review-page-message"></p>
        <div id="review-page-content"></div>
      </section>
    `,
    mount: () => {
      const content = document.querySelector<HTMLDivElement>('#review-page-content')
      const message = document.querySelector<HTMLParagraphElement>('#review-page-message')

      if (!content) {
        return
      }

      const reviewStorageKey = `reviewQuizSession:${quizSessionId}`
      const rawReview = window.sessionStorage.getItem(reviewStorageKey)
      if (!rawReview) {
        content.innerHTML = '<p>Données de relecture indisponibles pour cette session.</p>'
        return
      }

      let parsedReview: unknown
      try {
        parsedReview = JSON.parse(rawReview)
      } catch {
        window.sessionStorage.removeItem(reviewStorageKey)
        content.innerHTML = '<p>Données de relecture invalides.</p>'
        return
      }

      const review = normalizeReviewPayload(parsedReview)
      if (!review) {
        window.sessionStorage.removeItem(reviewStorageKey)
        content.innerHTML = '<p>Données de relecture incomplètes.</p>'
        return
      }

      const detailsByQuestionId = new Map<number, ReviewDetail>()
      review.details.forEach((detail) => {
        detailsByQuestionId.set(detail.questionId, detail)
      })

      const questionsHtml = review.questions
        .map((question, index) => {
          const detail = detailsByQuestionId.get(question.id)
          const selectedIds = detail ? detail.answerIds : []
          const correctIds = detail ? detail.correctAnswerIds : []

          const answersHtml = question.answers
            .map((answer) => {
              const isSelected = selectedIds.includes(answer.id)
              const isCorrect = correctIds.includes(answer.id)
              const isWrongSelection = isSelected && !isCorrect
              const cssClasses = [
                'review-answer',
                isCorrect ? 'review-answer--correct' : '',
                isWrongSelection ? 'review-answer--wrong' : '',
              ]
                .filter((cssClass) => cssClass !== '')
                .join(' ')

              const badges = [
                isSelected ? '<span class="review-badge review-badge--user">Ta réponse</span>' : '',
                isCorrect ? '<span class="review-badge review-badge--correct">Bonne réponse</span>' : '',
              ]
                .filter((badge) => badge !== '')
                .join(' ')

              return `
                <li class="${cssClasses}">
                  <span>${escapeHtml(answer.content)}</span>
                  <span class="review-answer__badges">${badges}</span>
                </li>
              `
            })
            .join('')

          const questionType = question.type === 'QCM' ? 'QCM' : 'Vrai/Faux'

          return `
            <article class="card review-question-card">
              <p class="review-question-card__meta">Question ${index + 1} · ${escapeHtml(questionType)}</p>
              <h3>${escapeHtml(question.label)}</h3>
              <ul class="review-answer-list">${answersHtml}</ul>
            </article>
          `
        })
        .join('')

      content.innerHTML = `
        <div class="card">
          <p><strong>Quiz :</strong> ${escapeHtml(review.title)}</p>
          <p><strong>Session :</strong> #${review.quizSessionId}</p>
        </div>
        ${questionsHtml}
        <button id="review-back-results" class="play-quiz-submit" type="button">Retour au classement</button>
      `

      const backButton = content.querySelector<HTMLButtonElement>('#review-back-results')
      backButton?.addEventListener('click', () => {
        navigate('/results/' + quizSessionId)
      })

      if (message) {
        message.textContent = ''
      }
    },
  }
}
