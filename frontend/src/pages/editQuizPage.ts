import type { PageContext, PageRenderResult } from './types'

type EditableQuestion = {
  label: string
  type: 'TRUE_FALSE' | 'QCM'
  timeLimit: number
  correctAnswer?: boolean
  answers?: string[]
  correctAnswers?: number[]
}

type EditQuestionPayload =
  | {
      label: string
      type: 'QCM'
      timeLimit: number
      answers: string[]
      correctAnswers: number[]
    }
  | {
      label: string
      type: 'TRUE_FALSE'
      timeLimit: number
      correctAnswer: boolean
    }

const normalizeCorrectAnswer = (rawQuestion: Record<string, unknown>): boolean => {
  const answers = Array.isArray(rawQuestion.answers) ? (rawQuestion.answers as unknown[]) : []
  const correctAnswer = answers
    .map((answer) => (answer && typeof answer === 'object' ? (answer as Record<string, unknown>) : null))
    .find((answer) => Boolean(answer?.isCorrect))

  const content = String(correctAnswer?.content ?? '').trim().toLowerCase()
  if (content === 'vrai' || content === 'true' || content === '1') {
    return true
  }
  if (content === 'faux' || content === 'false' || content === '0') {
    return false
  }

  return Boolean(correctAnswer)
}

const normalizeQcmQuestion = (rawQuestion: Record<string, unknown>): EditableQuestion => {
  const answers = Array.isArray(rawQuestion.answers) ? (rawQuestion.answers as unknown[]) : []
  const normalizedAnswers = answers
    .map((answer) => (answer && typeof answer === 'object' ? (answer as Record<string, unknown>) : null))
    .filter((answer): answer is Record<string, unknown> => Boolean(answer))
    .sort((left, right) => Number(left.position ?? 0) - Number(right.position ?? 0))
    .map((answer) => String(answer.content ?? '').trim())
    .filter((content) => content !== '')
  const parsedTimeLimit = Number(rawQuestion.timeLimit)
  const timeLimit = Number.isFinite(parsedTimeLimit) ? Math.min(300, Math.max(5, Math.trunc(parsedTimeLimit))) : 30

  const correctAnswers = answers
    .map((answer, index) => {
      const normalized = answer && typeof answer === 'object' ? (answer as Record<string, unknown>) : null
      return normalized?.isCorrect ? index : -1
    })
    .filter((index) => index >= 0)

  return {
    label: String(rawQuestion.label ?? '').trim(),
    type: 'QCM',
    timeLimit,
    answers: normalizedAnswers,
    correctAnswers,
  }
}

const extractEditableQuestions = (quiz: Record<string, unknown>): EditableQuestion[] => {
  const questions = Array.isArray(quiz.questions) ? (quiz.questions as unknown[]) : []

  return questions
    .map((question) => (question && typeof question === 'object' ? (question as Record<string, unknown>) : null))
    .filter((question): question is Record<string, unknown> => Boolean(question))
    .map((question) => {
      const rawType = String(question.type ?? 'TRUE_FALSE').toUpperCase()
      const parsedTimeLimit = Number(question.timeLimit)
      const timeLimit = Number.isFinite(parsedTimeLimit) ? Math.min(300, Math.max(5, Math.trunc(parsedTimeLimit))) : 30

      if (rawType === 'QCM') {
        return normalizeQcmQuestion(question)
      }

      return {
        label: String(question.label ?? '').trim(),
        type: 'TRUE_FALSE' as const,
        timeLimit,
        correctAnswer: normalizeCorrectAnswer(question),
      }
    })
    .filter((question) => question.label !== '')
}

