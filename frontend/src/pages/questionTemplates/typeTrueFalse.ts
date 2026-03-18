type TemplateQuestion = {
  id: number
  answers: Array<{ id: number; content: string }>
}

type QuestionTemplateResult = {
  html: string
  mount: (container: HTMLElement, onAnswer: (answerIds: number[]) => void) => void
  restoreSelection: (container: HTMLElement, savedIds: number[]) => void
}

export const renderTrueFalseTemplate = (
  question: TemplateQuestion,
  escapeHtml: (s: string) => string,
): QuestionTemplateResult => {
  const html = `
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
  `

  const mount = (container: HTMLElement, onAnswer: (answerIds: number[]) => void): void => {
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="radio"]')
    inputs.forEach((input) => {
      input.addEventListener('change', () => {
        onAnswer([Number(input.value)])
      })
    })
  }

  const restoreSelection = (container: HTMLElement, savedIds: number[]): void => {
    if (savedIds.length === 0) return
    const saved = container.querySelector<HTMLInputElement>(`input[value="${savedIds[0]}"]`)
    if (saved) saved.checked = true
  }

  return { html, mount, restoreSelection }
}
