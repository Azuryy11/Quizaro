import type { PageContext, PageRenderResult } from './types'

const renderQuestionBlock = (index: number): string => {
  const questionNumber = index + 1

  return `
    <div class="card" data-question-item>
      <h3>Question ${questionNumber}</h3>
      <label>Label</label>
      <input name="question-label" type="text" maxlength="180" required>

      <label>Type de question</label>
      <select name="question-type" data-question-type required>
        <option value="TRUE_FALSE">Vrai/Faux</option>
        <option value="QCM">QCM</option>
      </select>

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

export const renderCreateQuizPage = ({ isAuthenticated, navigate, apiPost }: PageContext): PageRenderResult => {
  if (!isAuthenticated) {
    return {
      content: `
        <section class="card">
          <h2>Création de Quiz</h2>
          <p>Connecte toi pour créer un quiz</p>
          <button id="go-login-create-quiz">Aller à la connexion</button>
        </section>
      `,
      mount: () => {
        const goLoginButton = document.querySelector<HTMLButtonElement>('#go-login-create-quiz')
        if (goLoginButton) {
          goLoginButton.addEventListener('click', () => navigate('/login'))
        }
      },
    }
  }

  return {
    content: `
      <section class="card">
        <h2>Créer un quiz</h2>
        <form id="create-quiz-form">
          <label for="quiz-title">Titre du quiz</label>
          <input id="quiz-title" name="title" type="text" maxlength="160" required>

          <label for="quiz-description">Description (optionnel)</label>
          <input id="quiz-description" name="description" type="text">

          <div id="questions-container"></div>

          <button id="add-question-btn" type="button">Ajouter une question</button>

          <button type="submit">Créer le quiz</button>
          <p id="create-quiz-msg"></p>
          <button id="test-quiz-btn" class="is-hidden" type="button">Tester ce quiz</button>
        </form>
      </section>
    `,
    mount: () => {
      const form = document.querySelector<HTMLFormElement>('#create-quiz-form')
      const message = document.querySelector<HTMLParagraphElement>('#create-quiz-msg')
      const testQuizButton = document.querySelector<HTMLButtonElement>('#test-quiz-btn')
      const questionsContainer = document.querySelector<HTMLDivElement>('#questions-container')
      const addQuestionButton = document.querySelector<HTMLButtonElement>('#add-question-btn')

      if (!form || !questionsContainer || !addQuestionButton) {
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

      const addQuestion = (): void => {
        const index = questionsContainer.querySelectorAll('[data-question-item]').length
        questionsContainer.insertAdjacentHTML('beforeend', renderQuestionBlock(index))
        const inserted = questionsContainer.querySelectorAll<HTMLDivElement>('[data-question-item]')[index]
        if (inserted) {
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

      addQuestion()

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
                answers,
                correctAnswers,
              }
            }

            return {
              label,
              type: 'TRUE_FALSE',
              correctAnswer: String(correctSelect?.value ?? 'true') === 'true',
            }
          })
          .filter((question): question is Record<string, unknown> => question !== null)

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

          const result = await apiPost('/api/quizzes', payload)
          const quiz = (result.quiz as Record<string, unknown> | undefined) ?? undefined
          const quizId = quiz && typeof quiz.id === 'number' ? quiz.id : null

          if (message) {
            message.textContent = quizId
              ? `Quiz créé avec succès ✅ (ID: ${quizId})`
              : 'Quiz créé avec succès ✅'
          }

          if (testQuizButton && quizId) {
            testQuizButton.classList.remove('is-hidden')
            testQuizButton.onclick = () => navigate(`/play-quiz/${quizId}`)
          }

          form.reset()
          questionsContainer.innerHTML = ''
          addQuestion()
        } catch (error) {
          if (message) {
            message.textContent = `Erreur: ${(error as Error).message}`
          }
        }
      })
    },
  }
}
