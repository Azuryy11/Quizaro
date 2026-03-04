import type { PageContext, PageRenderResult } from './types'
import feather from 'feather-icons'

export const renderRegisterPage = ({ apiPost, navigate }: PageContext): PageRenderResult => {
  return {
    content: `
      <section class="card">
        <h2>Inscription</h2>
        <form id="register-form">
          <label>Pseudo</label>
          <input name="displayName" type="text">
          <label>Email</label>
          <input name="email" type="email" required>
          <label>Mot de passe</label>
          <label class="password-field">
            <input id="password" name="password" type="password" placeholder="Mot de passe" required>
            <button id="toggle-password" class="password-icon" type="button" aria-label="Afficher le mot de passe">
              <i class="icon-eye" data-feather="eye"></i>
              <i class="icon-eye-off" data-feather="eye-off"></i>
            </button>
          </label>
          <label>Confirmer le mot de passe</label>
          <label class="password-field">
            <input id="verifpassword" name="verifpassword" type="password" placeholder="Confirmer le mot de passe" required>
            <button id="toggle-verifpassword" class="password-icon" type="button" aria-label="Afficher la confirmation du mot de passe">
              <i class="icon-eye" data-feather="eye"></i>
              <i class="icon-eye-off" data-feather="eye-off"></i>
            </button>
          </label>
          <button type="submit">Créer mon compte</button>
          <p id="register-msg"></p>
        </form>
      </section>
    `,
    mount: () => {
      const registerForm = document.querySelector<HTMLFormElement>('#register-form')
      if (!registerForm) {
        return
      }

      feather.replace()

      const toggleVisibility = (inputId: string, buttonId: string): void => {
        const input = document.querySelector<HTMLInputElement>(`#${inputId}`)
        const button = document.querySelector<HTMLButtonElement>(`#${buttonId}`)

        if (!input || !button) {
          return
        }

        button.addEventListener('click', () => {
          const isHidden = input.type === 'password'
          input.type = isHidden ? 'text' : 'password'
          button.classList.toggle('is-visible', isHidden)
          button.setAttribute('aria-label', isHidden ? 'Masquer le mot de passe' : 'Afficher le mot de passe')
        })
      }

      toggleVisibility('password', 'toggle-password')
      toggleVisibility('verifpassword', 'toggle-verifpassword')

      registerForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        const formData = new FormData(registerForm)
        const message = document.querySelector<HTMLParagraphElement>('#register-msg')
        const password = String(formData.get('password') ?? '')
        const verifpassword = String(formData.get('verifpassword') ?? '')

        if (password !== verifpassword) {
          if (message) {
            message.textContent = 'Les mots de passe ne correspondent pas'
          }
          return
        }

        try {
          await apiPost('/api/auth/register', {
            displayName: String(formData.get('displayName') ?? ''),
            email: String(formData.get('email') ?? ''),
            password,
          })
          if (message) {
            message.textContent = 'Inscription réussie ✅'
          }
          navigate('/profile')
        } catch (error) {
          if (message) {
            message.textContent = `Erreur: ${(error as Error).message}`
          }
        }
      })
    },
  }
}