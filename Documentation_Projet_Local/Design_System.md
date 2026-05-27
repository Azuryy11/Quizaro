# Design System - Quizaro

> Document basé sur le code réel du projet (`frontend/src/style.css`, `navbar.css`, `backend/assets/styles/app.css`).

Derniere mise a jour: 01/05/2026

## Principes de conception

- **Identité néon-violet** : le violet est la couleur centrale de l'interface, il structure tous les effets visuels.
- **Glassmorphisme** : les surfaces sont translucides avec flou d'arrière-plan (`backdrop-filter: blur`).
- **Forme pilule** : les boutons et options de réponse sont en `border-radius: 999px`.
- **Légèreté et animation** : effets de lueur neon pulsée, transitions fluides, transforms au survol.

---

## Design Tokens

### Couleurs — extrait direct de `style.css`

Ces variables sont définies dans le `:root` du frontend Vite.

| Token | Valeur | Rôle |
|---|---|---|
| `--neon` | `#7c3aed` | Violet principal (boutons, focus, bordures actives) |
| `--neon-soft` | `#a78bfa` | Violet clair (hints, accents secondaires) |
| `--neon-rgb` | `124, 58, 237` | Valeur RGB pour les `rgba()` dynamiques |
| `--bg-start` | `#ede8ff` | Début du dégradé fond |
| `--bg-mid` | `#f3f0ff` | Milieu du dégradé fond |
| `--bg-end` | `#e8e2ff` | Fin du dégradé fond |
| `--surface` | `rgba(250, 248, 255, 0.96)` | Fond des cartes et surfaces |
| `--surface-border` | `rgba(124, 58, 237, 0.15)` | Bordure des cartes |
| `--field-border` | `rgba(124, 58, 237, 0.25)` | Bordure des champs et boutons |
| `--focus-ring` | `rgba(124, 58, 237, 0.15)` | Anneau de focus clavier |
| `--button-bg` | `rgba(124, 58, 237, 0.07)` | Fond bouton au repos |
| `--button-bg-hover` | `rgba(124, 58, 237, 0.14)` | Fond bouton au survol |
| `--button-shadow` | `0 4px 14px rgba(124, 58, 237, 0.18)` | Ombre bouton |

Couleurs fixes utilisées dans le CSS :

- Texte principal : `#1e1040` (violet très sombre)
- Fond input : `#ffffff`
- Fond page (backend Symfony) : `radial-gradient(circle at top left, #7486ff 0%, #4a4f88 42%, #2b2e59 100%)`
- Texte backend Symfony : `#eef3ff`
- Flash success : `#b6f7c1` / Flash error : `#ffd1d1`

### Typographie

**Polices utilisées dans le projet :**

| Police | Type | Usage |
|---|---|---|
| `Neoneon` | Custom `.otf` | Nom de marque (navbar `.nav-brand`, H1) |
| `Sportrop` | Custom `.otf` | Titre décoratif (disponible dans le projet) |
| `system-ui, Avenir, Helvetica, Arial, sans-serif` | Système | Corps du texte (frontend Vite) |

Fichiers déclarés dans `backend/assets/styles/app.css` via `@font-face`.

**Échelle typographique implicite dans le CSS :**

| Élément | Taille | Graisse |
|---|---|---|
| `h1` | `3rem` | `700` (font Neoneon) |
| `.nav-brand` | `2rem` | Neoneon |
| `.nav-brand` mobile | `1.4rem` | Neoneon |
| Label de champ | `0.95rem` | `600` |
| Bouton | `0.95rem` | `600` |
| Lien navbar | `0.92rem` | `600` |
| Texte cellule table admin | `0.9rem` | — |
| Line-height général | `1.5` | — |

### Espacements

Base : pas de système de token centralisé actuellement, espacements en `rem` inline.

Valeurs courantes relevées :

- Gap carte : `1.25rem` padding
- Gap nav : `0.9rem`
- Gap éléments de formulaire : `0.75rem`
- Margin carte : `1rem`
- Margin séparateur `hr` : `2rem 0 1rem`
- Padding #app : `7rem 1.25rem 2rem` (haut padding pour la navbar fixe)
- Largeur max #app : `880px`

### Rayons de bordure

