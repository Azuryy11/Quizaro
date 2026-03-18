type TemplateQuestion = {
  id: number
  answers: Array<{ id: number; content: string }>
}

type QuestionTemplateResult = {
  html: string
  mount: (container: HTMLElement, onAnswer: (answerIds: number[]) => void) => void
  restoreSelection: (container: HTMLElement, savedIds: number[]) => void
}

export const renderQcmTemplate = (
  question: TemplateQuestion,
  escapeHtml: (s: string) => string,
): QuestionTemplateResult => {
  const html = `
    <p class="qcm-hint">Plusieurs réponses possibles</p>
    <div class="answer-options">
      ${question.answers
        .map(
          (answer) => `
        <label class="answer-option">
          <input type="checkbox" name="current-question-${question.id}" value="${answer.id}">
          <span class="answer-option__text">${escapeHtml(answer.content)}</span>
        </label>
      `,
        )
        .join('')}
    </div>
  `

  const mount = (container: HTMLElement, onAnswer: (answerIds: number[]) => void): void => {
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    inputs.forEach((input) => {
      input.addEventListener('change', () => {
        const checked = Array.from(inputs)
          .filter((i) => i.checked)
          .map((i) => Number(i.value))
        onAnswer(checked)
      })
    })
  }

  const restoreSelection = (container: HTMLElement, savedIds: number[]): void => {
    if (savedIds.length === 0) return
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    inputs.forEach((input) => {
      if (savedIds.includes(Number(input.value))) {
        input.checked = true
      }
    })
  }

  return { html, mount, restoreSelection }
}