const renderQuestionBlock = (index: number): string => {
  const questionNumber = index + 1

  return `
    <div class="card" data-question-item>
      <h3>Question ${questionNumber}</h3>
      <label>Énoncé de la question :</label>
      <input name="question-label" type="text" maxlength="180" required>

      <label>Type de question</label>
      <select name="question-type" data-question-type required>
        <option value="TRUE_FALSE">Vrai/Faux</option>
        <option value="QCM">QCM</option>
      </select>

      <label>Limite de temps (secondes)</label>
      <input name="question-time-limit" type="number" min="5" max="60" step="1" value="30" required>


      <div data-true-false-fields>
        <label>Bonne réponse</label>
        <select name="question-correct" required>
          <option value="true">Vrai</option>
          <option value="false">Faux</option>
        </select>
      </div>

      <div data-qcm-fields class="is-hidden">
        <p>Réponses QCM (2 minimum)</p>
        <div class="qcm-option-row">
          <input name="question-qcm-answer" type="text" maxlength="255" placeholder="Réponse 1">
          <label><input name="question-qcm-correct" type="checkbox" value="0"> Correcte</label>
        </div>
        <div class="qcm-option-row">
          <input name="question-qcm-answer" type="text" maxlength="255" placeholder="Réponse 2">
          <label><input name="question-qcm-correct" type="checkbox" value="1"> Correcte</label>
        </div>
        <div class="qcm-option-row">
          <input name="question-qcm-answer" type="text" maxlength="255" placeholder="Réponse 3">
          <label><input name="question-qcm-correct" type="checkbox" value="2"> Correcte</label>
        </div>
        <div class="qcm-option-row">
          <input name="question-qcm-answer" type="text" maxlength="255" placeholder="Réponse 4">
          <label><input name="question-qcm-correct" type="checkbox" value="3"> Correcte</label>
        </div>
      </div>

      <button type="button" data-remove-question>Supprimer la question</button>
    </div>
  `
}

