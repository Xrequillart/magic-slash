import type { en } from './en'

/**
 * French catalogue. Typed against `en`, so a key added there and forgotten here is a
 * tsc error rather than a hole on screen.
 *
 * Wording is taken from `desktop/src/i18n/fr.ts` wherever the two surfaces say the
 * same thing — the settings, organization and profile copy the webapp mirrors from
 * the desktop app is translated once, not twice.
 *
 * Vouvoiement throughout, which is what the desktop's settings and account copy uses.
 */
export const fr: Record<keyof typeof en, string> = {
  // ── Commun ─────────────────────────────────────────────────────────────────
  'common.loading': 'Chargement…',
  'common.cancel': 'Annuler',
  'common.save': 'Enregistrer',
  'common.saving': 'Enregistrement…',
  'common.create': 'Créer',
  'common.creating': 'Création…',
  'common.copy': 'Copier',
  'common.copied': 'Copié',
  'common.close': 'Fermer',
  'common.download': 'Télécharger',
  'common.add': 'Ajouter',
  'common.next': 'Suivant',
  'common.back': 'Retour',
  'common.finish': 'Terminer',
  'common.deleting': 'Suppression…',
  'common.select': 'Sélectionner…',
  'common.saveFailed': 'Échec de l’enregistrement.',
  'common.remove': 'Retirer {item}',
  'common.notSignedIn': 'Vous n’êtes pas connecté.',

  // ── Sélecteur de langue ────────────────────────────────────────────────────
  'language.label': 'Langue de l’interface',
  'language.hint': 'S’applique à ce site, dans ce navigateur.',

  // ── Navigation ─────────────────────────────────────────────────────────────
  'nav.application': 'Application',
  'nav.organization': 'Organisation',
  'nav.account': 'Compte',
  'nav.admin': 'Admin',
  'nav.signOut': 'Se déconnecter',

  // ── Connexion ──────────────────────────────────────────────────────────────
  'login.title': 'Content de vous revoir',
  'login.subtitle': 'Connectez-vous à votre compte Magic Slash.',
  'login.email': 'E-mail',
  'login.emailPlaceholder': 'vous@entreprise.com',
  'login.password': 'Mot de passe',
  'login.submit': 'Se connecter',
  'login.submitting': 'Connexion…',
  'login.failed': 'E-mail ou mot de passe incorrect.',
  'login.invited':
    'Invité dans une équipe ? Ouvrez votre lien d’invitation pour créer votre compte.',

  // ── Invitation ─────────────────────────────────────────────────────────────
  'invite.asideTitle': 'Votre équipe vous attend.',
  'invite.asideBody':
    'Rejoignez votre organisation sur Magic Slash et livrez avec vos agents de dev IA.',
  'invite.loading': 'Chargement de votre invitation…',
  'invite.notFound.title': 'Invitation introuvable',
  'invite.notFound.body':
    'Ce lien d’invitation n’est pas valide. Demandez à un admin de vous en envoyer un nouveau.',
  'invite.unavailable.title': 'Invitation indisponible',
  'invite.unavailable.accepted':
    'Cette invitation a déjà été acceptée. Téléchargez simplement l’application et connectez-vous.',
  'invite.unavailable.revoked':
    'Cette invitation a été révoquée. Demandez à un admin de vous en envoyer une nouvelle.',
  'invite.unavailable.expired':
    'Cette invitation a expiré. Demandez à un admin de vous en envoyer une nouvelle.',
  'invite.unavailable.fallback': 'Cette invitation ne peut plus être utilisée.',
  'invite.downloadApp': 'Télécharger l’application',
  'invite.badge.admin': 'Invitation admin',
  'invite.badge.team': 'Invitation équipe',
  'invite.joinLead': 'Rejoignez',
  'invite.subtitle': 'Créez votre compte Magic Slash pour accepter cette invitation.',
  'invite.email': 'E-mail',
  'invite.password': 'Mot de passe',
  'invite.passwordPlaceholder': 'Au moins 8 caractères',
  'invite.submit': 'Accepter et rejoindre {org}',
  'invite.submitting': 'En cours…',
  'invite.error.exists':
    'Un compte existe déjà pour cet e-mail. Vérifiez votre mot de passe et réessayez.',
  'invite.error.confirmEmail':
    'Consultez votre boîte mail pour confirmer votre e-mail, puis rouvrez ce lien pour terminer.',
  'invite.error.generic': 'Une erreur est survenue. Merci de réessayer.',

  // ── Tableau de bord ────────────────────────────────────────────────────────
  'dashboard.greeting': 'Salut {name}.',
  'dashboard.greetingFallback': 'à vous',

  // ── Prise en main ──────────────────────────────────────────────────────────
  'onboarding.title': 'Bien démarrer',
  'onboarding.org.title': 'Rejoindre une organisation',
  'onboarding.org.hintPending':
    'Créez la vôtre, ou ouvrez le lien d’invitation envoyé par un collègue',
  'onboarding.org.hintCount': '{count} organisations',
  'onboarding.org.expand':
    'Créez une organisation — ou ouvrez simplement le lien d’invitation envoyé par un collègue.',
  'onboarding.org.namePlaceholder': 'Nom de l’organisation',
  'onboarding.org.failed': 'Impossible de créer l’organisation.',
  'onboarding.profile.title': 'Compléter votre profil',
  'onboarding.profile.hintDone': 'Claude adapte son ton et son niveau de détail à vous',
  'onboarding.profile.hintPending':
    'Quelques questions pour que Claude s’adapte à votre façon de travailler',
  'onboarding.install.title': 'Installer l’application desktop',
  'onboarding.install.hintDone': 'Active sur {devices}',
  'onboarding.install.device.one': '1 appareil',
  'onboarding.install.device.many': '{count} appareils',
  'onboarding.install.hintPending':
    'Magic Slash tourne sur votre machine — téléchargez-le et connectez-vous',
  'onboarding.install.downloadHint':
    'Glissez-le dans Applications et ouvrez-le. Il installe les skills et configure Claude Code au premier lancement.',
  'onboarding.repoPath.title': 'Relier un dépôt à son dossier',
  'onboarding.repoPath.hintDone.one': '1 dépôt relié à un dossier local',
  'onboarding.repoPath.hintDone.many': '{count} dépôts reliés à un dossier local',
  'onboarding.repoPath.hintPending':
    'Un agent travaille dans votre clone — sans son chemin, /magic:start n’a nulle part où tourner',
  'onboarding.repoPath.step.1': 'Ouvrez Magic Slash sur votre machine',
  'onboarding.repoPath.step.2': 'Allez dans l’onglet Dépôts',
  'onboarding.repoPath.step.3': 'Choisissez un dépôt — ou ajoutez-en un, si la liste est vide',
  'onboarding.repoPath.step.4': 'Indiquez le dossier dans lequel vous l’avez cloné',
  'onboarding.repoPath.note':
    'Cela se passe dans l’application plutôt qu’ici parce que choisir un dossier suppose de parcourir votre disque. Et l’endroit où chacun a cloné un dépôt ne regarde que lui : un dépôt partagé avec votre organisation attend donc quand même votre dossier.',

  // ── Dépôts de l’équipe ─────────────────────────────────────────────────────
  'team.repositories': 'Dépôts',
  'team.personal': 'Personnel',
  'team.agents.none': 'aucun agent',
  'team.agents.one': '1 agent',
  'team.agents.many': '{count} agents',
  'team.onPr': '{count} sur une PR',
  'team.unassigned': 'Non attribué',
  'team.openPr': 'Ouvrir la pull request',
  'team.viewPr': 'Voir la PR',
  'team.emptyScope': 'Aucun dépôt ici pour l’instant.',
  'team.empty': 'Aucun dépôt partagé avec votre équipe pour l’instant.',
  'team.emptyHint':
    'Les dépôts partagés à une organisation depuis l’application desktop apparaissent ici, avec tous ceux qui y travaillent.',
  'team.status.inProgress': 'en cours',
  'team.status.committed': 'committé',
  'team.status.readyForPR': 'prêt pour la PR',
  'team.status.prCreated': 'PR créée',
  'team.status.ciGreen': 'CI verte',
  'team.status.inReview': 'en revue',
  'team.status.changesRequested': 'modifications demandées',
  'team.status.reviewAddressed': 'revue traitée',
  'team.status.prMerged': 'PR mergée',
  'team.unmatched.one': '1 agent sur un dépôt que cette vue ne peut pas rattacher',
  'team.unmatched.many': '{count} agents sur des dépôts que cette vue ne peut pas rattacher',

  // ── Statistiques des skills ────────────────────────────────────────────────
  'skills.title': 'Skills exécutés',
  'skills.titlePersonal': 'Vos skills exécutés',
  'skills.runs.one': '1 exécution',
  'skills.runs.many': '{count} exécutions',
  'skills.empty':
    'Aucune exécution enregistrée pour cette organisation. Les exécutions sont rattachées via les dépôts de l’agent qui les lance : le travail sur un dépôt personnel n’est donc pas compté ici.',
  'skills.emptyPersonal':
    'Aucune exécution enregistrée hors organisation. Une exécution arrive ici uniquement si l’agent qui l’a lancée travaille sur des dépôts personnels seulement — une exécution lancée depuis un terminal que l’application desktop n’a pas ouvert est rattachée à votre organisation.',

  // ── Heures passées sur les skills ──────────────────────────────────────────
  'skillHours.hours': '{count}h',
  'skillHours.minutes': '{count} min',
  'skillHours.label.total': 'Temps total',
  'skillHours.label.week': 'Temps passé cette semaine',
  'skillHours.label.last': 'Dernière utilisation',
  'skillHours.since': 'depuis le {date}',
  'skillHours.sinceMonday': 'depuis lundi',
  'skillHours.byAgent': 'sur {name}',
  'skillHours.hint':
    'Seules les exécutions qui ont signalé leur fin sont comptées : une exécution interrompue n’ajoute rien et une exécution compte au maximum quatre heures — le vrai total est donc plus élevé.',

  // ── Heures de skills · enregistrement coupé ────────────────────────────────
  'skillHours.optIn.title': 'Vos heures, une fois le suivi activé',
  'skillHours.optIn.body':
    'L’enregistrement de l’activité est coupé : aucune exécution de skill n’est enregistrée, il n’y a donc rien à compter ici. Activez-le et le total repart à votre prochaine exécution — celles faites entre-temps ne sont pas rattrapées.',
  'skillHours.optIn.cta': 'Activer le suivi',
  'skillHours.optIn.saving': 'Activation…',
  'skillHours.optIn.savedTitle': 'C’est activé.',
  'skillHours.optIn.savedBody':
    'Vos heures apparaîtront ici après votre prochaine exécution de skill. L’app desktop suit ce réglage en direct, il n’y a rien à redémarrer.',
  'skillHours.optIn.note':
    'Il s’agit du réglage « Partager mon activité avec mon équipe ». Le détail de ce qui est enregistré est dans Application → Fonctionnalités, où vous pouvez le désactiver à nouveau quand vous le souhaitez.',

  // ── Compte ─────────────────────────────────────────────────────────────────
  'account.title': 'Compte',

  // ── Compte cloud ───────────────────────────────────────────────────────────
  'cloud.title': 'Compte cloud',
  'cloud.signedIn': 'Connecté au cloud Magic Slash',
  'cloud.signOut': 'Se déconnecter',
  'cloud.changePassword': 'Changer de mot de passe',
  'cloud.changeEmail': 'Changer d’e-mail',
  'cloud.deleteAccount': 'Supprimer mon compte',
  'cloud.password.newPlaceholder': 'Nouveau mot de passe',
  'cloud.password.confirmPlaceholder': 'Confirmer le nouveau mot de passe',
  'cloud.password.submit': 'Mettre à jour le mot de passe',
  'cloud.password.tooShort': 'Utilisez au moins 8 caractères.',
  'cloud.password.mismatch': 'Les mots de passe ne correspondent pas.',
  'cloud.password.failed': 'Impossible de mettre à jour le mot de passe.',
  'cloud.email.requestHint':
    'Nous enverrons un code de confirmation à 6 chiffres à votre nouvelle adresse.',
  'cloud.email.newPlaceholder': 'Nouvel e-mail',
  'cloud.email.confirmBefore': 'Relevez le code de confirmation envoyé à',
  'cloud.email.confirmAfter': ', puis saisissez-le ci-dessous.',
  'cloud.email.codePlaceholder': 'Code à 6 chiffres',
  'cloud.email.sendCode': 'Envoyer le code',
  'cloud.email.confirmChange': 'Confirmer le changement',
  'cloud.email.working': 'En cours…',
  'cloud.email.codeSent': 'Code envoyé. Consultez votre nouvelle boîte mail.',
  'cloud.email.failed': 'Impossible de changer l’e-mail.',
  'cloud.email.noSession':
    'Le changement d’e-mail n’a pas renvoyé de session — reconnectez-vous.',
  'cloud.delete.submit': 'Supprimer définitivement',
  'cloud.delete.warning':
    'Cette action supprime définitivement votre compte et vos données personnelles.',
  'cloud.delete.body':
    'Les organisations que vous avez créées seront supprimées avec leurs données. L’opération est irréversible. Magic Slash continue de fonctionner en local sans compte.',
  'cloud.delete.failed': 'Impossible de supprimer le compte.',

  // ── Profil ─────────────────────────────────────────────────────────────────
  'profile.title': 'Profil',
  'profile.clickToEdit': 'Cliquer pour modifier',
  'profile.editAria': 'Modifier votre profil',
  'profile.fillAria': 'Compléter votre profil',
  'profile.fillTitle': 'Compléter votre profil',
  'profile.fillHint':
    'Quelques questions pour que Claude adapte son ton et son niveau de détail à votre façon de travailler.',
  'profile.role.product': 'Produit',
  'profile.role.dev': 'Dev',
  'profile.role.design': 'Design',
  'profile.role.qa': 'QA',
  'profile.role.ops': 'Ops',
  'profile.role.manager': 'Manager',
  'profile.role.other': 'Autre',
  'profile.level.beginner': 'Débutant',
  'profile.level.intermediate': 'Intermédiaire',
  'profile.level.expert': 'Expert',
  'profile.style.simple': 'Simple',
  'profile.style.technical': 'Technique',
  'profile.style.detailed': 'Détaillé',
  'profile.wizard.titleEdit': 'Modifier votre profil',
  'profile.wizard.titleWelcome': 'Bienvenue dans Magic Slash',
  'profile.wizard.nameQuestion': 'Quel est votre prénom ?',
  'profile.wizard.nameHint': 'Claude s’en servira pour personnaliser ses réponses.',
  'profile.wizard.namePlaceholder': 'Votre prénom',
  'profile.wizard.roleQuestion': 'Quel est votre rôle ?',
  'profile.wizard.roleHint': 'Aide Claude à ajuster son niveau de détail.',
  'profile.wizard.levelQuestion': 'Niveau technique',
  'profile.wizard.levelHint':
    'Claude adapte son vocabulaire et ses explications en conséquence.',
  'profile.wizard.level.beginner.hint':
    'Nouveau dans le développement ou les concepts techniques',
  'profile.wizard.level.intermediate.hint': 'À l’aise avec le code et l’outillage',
  'profile.wizard.level.expert.hint':
    'Solide expérience et connaissances techniques approfondies',
  'profile.wizard.styleQuestion': 'Style de communication',
  'profile.wizard.styleHint': 'Facultatif — comment Claude doit-il s’adresser à vous ?',
  'profile.wizard.style.simple.hint': 'Réponses concises, peu de jargon',
  'profile.wizard.style.technical.hint': 'Centré sur le code, terminologie précise',
  'profile.wizard.style.detailed.hint': 'Explications complètes, avec le contexte',
  'profile.wizard.languagesQuestion': 'Langues préférées',
  'profile.wizard.languagesHint': 'Facultatif — Claude s’exprimera dans ces langues.',
  'profile.wizard.freeTextQuestion': 'Autre chose ?',
  'profile.wizard.freeTextHint':
    'Facultatif — tout ce que Claude devrait savoir d’autre sur vous.',
  'profile.wizard.freeTextPlaceholder':
    'ex. : je préfère les réponses courtes, je travaille sur des apps mobiles…',
  'profile.wizard.failed': 'Impossible d’enregistrer le profil.',

  // ── Appareils ──────────────────────────────────────────────────────────────
  'devices.title': 'Appareils',
  'devices.empty':
    'Aucun appareil pour l’instant. Installez l’application et connectez-vous pour le voir ici.',
  'devices.unknown': 'Appareil inconnu',
  'devices.lastSeen': 'vu {when}',

  // ── État de l’application desktop ──────────────────────────────────────────
  'appStatus.title': 'Application desktop',
  'appStatus.notInUse': 'Pas encore utilisée',
  'appStatus.notInUseHint':
    'Installez l’application desktop et connectez-vous — elle apparaîtra ici à son premier lancement.',
  'appStatus.inUse': 'Active',
  'appStatus.updateAvailable': 'v{version} disponible',
  'appStatus.lastActive': 'actif {when}',

  // ── Temps relatif ──────────────────────────────────────────────────────────
  'time.unknown': 'inconnu',
  'time.justNow': 'à l’instant',
  'time.minutes.one': 'il y a 1 minute',
  'time.minutes.many': 'il y a {count} minutes',
  'time.hours.one': 'il y a 1 heure',
  'time.hours.many': 'il y a {count} heures',
  'time.days.one': 'il y a 1 jour',
  'time.days.many': 'il y a {count} jours',

  // ── Page Application ───────────────────────────────────────────────────────
  'application.title': 'Application',
  'application.footnote':
    'Ces réglages appartiennent à l’application desktop et suivent votre compte sur toutes les machines où vous vous connectez. Une application déjà lancée les applique immédiatement.',
  'settings.saveFailed':
    'Vos réglages n’ont pas pu être enregistrés — reconnectez-vous puis réessayez.',

  // ── Réglages · Apparence ───────────────────────────────────────────────────
  'settings.appearance': 'Apparence',
  'settings.appearance.note':
    'Le thème habille l’application Magic Slash, pas ce site. Il suit votre compte — il s’applique sur toutes les machines où vous vous connectez. L’échelle de l’interface reste propre à chaque machine, puisqu’elle compense cet écran-là.',
  'settings.appearance.claudeTheme.label': 'Accorder Claude Code au thème',
  'settings.appearance.claudeTheme.help':
    'Claude Code adopte les couleurs du thème choisi dans les terminaux de l’app. Les sessions déjà ouvertes se repeignent aussi. Votre Claude Code lancé depuis un vrai terminal n’est pas touché.',
  'settings.sidebars.section': 'Barres latérales',
  'settings.sidebars.agentContext.label': 'Contexte de l’agent',
  'settings.sidebars.agentContext.help':
    'La jauge de contexte de l’agent sélectionné, son modèle, son coût et sa durée, en haut de la barre latérale droite.',
  'settings.sidebars.format.label': 'Format',
  'settings.sidebars.format.full': 'Complet',
  'settings.sidebars.format.minimized': 'Réduit',
  'theme.dark': 'Sombre',
  'theme.dark.help': 'L’original, presque noir.',
  'theme.midnight': 'Minuit',
  'theme.midnight.help': 'Sombre, en bleu profond.',
  'theme.espresso': 'Espresso',
  'theme.espresso.help': 'Un brun-noir chaleureux.',
  'theme.highContrast': 'Contraste élevé',
  'theme.highContrast.help': 'Blanc sur noir, arêtes franches.',
  'theme.light': 'Clair',
  'theme.light.help': 'Lumineux et neutre.',
  'theme.mist': 'Brume',
  'theme.mist.help': 'Un gris-bleu froid de plein jour.',
  'theme.sepia': 'Sépia',
  'theme.sepia.help': 'Une page ivoire chaleureuse.',
  'theme.daylight': 'Grand jour',
  'theme.daylight.help': 'Noir sur blanc, arêtes franches.',

  // ── Réglages · Langue et région ────────────────────────────────────────────
  'settings.language.section': 'Langue et région',
  'settings.language.label': 'Langue de l’interface',
  'settings.language.help':
    'La langue de l’application elle-même — menus, réglages, notifications, et la façon d’écrire les dates et les nombres.',
  'settings.language.noteBefore':
    'Ce n’est pas la langue dans laquelle Claude écrit : les messages de commit, les pull requests et les commentaires Jira suivent',
  'settings.language.noteLink': 'les réglages de langue de chaque dépôt',
  'settings.language.noteAfter':
    ', et les langues de votre profil décident de la façon dont Claude vous parle.',

  // ── Réglages · Fonctionnalités ─────────────────────────────────────────────
  'settings.features': 'Fonctionnalités',
  'settings.usageCard.label': 'Carte d’usage',
  'settings.usageCard.help':
    'Le compte connecté et les jauges Session (5 h) / Semaine (7 j), en bas de la barre latérale gauche.',
  'settings.usageLogs.label': 'Partager mon activité avec mon équipe',
  'settings.usageLogs.help':
    'Activé par défaut, et vous pouvez le couper à tout moment. Ce que vous faites avec vos agents est envoyé au cloud Magic Slash pour que le tableau de bord de votre équipe reflète votre travail. Le couper arrête les nouveaux enregistrements ; ce qui a déjà été envoyé est conservé.',
  'settings.usageLogs.collected': 'Collecté',
  'settings.usageLogs.excluded': 'Jamais collecté',
  'settings.usageLogs.collected.activity':
    'L’activité des agents : tickets, commits, PR, revues',
  'settings.usageLogs.collected.skills':
    'Les skills que vous lancez (/magic:start, /magic:pr, …), la durée de chaque exécution et comment elle s’est terminée',
  'settings.usageLogs.collected.session':
    'Le résumé de fin de session : coût estimé, lignes ajoutées/supprimées, durée, modèle',
  'settings.usageLogs.collected.context':
    'L’identifiant et le titre du ticket, et les dépôts sur lesquels vous travaillez',
  'settings.usageLogs.excluded.prompts': 'Vos prompts et les réponses de Claude',
  'settings.usageLogs.excluded.code': 'Votre code, vos diffs, le contenu de vos fichiers',
  'settings.usageLogs.excluded.terminal':
    'La sortie du terminal et l’historique des commandes',
  'settings.usageLogs.excluded.secrets': 'Vos jetons, vos clés et vos identifiants',
  'settings.usageLogs.excluded.args': 'Ce que vous tapez après le nom d’un skill',
  'settings.usageLogs.excluded.otherSkills': 'Les skills dont le nom ne commence pas par « magic- »',
  'settings.usageLogs.footnote':
    'Chaque membre de votre organisation voit ces chiffres par personne sur la page Équipe.',
  'settings.usageLogs.footnoteAgents':
    'Quoi que dise ce réglage, vos agents (nom, branche, ticket, dépôts) se synchronisent avec votre équipe — c’est ce qui alimente la vue temps réel.',
  'settings.digest.label': 'Résumé quotidien de l’équipe',
  'settings.digest.help':
    'Désactivé par défaut. Une fois activé, vous recevez une notification à 9 h résumant l’activité de votre équipe sur les dernières 24 heures (PR livrées, tickets passés en Terminé). Rien n’est envoyé s’il n’y a eu aucune activité.',
  'settings.split.label': 'Activer la vue divisée',
  'settings.split.help': 'Affiche deux agents côte à côte sur les écrans larges.',
  'settings.spotlight.label': 'Activer Spotlight',
  'settings.spotlight.help':
    'Ouvre le panneau de lancement rapide depuis n’importe où avec un raccourci clavier. Le choix des touches se fait dans l’application : il dépend de ce qui est installé sur cette machine-là.',
  'settings.usageLogs.section': 'Enregistrement de l’activité',

  // ── Réglages · Surveillance des revues de PR ───────────────────────────────
  // ── Réglages · Notifications ───────────────────────────────────────────────
  'settings.notifications.section': 'Notifications',
  'settings.notifications.master.label': 'Activer les notifications',
  'settings.notifications.master.help':
    'Tout ce qui suit, ainsi que celles qui n’ont pas d’interrupteur propre : une revue qui arrive sur votre PR, un relecteur qui demande des modifications, un collègue qui reprend un ticket sur lequel vous êtes. Aucune notification n’apparaît quand la fenêtre de l’app est au premier plan.',
  'settings.notifications.agents.section': 'Vos agents',
  'settings.notifications.agentWaiting.label': 'Agent en attente',
  'settings.notifications.agentWaiting.help':
    'Un agent s’est arrêté et attend une réponse ou une autorisation pour continuer.',
  'settings.notifications.agentCompleted.label': 'Agent terminé',
  'settings.notifications.agentCompleted.help': 'Un agent a terminé la tâche qui lui a été confiée.',
  'settings.notifications.team.section': 'Équipe',
  'settings.notifications.team.footnote':
    'Une revue qui arrive sur votre PR, et un collègue qui reprend un ticket sur lequel vous avez aussi un agent, suivent l’interrupteur principal ci-dessus — elles sont assez rares pour ne pas mériter le leur.',

  'settings.prWatcher.label': 'Surveiller les revues de PR',
  'settings.prWatcher.help':
    'Interroge GitHub pour suivre l’état des revues sur les pull requests des agents.',
  'settings.prWatcher.intervalLabel': 'Fréquence d’interrogation',
  'settings.prWatcher.intervalHelp': 'Fréquence des appels à l’API GitHub.',
  'settings.prWatcher.interval30s': '30 secondes',
  'settings.prWatcher.interval1m': '1 minute',
  'settings.prWatcher.interval2m': '2 minutes',
  'settings.prWatcher.interval5m': '5 minutes',
  'settings.prWatcher.autoLaunchLabel': 'Lancer les skills automatiquement',
  'settings.prWatcher.autoLaunchHelp':
    'Envoie /magic:resolve ou /magic:done directement dans le terminal de l’agent. Désactivé par défaut, par prudence.',

  // ── Réglages · Claude Code ─────────────────────────────────────────────────
  'settings.claudeCode': 'Claude Code',
  'settings.launchMode.label': 'Mode de permissions',
  'settings.launchMode.help':
    'Détermine le niveau d’autonomie de tous les agents Claude Code.',
  'settings.launchMode.plan': 'Plan',
  'settings.launchMode.plan.help':
    'Lecture seule — Claude explore et analyse, mais ne modifie jamais rien',
  'settings.launchMode.default': 'Standard',
  'settings.launchMode.default.help':
    'Claude demande votre accord pour chaque action sensible',
  'settings.launchMode.acceptEdits': 'Modifications acceptées',
  'settings.launchMode.acceptEdits.help':
    'Accepte automatiquement les modifications de fichiers, demande encore pour les commandes bash',
  'settings.launchMode.auto': 'Auto',
  'settings.launchMode.auto.help':
    'Approuve automatiquement la plupart des actions selon les listes d’autorisations configurées',
  'settings.launchMode.bypass': 'Bypass',
  'settings.launchMode.bypass.help':
    'Aucune vérification de permission — réservé aux environnements isolés',
  'settings.launchMode.bypassInline':
    'Le mode Bypass désactive toutes les vérifications de permission. À n’utiliser que dans un environnement isolé, sans accès à Internet.',
  'settings.launchMode.bypassTitle': 'Activer le mode Bypass ?',
  'settings.launchMode.bypassConfirm': 'J’ai compris, activer Bypass',
  'settings.launchMode.bypassWarning':
    'Avertissement de sécurité : le mode Bypass désactive toutes les vérifications de permission. Tous les agents, sur toutes les machines où vous vous connectez, lanceront des commandes et modifieront des fichiers sans jamais demander. À n’utiliser que dans un environnement isolé, sans accès à Internet.',

  // ── Page Organisations ─────────────────────────────────────────────────────
  'org.title': 'Organisations',
  'org.yourOrgs': 'Vos organisations',
  'org.yourOrgsCount': 'Vos organisations ({count})',
  'org.emptyTitle': 'Vous n’appartenez à aucune organisation.',
  'org.emptyHint': 'Créez-en une, ou rejoignez-en une avec une invitation.',
  'org.create': 'Créer une organisation',
  'org.join': 'Rejoindre une organisation',
  'org.inviteModal.title': 'Inviter dans {name}',
  'org.inviteModal.titleFallback': 'Inviter',
  'org.inviteModal.help':
    'Un lien d’invitation est généré — copiez-le depuis la liste et envoyez-le à votre collègue.',
  'org.inviteModal.emailPlaceholder': 'collegue@exemple.com',
  'org.inviteModal.role': 'Rôle',
  'org.inviteModal.send': 'Envoyer l’invitation',
  'org.inviteModal.sending': 'Envoi…',
  'org.createModal.help':
    'Vous en devenez l’admin et pouvez inviter des membres immédiatement.',
  'org.createModal.namePlaceholder': 'Nom de l’organisation',
  'org.joinModal.help': 'Collez le lien d’invitation reçu, ou seulement son token.',
  'org.joinModal.placeholder': 'https://invite.magic-slash.io/…',
  'org.joinModal.submitting': 'En cours…',
  'org.archiveModal.title': 'Archiver l’organisation',
  'org.archiveModal.confirm': 'Archiver {name} ?',
  'org.archiveModal.thisOrganization': 'cette organisation',
  'org.archiveModal.body':
    'L’organisation et ses membres perdent l’accès — elle disparaît pour tout le monde. Ses données sont conservées, pas supprimées, mais l’opération est irréversible depuis l’application.',
  'org.archiveModal.archiving': 'Archivage…',
  'org.error.role': 'Impossible de mettre à jour le rôle.',
  'org.error.removeMember': 'Impossible de retirer le membre.',
  'org.error.leave': 'Impossible de quitter l’organisation.',
  'org.error.deleteInvitation': 'Impossible de supprimer l’invitation.',
  'org.error.createInvitation': 'Impossible de créer l’invitation.',
  'org.error.createOrg': 'Impossible de créer l’organisation.',
  'org.error.join': 'Impossible de rejoindre l’organisation.',
  'org.error.archive': 'Impossible d’archiver l’organisation.',
  'org.error.nameRequired': 'Une organisation doit avoir un nom.',

  // ── Carte d’organisation ───────────────────────────────────────────────────
  'org.role.admin': 'Admin',
  'org.role.member': 'Membre',
  'org.role.member.help': 'Peut voir l’équipe et travailler sur les dépôts partagés',
  'org.role.admin.help': 'Peut inviter, changer les rôles et archiver l’organisation',
  'org.members': 'Membres',
  'org.membersEmpty': 'Aucun membre pour l’instant.',
  'org.colMember': 'Membre',
  'org.colRole': 'Rôle',
  'org.colActions': 'Actions',
  'org.you': ' (vous)',
  'org.removeMember': 'Retirer le membre',
  'org.repositories': 'Dépôts',
  'org.reposEmpty':
    'Aucun dépôt partagé. Les dépôts partagés à cette organisation depuis l’application desktop apparaissent ici.',
  'org.invitations': 'Invitations',
  'org.invite': 'Inviter',
  'org.invitationsEmpty': 'Aucune invitation en attente.',
  'org.copyInviteLink': 'Copier le lien d’invitation',
  'org.inviteLink': 'Lien d’invitation',
  'org.deleteInvitation': 'Supprimer l’invitation',
  'org.inviteStatus.pending': 'en attente',
  'org.inviteStatus.accepted': 'acceptée',
  'org.inviteStatus.expired': 'expirée',
  'org.inviteStatus.revoked': 'révoquée',
  'org.soleAdmin':
    'Vous êtes le dernier admin. Promouvez un autre membre avant de partir, ou archivez l’organisation.',
  'org.leave': 'Quitter l’organisation',
  'org.archive': 'Archiver l’organisation',

  // ── Page Dépôt ─────────────────────────────────────────────────────────────
  'repo.back': 'Retour aux organisations',
  'repo.notFound': 'Ce dépôt n’existe pas, ou vous n’y avez pas accès.',
  'repo.notFoundHint':
    'Les dépôts d’équipe ne sont visibles que par les membres de l’organisation à laquelle ils appartiennent.',
  'repo.readOnly.title': 'Lecture seule',
  'repo.readOnly.body':
    'Ces réglages sont partagés par tous les membres de {org} : seuls ses administrateurs peuvent les modifier. Votre dossier local se définit dans l’application desktop — il reste sur votre machine et n’est jamais partagé.',
  'repo.readOnly.theOrganization': 'l’organisation',
  'repo.delete.title': 'Supprimer le dépôt',
  'repo.delete.confirmBefore': 'Supprimer',
  'repo.delete.confirmAfter': ' ?',
  'repo.delete.thisRepository': 'ce dépôt',
  'repo.delete.teamBody':
    'Il disparaît pour tous les membres de l’organisation. L’opération est irréversible.',
  'repo.delete.personalBody': 'L’opération est irréversible.',
  'repo.delete.failed': 'Impossible de supprimer le dépôt.',
  'repo.updateFailed':
    'Ce dépôt n’a pas pu être mis à jour — vous n’avez peut-être pas la permission de le modifier.',
  'repo.deleteForbidden':
    'Ce dépôt n’a pas pu être supprimé — seuls son propriétaire ou un admin de l’organisation peuvent le retirer.',

  // ── Réglages du dépôt ──────────────────────────────────────────────────────
  'repo.scope.section': 'Portée',
  'repo.scope.team': 'Équipe',
  'repo.scope.teamNamed': 'Équipe — {name}',
  'repo.scope.personal': 'Personnel',
  'repo.scope.teamHelp':
    'Partagé avec l’organisation — chaque membre le voit et y associe son propre dossier local.',
  'repo.scope.personalHelp':
    'Vous seul voyez ce dépôt. Partagez-le avec une organisation pour en faire un dépôt d’équipe.',
  'repo.scope.makePersonal': 'Rendre personnel',
  'repo.scope.sharePlaceholder': 'Partager avec une organisation…',
  'repo.scope.joinOrg': 'Rejoignez une organisation pour partager des dépôts.',
  'repo.general.section': 'Général',
  'repo.general.name': 'Nom',
  'repo.general.nameHelp': 'Nom affiché du dépôt',
  'repo.general.keywords': 'Mots-clés',
  'repo.general.keywordsHelp': 'Mots-clés de détection automatique (séparés par des virgules)',
  'repo.general.discussionLang': 'Langue de discussion',
  'repo.general.discussionLangHelp': 'Langue utilisée par Claude quand il échange avec vous',
  'repo.general.color': 'Couleur',
  'repo.general.colorHelp': 'Couleur du projet dans la barre latérale',
  'repo.general.setColor': 'Choisir la couleur {color}',
  'repo.branches.section': 'Branches',
  'repo.branches.development': 'Branche de développement',
  'repo.branches.developmentHelp':
    'Branche de référence pour comparer les commits. Saisie à la main ici — l’application web ne peut pas lister les branches du dépôt.',
  'repo.worktree.section': 'Worktree',
  'repo.worktree.files': 'Fichiers à copier',
  'repo.worktree.filesHelp':
    'Fichiers copiés depuis le dépôt principal vers les nouveaux worktrees (ex. : .env, .env.local)',
  'repo.commit.section': 'Commit',
  'repo.commit.language': 'Langue',
  'repo.commit.languageHelp': 'Langue des messages de commit',
  'repo.commit.style': 'Style',
  'repo.commit.styleHelp': 'Une seule ligne, ou plusieurs lignes avec un corps',
  'repo.commit.styleSingle': 'Une seule ligne',
  'repo.commit.styleMulti': 'Plusieurs lignes (avec corps)',
  'repo.commit.format': 'Format',
  'repo.commit.formatHelp': 'Format / convention des messages de commit',
  'repo.commit.formatConventional': 'Conventional',
  'repo.commit.formatAngular': 'Angular',
  'repo.commit.formatGitmoji': 'Gitmoji',
  'repo.commit.formatNone': 'Aucun',
  'repo.commit.formatNoneHelp': 'Forme libre',
  'repo.commit.coAuthor': 'Co-auteur',
  'repo.commit.coAuthorHelp': 'Ajouter Claude comme co-auteur des commits',
  'repo.commit.ticketId': 'Inclure l’ID du ticket',
  'repo.commit.ticketIdHelp': 'Ajouter l’ID du ticket lu dans le nom de la branche',
  'repo.commit.protectedBranch': 'Commits sur les branches principales',
  'repo.commit.protectedBranchHelpOn':
    'Autorisés sur main, master, develop et la branche de dev de ce dépôt — /magic:commit demande confirmation',
  'repo.commit.protectedBranchHelpOff':
    'Bloqués sur main, master, develop et la branche de dev de ce dépôt — /magic:commit déplace le travail sur une nouvelle branche',
  'repo.example': 'Exemple',
  'repo.resolve.section': 'Resolve',
  'repo.resolve.commitMode': 'Mode de commit',
  'repo.resolve.commitModeHelp': 'Comment committer les corrections de revue',
  'repo.resolve.modeNew': 'Nouveau commit',
  'repo.resolve.modeNewHelp': 'Ajoute un commit pour les corrections',
  'repo.resolve.modeAmend': 'Amender le dernier commit',
  'repo.resolve.modeAmendHelp': 'Réécrit l’historique, pousse en force',
  'repo.resolve.modeAsk': 'Demander',
  'repo.resolve.modeAskHelp': 'Choix au moment voulu, à chaque resolve',
  'repo.resolve.commitFormat': 'Format de commit',
  'repo.resolve.commitFormatHelp': 'Source du format des messages de commit de resolve',
  'repo.resolve.useCommitConfig': 'Utiliser les réglages de commit',
  'repo.resolve.customConfig': 'Personnalisé',
  'repo.resolve.reply': 'Répondre aux commentaires',
  'repo.resolve.replyHelp': 'Répondre dans le fil des commentaires GitHub résolus',
  'repo.resolve.replyLang': 'Langue des réponses',
  'repo.resolve.replyLangHelp': 'Langue des réponses publiées sur GitHub',
  'repo.resolve.amendNotice': 'Le push utilisera',
  'repo.resolve.askNoticeBefore': 'Il vous sera demandé de choisir entre',
  'repo.resolve.askNoticeNew': 'nouveau commit',
  'repo.resolve.askNoticeOr': 'et',
  'repo.resolve.askNoticeAmend': 'amend',
  'repo.resolve.askNoticeAfter': 'à chaque resolve. L’amend pousse avec',
  'repo.pr.section': 'Pull request',
  'repo.pr.language': 'Langue',
  'repo.pr.languageHelp': 'Langue des titres et descriptions de pull request',
  'repo.pr.autoLink': 'Lier automatiquement les tickets',
  'repo.pr.autoLinkHelp':
    'Ajouter les liens des tickets Jira/GitHub dans la description de la PR',
  'repo.pr.watchCI': 'Surveiller la CI et la review',
  'repo.pr.watchCIHelp':
    'Après création de la PR, attendre les checks, corriger les échecs automatiquement et traiter les retours de review',
  'repo.pr.testAccounts': 'Comptes de test',
  'repo.pr.testAccountsHelp':
    'Indique si la description de la PR précise avec quel compte se connecter. Le mode référence est sans risque sur n’importe quel dépôt ; le mode en clair copie les identifiants dans le corps de la PR et est ignoré sur les dépôts publics.',
  'repo.pr.testAccountsOff': 'Désactivé',
  'repo.pr.testAccountsOffHelp': 'Ne jamais mentionner de compte de test',
  'repo.pr.testAccountsReference': 'Référence',
  'repo.pr.testAccountsReferenceHelp': 'Dire où ils sont documentés, sans identifiants',
  'repo.pr.testAccountsInline': 'En clair',
  'repo.pr.testAccountsInlineHelp': 'Copier les identifiants dans le corps de la PR',
  'repo.pr.testAccountsSource': 'Source des comptes de test',
  'repo.pr.testAccountsSourceHelp':
    'Chemin de fichier ou nom de skill projet contenant les comptes — détecté automatiquement si vide',
  'repo.pr.testAccountsPublicWarn':
    'Les identifiants ne sont jamais copiés sur un dépôt public : le mode en clair y retombe sur le mode référence.',
  'repo.pr.template': 'Modèle de PR',
  'repo.pr.templateHelp':
    'Modifié dans l’application desktop — le modèle est un fichier du dépôt (.github/pull_request_template.md), pas un réglage.',
  'repo.issues.section': 'Jira / GitHub issues',
  'repo.issues.commentLang': 'Langue des commentaires',
  'repo.issues.commentLangHelp': 'Langue des commentaires sur les tickets Jira et GitHub',
  'repo.issues.commentOnPR': 'Commenter à la création de la PR',
  'repo.issues.commentOnPRHelp':
    'Ajouter un commentaire contenant le lien de la PR sur le ticket',
  'repo.issues.jiraUrl': 'URL Jira',
  'repo.issues.jiraUrlHelp': 'URL de base des tickets Jira (ex. : PROJ-123)',
  'repo.issues.githubUrl': 'URL des issues GitHub',
  'repo.issues.githubUrlHelp': 'URL de base des issues GitHub (ex. : #456)',
  'repo.danger.section': 'Zone sensible',
  'repo.danger.delete': 'Supprimer ce dépôt',
  'repo.danger.deleteTeamHelp': 'Le retire pour tous les membres de l’organisation.',
  'repo.danger.deletePersonalHelp': 'Le retire de votre configuration Magic Slash.',
  'repo.danger.deleteAction': 'Supprimer le dépôt',
  'repo.teamNote': 'Les changements ici s’appliquent à tous les membres de {org}.',
}
