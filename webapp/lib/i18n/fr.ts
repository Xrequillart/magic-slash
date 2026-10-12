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
  'common.saving': 'Enregistrement…',
  'common.create': 'Créer',
  'common.creating': 'Création…',
  'common.copied': 'Copié',
  'common.close': 'Fermer',
  'common.download': 'Télécharger',
  'common.add': 'Ajouter',
  'common.next': 'Suivant',
  'common.back': 'Retour',
  'common.finish': 'Terminer',
  'common.saveFailed': 'Échec de l’enregistrement.',
  'common.remove': 'Retirer {item}',
  'common.notSignedIn': 'Vous n’êtes pas connecté.',

  // ── Sélecteur de langue ────────────────────────────────────────────────────
  'language.label': 'Langue de l’interface',
  'language.hint': 'S’applique à ce site, dans ce navigateur.',

  // ── Navigation ─────────────────────────────────────────────────────────────
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

  // ── Plans ──────────────────────────────────────────────────────────────────
  'plans.title': 'Plans',
  'plans.noRepo': 'Dépôt inconnu',

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
    'Il s’agit du réglage « Partager mon activité avec mon équipe ». Le détail de ce qui est enregistré est dans l’app desktop, sous Réglages → Application, où vous pouvez le désactiver à nouveau quand vous le souhaitez.',

  // ── Compte cloud ───────────────────────────────────────────────────────────
  'cloud.signOut': 'Se déconnecter',

  // ── Profil ─────────────────────────────────────────────────────────────────
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

  // ── Temps relatif ──────────────────────────────────────────────────────────
  'time.unknown': 'inconnu',
  'time.justNow': 'à l’instant',
  'time.minutes.one': 'il y a 1 minute',
  'time.minutes.many': 'il y a {count} minutes',
  'time.hours.one': 'il y a 1 heure',
  'time.hours.many': 'il y a {count} heures',
  'time.days.one': 'il y a 1 jour',
  'time.days.many': 'il y a {count} jours',

  // ── Réglages ──────────────────────────────────────────────────────────────
  'settings.saveFailed':
    'Vos réglages n’ont pas pu être enregistrés — reconnectez-vous puis réessayez.',

  // ── Réglages · Apparence ───────────────────────────────────────────────────
  'theme.dark': 'Sombre',
  'theme.dark.help': 'L’original, presque noir.',
  'theme.midnight': 'Minuit',
  'theme.midnight.help': 'Sombre, en bleu profond.',
  'theme.espresso': 'Graphite',
  'theme.espresso.help': 'Un gris foncé plus doux, plus clair.',
  'theme.highContrast': 'Contraste élevé',
  'theme.highContrast.help': 'Blanc sur noir, arêtes franches.',
  'theme.light': 'Clair',
  'theme.light.help': 'Lumineux et neutre.',
  'theme.mist': 'Bleu ciel',
  'theme.mist.help': 'Un bleu ciel lumineux.',
  'theme.sepia': 'Sépia',
  'theme.sepia.help': 'Une page ivoire chaleureuse.',
  'theme.daylight': 'Grand jour',
  'theme.daylight.help': 'Noir sur blanc, arêtes franches.',

  // ── Réglages · Langue et région ────────────────────────────────────────────
  'settings.language.label': 'Langue de l’interface',
  'settings.language.help':
    'La langue de l’application elle-même — menus, réglages, notifications, et la façon d’écrire les dates et les nombres.',

  // ── Réglages · Claude Code ─────────────────────────────────────────────────
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

  // ── Organisations ──────────────────────────────────────────────────────────
  'org.inviteModal.title': 'Inviter dans {name}',
  'org.inviteModal.help':
    'Un lien d’invitation est généré — copiez-le depuis la liste et envoyez-le à votre collègue.',
  'org.inviteModal.emailPlaceholder': 'collegue@exemple.com',
  'org.inviteModal.send': 'Envoyer l’invitation',
  'org.error.nameRequired': 'Une organisation doit avoir un nom.',

  // ── Carte d’organisation ───────────────────────────────────────────────────
  'org.members': 'Membres',
  'org.membersEmpty': 'Aucun membre pour l’instant.',
  'org.colMember': 'Membre',
  'org.colRole': 'Rôle',
  'org.colActions': 'Actions',
  'org.you': ' (vous)',

  // ── Dépôt ──────────────────────────────────────────────────────────────────
  'repo.back': 'Retour aux organisations',

  // ── Réglages du dépôt ──────────────────────────────────────────────────────
  'repo.general.keywords': 'Mots-clés',
  'repo.general.keywordsHelp': 'Mots-clés de détection automatique — un par tag',
  'repo.example': 'Exemple',

  'repo.plan.intro': 'Transforme une idée en tickets. Sur ce repository :',

  // ── The email-confirmation landing ───────────────────────────────────────
  // Read by components/EmailConfirmed.tsx, which draws over whatever the root of the
  // app host rendered. The visitor got here by opening a link in a mailbox and may
  // not be signed in on the web at all, so the copy says what happened and sends them
  // back to the app rather than offering anything to do here.
  'emailConfirmed.title': 'Adresse e-mail confirmée',
  'emailConfirmed.body':
    'Votre compte Magic Slash se connecte désormais avec cette adresse. Rien d’autre n’a changé.',
  'emailConfirmed.hint': 'Vous pouvez fermer cet onglet et revenir à l’application.',
}
