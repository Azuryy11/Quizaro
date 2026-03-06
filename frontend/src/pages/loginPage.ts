import type { PageContext, PageRenderResult } from './types'
import feather from 'feather-icons'
import { setupPasswordVisibilityToggle } from '../utils/passwordVisibility'

export const renderLoginPage = ({ apiPost, navigate }: PageContext): PageRenderResult => {
  return {
    content: `
      <section class="card">
        <h2>Connexion</h2>
        <form id="login-form">
          <label>Email</label>
          <input name="email" type="email" required>
          <label>Mot de passe</label>
          <label class="password-field">
            <input id="login-password" name="password" type="password" placeholder="Mot de passe" required>
            <button id="toggle-login-password" class="password-icon" type="button" aria-label="Afficher le mot de passe">
              <i class="icon-eye" data-feather="eye"></i>
              <i class="icon-eye-off" data-feather="eye-off"></i>
            </button>
          </label>
          <button type="submit">Se connecter</button>
          <p id="login-msg"></p>
        </form>
      </section>
    `,
    mount: () => {
      const loginForm = document.querySelector<HTMLFormElement>('#login-form')
      if (!loginForm) {
        return
      }

      feather.replace()

      const passwordInput = document.querySelector<HTMLInputElement>('#login-password')
      const togglePasswordButton = document.querySelector<HTMLButtonElement>('#toggle-login-password')

      if (passwordInput && togglePasswordButton) {
        setupPasswordVisibilityToggle(passwordInput, togglePasswordButton)
      }

      loginForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        const formData = new FormData(loginForm)
        const message = document.querySelector<HTMLParagraphElement>('#login-msg')

        try {
          await apiPost('/api/auth/login', {
            email: String(formData.get('email') ?? ''),
            password: String(formData.get('password') ?? ''),
          })
          if (message) {
            message.textContent = 'Connexion réussie ✅'
          }
          navigate('/')
        } catch (error) {
          if (message) {
            message.textContent = `Erreur: ${(error as Error).message}`
          }
        }
      })
    },
  }
}