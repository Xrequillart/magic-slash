# Magic Slash Desktop

Application Electron qui remplace la web-ui et ajoute des terminaux Claude Code intégrés.

## Fonctionnalités

### Configuration (portée de web-ui)
- Gestion des repositories (ajout, édition, suppression)
- Keywords par repo pour la détection automatique
- Langues par feature (commit, PR, jiraComment, discussion)
- Format de commit (conventional, angular, gitmoji)
- Options PR (auto-link tickets, comment on PR)
- Edition des templates PR

### Terminaux Claude Code (NOUVEAU)
- Lancer plusieurs instances Claude Code dans des tabs
- Chaque terminal = un PTY avec `claude` CLI
- Visualisation de l'état de chaque terminal :
  - Idle (gris)
  - Working (bleu, clignotant)
  - Waiting (jaune) - Claude attend une réponse
  - Completed (vert)
  - Error (rouge)
- Notification macOS quand un terminal passe en "waiting"

## Stack technique

- **Framework**: Electron 28+
- **UI**: React 18 + Tailwind CSS
- **Terminal**: @xterm/xterm + node-pty
- **State**: Zustand
- **Build**: Vite + vite-plugin-electron + electron-builder

## Développement

```bash
# Installation des dépendances
npm install

# Mode développement
npm run dev

# Build
npm run build

# Package (crée .dmg pour macOS)
npm run package:mac
```

## Structure

```
desktop/
├── src/
│   ├── main/              # Electron main process
│   │   ├── config/        # Service de configuration
│   │   ├── pty/           # Gestion des terminaux
│   │   └── ipc/           # Handlers IPC
│   │
│   ├── preload/           # Bridge sécurisé
│   │
│   └── renderer/          # React UI
│       ├── pages/
│       │   ├── Config/    # Pages de configuration
│       │   └── Terminals/ # Terminaux Claude Code
│       ├── components/
│       ├── hooks/
│       └── store/
│
├── resources/             # Assets (icons, etc.)
└── release/               # Build output
```