export const renderEditQuizPage = (
  { isAuthenticated, navigate, apiGet, apiPut, escapeHtml }: PageContext,
  quizId: number,
): PageRenderResult => {
  if (!isAuthenticated) {
    return {
      content: `
        <section class="card">
          <h2>Modification de Quiz</h2>
          <p>Connecte toi pour modifier un quiz</p>
          <button id="go-login-edit-quiz">Aller à la connexion</button>
        </section>
      `,
      mount: () => {
        const goLoginButton = document.querySelector<HTMLButtonElement>('#go-login-edit-quiz')
        if (goLoginButton) {
          goLoginButton.addEventListener('click', () => navigate('/login'))
        }
      },
    }
  }

  return {
    content: `
      <section class="card">
        <h2>Modifier un quiz</h2>
        <form id="edit-quiz-form">
          <label for="quiz-title">Titre du quiz</label>
          <input id="quiz-title" name="title" type="text" maxlength="160" required>

          <label for="quiz-description">Description (optionnel)</label>
          <input id="quiz-description" name="description" type="text">

          <div id="questions-container"></div>

          <button id="add-question-btn" type="button">Ajouter une question</button>

          <button type="submit">Enregistrer</button>
          <br>
          <button id="back-to-my-quizzes" type="button">Retourner à mes quiz</button>
          <p id="edit-quiz-msg"></p>
          <button id="test-quiz-btn" class="is-hidden" type="button">Tester ce quiz</button>
        </form>
      </section>
    `,
    mount: () => {
      const backButton = document.querySelector<HTMLButtonElement>('#back-to-my-quizzes')
      const form = document.querySelector<HTMLFormElement>('#edit-quiz-form')
      const message = document.querySelector<HTMLParagraphElement>('#edit-quiz-msg')
      const testQuizButton = document.querySelector<HTMLButtonElement>('#test-quiz-btn')
      const questionsContainer = document.querySelector<HTMLDivElement>('#questions-container')
      const addQuestionButton = document.querySelector<HTMLButtonElement>('#add-question-btn')
      const titleInput = document.querySelector<HTMLInputElement>('#quiz-title')
      const descriptionInput = document.querySelector<HTMLInputElement>('#quiz-description')

      if (backButton) {
        backButton.addEventListener('click', () => navigate('/my-quizzes'))
      }

      if (!form || !questionsContainer || !addQuestionButton || !titleInput || !descriptionInput) {
        return
      }

      const refreshQuestionTitles = (): void => {
        const questionCards = Array.from(
          questionsContainer.querySelectorAll<HTMLDivElement>('[data-question-item]'),
        )

        questionCards.forEach((questionCard, index) => {
          const heading = questionCard.querySelector<HTMLHeadingElement>('h3')
          if (heading) {
            heading.textContent = `Question ${index + 1}`
          }

          const removeButton = questionCard.querySelector<HTMLButtonElement>('[data-remove-question]')
          if (removeButton) {
            removeButton.disabled = questionCards.length === 1
          }
        })
      }

      const bindQuestionTypeToggle = (questionCard: HTMLDivElement): void => {
        const typeSelect = questionCard.querySelector<HTMLSelectElement>('[data-question-type]')
        const trueFalseFields = questionCard.querySelector<HTMLDivElement>('[data-true-false-fields]')
        const qcmFields = questionCard.querySelector<HTMLDivElement>('[data-qcm-fields]')

        if (!typeSelect || !trueFalseFields || !qcmFields) {
          return
        }

        const syncVisibility = (): void => {
          const isQcm = typeSelect.value === 'QCM'
          trueFalseFields.classList.toggle('is-hidden', isQcm)
          qcmFields.classList.toggle('is-hidden', !isQcm)
        }

        typeSelect.addEventListener('change', syncVisibility)
        syncVisibility()
      }

      const addQuestion = (question?: EditableQuestion): void => {
        const index = questionsContainer.querySelectorAll('[data-question-item]').length
        questionsContainer.insertAdjacentHTML('beforeend', renderQuestionBlock(index))

        const inserted = questionsContainer.querySelectorAll<HTMLDivElement>('[data-question-item]')[index]
        if (inserted) {
          const labelInput = inserted.querySelector<HTMLInputElement>('input[name="question-label"]')
          const typeSelect = inserted.querySelector<HTMLSelectElement>('select[name="question-type"]')
          const timeLimitInput = inserted.querySelector<HTMLInputElement>('input[name="question-time-limit"]')
          if (timeLimitInput && question) {
            timeLimitInput.value = String(question.timeLimit)
          }
          const correctSelect = inserted.querySelector<HTMLSelectElement>('select[name="question-correct"]')
          const qcmAnswerInputs = Array.from(
            inserted.querySelectorAll<HTMLInputElement>('input[name="question-qcm-answer"]'),
          )
          const qcmCorrectInputs = Array.from(
            inserted.querySelectorAll<HTMLInputElement>('input[name="question-qcm-correct"]'),
          )

          bindQuestionTypeToggle(inserted)

          if (labelInput && question) {
            labelInput.value = question.label
          }

          if (typeSelect && question) {
            typeSelect.value = question.type
            typeSelect.dispatchEvent(new Event('change'))
          }

          if (correctSelect && question && question.type === 'TRUE_FALSE') {
            correctSelect.value = question.correctAnswer ? 'true' : 'false'
          }

          if (question && question.type === 'QCM') {
            const answers = question.answers ?? []
            const correctAnswers = question.correctAnswers ?? []

            qcmAnswerInputs.forEach((input, answerIndex) => {
              input.value = answers[answerIndex] ?? ''
            })

            qcmCorrectInputs.forEach((input) => {
              const answerIndex = Number(input.value)
              input.checked = correctAnswers.includes(answerIndex)
            })
          }
        } else if (inserted) {
          bindQuestionTypeToggle(inserted)
        }

        refreshQuestionTitles()
      }

      questionsContainer.addEventListener('click', (event) => {
        const target = event.target as HTMLElement | null
        const removeButton = target?.closest<HTMLButtonElement>('[data-remove-question]')

        if (!removeButton) {
          return
        }

        const questionCard = removeButton.closest<HTMLDivElement>('[data-question-item]')
        if (!questionCard) {
          return
        }

        questionCard.remove()
        refreshQuestionTitles()
      })

      addQuestionButton.addEventListener('click', () => {
        addQuestion()
      })

      const loadQuiz = async (): Promise<void> => {
        if (!Number.isFinite(quizId) || quizId <= 0) {
          if (message) {
            message.textContent = 'Quiz invalide.'
          }
          return
        }

        try {
          const result = await apiGet(`/api/quizzes/${quizId}`)
          const quiz = (result.quiz as Record<string, unknown> | undefined) ?? null

          if (!quiz) {
            throw new Error('Quiz introuvable')
          }

          titleInput.value = String(quiz.title ?? '')
          descriptionInput.value = String(quiz.description ?? '')

          const editableQuestions = extractEditableQuestions(quiz)
          questionsContainer.innerHTML = ''

          if (editableQuestions.length === 0) {
            addQuestion()
          } else {
            editableQuestions.forEach((question) => addQuestion(question))
          }

          if (message) {
            message.textContent = ''
          }
        } catch (error) {
          const apiError = error as Error & { status?: number }
          if (apiError.status === 403) {
            throw error
          }
          if (message) {
            message.textContent = `Erreur: ${escapeHtml((error as Error).message)}`
          }
        }
      }

      const checkAccessAndLoad = async (): Promise<void> => {
        try {
          await loadQuiz()
        } catch (error) {
          const apiError = error as Error & { status?: number }
          if (apiError.status === 403) {
            form.innerHTML = `
              <div class="card">
                <h3>Accès refusé</h3>
                <p>Tu n'as pas le droit de modifier ce quiz.</p>
                <button type="button" id="back-to-my-quizzes-denied">Retourner à mes quiz</button>
              </div>
            `
            const backButton = form.querySelector<HTMLButtonElement>('#back-to-my-quizzes-denied')
            if (backButton) {
              backButton.addEventListener('click', () => navigate('/my-quizzes'))
            }
            return
          }
          throw error
        }
      }

      void checkAccessAndLoad()

      form.addEventListener('submit', async (event) => {
        event.preventDefault()

        const formData = new FormData(form)
        const title = String(formData.get('title') ?? '').trim()
        const description = String(formData.get('description') ?? '').trim()

        const questionCards = Array.from(
          questionsContainer.querySelectorAll<HTMLDivElement>('[data-question-item]'),
        )

        const questions = questionCards
          .map((questionCard) => {
            const labelInput = questionCard.querySelector<HTMLInputElement>('input[name="question-label"]')
            const typeSelect = questionCard.querySelector<HTMLSelectElement>('select[name="question-type"]')
            const timeLimitInput = questionCard.querySelector<HTMLInputElement>('input[name="question-time-limit"]')
            const parsedTimeLimit = Number.parseInt(String(timeLimitInput?.value ?? '30'), 10)
            const timeLimit = Number.isInteger(parsedTimeLimit) ? Math.min(300, Math.max(5, parsedTimeLimit)) : 30
            const correctSelect = questionCard.querySelector<HTMLSelectElement>('select[name="question-correct"]')
            const qcmAnswerInputs = Array.from(
              questionCard.querySelectorAll<HTMLInputElement>('input[name="question-qcm-answer"]'),
            )
            const qcmCorrectInputs = Array.from(
              questionCard.querySelectorAll<HTMLInputElement>('input[name="question-qcm-correct"]'),
            )

            const label = String(labelInput?.value ?? '').trim()
            const type = String(typeSelect?.value ?? 'TRUE_FALSE')

            if (label === '') {
              return null
            }

            if (type === 'QCM') {
              const answers = qcmAnswerInputs
                .map((input) => input.value.trim())
                .filter((answer) => answer !== '')

              const correctAnswers = qcmCorrectInputs
                .filter((input) => input.checked)
                .map((input) => Number(input.value))
                .filter((value) => Number.isInteger(value) && value >= 0)

              return {
                label,
                type: 'QCM',
                timeLimit,
                answers,
                correctAnswers,
              } satisfies EditQuestionPayload
            }

            return {
              label,
              type: 'TRUE_FALSE',
              timeLimit,
              correctAnswer: String(correctSelect?.value ?? 'true') === 'true',
            } satisfies EditQuestionPayload
          })
          .filter((question): question is EditQuestionPayload => question !== null)

        if ('' === title || questions.length === 0) {
          if (message) {
            message.textContent = 'Titre et au moins une question sont obligatoires.'
          }
          return
        }

        try {
          const payload: Record<string, unknown> = {
            title,
            questions,
          }

          if (description !== '') {
            payload.description = description
          }

          await apiPut(`/api/quizzes/${quizId}`, payload)

          if (message) {
            message.textContent = 'Quiz mis à jour ✅'
          }

          if (testQuizButton) {
            testQuizButton.classList.remove('is-hidden')
            testQuizButton.onclick = () => navigate(`/play-quiz/${quizId}`)
          }
        } catch (error) {
          if (message) {
            message.textContent = `Erreur: ${(error as Error).message}`
          }
        }
      })

      void loadQuiz()
    },
  }
}
