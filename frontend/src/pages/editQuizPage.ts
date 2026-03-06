import type { PageContext, PageRenderResult } from './types'

type EditableQuestion = {
  label: string
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

const extractEditableQuestions = (quiz: Record<string, unknown>): EditableQuestion[] => {
  const questions = Array.isArray(quiz.questions) ? (quiz.questions as unknown[]) : []

  return questions
    .map((question) => (question && typeof question === 'object' ? (question as Record<string, unknown>) : null))
    .filter((question): question is Record<string, unknown> => Boolean(question))
    .map((question) => ({
      label: String(question.label ?? '').trim(),
      correctAnswer: normalizeCorrectAnswer(question),
    }))
    .filter((question) => question.label !== '')
}

const renderQuestionBlock = (index: number): string => {
  const questionNumber = index + 1

  return `
    <div class="card" data-question-item>
      <h3>Question ${questionNumber}</h3>
      <label>Label</label>
      <input name="question-label" type="text" maxlength="180" required>

      <label>Bonne réponse</label>
      <select name="question-correct" required>
        <option value="true">Vrai</option>
        <option value="false">Faux</option>
      </select>

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
          <p id="edit-quiz-msg"></p>
          <button id="test-quiz-btn" class="is-hidden" type="button">Tester ce quiz</button>
        </form>
      </section>
    `,
    mount: () => {
      const form = document.querySelector<HTMLFormElement>('#edit-quiz-form')
      const message = document.querySelector<HTMLParagraphElement>('#edit-quiz-msg')
      const testQuizButton = document.querySelector<HTMLButtonElement>('#test-quiz-btn')
      const questionsContainer = document.querySelector<HTMLDivElement>('#questions-container')
      const addQuestionButton = document.querySelector<HTMLButtonElement>('#add-question-btn')
      const titleInput = document.querySelector<HTMLInputElement>('#quiz-title')
      const descriptionInput = document.querySelector<HTMLInputElement>('#quiz-description')

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

      const addQuestion = (question?: EditableQuestion): void => {
        const index = questionsContainer.querySelectorAll('[data-question-item]').length
        questionsContainer.insertAdjacentHTML('beforeend', renderQuestionBlock(index))

        const inserted = questionsContainer.querySelectorAll<HTMLDivElement>('[data-question-item]')[index]
        if (inserted) {
          const labelInput = inserted.querySelector<HTMLInputElement>('input[name="question-label"]')
          const correctSelect = inserted.querySelector<HTMLSelectElement>('select[name="question-correct"]')

          if (labelInput && question) {
            labelInput.value = question.label
          }

          if (correctSelect && question) {
            correctSelect.value = question.correctAnswer ? 'true' : 'false'
          }
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
          if (message) {
            message.textContent = `Erreur: ${escapeHtml((error as Error).message)}`
          }
        }
      }

      form.addEventListener('submit', async (event) => {
        event.preventDefault()

        const formData = new FormData(form)
        const title = String(formData.get('title') ?? '').trim()
        const description = String(formData.get('description') ?? '').trim()

        const labelValues = formData.getAll('question-label').map((value) => String(value).trim())
        const correctAnswerValues = formData.getAll('question-correct').map((value) => String(value))

        const questions = labelValues
          .map((label, index) => ({
            label,
            correctAnswer: correctAnswerValues[index] === 'true',
          }))
          .filter((question) => question.label !== '')

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
