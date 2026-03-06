type ToggleLabels = {
  whenHidden: string
  whenVisible: string
}

const defaultLabels: ToggleLabels = {
  whenHidden: 'Afficher le mot de passe',
  whenVisible: 'Masquer le mot de passe',
}

export const setupPasswordVisibilityToggle = (
  input: HTMLInputElement,
  button: HTMLButtonElement,
  labels: ToggleLabels = defaultLabels,
): void => {
  const applyState = (isHidden: boolean): void => {
    input.type = isHidden ? 'password' : 'text'
    button.classList.toggle('is-visible', !isHidden)
    button.setAttribute('aria-label', isHidden ? labels.whenHidden : labels.whenVisible)
  }

  applyState(input.type === 'password')

  button.addEventListener('click', () => {
    applyState(input.type !== 'password')
  })
}
