# Charte Graphique - Quizaro

> Document basé sur le code réel du projet (`frontend/src/style.css`, `navbar.css`, `backend/assets/styles/app.css`, polices custom).

## Identité de marque

Quizaro est une plateforme de quiz en ligne avec une identité visuelle forte, centrée sur un univers **néon-violet** et des effets **lumineux / glassmorphisme**. L'interface transmet :

- l'**énergie** : couleurs vives, animations pulsées,
- la **modernité** : glassmorphisme, gradients, polices custom,
- la **clarté** : surfaces aérées, contrastes nets.

---

## Logo et typographie de marque

### Polices du projet

Deux polices custom décorative sont intégrées directement dans le projet :

| Police | Fichier | Usage |
|---|---|---|
| **Neoneon** | `backend/assets/fonts/neoneon/Neoneon.otf` | Nom de marque dans la navbar (`.nav-brand`), titres H1 |
| **Sportrop** | `backend/assets/fonts/sportrop/Sportrop.otf` | Titres décoratifs secondaires |

Déclaration dans le code (`app.css`) :

```css
@font-face {
  font-family: 'Neoneon';
  src: url('../fonts/neoneon/Neoneon.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Sportrop';
  src: url('../fonts/sportrop/Sportrop.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

### Nom de marque dans la navbar

```css
.nav-brand {
  font-family: 'Neoneon', sans-serif;
  font-size: 2rem;
  color: #7c3aed;
  text-shadow: 0 0 5px rgba(124, 58, 237, 0.7), 0 0 14px rgba(124, 58, 237, 0.45);
}
```

### Police corps de texte

`system-ui, Avenir, Helvetica, Arial, sans-serif` — police système par défaut, sans chargement externe.

### Ressources logo

- `Quizaro_Logo.avif`
- `Quizaro_Logo2.png`

Le logo image est affiché dans la navbar via `.nav-logo` (`height: 5rem` desktop, `2rem` mobile).

---

## Palette de couleurs

Toutes les couleurs ci-dessous sont extraites directement du code source.

### Couleurs principales — Frontend Vite

| Couleur | Hex / Valeur | Usage |
|---|---|---|
| **Violet neon** | `#7c3aed` | Couleur centrale — bordures actives, focus, texte marque, accents |
| **Violet doux** | `#a78bfa` | Accents secondaires, hints |
| **Texte principal** | `#1e1040` | Tout le texte UI (sombre violet-noir) |
| **Surface** | `rgba(250, 248, 255, 0.96)` | Fond des cartes (translucide lavande) |
| **Fond début** | `#ede8ff` | Début du dégradé de fond |
| **Fond milieu** | `#f3f0ff` | Milieu du dégradé de fond |
| **Fond fin** | `#e8e2ff` | Fin du dégradé de fond |
| **Input fond** | `#ffffff` | Fond blanc des champs de saisie |

### Couleurs principales — Backend Symfony

| Couleur | Valeur | Usage |
|---|---|---|
| **Fond backend** | `radial-gradient(circle at top left, #7486ff 0%, #4a4f88 42%, #2b2e59 100%)` | Fond des vues Symfony |
| **Texte backend** | `#eef3ff` | Texte clair sur fond sombre |

### Couleurs de feedback

| Etat | Couleur |
|---|---|
| Succès (flash Symfony) | `#b6f7c1` |
| Erreur (flash Symfony) | `#ffd1d1` |

---

## Effets visuels et style graphique

### Fond de page — motif géométrique (Frontend)

Le fond n'est pas une image : il est entièrement généré en CSS pur avec un motif diagonal à losanges en violet très transparent, superposé à un dégradé lavande.

```
Taille du motif : 36 × 36 px
Couleur du motif : rgba(124, 58, 237, 0.08)
```

### Glassmorphisme (Navbar)

La navbar utilise un fond semi-transparent avec flou :

```css
background: rgba(255, 255, 255, 0.88);
backdrop-filter: blur(8px);
```

### Lueur neon (Glow effects)

Toutes les interactions clés utilisent des `box-shadow` colorés en violet :

- Hover bouton : `0 0 10px rgba(124, 58, 237, 0.2)`
- Shadow bouton : `0 4px 14px rgba(124, 58, 237, 0.18)`
- Focus input : anneau `0 0 0 3px rgba(124, 58, 237, 0.15)`
- Réponse quiz sélectionnée : `0 0 12px rgba(124, 58, 237, 0.2)`

### Animation `neonPulse`

La navbar pulse de manière continue avec un effet de lueur alternée :

```css
@keyframes neonPulse {
  0%, 100% { box-shadow: 0 0 6px rgba(124, 58, 237, 0.45), 0 0 14px rgba(124, 58, 237, 0.2); }
  50%       { box-shadow: 0 0 11px rgba(124, 58, 237, 0.6), 0 0 22px rgba(124, 58, 237, 0.26); }
}
/* 3.2s, infinite, alternate, ease-in-out */
```

---

## Typographie — règles d'usage

| Contexte | Police | Taille | Graisse | Couleur |
|---|---|---|---|---|
| Nom de marque navbar | Neoneon | `2rem` | 400 | `#7c3aed` + text-shadow |
| Titre H1 page | Neoneon | `3rem` | 400 | `#7c3aed` |
| Labels champs | system-ui | `0.95rem` | 600 | `#1e1040` |
| Texte bouton / lien | system-ui | `0.95rem` / `0.92rem` | 600 | `#1e1040` |
| Corps de texte | system-ui | base (`1rem`) | 400 | `#1e1040` |
| Texte backend Symfony | system-ui | base | 400 | `#eef3ff` |

---

## Formes et bordures

| Élément | Border-radius |
|---|---|
| Bouton / lien | `999px` (pilule complète) |
| Option de réponse quiz | `100px` |
| Carte `.card` | `16px` |
| Input | `10px` |
| Navbar desktop | `50px 0px 50px 0px` (asymétrique) |
| Navbar mobile | `0 0 20px 20px` |

Ligne de séparation (`hr`) : `2px solid rgba(124, 58, 237, 0.15)`.

---

## Comportement au survol (micro-interactions)

Tous les éléments interactifs partagent le même comportement :

```
Transition : 0.2s ease
Transform : translateY(-1px)
Fond : opacité neon augmentée
Lueur : box-shadow neon ajouté
```

---

## Layout et responsive

| Breakpoint | Comportement |
|---|---|
| Desktop | Navbar grille 3 colonnes, logo `5rem`, marque `2rem` |
| `≤ 700px` | Navbar collapsée, logo `2rem`, marque `1.4rem`, border-radius bas |
| `≤ 420px` | Logo `1.75rem`, marque `1.2rem` |

- Largeur min de l'app : `320px`
- Largeur max du conteneur `#app` : `880px`, centré
- Padding haut (#app) : `7rem` pour laisser place à la navbar fixe

---

## Règles d'usage de la marque

- Utiliser uniquement `Neoneon` pour le nom "Quizaro" affiché en UI.
- Ne jamais déformer le logo image (respecter le ratio).
- Ne pas utiliser le violet neon (`#7c3aed`) sur un fond sombre sans vérifier le contraste.
- Conserver la lueur (`text-shadow`) sur le nom de marque dans la navbar.
- Ne pas substituer le fond motif lavande par un fond uni sans raison de lisibilité.

## Version

- Version : 1.2 (basee sur le code reel)
- Date : 01/05/2026
- Projet : Quizaro
