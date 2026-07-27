import type { en } from './en'

/**
 * French catalogue. The `Record<keyof typeof en, string>` alias is the whole
 * point of this file's shape: forget a key and `tsc` fails, so a release can
 * never ship a half-translated interface.
 *
 * Electron `role:` menu items are absent on purpose — the OS localizes those
 * itself, and overriding them would give a French app English-looking system
 * entries (or the reverse).
 */
export const fr: Record<keyof typeof en, string> = {
  // ── Menu de l'application ────────────────────────────────────────────────
  'menu.file': 'Fichier',
  'menu.edit': 'Édition',
  'menu.view': 'Affichage',
  'menu.window': 'Fenêtre',
  'menu.actualSize': 'Taille réelle',
  'menu.zoomIn': 'Agrandir',
  'menu.zoomOut': 'Réduire',

  // ── Menu de la barre de menus ────────────────────────────────────────────
  'tray.version': 'Magic Slash v{version}',
  'tray.noAgents': 'Aucun agent actif',
  'tray.showWindow': 'Afficher la fenêtre',
  'tray.settings': 'Réglages',
  'tray.changelog': 'Nouveautés',
  'tray.documentation': 'Documentation',
  'tray.github': 'GitHub',
  'tray.quit': 'Quitter Magic Slash',
  'tray.update.checking': 'Recherche de mises à jour…',
  'tray.update.downloadingVersion': 'Téléchargement de la v{version}…',
  'tray.update.downloadingProgress': 'Téléchargement de la mise à jour… {percent} %',
  'tray.update.restart': '↻ Redémarrer pour mettre à jour (v{version})',
  'tray.update.checkFailed': 'Rechercher les mises à jour (dernier essai échoué)',
  'tray.update.check': 'Rechercher les mises à jour',

  // ── Notifications système ────────────────────────────────────────────────
  'notification.waiting.title': 'Claude Code a besoin de vous',
  'notification.waiting.body': 'L’agent « {name} » attend votre réponse',
  'notification.completed.title': 'Tâche terminée',
  'notification.completed.body': 'L’agent « {name} » a terminé',
  'notification.prReview.title': 'Mise à jour de revue de PR',
  'notification.prReview.body': '{url} : {status}',
  'notification.pickup.title': 'Un collègue a pris {ticket}',
  'notification.pickup.body': 'Un collègue travaille maintenant sur {ticket} — vous avez aussi un agent dessus.',
  'notification.changesRequested.title': 'Modifications demandées sur votre PR',
  'notification.changesRequested.body': '{subject} : un relecteur demande des modifications.',

  // ── Résumé quotidien de l'équipe ─────────────────────────────────────────
  'digest.title': 'Votre équipe hier',
  'digest.sentence': 'Hier, votre équipe {parts}.',
  'digest.prs.one': 'a livré 1 PR',
  'digest.prs.other': 'a livré {count} PR',
  'digest.tickets.one': 'a passé 1 ticket en Terminé',
  'digest.tickets.other': 'a passé {count} tickets en Terminé',
  'digest.sessions.one': 'a lancé 1 session',
  'digest.sessions.other': 'a lancé {count} sessions',
  'digest.list.separator': ', ',
  'digest.list.last': ' et ',

  // ── Boîtes de dialogue natives ───────────────────────────────────────────
  'dialog.selectRepository': 'Choisir un dossier de dépôt',
  'dialog.selectSkillFolder': 'Choisir un dossier de skill',
  'dialog.selectImage': 'Choisir une image',
  'dialog.filter.zip': 'Archive ZIP',
  'dialog.filter.images': 'Images',

  // ── Réglages → Langue et région ──────────────────────────────────────────
  'settings.tab.account': 'Compte',
  'settings.tab.organization': 'Organisation',
  'settings.tab.repositories': 'Dépôts',
  'settings.tab.claudeCode': 'Claude Code',
  'settings.tab.appearance': 'Apparence',
  'settings.tab.language': 'Langue et région',
  'settings.tab.features': 'Fonctionnalités',
  'settings.tab.shortcuts': 'Raccourcis',
  'settings.tab.about': 'À propos',
  'settings.language.section': 'Langue et région',
  'settings.language.label': 'Langue de l’interface',
  'settings.language.help':
    'La langue de l’application elle-même — menus, réglages, notifications, et la façon d’écrire les dates et les nombres.',
  'settings.language.distinction':
    'Ce n’est pas la langue dans laquelle Claude écrit : les messages de commit, les pull requests et les commentaires Jira suivent les réglages de chaque dépôt, et les langues de votre profil décident de la façon dont Claude vous parle.',
  'settings.language.followsAccount':
    'La langue suit votre compte — elle s’applique sur toutes les machines où vous vous connectez.',
  'settings.language.error': 'Impossible de changer la langue',

  // ── Barre de titre (chrome du terminal) ──────────────────────────────────
  'titlebar.normalView': 'Normal',
  'titlebar.splitView': 'Vue divisée',

  // ── Historique ───────────────────────────────────────────────────────────
  'history.today': 'Aujourd’hui — {date}',
  'history.yesterday': 'Hier — {date}',
}
