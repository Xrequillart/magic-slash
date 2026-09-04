import type { marketingEn } from './en'

/**
 * French catalogue for the public site. Typed against `marketingEn`, so a key added
 * there and forgotten here is a tsc error rather than an English sentence on a French
 * page.
 *
 * Vouvoiement throughout, matching the app catalogue in `lib/i18n/fr.ts` and the story
 * page below. The English side of the new home copy is deliberately conversational
 * ("You describe. It builds."), and the French keeps that rhythm with "vous" rather
 * than switching the site to "tu" — a visitor who reads the hero and then the story
 * page would otherwise be addressed two different ways on the same site.
 */
export const marketingFr: Record<keyof typeof marketingEn, string> = {
  // ── Nav ────────────────────────────────────────────────────────────────────
  'site.nav.howItWorks': 'Comment ça marche',
  'site.nav.menu': 'Menu du site',
  'site.nav.product': 'Produit',
  'site.nav.allFeatures': 'Toutes les fonctionnalités',
  'site.nav.resources': 'Ressources',
  'site.nav.signIn': 'Connexion',
  'site.nav.account': 'Votre compte',
  'site.nav.documentationCategory': 'Documentation',
  'site.nav.gettingStarted': 'Démarrage rapide',
  'site.nav.skillsReference': 'Référence des commandes',
  'site.nav.configuration': 'Configuration',
  'site.nav.viewAllDocs': 'Voir toute la doc',
  'site.nav.communityCategory': 'Communauté',
  'site.nav.faq': 'FAQ',
  'site.nav.updatesCategory': 'Mises à jour',
  'site.nav.changelog': 'Changelog',
  'site.nav.ourStory': 'Notre histoire',

  // ── Hero ───────────────────────────────────────────────────────────────────
  'site.hero.title': 'Vos idées deviennent<br>des fonctionnalités boostées à l’IA.',
  'site.hero.subtitle': 'L’application pour product builders.',
  'site.hero.cta': 'Commencer gratuitement',
  'site.hero.howCta': 'Voir comment ça marche',
  'site.hero.downloadCta': 'Télécharger pour Mac',

  // ── ② Comment ça marche ────────────────────────────────────────────────────
  'site.how.title': 'Comment ça marche, vraiment.',
  'site.how.subtitle': 'Vous décrivez. Ça construit. Vous validez.',
  'site.how.step1Title': 'Vous décrivez',
  'site.how.step1Desc':
    'Dites ce que vous voulez construire : une fonctionnalité, un correctif, un nettoyage. Avec vos mots, pas une spec.',
  'site.how.step2Title': 'Ça construit',
  'site.how.step2Desc':
    'Un agent prend le chantier et le mène jusqu’au bout, en respectant les conventions de votre projet.',
  'site.how.step3Title': 'Vous validez',
  'site.how.step3Desc':
    'Vous recevez du travail fini à relire, pas un tas de code à trier.',
  'site.how.commandsTitle': 'Les huit commandes',
  'site.how.commandsIntro':
    'Tapez <strong>/magic:</strong> pour les retrouver toutes d’un coup.',
  'site.how.planDesc':
    '<strong>/magic:plan</strong> transforme une idée en tickets, prêts à construire.',
  'site.how.startDesc':
    '<strong>/magic:start</strong> prend une tâche et commence à la construire.',
  'site.how.continueDesc':
    '<strong>/magic:continue</strong> reprend un chantier laissé en cours.',
  'site.how.commitDesc':
    '<strong>/magic:commit</strong> enregistre le travail avec un message clair.',
  'site.how.prDesc': '<strong>/magic:pr</strong> ouvre la pull request, prête à relire.',
  'site.how.reviewDesc': '<strong>/magic:review</strong> la relit selon vos conventions.',
  'site.how.resolveDesc': '<strong>/magic:resolve</strong> applique les retours de review.',
  'site.how.doneDesc': '<strong>/magic:done</strong> clôture et nettoie derrière.',
  'site.how.seeDocs': 'Voir la doc',

  // ── Les huit commandes ─────────────────────────────────────────────────────
  'site.commands.subtitle':
    'Une par étape du cycle. Tapez <strong>/magic:</strong> et Claude Code les liste toutes.',
  'site.commands.plan':
    'Transforme une idée floue en une spec à relire, puis en épic et en stories.',
  'site.commands.start': 'Lit le ticket, prépare la branche et attaque le chantier.',
  'site.commands.continue':
    'Reprend un chantier là où un collègue ou vous-même l’avez laissé.',
  'site.commands.commit':
    'Découpe le travail en commits atomiques, chacun avec un message clair.',
  'site.commands.pr': 'Pousse, ouvre la pull request, met à jour le ticket.',
  'site.commands.review':
    'Relit le diff à l’aune des conventions de votre projet, et pose ses remarques sur les lignes concernées.',
  'site.commands.resolve':
    'Applique les retours de review — et discute avec le reviewer quand une suggestion mérite un compromis plutôt qu’une obéissance.',
  'site.commands.done':
    'Clôture le ticket une fois la PR mergée, puis supprime le worktree et tous les fichiers locaux qu’il contient, et efface la branche.',

  // ── La grille de fonctionnalités ───────────────────────────────────────────
  'site.features.title': 'Toutes les fonctionnalités',
  'site.features.subtitle':
    'Neuf choses que fait le produit — et où chacune est documentée.',
  'site.features.learnMore': 'En savoir plus',
  'site.features.commandsTitle': 'Huit commandes',
  'site.features.commandsDesc': 'Une par étape, de la première idée au merge.',
  'site.features.workflowsTitle': 'Enchaînements',
  'site.features.workflowsDesc': 'Les chaînes de commandes qui portent une tâche entière.',
  'site.features.desktopTitle': 'Fonctionnalités',
  'site.features.desktopDesc': 'Jusqu’à douze agents à la fois, chacun dans son worktree.',
  'site.features.multiRepoTitle': 'Plusieurs dépôts',
  'site.features.multiRepoDesc':
    'Un dépôt GitHub, une configuration Magic Slash. L’administrateur de l’organisation la règle — format de commit, langues, pull requests, tickets, conventions de code — et chaque membre qui rejoint l’équipe en hérite aussitôt. Elle se change à tout moment, et les skills /magic: l’utilisent et la respectent à la lettre.',
  'site.features.configurationTitle': 'Vos conventions',
  'site.features.configurationDesc':
    'Format de commit, langues, modèles, pull requests, conventions de code, tickets… Une organisation, un dépôt, une configuration pour toute l’équipe.',
  'site.features.integrationsTitle': 'GitHub et Jira',
  'site.features.integrationsDesc':
    'Tickets, issues et pull requests, lus et écrits sur place.',
  'site.features.hooksTitle': 'Notifications',
  'site.features.hooksDesc': 'Votre Mac vous prévient dès qu’un chantier vous attend.',
  'site.features.securityTitle': 'Sécurité',
  'site.features.securityDesc':
    'Ce qui tourne où, ce qui quitte votre machine, et ce qui n’en sort jamais.',
  'site.features.troubleshootingTitle': 'Dépannage',
  'site.features.troubleshootingDesc':
    'Les correctifs des ratés, écrits plutôt que mémorisés.',

  // ── La page /features ──────────────────────────────────────────────────────
  // Le chrome de la page, puis deux titres de famille et les lignes des quatre familles
  // écrites à la main. La LISTE — quelles familles, dans quel ordre, avec quelles
  // features et quelle icône — vit dans `lib/features.ts` ; ici il n'y a que la prose.
  // Le reste de la page réutilise ce qui était déjà traduit : `site.commands.<id>`, les
  // paires que la refonte de la home a mises de côté, et `site.whereItStands.*`.
  'site.features.pageLead': 'Chaque commande, chaque panneau, chaque réglage.',
  'site.features.onThisPage': 'Sur cette page',
  // "Skills" in both catalogues, on purpose: it is the product's own word for them,
  // the app's own menu says it and so does the documentation. Listed in
  // `i18n.test.ts`'s `SAME_IN_BOTH.site` because of that.
  'site.features.groupSkillsTitle': 'Skills',
  // Voir la note du catalogue anglais.
  // Voir la note du catalogue anglais.
  'site.features.sidebarSelfUpdating':
    'La sidebar se met à jour toute seule : les skills et Claude Code y écrivent le statut, la branche, les commits et la pull request au fil du travail. Et tout reste modifiable à la main, d’un clic depuis l’application.',
  'site.features.skillsIndependent':
    'La grille se lit comme un pipeline parce qu’un ticket entier en est un — mais chaque skill est autonome. Enchaînez les huit, ou n’en appelez qu’un : /magic:commit sur du travail écrit à la main, /magic:review sur la pull request de quelqu’un d’autre.',
  'site.features.groupPlan': 'Un skill pour s’organiser : une épic, et les stories dessous.',
  'site.features.groupBuild': 'Deux skills pour lancer le travail.',
  'site.features.groupPropose': 'Deux skills pour le mettre en revue.',
  'site.features.groupReview': 'Deux skills pour le relire, et traiter les retours.',
  'site.features.groupFinish': 'Un skill pour finir, et libérer l’agent qui a travaillé.',
  // ── The /features start card ───────────────────────────────────────────────
  // The four lines the terminal in the `/magic:start` card reports, in the order
  // the skill actually does them. Checked against `skills/magic-start/SKILL.md`
  // rather than invented: read the ticket and resolve the repo (steps 2-3), create
  // the worktree on a new branch (4.1), install dependencies (4.3), write the plan
  // and have it reviewed (5.2).
  // ── La carte plan de /features ─────────────────────────────────────────────
  // Voir la note du catalogue anglais : seules ces deux chaînes sont de la langue,
  // les titres autour restent en anglais dans les deux catalogues.
  // Voir la note du catalogue anglais.
  // Voir la note du catalogue anglais.
  // Reprises mot pour mot de `desktop/src/i18n/fr.ts`. Voir la note du catalogue anglais.
  'site.prCard.comments': 'Commentaires',
  'site.prCard.commentsCount': '3 commentaires',
  'site.prCard.checks': 'Checks CI',
  'site.prCard.checksPending': '1/3 réussis',
  'site.prCard.checksDone': '3/3 réussis',
  'site.prCard.noConflicts': 'Aucun conflit',
  'site.prCard.stateOpen': 'Ouverte',
  'site.continueCard.button': 'Reprendre avec magic-slash',
  'site.continueCard.ticketDescription':
    'Liste toutes les fonctionnalités, groupées, avec une sidebar dont les entrées ancrent vers leur section.',
  // Voir la note du catalogue anglais.
  'site.doneCard.merged': 'Pull request mergée',
  'site.doneCard.branch': 'Branche supprimée, en local et sur le remote',
  'site.doneCard.worktree': 'Worktree local supprimé',
  'site.doneCard.ticket': 'Ticket commenté et clôturé',
  'site.doneCard.agent': 'Agent marqué terminé dans magic-slash',
  'site.planCard.specTitle': 'Mode hors ligne pour l’éditeur',
  'site.planCard.specIdea':
    'Permettre de continuer à travailler malgré une coupure de connexion, puis de réconcilier au retour. Ne jamais perdre une frappe, ne jamais avoir à rafraîchir.',
  // Voir la note du catalogue anglais.
  // Voir la note du catalogue anglais.
  'site.resolveCard.reviewer': 'relecteur',
  'site.resolveCard.resolved': 'Résolue',
  'site.resolveCard.open': 'Ouverte',
  'site.resolveCard.comment': 'Donne une hauteur fixe à ces cards.',
  'site.resolveCard.reply':
    'Gardé le minimum : une hauteur fixe couperait la copie française, plus longue. À vous de trancher.',
  'site.reviewCard.author': 'vous',
  'site.reviewCard.comment1':
    'Toute page marketing absente de cet ensemble est redirigée en 307 vers l’hôte de l’app : la nouvelle route doit donc être ajoutée ici, pas seulement créée.',
  'site.reviewCard.comment2':
    'Ceci mesure à chaque événement de scroll, plusieurs fois par frame. À regrouper avec requestAnimationFrame, et le listener doit être passif.',
  // Voir la note du catalogue anglais.
  'site.spotlightCard.placeholder': 'PROJ-123 /start',
  'site.notificationCard.title': 'Un agent vous attend',
  'site.notificationCard.body': 'PAY-311 a besoin de votre réponse pour continuer',
  'site.notificationCard.when': 'maintenant',
  // Voir la note du catalogue anglais.
  'site.agentsCard.tasks': 'Tâches',
  'site.agentsCard.team': 'Équipe',
  'site.agentsCard.skills': 'Skills',
  'site.agentsCard.agents': 'Agents',
  'site.agentsCard.attention': 'Demande une action',
  'site.agentsCard.usageSession': 'Session (5 h)',
  'site.agentsCard.usageWeek': 'Semaine (7 j)',
  'site.agentsCard.working': 'Au travail',
  'site.agentsCard.workingDesc':
    'L’agent tourne — il lit, il écrit, ou il attend une commande. Rien ne vous est demandé.',
  'site.agentsCard.waiting': 'Il vous demande quelque chose',
  'site.agentsCard.waitingDesc':
    'Il bute sur une décision qui n’appartient qu’à vous : une validation, un choix entre deux routes, une permission. Il s’arrête plutôt que de deviner.',
  'site.agentsCard.completed': 'Terminé',
  'site.agentsCard.completedDesc':
    'La skill qu’il exécutait est allée au bout. Le worktree, la branche et l’historique sont toujours là, à relire.',
  'site.agentsCard.error': 'Arrêté sur une erreur',
  'site.agentsCard.errorDesc':
    'Une commande a échoué, ou la session s’est mal terminée. Le transcript est conservé : vous pouvez voir ce qui s’est passé avant l’arrêt.',
  // Voir la note du catalogue anglais.
  'site.tasksCard.title': 'Tâches',
  'site.tasksCard.section': 'À faire',
  'site.tasksCard.reload': 'Recharger',
  'site.tasksCard.total': '17 à faire',
  'site.tasksCard.countGithub': '9 à faire',
  'site.tasksCard.countJira': '8 à faire',
  'site.tasksCard.search': 'Rechercher par ID de ticket ou titre…',
  'site.tasksCard.allRepos': 'Tous les dépôts',
  'site.tasksCard.sortRecent': 'Plus récents',
  'site.tasksCard.openGithub': 'Ouvrir sur GitHub',
  'site.tasksCard.openJira': 'Ouvrir dans Jira',
  'site.tasksCard.agent': 'agent',
  // Voir la note du catalogue anglais.
  'site.tasksCard.legendFiltersTitle': 'Filtrez, puis ordonnez',
  'site.tasksCard.legendFiltersDesc':
    'Cherchez sur un ID de ticket ou un titre, restreignez à un dépôt ou à un epic Jira, et lisez le résultat par ordre d’arrivée ou par priorité.',
  'site.tasksCard.legendFieldsTitle': 'Les mots de votre board',
  'site.tasksCard.legendFieldsDesc':
    'Une ligne Jira porte son statut, sa priorité et l’epic auquel elle est rattachée — affichés tels que votre site les envoie, jamais traduits ni reclassés.',
  'site.tasksCard.legendAvailableTitle': 'Seulement ce qui est libre',
  'site.tasksCard.legendAvailableDesc':
    'La colonne To Do du sprint, plus les tickets qu’un agent a déjà pris — marqués comme tels. Le travail en cours ailleurs n’est pas proposé : la page ne vous offrira pas de le dupliquer.',
  'site.tasksCard.legendTrackersTitle': 'Les deux trackers, par dépôt',
  'site.tasksCard.legendTrackersDesc':
    'Les issues ouvertes d’un dépôt GitHub et le sprint actif d’un projet Jira, chacun sur sa carte — et une seule carte pour deux services qui partagent un projet.',
  'site.tasksCard.gh1': 'Les relances de webhook perdent la clé d’idempotence',
  'site.tasksCard.gh2': 'Limiter le débit de la recherche publique',
  'site.tasksCard.gh3': 'Le paiement renvoie une 500 quand le panier est vide',
  // Voir la note du catalogue anglais.
  'site.reposCard.title': 'Réglages',
  'site.reposCard.tabAccount': 'Compte',
  'site.reposCard.tabConnections': 'Connexions',
  'site.reposCard.tabOrganization': 'Organisation',
  'site.reposCard.tabRepositories': 'Dépôts',
  'site.reposCard.tabApplication': 'Application',
  'site.reposCard.tabClaudeCode': 'Claude Code',
  'site.reposCard.tabNotifications': 'Notifications',
  'site.reposCard.tabAppearance': 'Apparence',
  'site.reposCard.tabLanguage': 'Langue et région',
  'site.reposCard.tabShortcuts': 'Raccourcis',
  'site.reposCard.tabAbout': 'À propos',
  'site.reposCard.signOut': 'Se déconnecter',
  'site.reposCard.section': 'Dépôts',
  'site.reposCard.add': 'Ajouter un dépôt',
  'site.reposCard.personal': 'Personnels',
  'site.reposCard.connected': 'Connecté',
  'site.reposCard.noLocalFolder': 'Aucun dossier local — cliquez pour le définir',
  'site.reposCard.agents.one': '1 agent',
  'site.reposCard.agents.other': '2 agents',
  // Voir la note du catalogue anglais.
  'site.reposCard.legendOneConfigTitle': 'Un dépôt, une configuration',
  'site.reposCard.legendOneConfigDesc':
    'Chaque dépôt GitHub a ses propres réglages dans Magic Slash — format de commit, langues, modèle de pull request, tracker, conventions de code — et rien ne se partage par accident entre deux projets.',
  'site.reposCard.legendAdminTitle': 'L’admin de l’organisation la règle',
  'site.reposCard.legendAdminDesc':
    'La configuration d’un dépôt partagé est réglée par un administrateur de l’organisation, une fois. Les membres la lisent ; seul un admin la change — et peut le faire à tout moment.',
  'site.reposCard.legendInheritTitle': 'Qui rejoint l’équipe en hérite',
  'site.reposCard.legendInheritDesc':
    'Un nouveau membre voit les dépôts de l’équipe dès sa connexion, conventions comprises — avant d’en avoir cloné un seul. Il ne lui reste qu’à indiquer un dossier local pour chacun.',
  'site.reposCard.legendSkillsTitle': 'Les skills la respectent',
  'site.reposCard.legendSkillsDesc':
    'Chaque skill /magic: lit la configuration du dépôt avant d’agir : le commit qu’il écrit, la pull request qu’il ouvre et le ticket qu’il fait avancer suivent les règles de ce dépôt.',
  // Voir la note du catalogue anglais.
  'site.repoPage.subtitle': 'Configurer les réglages du dépôt',
  'site.repoPage.tabGeneral': 'Général',
  'site.repoPage.tabLanguages': 'Langues',
  'site.repoPage.tabPlan': 'Planification',
  'site.commitCfg.intro': 'Transforme vos modifications en commits. Sur ce repository :',
  'site.commitCfg.stepAtomic':
    'Découpe ce qui a changé en commits atomiques — un changement logique par commit, sans demander.',
  'site.commitCfg.stepFormat':
    'Chaque message est en Conventional : le type, puis le sujet (feat: add login).',
  'site.commitCfg.stepStyle': 'Une seule ligne par commit, sans corps.',
  'site.commitCfg.stepProtected':
    'Ne commite jamais sur main, master ou develop : il déplace d’abord le travail sur une nouvelle branche.',
  'site.commitCfg.tailCoAuthor': 'Claude ajouté en co-auteur',
  'site.commitCfg.tailTicketId': 'id du ticket ajouté au message',
  'site.commitCfg.styleHelp': 'Une seule ligne, ou plusieurs lignes avec un corps',
  'site.commitCfg.styleSingle': 'Une seule ligne',
  'site.commitCfg.formatHelp': 'Format / convention des messages de commit',
  'site.commitCfg.formatConventional': 'Conventional (type : description)',
  'site.commitCfg.coAuthor': 'Co-auteur',
  'site.commitCfg.coAuthorHelp': 'Ajouter Claude comme co-auteur des commits',
  'site.commitCfg.ticketId': 'Inclure l’ID du ticket',
  'site.commitCfg.ticketIdHelp':
    'Ajouter au message de commit l’ID du ticket lu dans le nom de la branche',
  'site.commitCfg.example': 'Exemple',
  'site.commitCfg.protectedBranch': 'Commits sur les branches principales',
  'site.commitCfg.protectedBranchHelp':
    'Bloqués sur main, master, develop et la branche de dev de ce dépôt — /magic:commit déplace le travail sur une nouvelle branche',
  'site.commitCfg.tableFormat': 'Format',
  'site.commitCfg.tableShape': 'Forme',
  'site.commitCfg.tableExample': 'Exemple',
  'site.commitCfg.formatNoneName': 'Aucun',
  'site.commitCfg.formatNoneShape': 'forme libre',
  'site.prCfg.intro': 'Transforme vos commits en pull request. Sur ce repository :',
  'site.prCfg.stepOpen':
    'Lance les vérifications du projet, pousse la branche, puis ouvre la pull request avec son titre et sa description.',
  'site.prCfg.stepAutoLink': 'La description renvoie vers le ticket GitHub.',
  'site.prCfg.stepAccounts':
    'Indique au relecteur où trouver les comptes de test, sans identifiants.',
  'site.prCfg.stepTicketComment':
    'Met à jour le ticket GitHub lié et y poste le lien de la pull request.',
  'site.prCfg.stepWatch':
    'Reste ensuite sur la pull request : attend les checks, corrige ce qui échoue, traite les retours de review, et ajoute l’URL de preview aux scénarios de test quand le projet en publie une.',
  'site.prCfg.tailAccountsSource': 'comptes lus depuis docs/test-accounts.md',
  'site.prCfg.autoLink': 'Lier automatiquement les tickets',
  'site.prCfg.autoLinkHelp': 'Ajouter les liens des tickets Jira/GitHub dans la description de la PR',
  'site.prCfg.testAccounts': 'Comptes de test',
  'site.prCfg.testAccountsHelp':
    'Si la description de la PR mentionne les comptes de test utilisables par les relecteurs. La référence est sans risque sur n’importe quel dépôt ; le mode intégré colle les identifiants dans le corps de la PR',
  'site.prCfg.testAccountsReference': 'Référence (indiquer où ils se trouvent)',
  'site.prCfg.testAccountsSource': 'Source des comptes de test',
  'site.prCfg.testAccountsSourceHelp':
    'Chemin de fichier ou nom de skill projet contenant les comptes (détection automatique si vide)',
  'site.prCfg.template': 'Modèle de PR',
  'site.prCfg.templateHelp': 'Modèle utilisé à la création des pull requests',
  'site.prCfg.templateFound': 'Modèle trouvé',
  'site.prCfg.groupAfter': 'Une fois ouverte',
  'site.prCfg.commentOnPR': 'Commenter le ticket',
  'site.prCfg.commentOnPRHelp':
    'Publie sur le ticket un commentaire contenant le lien de la pull request, à sa création',
  'site.prCfg.watchCI': 'Surveiller la CI et la review',
  'site.prCfg.watchCIHelp':
    'Après création de la PR, attendre les checks, corriger les échecs automatiquement, traiter les retours de review et ajouter l’URL de preview de la PR aux scénarios de test quand le projet en publie une',
  // Voir la note du catalogue anglais.
  'site.prCfg.legendAutoLinkTitle': 'Lier l’issue ou le ticket Jira',
  'site.prCfg.legendAutoLinkDesc':
    'La description porte le lien vers l’issue GitHub ou le ticket Jira d’où la branche est partie : le relecteur tombe sur le pourquoi avant le diff.',
  'site.prCfg.legendTestAccountsTitle': 'Comptes de test',
  'site.prCfg.legendTestAccountsDesc':
    'Dites aux relecteurs avec quel compte se connecter — en pointant vers le fichier qui les contient, ou en collant les identifiants dans la PR. Jamais collés sur un dépôt public.',
  'site.prCfg.legendTemplateTitle': 'Modèle de PR',
  'site.prCfg.legendTemplateDesc':
    'Le modèle de pull request du dépôt est trouvé et rempli ; s’il n’y en a pas, l’app vous en génère un.',
  'site.prCfg.legendWatchTitle': 'Surveiller la CI et la review',
  'site.prCfg.legendWatchDesc':
    'Une fois ouverte, l’agent reste sur la PR : il attend les checks, corrige ce qui échoue, traite les retours de review et ajoute l’URL de preview aux scénarios de test.',
  'site.prCfg.legendCommentTitle': 'Commenter le ticket',
  'site.prCfg.legendCommentDesc':
    'À la création de la PR, un commentaire avec son lien est posté sur l’issue ou le ticket Jira — et le ticket avance sur son board.',
  // Voir la note du catalogue anglais.
  'site.launchModes.plan': 'Plan',
  'site.launchModes.planHelp': 'Lecture seule — Claude explore et analyse, mais ne modifie jamais rien',
  'site.launchModes.default': 'Standard',
  'site.launchModes.defaultHelp': 'Claude demande votre accord pour chaque action sensible',
  'site.launchModes.acceptEdits': 'Modifications acceptées',
  'site.launchModes.acceptEditsHelp':
    'Accepte automatiquement les modifications de fichiers, demande encore pour les commandes bash',
  'site.launchModes.auto': 'Auto',
  'site.launchModes.autoHelp':
    'Approuve automatiquement la plupart des actions selon les listes d’autorisations configurées',
  'site.launchModes.bypass': 'Bypass',
  'site.launchModes.bypassHelp':
    'Aucune vérification de permission — réservé aux environnements isolés',
  'site.tasksCard.jira1': 'TVA arrondie deux fois sur la facture PDF',
  'site.tasksCard.jira2': 'Changer la carte d’un abonnement en cours',
  'site.tasksCard.jira3': 'Les avoirs manquent dans l’export mensuel',
  'site.startCard.ticket': 'Ticket lu, dépôt identifié',
  'site.startCard.worktree': 'Worktree créé sur une nouvelle branche',
  'site.startCard.deps': 'Dépendances installées',
  'site.startCard.plan': 'Rédaction du plan d’implémentation, puis relecture',
  'site.startCard.implementing': 'Implémentation en cours',
  // Voir la note du catalogue anglais.
  'site.features.groupCloudTitle': 'Cloud',
  'site.features.groupIntegrationsTitle': 'Connexion avec vos outils',
  'site.features.groupInsightsTitle': 'Information sidebar',

  // La famille desktop. « Split View » et « Spotlight » sont des noms que l'app porte
  // telle quelle : seules leurs descriptions sont ici.
  'site.features.worktreesTitle': 'Un worktree par chantier',
  'site.features.worktreesDesc':
    'Chaque agent travaille dans sa propre copie du projet : une fonctionnalité et un correctif ne touchent jamais les mêmes fichiers.',
  'site.features.splitViewDesc':
    'Deux agents côte à côte sur un grand écran : celui à qui vous répondez, et celui que vous surveillez.',
  'site.features.spotlightDesc':
    'Un raccourci global ouvre le Quick Launch depuis n’importe quelle app : donnez le ticket, l’agent démarre.',
  'site.features.menuBarTitle': 'Toujours présent',
  'site.features.menuBarDesc':
    'Elle démarre à l’ouverture de session et continue depuis la barre de menus, où l’icône indique combien d’agents vous attendent. Les agents travaillent en arrière-plan pendant que vous vous tournez les pouces.',
  // The review drawer under `Review the changes` — `ReviewDrawerMockup`.
  'site.reviewDrawer.filesChanged': '3 fichiers modifiés',
  'site.reviewDrawer.line': 'Ligne 11',
  'site.reviewDrawer.placeholder': 'Que doit savoir l’agent à propos de ces lignes ?',
  'site.reviewDrawer.comment': 'Arrondis la TVA au centime avant de l’ajouter au total.',
  'site.reviewDrawer.cancel': 'Annuler',
  'site.reviewDrawer.save': 'Enregistrer',
  'site.reviewDrawer.delete': 'Supprimer',
  'site.reviewDrawer.edit': 'Modifier',
  'site.reviewDrawer.noComments': 'Aucun commentaire',
  'site.reviewDrawer.oneComment': '1 commentaire',
  'site.reviewDrawer.sendToAgent': 'Envoyer à l’agent',
  'site.features.filePreviewTitle': 'Relire les modifications',
  'site.features.filePreviewDesc':
    'Une spec en cours d’écriture ou un fichier modifié dans le code : ouvrez-le, parcourez le diff, et commentez la ligne qui vous gêne. Tout se relit et se commente depuis l’interface, et l’agent reçoit vos remarques.',

  // La famille intégrations.
  // Voir la note du catalogue anglais.
  'site.features.cloudDesc':
    'Le même compte sur app.magic-slash.io, depuis n’importe quelle machine — votre équipe, vos dépôts, vos plans et vos réglages. Les agents, eux, tournent toujours sur la vôtre.',
  'site.features.teamTitle': 'Votre organisation, et qui en fait partie',
  'site.features.teamDesc':
    'Créez-la, ou rejoignez celle dont un collègue vous a envoyé l’invitation. Invitez par e-mail ou par lien : un membre voit l’équipe et travaille sur les dépôts partagés, un admin invite, change les rôles et archive.',
  'site.features.appSettingsTitle': 'Des réglages qui vous suivent, pas la machine',
  'site.features.appSettingsDesc':
    'Apparence, langue, notifications, Claude Code — réglés dans l’app ou ici, conservés sur votre compte. Il n’y a pas de fichier de config local : une deuxième machine se configure en se connectant.',

  // Voir la note du catalogue anglais.
  'site.features.jiraTitle': 'Piloter Jira depuis l’app',
  'site.features.jiraDesc':
    'Lire le ticket, le faire avancer sur le board, le commenter — sans ouvrir un onglet.',
  'site.features.githubTitle': 'Tout passe par GitHub',
  'site.features.githubDesc':
    'Issues, pull requests, fils de review et checks CI, lus et écrits là où ils vivent déjà.',
  'site.features.vscodeTitle': 'Ouvrir dans VS Code',
  'site.features.vscodeDesc':
    'Ouvrez un worktree, ou juste le fichier dont parle un agent, dans l’éditeur que vous utilisez déjà.',
  'site.features.claudeCodeTitle': 'Tourne sur votre Claude Code',
  'site.features.claudeCodeDesc':
    'Tout tourne sur votre abonnement, sur votre machine. Rien n’est réhébergé au milieu.',
  'site.features.machineSetupTitle': 'Configuré au démarrage',
  'site.features.machineSetupDesc':
    'Les huit skills, les serveurs MCP, les hooks et les permissions sont vérifiés — et installés — à chaque lancement de l’app.',
  // Voir la note du catalogue anglais.
  'site.features.tasksDesc':
    'Toutes les issues ouvertes et tous les tickets de backlog, GitHub comme Jira, groupés par dépôt dans votre propre fenêtre — et un clic sur l’un d’eux lance un agent dessus avec /magic:start.',

  // La famille configuration.
  'site.features.commitFormatTitle': 'Le format de commit que vous utilisez',
  'site.features.commitFormatDesc':
    'Conventional, Angular, Gitmoji ou forme libre, sur une ligne ou avec un corps, Claude en co-auteur ou non, l’ID du ticket dans le message ou non — et la règle qui décide si un commit peut tomber sur main. Réglé une fois par dépôt, puis /magic:commit s’y tient.',
  'site.features.pullRequestsTitle': 'La pull request, à votre façon',
  'site.features.pullRequestsDesc':
    'Le lien vers le ticket dans la description, les comptes de test pour les relecteurs, le modèle de PR du dépôt, un commentaire posté sur le ticket à l’ouverture, et la CI et la review surveillées jusqu’au vert. Réglé une fois par dépôt, puis /magic:pr s’y tient.',
  'site.features.languagesTitle': 'Une langue par surface',
  'site.features.languagesDesc':
    'Une langue pour les commits, une pour les pull requests, une pour les commentaires postés sur les tickets, une pour la spec et les tickets que /magic:plan rédige — et celle de la discussion avec Claude, qui n’est lue que par vous. Chacune se choisit à part, par dépôt.',
  'site.features.permissionModesTitle': 'Jusqu’où un agent peut aller',
  'site.features.permissionModesDesc':
    'Plan, standard, accept edits, auto ou bypass — ce qu’un agent fait avant de vous demander.',
  'site.features.profileTitle': 'Comment il vous parle',
  'site.features.profileDesc':
    'Juste après l’inscription, un court formulaire d’onboarding apprend à Claude Code qui vous êtes : votre prénom, votre rôle, votre niveau technique, le ton que vous voulez et vos langues. Chaque skill le lit avant de vous répondre, pour que la réponse arrive à la profondeur où vous lisez. Modifiable à tout moment depuis les réglages.',
  'site.features.teamReposTitle': 'Les dépôts que toute l’équipe partage',
  'site.features.teamReposDesc':
    'Partagez un dépôt avec votre organisation, ses conventions voyagent avec lui — en lecture seule pour les membres, seuls les admins les changent. Le tableau les liste tous, avec les agents dessus et où chacun en est. Votre clone local, lui, reste sur votre machine.',

  // La famille insights.
  // Le dessin de la sidebar d’info — `InfoSidebarMockup`, avec les libellés de l’app.
  'site.features.ticketInfoTitle': 'Le ticket, et où il en est',
  'site.features.ticketInfoDesc': 'Identifiant, titre, description et statut — ce que l’agent dit de son travail, tenu à jour à chaque étape. L’identifiant est cliquable et ouvre l’issue GitHub ou le ticket Jira dans votre navigateur. Plus besoin de retenir quel Claude Code travaille sur quelle tâche : tout est là, et c’est autant de charge mentale en moins.',
  'site.features.repositoryTitle': 'La branche, les fichiers, les commits',
  'site.features.repositoryDesc': 'La branche, les fichiers touchés par l’agent avec leurs lignes ajoutées et retirées, et les commits déjà posés — lus dans Git en direct. Deux boutons ouvrent le projet dans VS Code et le dépôt sur GitHub.',
  'site.features.devServerTitle': 'Lancez un serveur local de test',
  'site.features.devServerDesc': 'Les scripts de votre package.json sont à un clic. Un serveur qui démarre affiche son adresse sous la carte, et l’adresse s’ouvre dans votre navigateur.',
  'site.features.pullRequestTitle': 'La pull request, suivie en direct',
  'site.features.pullRequestDesc': 'Les checks CI, les commentaires et le verdict de la review arrivent dans la carte au fil de l’eau — sans ouvrir GitHub.',
  'site.infoSidebar.uncommitted': 'Modifications non committées',
  'site.infoSidebar.fileOne': '{count} fichier',
  'site.infoSidebar.files': '{count} fichiers',
  'site.infoSidebar.commits': 'Commits',
  'site.infoSidebar.open': 'Ouvrir',
  'site.infoSidebar.scripts': 'Scripts',
  'site.infoSidebar.scriptsDev': 'Dev',
  'site.infoSidebar.scriptsBuild': 'Build',
  'site.infoSidebar.scriptsTest': 'Test',
  'site.infoSidebar.stop': 'Arrêter',
  'site.agentPanel.stateOpen': 'Ouverte',
  'site.agentPanel.reviewCommented': 'Commentée',
  'site.agentPanel.reviewApproved': 'Approuvée',
  'site.agentPanel.commentOne': '{count} commentaire',
  'site.agentPanel.commentsCount': '{count} commentaires',
  // The left sidebar's usage card — `UsageCardMockup`, the app's own labels.
  'site.usageCard.session': 'Session (5 h)',
  'site.usageCard.weekly': 'Semaine (7 j)',
  'site.usageCard.resetSession': '2 h 14',
  'site.usageCard.resetWeekly': '3 j',
  // The PR comments drawer — `PRCommentsMockup`.
  'site.features.prCommentsTitle': 'Les commentaires de la PR, lus sur place',
  'site.features.prCommentsDesc': 'Un clic sur la ligne Commentaires ouvre chaque fil dans un panneau : les lignes visées, l’auteur, le verdict, les réponses. Et n’importe quel fil peut être renvoyé directement à l’agent.',
  'site.prComments.threads': '3 fils',
  'site.prComments.oneReply': '1 réponse',
  'site.prComments.resolved': 'Résolu',
  'site.prComments.previous': 'Précédent',
  'site.prComments.next': 'Suivant',
  'site.prComments.counter': '1 / 2 commentaires de code',
  'site.prComments.age1': '1 h',
  'site.prComments.age2': '32 min',
  'site.prComments.age3': '3 min',
  'site.prComments.root1': 'La TVA est arrondie après avoir été ajoutée au total : sur une facture à deux lignes, ça fait un centime d’écart avec le PDF.',
  'site.prComments.reply1': 'Bien vu. Corrigé dans a3f1c92 : l’arrondi se fait une fois, sur le total.',
  'site.prComments.summary': 'Approuvé — merci pour le test qui couvre le cas à deux lignes.',
  // The status table under the ticket card — `StatusPill.tsx`'s options, one sentence each.
  'site.status.planning': 'planification',
  'site.status.planningDesc': '/magic:plan écrit la spec avec vous.',
  'site.status.planned': 'planifié',
  'site.status.plannedDesc': 'La spec est écrite ; rien n’est encore codé.',
  'site.status.inProgress': 'en cours',
  'site.status.inProgressDesc': 'L’agent travaille sur le code.',
  'site.status.committed': 'committé',
  'site.status.committedDesc': 'Le travail est dans des commits sur la branche, pas encore poussés.',
  'site.status.readyForPR': 'prêt pour la PR',
  'site.status.readyForPRDesc': 'Tout est committé ; la pull request peut être ouverte.',
  'site.status.prCreated': 'PR créée',
  'site.status.prCreatedDesc': 'La pull request est ouverte sur GitHub.',
  'site.status.ciGreen': 'CI verte',
  'site.status.ciGreenDesc': 'Tous les checks de la pull request sont passés.',
  'site.status.inReview': 'en revue',
  'site.status.inReviewDesc': 'Un relecteur a la pull request entre les mains.',
  'site.status.changesRequested': 'modifications demandées',
  'site.status.changesRequestedDesc': 'La revue a demandé des changements ; /magic:resolve les prend en charge.',
  'site.status.reviewAddressed': 'revue traitée',
  'site.status.reviewAddressedDesc': 'Les changements demandés sont poussés ; la revue peut reprendre.',
  'site.status.prMerged': 'PR mergée',
  'site.status.prMergedDesc': 'La pull request est mergée ; /magic:done ferme le ticket.',
  // ── La fenêtre Skills — `SkillsModalMockup` ─────────────────────────────
  //
  // Voir la note côté anglais : le titre de la ligne est « Skills », le mot de la barre
  // de titre de la fenêtre, et c'est un `LiteralTitle` dans `lib/features.ts` — pas une
  // entrée de catalogue.
  'site.features.skillsPageDesc':
    'Toutes les skills que Claude Code peut atteindre, dans une seule fenêtre : celles que Magic Slash embarque, celles que vous avez écrites, et celles que portent vos dépôts. À côté, ce que leurs descriptions coûtent à chaque message, et une alerte dès qu’un doublon ou une description trop longue commence à grignoter ce budget.',
  // CE QUE DIT L'APPLICATION, clé pour clé — les phrases des catalogues du desktop plutôt
  // que de nouvelles : qui ouvre l'application après cette page doit y retrouver les mêmes
  // mots. Elles vivent dans `desktop/src/i18n/*.ts`.
  'site.skillsCard.allSkills': 'Tous les skills',
  'site.skillsCard.builtIn': 'Intégrés',
  'site.skillsCard.builtInHelp': 'Les skills cœur de Magic Slash, qui pilotent le cycle de développement',
  'site.skillsCard.custom': 'Personnalisés',
  'site.skillsCard.customHelp': 'Vos skills, disponibles dans tous les projets',
  'site.skillsCard.repos': 'Skills des dépôts',
  'site.skillsCard.reposHelp':
    'Skills définis dans vos dépôts enregistrés (.claude/skills/ et .claude/commands/)',
  'site.skillsCard.deployPreview': 'Déploie la branche sur un environnement de préversion et publie l’URL.',
  'site.skillsCard.releaseNotes': 'Transforme les pull requests mergées depuis le dernier tag en notes de version.',
  'site.skillsCard.dbMigrate': 'Écrit la migration, la joue sur une base jetable et la relit.',
  'site.skillsCard.import': 'Importer',
  'site.skillsCard.new': 'Nouveau skill',
  'site.skillsCard.sourceBuiltIn': 'intégré',
  'site.skillsCard.warnings': 'Avertissements',
  'site.skillsCard.longDesc':
    '2 skills dont les descriptions dépassent 110 mots. Envisagez de les optimiser pour de meilleures performances.',
  'site.skillsCard.words': '{count} mots',
  'site.skillsCard.openInVSCode': 'Ouvrir dans VS Code',
  'site.skillsCard.fixWithAgent': 'Corriger avec un agent',
  'site.skillsCard.budgetSection': 'Budget des skills',
  'site.skillsCard.budgetHelp': 'Ce que coûtent les descriptions de vos skills, à chaque message.',
  'site.skillsCard.windowLabel': 'Fenêtre de contexte',
  'site.skillsCard.windowHint': 'Détectée sur l’agent en cours.',
  'site.skillsCard.chars': 'Caractères (budget réel)',
  'site.skillsCard.charsValue': '32 400 / 40 000',
  'site.skillsCard.unitChars': 'car.',
  'site.skillsCard.tokens': 'Tokens (estimation)',
  'site.skillsCard.tokensValue': '8 100 / 10 000',
  'site.skillsCard.unitTokens': 'tokens',
  'site.skillsCard.how': 'Comment c’est calculé',
  'site.skillsCard.details': 'Détail par skill',
  // ── La légende sous le dessin ──────────────────────────────────────────
  'site.skillsCard.legendRailTitle': 'Toutes les skills de la machine',
  'site.skillsCard.legendRailDesc':
    'Le rail liste les trois origines d’un coup : les huit que Magic Slash embarque, celles que vous vous êtes écrites, et celles que chaque dépôt enregistré porte dans .claude/. Un clic ouvre la skill à côté de la liste.',
  'site.skillsCard.legendBudgetTitle': 'Un budget qui suit le modèle',
  'site.skillsCard.legendBudgetDesc':
    'Claude Code dépense environ 1 % de la fenêtre de contexte à lister vos skills. Les jauges sont calées sur la fenêtre que rapporte l’agent en cours : la même bibliothèque est confortable sur un modèle à 1M et serrée sur un 200K.',
  'site.skillsCard.legendWarningsTitle': 'Elle vous dit ce qui cloche',
  'site.skillsCard.legendWarningsDesc':
    'Un nom défini deux fois, une description au-delà de 110 mots, tout ce qui est coupé avant que Claude ne le voie : chaque cas est nommé, avec le fichier à ouvrir et un agent qui le réécrit pour vous.',
  'site.skillsCard.legendEditTitle': 'Écrire, importer, partager',
  'site.skillsCard.legendEditDesc':
    'Une skill est un fichier markdown. Cette fenêtre en crée un, importe le dossier qu’on vous a envoyé, modifie les instructions sur place et réexporte le tout.',
  'site.infoSidebar.justNow': 'à l’instant',
  'site.infoSidebar.session': 'Session',
  'site.infoSidebar.context': 'Contexte',
  'site.infoSidebar.status': 'en revue',
  'site.infoSidebar.ticketTitle': 'TVA arrondie deux fois sur la facture PDF',
  'site.infoSidebar.ticketDescription':
    'Les totaux de ligne sont arrondis avant la TVA, puis la TVA est arrondie à nouveau. Arrondir une fois, sur le total.',
  'site.features.usageTitle': 'Vos limites Claude Code',
  'site.features.usageDesc':
    'Ce qu’il reste de votre session de cinq heures et de votre semaine glissante, sur chaque écran de l’app.',
  'site.features.agentContextTitle': 'Le contexte dépensé par l’agent en cours',
  'site.features.agentContextDesc':
    'La part de sa fenêtre que ce run a déjà remplie, en tokens et en pourcentage — l’agent affiché, pas le compte.',
  'site.features.planSessionsTitle': 'Les plans, les vôtres et ceux de l’équipe',
  'site.features.planSessionsDesc':
    'Chaque session /magic:plan sur un dépôt que vous pouvez voir — la spec qu’elle a écrite et les tickets qu’elle a créés. Conservés sur votre compte : un plan survit à la fenêtre où il a été écrit.',

  // ── ③ Sur le produit que vous avez déjà ────────────────────────────────────
  'site.yourProduct.title': 'Sur le produit que vous avez déjà.',
  'site.yourProduct.subtitle': 'Pas une page blanche, pas un bac à sable.',
  'site.yourProduct.p1':
    'Connectez un dépôt : il reprend votre structure, vos conventions et votre historique.',
  'site.yourProduct.p2':
    'GitHub pour les pull requests et les issues. Jira pour les tickets. VS Code pour ouvrir n’importe quel fichier. Rien à migrer.',
  'site.yourProduct.seeDocs': 'Voir la doc',

  // ── ④ Plusieurs chantiers à la fois ────────────────────────────────────────
  'site.parallel.title': 'Plusieurs chantiers à la fois.',
  'site.parallel.subtitle':
    'Jusqu’à 12 chantiers en parallèle, chacun dans sa copie isolée de votre projet. Rien ne se télescope.',
  'site.parallel.p1':
    'Lancez une fonctionnalité, corrigez un bug, nettoyez un vieux module — en même temps, sans qu’ils se gênent.',
  'site.parallel.p2':
    'Un écran montre chaque chantier et où il en est. Votre Mac vous prévient quand quelque chose vous attend.',
  'site.parallel.cta': 'En savoir plus sur l’app',

  // ── ⑤ Ça s'adapte à votre façon de travailler ──────────────────────────────
  'site.yourWay.title': 'Ça s’adapte à votre façon de travailler.',
  'site.yourWay.subtitle':
    'Chaque projet a ses habitudes. Magic Slash apprend les vôtres et s’y tient.',
  'site.yourWay.p1':
    'Réglez les conventions une fois par projet — la forme des commits, la langue, les modèles. Dix projets, dix jeux d’habitudes.',
  'site.yourWay.p2':
    'Le travail arrive fini : rien à moitié fait, rien à nettoyer derrière.',
  'site.yourWay.seeDocs': 'Voir la doc',

  // ── ⑥ Vous savez toujours où ça en est ─────────────────────────────────────
  'site.whereItStands.title': 'Vous savez toujours où ça en est.',
  'site.whereItStands.subtitle':
    'Chaque chantier a son panneau : sur quoi il travaille, et où il en est arrivé.',
  'site.whereItStands.p1':
    'Le ticket, la branche, les commits, la pull request — lus dans GitHub et Jira en direct, jamais saisis à la main.',
  'site.whereItStands.p2':
    'En attente de revue ? Modifications demandées ? Un check rouge ? Vous le voyez sans ouvrir un seul onglet.',
  'site.whereItStands.cta': 'Voir le workflow complet',

  // ── ⑦ Pourquoi on a construit ça (teaser vers /story) ──────────────────────
  'site.why.title': 'Pourquoi on a construit ça.',
  'site.why.p1':
    'On utilisait Claude Code tous les jours, sur de vrais projets. Et chaque fois, la même routine : lire le ticket, le reformuler en prompt, préparer la branche à la main, écrire le commit, décrire la PR. Ça marchait. C’était juste lent et ennuyeux.',
  'site.why.p2':
    'Alors on a automatisé les parties ennuyeuses — et on a continué jusqu’à ce que l’ensemble se construise tout seul.',
  'site.why.cta': 'Lire notre histoire',

  // ── ⑧ FAQ ──────────────────────────────────────────────────────────────────
  'site.faq.title': 'FAQ & Troubleshooting',
  'site.faq.q1': 'Faut-il être développeur ?',
  'site.faq.a1':
    'Il faut un projet de code et un minimum d’aisance avec Git. Vous n’avez pas besoin d’écrire le code — c’est justement le principe — mais ce n’est pas un outil no-code : il travaille sur de vrais projets.',
  'site.faq.q2': 'Magic Slash est-il gratuit ?',
  'site.faq.a2':
    'Oui. Magic Slash est open-source et gratuit. Il suffit d’un abonnement Claude Code.',
  'site.faq.q3': 'Est-ce compatible avec GitHub Issues ?',
  'site.faq.a3': 'Tout à fait. Magic Slash supporte Jira et GitHub Issues nativement.',
  'site.faq.q4': 'Puis-je personnaliser le format de commit ?',
  'site.faq.a4':
    'Oui. Choisissez entre Conventional Commits, Angular, Gitmoji, ou définissez votre propre format par projet.',
  'site.faq.q5': 'Est-ce compatible avec tous les langages ?',
  'site.faq.a5':
    'Oui. Magic Slash est agnostique au langage — il fonctionne avec tout projet que Claude Code peut gérer.',
  'site.faq.viewAll': 'Voir toute la FAQ',

  // ── CTA de fin ─────────────────────────────────────────────────────────────
  // ── CTA de clôture (page d'accueil) ────────────────────────────────────────
  'site.finalCta.title':
    'Faites passer votre workflow de product builder à la vitesse supérieure.',
  'site.finalCta.subtitle': 'Essayez Magic Slash.',
  'site.finalCta.button': 'Obtenir Magic Slash pour Mac',

  'site.cta.title': 'Commencez à construire.',
  'site.cta.subtitle': 'Gratuit, et une minute suffit pour l’installer.',
  'site.cta.button': 'Commencer gratuitement',

  // ── Maquette du hero ───────────────────────────────────────────────────────
  // Uniquement le chrome de la fenêtre. Les lignes du terminal ne sont PAS ici : c'est
  // le log que le vrai produit imprime, et il l'imprime en anglais — elles vivent en dur
  // dans `AppMockup.tsx`. `{n}` est remplacé par l'animation.
  'site.mockup.menuNewAgent': 'Nouvel agent',
  'site.mockup.menuSkills': 'Skills',
  'site.mockup.menuTeam': 'Équipe',
  'site.mockup.agentsLabel': 'AGENTS',
  'site.mockup.needsAttention': 'Demande une action',
  'site.mockup.usageSession': 'Session (5 h)',
  'site.mockup.usageWeekly': 'Semaine (7 j)',
  'site.mockup.autoMode': 'mode auto activé (shift+tab pour changer)',
  'site.mockup.replay': 'Rejouer',
  'site.mockup.session': 'SESSION',
  'site.mockup.context': 'Contexte',
  'site.mockup.commits': 'Commits',
  'site.mockup.aheadOfMain': '{n} en avance sur main',
  'site.mockup.addRepo': 'Ajouter un dépôt',
  'site.mockup.scripts': 'Scripts',
  'site.mockup.open': 'Ouvrir',

  // Le badge d'état du ticket, un libellé par étape que la run lui fait traverser. Ils
  // reprennent le vocabulaire d'état de l'app (`statusPill.*` dans les catalogues du
  // desktop), puisqu'il s'agit du même badge montrant le même workflow.
  'site.mockup.inProgress': 'en cours',
  'site.mockup.ticketInReview': 'en revue',
  'site.mockup.ticketReviewed': 'revu',
  'site.mockup.ticketDone': 'terminé',
  'site.mockup.uncommitted': 'Non committé',
  'site.mockup.oneFile': '{n} fichier modifié',
  'site.mockup.manyFiles': '{n} fichiers modifiés',
  'site.mockup.inReview': 'en review',
  'site.mockup.merged': 'mergée',

  // ── Illustration des réglages de dépôt (section ⑤) ──────────────────────────
  // Chaque libellé est repris du catalogue `repo.*` de l'app plutôt que réécrit, pour que
  // l'illustration dise ce que dit l'écran qu'elle dessine. Les VALEURS à côté (main,
  // magic-slash, PROJ-142…) sont des littéraux dans `RepoSettings.tsx`, comme les lignes
  // de log du terminal.
  'site.repoCfg.subtitle': 'Configurer les réglages du dépôt',
  'site.repoCfg.scope': 'Portée',
  'site.repoCfg.personal': 'Personnel',
  'site.repoCfg.personalHelp':
    'Vous seul voyez ce dépôt. Partagez-le avec une organisation pour en faire un dépôt d’équipe.',
  'site.repoCfg.general': 'Général',
  'site.repoCfg.name': 'Nom',
  'site.repoCfg.nameHelp': 'Nom affiché du dépôt',
  'site.repoCfg.keywords': 'Mots-clés',
  'site.repoCfg.keywordsHelp': 'Mots-clés de détection automatique (séparés par des virgules)',
  'site.repoCfg.discussionLang': 'Langue de discussion',
  'site.repoCfg.discussionLangHelp': 'Langue utilisée par Claude quand il échange avec vous',
  'site.repoCfg.color': 'Couleur',
  'site.repoCfg.colorHelp': 'Couleur du projet dans la barre latérale',
  'site.repoCfg.branches': 'Branches',
  'site.repoCfg.development': 'Branche de développement',
  'site.repoCfg.developmentHelp': 'Branche de référence pour comparer les commits',
  'site.repoCfg.worktree': 'Worktree',
  'site.repoCfg.files': 'Fichiers à copier',
  'site.repoCfg.filesHelp':
    'Fichiers copiés depuis le dépôt principal vers les nouveaux worktrees (ex. : .env, .env.local)',
  'site.repoCfg.add': 'Ajouter',
  'site.repoCfg.commit': 'Commit',
  'site.repoCfg.language': 'Langue',
  'site.repoCfg.commitLangHelp': 'Langue des messages de commit',
  'site.repoCfg.style': 'Style',
  'site.repoCfg.styleHelp': 'Une seule ligne, ou plusieurs lignes avec un corps',
  'site.repoCfg.styleSingle': 'Une seule ligne',
  'site.repoCfg.format': 'Format',
  'site.repoCfg.formatHelp': 'Format / convention des messages de commit',
  'site.repoCfg.formatAngular': 'Angular (type(scope) : description)',
  'site.repoCfg.coAuthor': 'Co-auteur',
  'site.repoCfg.coAuthorHelp': 'Ajouter Claude comme co-auteur des commits',
  'site.repoCfg.ticketId': 'Inclure l’ID du ticket',
  'site.repoCfg.ticketIdHelp':
    'Ajouter l’ID du ticket depuis le nom de branche dans le message de commit',
  'site.repoCfg.example': 'Exemple',
  'site.repoCfg.resolve': 'Resolve',
  'site.repoCfg.commitMode': 'Mode de commit',
  'site.repoCfg.commitModeHelp': 'Comment committer les corrections de revue',
  'site.repoCfg.modeNew': 'Nouveau commit',
  'site.repoCfg.commitFormat': 'Format de commit',
  'site.repoCfg.commitFormatHelp': 'Source du format des messages de commit de resolve',
  'site.repoCfg.useCommitConfig': 'Utiliser les réglages de commit',
  'site.repoCfg.pr': 'Pull Request',
  'site.repoCfg.prLangHelp': 'Langue des titres et descriptions de pull request',
  'site.repoCfg.autoLink': 'Lier les tickets automatiquement',
  'site.repoCfg.autoLinkHelp': 'Ajouter les liens de ticket Jira/GitHub dans la description de la PR',
  'site.repoCfg.watchCI': 'Surveiller la CI et la review',
  'site.repoCfg.watchCIHelp':
    'Après création de la PR, attendre les checks, corriger les échecs automatiquement, traiter les retours de review et ajouter l’URL de preview de la PR aux scénarios de test',
  'site.repoCfg.issues': 'Jira / GitHub Issues',
  'site.repoCfg.commentLang': 'Langue des commentaires',
  'site.repoCfg.commentLangHelp': 'Langue des commentaires sur les tickets Jira et GitHub',
  'site.repoCfg.commentOnPR': 'Commenter à la création de la PR',
  'site.repoCfg.commentOnPRHelp':
    'Ajouter un commentaire contenant le lien de la PR au moment de sa création',
  'site.repoCfg.jiraUrl': 'URL Jira',
  'site.repoCfg.jiraUrlHelp': 'URL de base des tickets Jira (ex. : PROJ-123)',
  'site.repoCfg.danger': 'Zone sensible',
  'site.repoCfg.delete': 'Supprimer ce dépôt',
  'site.repoCfg.deleteHelp': 'Retirer ce dépôt de la configuration de Magic Slash',
  'site.repoCfg.deleteAction': 'Supprimer le dépôt',

  // ── Illustration du panneau d'agent (section ⑥) ─────────────────────────────
  'site.agentPanel.title': 'Infos de {name}',
  'site.agentPanel.closeAgent': 'Fermer l’agent',
  'site.agentPanel.ago': 'il y a {time}',
  'site.agentPanel.justNow': 'à l’instant',
  'site.agentPanel.tokens': '{used} tokens',
  'site.agentPanel.statusPrCreated': 'PR créée',
  'site.agentPanel.statusCiGreen': 'CI verte',
  'site.agentPanel.statusChangesRequested': 'modifications demandées',
  'site.agentPanel.statusReviewAddressed': 'revue traitée',
  'site.agentPanel.statusPrMerged': 'PR mergée',
  'site.agentPanel.prNumber': 'Pull request #{number}',
  'site.agentPanel.reviewPending': 'En attente de revue',
  'site.agentPanel.reviewChanges': 'Modifications demandées',
  'site.agentPanel.merged': 'Mergée',
  'site.agentPanel.comments': 'Commentaires',
  'site.agentPanel.checks': 'Checks CI',
  'site.agentPanel.checksPassed': '{passed}/{total} réussis',
  'site.agentPanel.noConflicts': 'Aucun conflit',
  'site.agentPanel.launchDone': 'Lancer magic-done',
  'site.agentPanel.lastChecked': 'vérifié {time}',
  'site.agentPanel.refresh': 'Rafraîchir',

  // ── Page histoire ──────────────────────────────────────────────────────────
  'site.story.label': 'Notre histoire',
  'site.story.heroTitle': 'On en avait marre<br>du copier-coller.',
  'site.story.heroIntro':
    'On utilisait Claude Code tous les jours, sur de vrais projets, avec de vrais tickets Jira. Et à chaque fois, c’était la même chose : lire le ticket, le reformuler en prompt, créer les worktrees à la main, committer manuellement, rédiger les descriptions de PR from scratch. Ça marchait. Mais c’était lent, répétitif et ennuyeux.',
  'site.story.painTitle': 'À quoi ça ressemblait avant.',
  'site.story.painSubtitle':
    'Chaque tâche, c’était la même routine. Voici ce qu’on faisait 5 à 10 fois par jour.',
  'site.story.pain1Title': 'Lire et comprendre le ticket',
  'site.story.pain1Desc':
    'Ouvrir Jira, lire le titre, la description, les critères d’acceptation. Comprendre ce qu’il faut faire, puis basculer sur le terminal et tout reformuler en prompt pour Claude Code.',
  'site.story.pain2Title': 'Créer le worktree à la main',
  'site.story.pain2Desc':
    'Trouver le nom de branche depuis l’ID du ticket, lancer git worktree add, cd dedans, vérifier qu’on est sur la bonne branche de base. À. Chaque. Fois.',
  'site.story.pain3Title': 'Écrire le prompt parfait',
  'site.story.pain3Desc':
    'Traduire la spec Jira dans le meilleur prompt possible. Copier-coller les critères d’acceptation, ajouter du contexte sur la codebase, espérer n’avoir rien oublié d’important.',
  'site.story.pain4Title': 'Commit, PR, description',
  'site.story.pain4Desc':
    'Stager les changements, écrire un message de commit conventionnel, pousser, ouvrir la PR, rédiger la description, lier le ticket Jira, mettre à jour le statut. Tout à la main.',
  'site.story.pain5Title': 'Répondre aux reviews seul',
  'site.story.pain5Desc':
    'Lire chaque commentaire de review, comprendre le feedback, corriger le code, force-push, résoudre les threads. Aucune aide, aucune automatisation.',
  'site.story.pain6Title': 'Nettoyer (si on y pense)',
  'site.story.pain6Desc':
    'Une fois mergé, supprimer le worktree, la branche locale, la branche remote. Une fois sur cinq, on oublie, et les branches mortes s’accumulent.',
  'site.story.timelineTitle': 'Comment on en est arrivé là.',
  'site.story.timelineSubtitle':
    'D’un brainstorm à un produit utilisé au quotidien par l’équipe.',
  'site.story.tl1Date': 'Début janvier 2026',
  'site.story.tl1Title': 'Le premier brainstorm',
  'site.story.tl1Desc':
    'Idée initiale : une extension Chrome qui ajoute un bouton sur les tickets Jira pour copier la spec et la coller dans un Claude Code lancé à la main. Simple, mais pas suffisant.',
  'site.story.tl2Date': 'Janvier 2026',
  'site.story.tl2Title': 'Pivot vers les slash commands',
  'site.story.tl2Desc':
    'Après le brainstorm, la décision est claire : oubliez l’extension, on construit des slash commands Claude Code alimentées par les serveurs MCP GitHub et Atlassian — pour intégrer nativement les tickets Jira et les GitHub Issues. Direct, rapide, zéro changement de contexte.',
  'site.story.tl3Date': 'Mi-janvier 2026',
  'site.story.tl3Title': 'Première version de magic-slash',
  'site.story.tl3Desc':
    'magic-slash sort avec une landing page, une commande <code>/start</code> pour lancer des tâches depuis les tickets Jira, et un CLI d’install soigné pour une expérience développeur au top. Récupérer la spec, créer la branche, commencer à coder — une commande.',
  'site.story.tl4Date': 'Fin janvier 2026',
  'site.story.tl4Title': '/commit et /done arrivent',
  'site.story.tl4Desc':
    '<code>/commit</code> pour des commits conventionnels rapides et <code>/done</code> pour pousser, ouvrir la PR et mettre à jour Jira. Le cycle complet prend forme. Les slash commands évoluent en skills Claude Code pour une meilleure expérience.',
  'site.story.tl5Date': 'Février 2026',
  'site.story.tl5Title': 'Testé au combat par l’équipe',
  'site.story.tl5Desc':
    'magic-slash entre en utilisation intensive quotidienne dans l’équipe dev. De vrais tickets, de vraies PRs, de vrais retours. Chaque point de friction remonte et est corrigé.',
  'site.story.tl6Date': 'Début mars 2026',
  'site.story.tl6Title': 'Magic-slash desktop est né',
  'site.story.tl6Desc':
    'Nouveau problème : avec 7-8 instances Claude lancées dans des terminaux, personne ne savait quel agent travaillait sur quoi. Trop de temps perdu en remise en contexte. Alors on a construit une app desktop pour tout voir d’un coup d’œil — jusqu’à 12 agents en parallèle, chacun sur son propre ticket.',
  'site.story.tl7Date': 'Mars 2026',
  'site.story.tl7Title': 'De 3 skills à 7 — le flow de dev complet',
  'site.story.tl7Desc':
    'Le nombre de skills passe de 3 à 7 avec un cycle de développement complet. <code>/done</code> devient <code>/pr</code> pour créer les pull requests, et un nouveau <code>/done</code> gère la clôture du ticket après le merge. <code>/review</code> et <code>/resolve</code> arrivent pour automatiser les revues de code et traiter les retours. Plus un mois complet de tests de l’app desktop, corrections de bugs et affinage de l’UI.',
  'site.story.tl8Date': 'Avril 2026',
  'site.story.tl8Title': 'Rebranding & le Lapin Ninja',
  'site.story.tl8Desc':
    'Nouvelle identité avec une mascotte : le Lapin Ninja. Un sabre pour le Slash, un lapin blanc comme symbole de la magie. Nouvelle landing page, nouvelle direction visuelle.',
  'site.story.tl9Date': 'Coming soon',
  'site.story.tl9Title': 'Et ensuite ?',
  'site.story.tl9Desc':
    'Plus d’intégrations, des reviews plus intelligentes, et bien plus encore. Stay tuned.',
  'site.story.ctaTitle': 'Prêt à essayer ?',
  'site.story.ctaDesc': 'Installez magic-slash et voyez la différence.',
  'site.story.ctaBtn': 'Commencer gratuitement',

  // ── Footer ─────────────────────────────────────────────────────────────────
  'site.footer.tagline': 'Votre produit, construit.',
  'site.footer.product': 'Produit',
  'site.footer.features': 'Fonctionnalités',
  'site.footer.commands': 'Les commandes',
  'site.footer.download': 'Télécharger',
  'site.footer.howItWorks': 'Comment ça marche',
  'site.footer.gettingStarted': 'Démarrage rapide',
  'site.footer.updates': 'Mises à jour',
  'site.footer.configuration': 'Configuration',
  'site.footer.changelog': 'Changelog',
  'site.footer.resources': 'Ressources',
  'site.footer.documentation': 'Documentation',
  'site.footer.faq': 'FAQ',
  'site.footer.ourStory': 'Notre histoire',
  'site.footer.legal': 'Légal',
  'site.footer.security': 'Politique de sécurité',
  'site.footer.company': 'Entreprise',
  'site.footer.license': 'Licence',
  'site.footer.reportIssue': 'Signaler un problème',
  'site.footer.termsLink': 'Conditions',
  'site.footer.privacyLink': 'Confidentialité',
}