| Usage | Valeur |
|---|---|
| Carte `.card` | `16px` |
| Bouton / lien | `999px` (pilule) |
| Input | `10px` |
| Option de réponse `.answer-option__text` | `100px` |
| Navbar desktop | `50px 0px 50px 0px` |
| Navbar mobile | `0 0 20px 20px` |

### Ombres et effets lumineux

```css
/* Ombre de carte */
box-shadow: 0 4px 24px rgba(124, 58, 237, 0.07), 0 1px 3px rgba(0,0,0,0.05);

/* Lueur survol bouton */
box-shadow: 0 0 10px rgba(124, 58, 237, 0.2);

/* Lueur navbar neonPulse (animation) */
box-shadow: 0 0 6px rgba(124, 58, 237, 0.45), 0 0 14px rgba(124, 58, 237, 0.2);  /* état bas */
box-shadow: 0 0 11px rgba(124, 58, 237, 0.6), 0 0 22px rgba(124, 58, 237, 0.26); /* état haut */

/* Logo texte navbar */
text-shadow: 0 0 5px rgba(124, 58, 237, 0.7), 0 0 14px rgba(124, 58, 237, 0.45);

/* Focus input */
box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
```

---

## Composants UI

### Salle d'attente (lobby)

- Conteneur principal: `.waiting-lobby`
- Bloc compteur joueurs: `.lobby-player-count`
- Liste des pseudos connectes: `.lobby-players`, `.lobby-players-list`, `.lobby-player-item`, `.lobby-player-name`
- Etat vide: `.lobby-players-empty`
- QR code session: `.lobby-qr`

Le lobby met a jour dynamiquement le compteur et la liste des pseudos via polling API.

### Fond de page

**Frontend Vite** — motif géométrique généré en CSS pur :

```css
background:
  linear-gradient(135deg, rgba(124, 58, 237, 0.08) 25%, transparent 25%) -18px 0,
  linear-gradient(225deg, rgba(124, 58, 237, 0.08) 25%, transparent 25%) -18px 0,
  linear-gradient(315deg, rgba(124, 58, 237, 0.08) 25%, transparent 25%),
  linear-gradient(45deg,  rgba(124, 58, 237, 0.08) 25%, transparent 25%),
  linear-gradient(150deg, #ede8ff 0%, #f3f0ff 50%, #e8e2ff 100%);
background-size: 36px 36px, 36px 36px, 36px 36px, 36px 36px, 100% 100%;
```

**Backend Symfony** — dégradé radial sombre :

```css
background: radial-gradient(circle at top left, #7486ff 0%, #4a4f88 42%, #2b2e59 100%);
```

### Navbar (`.nav-links`)

- Position : `fixed`, top 0, plein largeur avec `margin: 10px`.
- Grille 3 colonnes : `1fr auto 1fr` (gauche / centre / droite).
- Glassmorphisme : `background: rgba(255,255,255,0.88)` + `backdrop-filter: blur(8px)`.
- Animation pulsée neon : `neonPulse 3.2s infinite alternate ease-in-out`.
- Logo texte centré en police `Neoneon`, couleur `var(--neon)`.
- Mobile (`<700px`) : grille collapsée, border-radius `0 0 20px 20px`.

### Cartes (`.card`)

- Padding `1.25rem`, margin-bottom `1rem`.
- `border-radius: 16px`.
- Fond `var(--surface)` = `rgba(250, 248, 255, 0.96)`.
- Bordure `1px solid var(--surface-border)`.
- Ombre subtile neon.
- Variante `.card--spaced` : `margin-top: 1rem`.

### Boutons et liens

- `border-radius: 999px` (pilule).
- Bordure `1px solid var(--field-border)`.
- Fond `var(--button-bg)`, texte `#1e1040`.
- Hover : fond plus opaque + lueur neon + `translateY(-1px)`.
- Padding : `0.62rem 1rem`, font `0.95rem`, graisse `600`.

### Champs de saisie (`input`, `select`, `textarea`)

- `border-radius: 10px`.
- Fond `#ffffff`, couleur `#1e1040`.
- Bordure `var(--field-border)`.
- Focus : bordure `var(--neon)` + anneau `var(--focus-ring)`.
- Labels au-dessus en `0.95rem` / `600`.

### Champ mot de passe (`.password-field`)

- Input avec padding-right pour icône toggle.
- Bouton `.password-icon` positionné en absolu, transparent, violet.
- Toggle icône `icon-eye` / `icon-eye-off` via classe `.is-visible`.

