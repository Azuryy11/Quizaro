import './navbar.css'

const logoUrl = new URL('../img/Quizaro_Contour_Logo/transparent-logo-good.svg', import.meta.url).href

export const renderNav = (isAuthenticated: boolean): string => {
  return `
    <nav class="card nav-links">
      <div class="nav-group nav-left">
        <a href="#/" class="nav-logo-link" aria-label="Accueil">
          <img src="${logoUrl}" alt="Quizaro" class="nav-logo" />
        </a>
      </div>
      <span class="nav-brand">Quizaro</span>
      <div class="nav-group nav-right">
        ${isAuthenticated ? '<a href="#/profile">Profil</a><a id="logout-btn">Déconnexion</a>' : '<a href="#/login">Connexion</a><a href="#/register">Inscription</a>'}
      </div>
    </nav>
  `
}
