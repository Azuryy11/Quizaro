import type { PageContext, PageRenderResult } from './types'
import feather from 'feather-icons'
import { setupPasswordVisibilityToggle } from '../utils/passwordVisibility'

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

      const passwordInput = document.querySelector<HTMLInputElement>('#password')
      const passwordToggle = document.querySelector<HTMLButtonElement>('#toggle-password')
      if (passwordInput && passwordToggle) {
        setupPasswordVisibilityToggle(passwordInput, passwordToggle)
      }

      const verifyPasswordInput = document.querySelector<HTMLInputElement>('#verifpassword')
      const verifyPasswordToggle = document.querySelector<HTMLButtonElement>('#toggle-verifpassword')
      if (verifyPasswordInput && verifyPasswordToggle) {
        setupPasswordVisibilityToggle(verifyPasswordInput, verifyPasswordToggle, {
          whenHidden: 'Afficher la confirmation du mot de passe',
          whenVisible: 'Masquer la confirmation du mot de passe',
        })
      }

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