### Options de réponse quiz (`.answer-option`)

- Disposition flex, wrapping, `flex: 1 1 160px`.
- Input radio caché (`opacity: 0`, `pointer-events: none`).
- Label `.answer-option__text` : pilule blanche, `font-weight: 700`, `min-height: 40px`.
- Sélectionné : `background: rgba(124, 58, 237, 0.28)`, bordure neon + lueur.
- Hover : fond + ombre neon + `translateY(-1px)`.

### Tableaux

**`.admin-users-table`** — tableau gestion utilisateurs :
- Largeur 100%, séparateur ligne en neon 20% opacité.
- En-têtes en `0.9rem`.

**`.results-table`** — tableau de résultats :
- Largeur `min(100%, 760px)`, centré.
- `border-collapse: separate`, colonnes séparées par `2px solid rgba(neon, 0.25)`.

### Séparateur (`hr`)

- `border-top: 2px solid var(--surface-border)`.
- Margin `2rem 0 1rem`.

---

## Etats d'interface

| Etat | Comportement dans le projet |
|---|---|
| Message feedback | `<p aria-live="polite">` texte mis à jour dynamiquement en JS |
| Flash Symfony | Div coloré en vert (`#b6f7c1`) ou rouge (`#ffd1d1`) |
| Bouton désactivé | `disabled` posé en JS pendant requête async |
| Champ password | Toggle visibilité via `.is-visible` sur `.password-icon` |
| Réponse sélectionnée | Classe `input:checked` déclenche style neon sur le label |
| Elément masqué | `.is-hidden` = `display: none !important` |

---

## Responsive

| Breakpoint | Règle |
|---|---|
| `≤ 700px` | Navbar : grille collapsée, border-radius inférieur, tailles réduites |
| `≤ 420px` | Navbar : logo et marque encore plus petits |
| Général | `min-width: 320px` sur body, `max-width: 880px` sur `#app` |

---

## Animations

### `neonPulse` (navbar)

```css
@keyframes neonPulse {
  0%, 100% {
    box-shadow: 0 0 6px rgba(124, 58, 237, 0.45), 0 0 14px rgba(124, 58, 237, 0.2);
  }
  50% {
    box-shadow: 0 0 11px rgba(124, 58, 237, 0.6), 0 0 22px rgba(124, 58, 237, 0.26);
  }
}
/* Durée: 3.2s, infinite, alternate, ease-in-out */
```

### Transitions génériques

- Boutons, liens, options : `transition: 0.2s ease`.
- Transform hover : `translateY(-1px)`.

---

## Variables CSS (bloc `:root` complet du frontend)

```css
:root {
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color: #1e1040;
  background-color: #f3f0ff;

  --bg-start: #ede8ff;
  --bg-mid:   #f3f0ff;
  --bg-end:   #e8e2ff;
  --neon: #7c3aed;
  --neon-soft: #a78bfa;
  --neon-rgb: 124, 58, 237;
  --surface: rgba(250, 248, 255, 0.96);
  --surface-border: rgba(124, 58, 237, 0.15);
  --field-border: rgba(124, 58, 237, 0.25);
  --focus-ring: rgba(124, 58, 237, 0.15);
  --button-bg: rgba(124, 58, 237, 0.07);
  --button-bg-hover: rgba(124, 58, 237, 0.14);
  --button-shadow: 0 4px 14px rgba(124, 58, 237, 0.18);
}
```

---

## Architecture des fichiers de style

```
frontend/src/
├── style.css              # Tokens globaux, composants UI, layout
├── components/
│   ├── navbar.css         # Navbar fixe + animation neonPulse
│   └── navbar.ts          # Logique montage navbar

backend/assets/styles/
└── app.css                # Styles côté Symfony (backend, @font-face)

backend/assets/fonts/
├── neoneon/Neoneon.otf    # Police de marque
└── sportrop/Sportrop.otf  # Police décorative secondaire
```

---

## Gouvernance

- Ne pas introduire de nouvelles couleurs hors palette neon-violet sans mise à jour de ce fichier.
- Tout nouveau composant doit utiliser `var(--neon)`, `var(--surface)`, `var(--field-border)` pour rester cohérent.
- Les tokens `--neon-rgb` permettent de composer des `rgba()` à n'importe quelle opacité sans duplication de valeur.
