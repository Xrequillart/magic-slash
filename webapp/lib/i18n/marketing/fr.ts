import type { marketingEn } from './en'

/**
 * French catalogue for the public site. Typed against `marketingEn`, so a key added
 * there and forgotten here is a tsc error rather than an English sentence on a French
 * page.
 *
 * Wording is the French copy that has been live on magic-slash.io (the `fr` half of
 * the `i18n` object in `docs/script.js`) — this is a port, not a retranslation, so
 * the site reads exactly as it did.
 *
 * Vouvoiement throughout, matching the app catalogue in `lib/i18n/fr.ts`.
 */
export const marketingFr: Record<keyof typeof marketingEn, string> = {
  // ── Nav ────────────────────────────────────────────────────────────────────
  'site.nav.product': 'Produit',
  'site.nav.productCategory': 'Produit',
  // Just "Application" in the nav, where it sits between "Skills" and "Ressources"
  // and the row has to stay short. The footer says "Application Desktop" in full —
  // that is `site.footer.desktopApp`, a separate key.
  'site.nav.desktopApp': 'Application',
  'site.nav.skills': 'Skills',
  'site.nav.resources': 'Ressources',
  'site.nav.getStarted': 'Commencer',
  'site.nav.signIn': 'Connexion',
  'site.nav.account': 'Votre compte',
  'site.nav.documentationCategory': 'Documentation',
  'site.nav.gettingStarted': 'Démarrage rapide',
  'site.nav.skillsReference': 'Référence des skills',
  'site.nav.configuration': 'Configuration',
  'site.nav.viewAllDocs': 'Voir toute la doc',
  'site.nav.communityCategory': 'Communauté',
  'site.nav.faq': 'FAQ',
  'site.nav.updatesCategory': 'Mises à jour',
  'site.nav.changelog': 'Changelog',
  'site.nav.ourStory': 'Notre histoire',

  // ── Hero ───────────────────────────────────────────────────────────────────
  'site.hero.title': 'Les tâches ingrates,<br>automatisées.',
  'site.hero.subtitle': 'Du ticket au merge — sans la corvée.',
  'site.hero.cta': 'Commencer',
  'site.hero.docsCta': 'Voir la doc',

  // ── Maquette desktop (la fausse fenêtre de l'app dans le hero) ─────────────
  'site.desktop.newAgent': 'Nouvel agent',
  'site.desktop.skills': 'Skills',
  'site.desktop.settings': 'Paramètres',
  'site.desktop.agents': 'Agents',
  'site.desktop.inProgress': 'En cours',
  'site.desktop.ticketTitle': "Ajouter le middleware d'auth JWT",
  'site.desktop.ticketDesc':
    'Implémenter la validation des tokens et la logique de rafraîchissement pour la passerelle API.',
  'site.desktop.repositories': 'Dépôts',
  'site.desktop.filesChanged': '3 fichiers modifiés',
  'site.desktop.aheadOfMain': '2 en avance sur main',
  'site.desktop.heroLabel': 'Application Desktop',
  'site.desktop.heroTitle': 'Tous vos agents,<br>un seul écran.',
  'site.desktop.heroIntro':
    'Suivez chaque agent en temps réel. Tâches, diffs et contexte Jira côte à côte — sans jongler entre les terminaux. Conçu pour les développeurs qui travaillent sur plusieurs tâches en parallèle.',

  // ── Section 1 — Sept skills ────────────────────────────────────────────────
  'site.section1.title': '7 skills.<br>Tout le workflow.',
  'site.section1.subtitle': 'Du ticket au merge en sept commandes slash.',
  'site.section1.startDesc':
    '<strong>/magic:start</strong> récupère votre ticket et crée la branche.',
  'site.section1.continueDesc':
    '<strong>/magic:continue</strong> reprend le travail sur un ticket existant.',
  'site.section1.commitDesc':
    '<strong>/magic:commit</strong> indexe, découpe et rédige votre message de commit.',
  'site.section1.prDesc': '<strong>/magic:pr</strong> pousse et crée la pull request.',
  'site.section1.reviewDesc':
    "<strong>/magic:review</strong> review une PR selon les conventions d'équipe.",
  'site.section1.resolveDesc':
    '<strong>/magic:resolve</strong> traite les commentaires de review et pousse les corrections.',
  'site.section1.doneDesc':
    '<strong>/magic:done</strong> finalise après le merge — nettoie et met à jour Jira.',
  'site.section1.prefixHint':
    'Tapez <strong>/magic:</strong> pour retrouver toutes les commandes.',
  'site.section1.noContext':
    "Pas de changement de contexte. Pas de copier-coller d'identifiants. Juste du flow.",
  'site.section1.seeDocs': 'Voir la doc',

  // ── Section 2 — Gestionnaire de skills ─────────────────────────────────────
  'site.section2.skillsTitle': 'Skills',
  'site.section2.newSkill': 'Nouveau skill',
  'site.section2.startDesc': 'Récupérer le ticket et créer la branche',
  'site.section2.continueDesc': 'Reprendre le travail sur un ticket existant',
  'site.section2.commitDesc': 'Commit intelligent avec contexte',
  'site.section2.prDesc': 'Pousser et créer la pull request',
  'site.section2.reviewDesc': "Revue de PR selon les conventions d'équipe",
  'site.section2.resolveDesc': 'Traiter les commentaires de review',
  'site.section2.doneDesc': 'Finaliser après le merge',
  'site.section2.deployDesc': 'Builder, tester et déployer en staging',
  'site.section2.title': 'Gérez les skills Claude Code.',
  'site.section2.p1':
    "Ajoutez, éditez et organisez vos skills Claude Code directement depuis l'application desktop. Chaque skill est un simple fichier markdown — pas de fichiers de config à chercher.",
  'site.section2.p2':
    'Les skills intégrés vous lancent immédiatement. Créez-en sur mesure pour les workflows de votre équipe, vos pipelines de déploiement ou vos standards de code.',
  'site.section2.seeDocs': 'Voir la doc',

  // ── Section 3 — Configuration ──────────────────────────────────────────────
  'site.section3.title': 'Une config.<br>Chaque repo.',
  'site.section3.p1':
    'Adaptez le style de commit, les templates de PR et la langue par dépôt. Choisissez entre Conventional Commits, Angular, Gitmoji ou format libre.',
  'site.section3.p2':
    'Rédigez vos commits en anglais ou en français. Synchronisez automatiquement les tickets Jira et utilisez vos propres templates de PR avec des résumés générés par IA.',
  'site.section3.seeDocs': 'Voir la doc',
  'site.section3.commitFormat': 'Format de commit',
  'site.section3.language': 'Langue',
  'site.section3.jiraSync': 'Sync Jira',
  'site.section3.prTemplate': 'Template de PR',

  // ── Section 4 — Multi-agent ────────────────────────────────────────────────
  'site.section4.agents': 'Agents',
  'site.section4.title': '12 agents.<br>Une fenêtre.',
  'site.section4.p1':
    "Lancez des instances Claude Code en parallèle et voyez tout d'un coup d'œil. Statut visuel par agent, notifications natives macOS et glisser-déposer pour réorganiser.",
  'site.section4.p2':
    "Barre latérale d'info avec le contexte complet de l'agent. Projets colorés pour une reconnaissance instantanée.",
  'site.section4.seeDocs': 'Voir la doc',

  // ── Section 5 — Intégrations ───────────────────────────────────────────────
  'site.section5.title': 'Se branche sur votre stack.',
  'site.section5.p1':
    'Intégrations natives avec GitHub pour les PRs, issues et revues. Jira pour les tickets et la synchronisation de statut. VS Code pour ouvrir fichiers et projets.',
  'site.section5.p2':
    "Support complet de Git avec worktrees et branches. Tout est connecté, rien n'est manuel.",
  'site.section5.seeDocs': 'Voir la doc',

  // ── Bandeau skills ─────────────────────────────────────────────────────────
  'site.skillsBanner.title': '7 skills.<br>Tout le workflow.',
  'site.skillsBanner.subtitle':
    'Du ticket au merge en sept commandes slash. Chaque skill gère une étape de votre cycle de développement — récupérer un ticket, coder, committer, ouvrir une PR, reviewer, résoudre les commentaires et clôturer. Lancez plusieurs tâches en parallèle grâce aux worktrees Git — chaque agent travaille dans sa propre branche isolée, sans aucun conflit. Pas de changement de contexte, pas de copier-coller. Juste du flow.',
  'site.skillsBanner.cta': 'Découvrir les skills',

  // ── Section 6 — Contexte du ticket ─────────────────────────────────────────
  'site.section6.agentInfo': 'Info agent',
  'site.section6.inProgress': 'En cours',
  'site.section6.ticketTitle': "Ajouter le flux d'authentification utilisateur",
  'site.section6.ticketDesc':
    'Implémenter la connexion OAuth 2.0 avec Google et GitHub. Ajouter la gestion des sessions et la logique de rafraîchissement des tokens.',
  'site.section6.filesChanged': '3 fichiers modifiés',
  'site.section6.noCommits': 'Aucun commit',
  'site.section6.title': 'Votre ticket, toujours en contexte.',
  'site.section6.p1':
    'Quand vous faites <strong>/magic:start</strong> sur un ticket, magic-slash récupère le titre, la description et les métadonnées depuis Jira ou GitHub Issues. Chaque commande que vous lancez sait sur quoi vous travaillez.',
  'site.section6.p2':
    'Les messages de commit référencent le bon ticket. Les PRs incluent le contexte complet. Fini les allers-retours entre onglets pour copier-coller les détails des issues.',
  'site.section6.seeDocs': 'Voir la doc',

  // ── Application desktop ────────────────────────────────────────────────────
  'site.desktopApp.title': 'Tous vos agents, un seul écran.',
  'site.desktopApp.p1':
    'Suivez chaque agent en temps réel. Tâches, diffs et contexte Jira côte à côte — sans jongler entre les terminaux.',
  'site.desktopApp.p2':
    'Tickets Jira, statut Git et suivi des PRs — toujours visibles, toujours synchronisés.',
  'site.desktopApp.cta': 'Explorer l’app',
  'site.desktopApp.feat1Title': 'Vue split',
  'site.desktopApp.feat1Desc':
    'Deux agents côte à côte. Glissez-déposez entre les panneaux, chacun scrolle indépendamment.',
  'site.desktopApp.feat2Title': 'Suivi en temps réel',
  'site.desktopApp.feat2Desc':
    'Statut en direct pour chaque agent, regroupé par étape du workflow. Notifications natives quand quelque chose requiert votre attention.',
  'site.desktopApp.feat3Title': 'Panneau de contexte',
  'site.desktopApp.feat3Desc':
    'Une sidebar avec le ticket lié, la branche Git, les changements, les commits et le statut de la PR — tout en temps réel.',
  'site.desktopApp.feat3Desc2':
    "En dessous, l'état Git en temps réel : branche courante, fichiers modifiés non committés avec le nombre d'ajouts et de suppressions par fichier, et une jauge visuelle qui montre le ratio du diff d'un coup d'œil. Vous voyez exactement ce que l'agent a touché avant même qu'il committe.",
  'site.desktopApp.feat3Desc3':
    "Plus bas, l'historique des commits avec les hashes courts et les dates relatives, plus le nombre de commits d'avance sur la branche de base. Et quand une PR existe, elle apparaît en bas avec son statut de review — ouverte, approuvée ou changements demandés — liée directement à GitHub.",
  'site.desktopApp.feat4Title': 'Keyboard-first',
  'site.desktopApp.feat4Desc':
    'Chaque action a son raccourci. Naviguer, splitter, toggle les sidebars — tout sans la souris.',
  'site.desktopApp.feat5Title': 'Budget des skills',
  'site.desktopApp.feat5Desc':
    'Consommation tokens et caractères par skill avec catégories de poids. Créez et gérez vos skills avec un scoping par repo.',
  'site.desktopApp.feat6Title': 'Script runner',
  'site.desktopApp.feat6Desc':
    'Lancez vos scripts package.json directement depuis le panneau contextuel — dev, build, test, lint — sans taper une seule commande. Plus besoin de basculer vers un terminal séparé pour lancer un build ou vos tests.',
  'site.desktopApp.feat6Desc2':
    "Les résultats de Vitest, Jest et Mocha sont automatiquement parsés et affichés en notifications toast avec le nombre de tests passés/échoués. Si un test échoue, l'agent est signalé immédiatement pour que vous puissiez intervenir.",
  'site.desktopApp.feat6Desc3':
    "Les scripts tournent en arrière-plan pendant que vos agents continuent de travailler. Vous avez le streaming de l'output en temps réel, le suivi des codes de sortie, et un log complet consultable à tout moment. Un clic pour lancer, un clic pour stopper — toute votre toolchain à côté de votre code.",
  'site.desktopApp.feat7Title': 'Mises à jour auto',
  'site.desktopApp.feat7Desc':
    'Mises à jour silencieuses en arrière-plan avec notes de version au redémarrage. Toujours à jour, zéro effort.',
  'site.desktopApp.feat8Title': 'Configuration par repo',
  'site.desktopApp.feat8Desc':
    'Style de commit, langue, templates PR et config worktree par repo. Une équipe, dix repos, dix conventions.',
  'site.desktopApp.feat9Title': 'Notifications en temps réel',
  'site.desktopApp.feat9Desc':
    'Quand un agent termine une tâche, rencontre une erreur ou attend votre intervention, vous recevez une notification macOS native instantanément. Pas besoin de surveiller l’écran — continuez à travailler et laissez l’app vous prévenir quand quelque chose requiert votre attention.',
  'site.desktopApp.feat10Title': 'Quick Launch',
  'site.desktopApp.feat10Desc':
    'Appuyez sur ⌃Espace pour ouvrir une palette de commandes style Spotlight. Recherchez des agents, lancez des skills ou naviguez vers n’importe quel repo — sans quitter le clavier. Le champ se réinitialise à chaque ouverture.',
  'site.desktopApp.feat11Title': 'Intégration barre de menus',
  'site.desktopApp.feat11Desc':
    'magic-slash vit dans votre barre de menus macOS. Un popover léger vous donne un aperçu rapide des agents en cours et de leur statut sans afficher la fenêtre principale. Cliquez pour agrandir, ou laissez-le tranquille dans le tray.',
  'site.desktopApp.feat13Title': 'Historique d’activité',
  'site.desktopApp.feat13Desc':
    'Chaque action est consignée dans une frise chronologique : tâche démarrée, commit créé, PR ouverte, review terminée, ticket clôturé. Les entrées sont regroupées par jour et colorées par type d’action, pour parcourir votre semaine d’un coup d’œil.',
  'site.desktopApp.feat13Desc2':
    'Dépliez un groupe pour entrer dans le détail des événements, ou videz l’historique pour repartir à zéro. C’est votre journal de développement — sans écrire une ligne.',

  // ── Agents en parallèle ────────────────────────────────────────────────────
  'site.parallel.title': '12 agents. 12 tâches. Zéro attente.',
  'site.parallel.p1':
    "Lancez jusqu'à 12 agents en parallèle, chacun sur son propre ticket dans son propre worktree. Démarrez une feature, corrigez un bug et refactorez un endpoint — en même temps.",
  'site.parallel.p2':
    "Pas de file d'attente, pas de changement de contexte. Chaque agent tourne indépendamment avec un accès complet à votre stack.",
  'site.parallel.seeDocs': 'Voir la doc',

  // ── Pourquoi ───────────────────────────────────────────────────────────────
  'site.why.title': 'Pourquoi on construit ça.',
  'site.why.point1Title': 'Jira rencontre Claude Code.',
  'site.why.point1Desc':
    'Vos tickets vivent dans Jira, votre code vit dans Claude Code. magic-slash fait le pont entre les deux pour que chaque commande sache sur quoi vous travaillez, pourquoi, et pour qui.',
  'site.why.point2Title': 'Zéro perte de contexte.',
  'site.why.point2Desc':
    'Fini de reformuler les specs du ticket en prompts. magic-slash injecte la description Jira complète, les critères d’acceptation et les métadonnées directement dans Claude Code. Le prompt humain rencontre des specs bien définies — rien ne se perd.',
  'site.why.point3Title': 'Une commande au lieu de dix.',
  'site.why.point3Desc':
    'On tapait toujours les mêmes prompts pour démarrer une tâche, créer une branche, committer, pousser et ouvrir une PR. Maintenant c’est juste /magic:start PROJ-123 — rapide, consistant, et terminé.',
  'site.why.cta': 'Lire notre histoire',

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
  'site.story.ctaBtn': 'Commencer',

  // ── Page skills ────────────────────────────────────────────────────────────
  'site.skills.label': 'Skills',
  'site.skills.heroTitle': '7 skills.<br>Tout le workflow.',
  'site.skills.heroSubtitle':
    'Du ticket au merge en sept commandes slash. Chaque skill gère une étape de votre cycle de développement. Pas de changement de contexte, pas de copier-coller. Juste du flow.',
  'site.skills.startTitle': 'Récupérez votre ticket.',
  'site.skills.startDesc':
    'Récupère le ticket Jira ou GitHub, analyse la spec, crée un worktree avec le bon nom de branche, et lance un agent qui code et implémente la spec du ticket — en une seule commande.',
  'site.skills.continueTitle': 'Reprenez où vous en étiez.',
  'site.skills.continueDesc':
    'Bascule sur un worktree existant et recharge tout le contexte du ticket. Reprenez là où vous en étiez — ou prenez le relais sur le travail d’un collègue. Pas de fil perdu, pas besoin de relire la spec.',
  'site.skills.commitTitle': 'Committez avec du contexte.',
  'site.skills.commitDesc':
    'Indexe vos changements, génère un message de commit conventionnel depuis le diff et le contexte du ticket, et committe. Fini le copier-coller d’identifiants ou la rédaction de messages from scratch.',
  'site.skills.prTitle': 'Expédiez la PR.',
  'site.skills.prDesc':
    'Pousse sur le remote, crée la pull request avec une description complète, et passe le ticket Jira en review. Une commande, zéro changement d’onglet.',
  'site.skills.reviewTitle': 'Reviewez avec des standards.',
  'site.skills.reviewDesc':
    'Récupère le diff de la PR et la review selon les conventions de votre équipe. Commentaires inline, approbation — tout automatisé. Fonctionne en self-review ou sur des PRs externes.',
  'site.skills.resolveTitle': 'Corrigez les retours de review.',
  'site.skills.resolveDesc':
    'Lit chaque commentaire de review, applique les corrections, et force-push. Tous les threads résolus, pas d’allers-retours. Du feedback au fix en quelques secondes.',
  'site.skills.doneTitle': 'Bouclez la boucle.',
  'site.skills.doneDesc':
    'Merge la PR, supprime la branche et le worktree, et passe le ticket Jira en Done. Table rase, prêt pour la prochaine tâche.',
  'site.skills.seeDocs': 'Voir la doc',
  'site.skills.overviewTitle': 'En un coup d’œil.',
  'site.skills.overviewSubtitle': 'Sept commandes. Un cycle de développement complet.',
  'site.skills.overviewStartTitle': 'Start',
  'site.skills.overviewStartDesc': 'Récupérer le ticket, créer le worktree, coder.',
  'site.skills.overviewContinueTitle': 'Continue',
  'site.skills.overviewContinueDesc': 'Reprendre le travail sur un ticket existant.',
  'site.skills.overviewCommitTitle': 'Commit',
  'site.skills.overviewCommitDesc': 'Indexer, message, commit — avec du contexte.',
  'site.skills.overviewPrTitle': 'Pull Request',
  'site.skills.overviewPrDesc': 'Pousser, créer la PR, mettre à jour Jira.',
  'site.skills.overviewReviewTitle': 'Review',
  'site.skills.overviewReviewDesc': 'Revue de code automatisée avec commentaires inline.',
  'site.skills.overviewResolveTitle': 'Resolve',
  'site.skills.overviewResolveDesc': 'Corriger les commentaires de review, force-push.',
  'site.skills.overviewDoneTitle': 'Done',
  'site.skills.overviewDoneDesc':
    'Merge, nettoyage, transition Jira en Done. Boucle bouclée.',

  // ── FAQ ────────────────────────────────────────────────────────────────────
  'site.faq.title': 'FAQ & Troubleshooting',
  'site.faq.q1': 'magic-slash est-il gratuit ?',
  'site.faq.a1':
    "Oui. magic-slash est entièrement open-source et gratuit. Il suffit d'un abonnement Claude Code.",
  'site.faq.q2': 'Est-ce compatible avec GitHub Issues ?',
  'site.faq.a2': 'Tout à fait. magic-slash supporte Jira et GitHub Issues nativement.',
  'site.faq.q3': 'Puis-je personnaliser le format de commit ?',
  'site.faq.a3':
    'Oui. Choisissez entre Conventional Commits, Angular, Gitmoji, ou définissez votre propre format par repo.',
  'site.faq.q4': 'Est-ce compatible avec tous les langages ?',
  'site.faq.a4':
    'Oui. magic-slash est agnostique au langage — il fonctionne avec tout projet que Claude Code peut gérer.',
  'site.faq.viewAll': 'Voir toute la FAQ',

  // ── Section flow ───────────────────────────────────────────────────────────
  'site.flow.title': 'Le flow complet.',
  'site.flow.subtitle': 'Sept étapes du ticket au merge. Scrollez pour les découvrir.',
  'site.flow.step1Title': 'Récupérez votre ticket.',
  'site.flow.step1Desc':
    'Récupère le ticket Jira ou GitHub, analyse la spec, crée un worktree avec le bon nom de branche, et lance un agent qui code et implémente la spec du ticket — en une seule commande.',
  'site.flow.step2Title': 'Reprenez où vous en étiez.',
  'site.flow.step2Desc':
    'Bascule sur un worktree existant et recharge tout le contexte du ticket. Reprenez là où vous en étiez — ou prenez le relais sur le travail d’un collègue. Pas de fil perdu, pas besoin de relire la spec.',
  'site.flow.step3Title': 'Committez avec du contexte.',
  'site.flow.step3Desc':
    'Indexe vos changements, génère un message de commit conventionnel depuis le diff et le contexte du ticket, et committe. Fini le copier-coller d’identifiants.',
  'site.flow.step4Title': 'Expédiez la PR.',
  'site.flow.step4Desc':
    'Pousse sur le remote, crée la pull request avec une description complète, et passe le ticket Jira en review.',
  'site.flow.step5Title': 'Reviewez avec des standards.',
  'site.flow.step5Desc':
    'Récupère le diff de la PR et la review selon les conventions de votre équipe. Commentaires inline, approbation — tout automatisé.',
  'site.flow.step6Title': 'Corrigez les retours de review.',
  'site.flow.step6Desc':
    'Lit chaque commentaire de review, applique les corrections, et force-push. Tous les threads résolus, pas d’allers-retours.',
  'site.flow.step7Title': 'Bouclez la boucle.',
  'site.flow.step7Desc':
    'Merge la PR, supprime la branche et le worktree, et passe le ticket Jira en Done. Table rase.',
  'site.flow.cta': 'Commencer',

  // ── CTA de fin ─────────────────────────────────────────────────────────────
  'site.cta.title': 'Lancez-vous en 30 secondes.',
  'site.cta.button': 'Commencer',
  'site.cta.subtitle': 'Installez magic-slash et transformez votre workflow.',

  // ── Footer ─────────────────────────────────────────────────────────────────
  'site.footer.tagline': 'Votre workflow, en pilote automatique.',
  'site.footer.product': 'Produit',
  'site.footer.gettingStarted': 'Démarrage rapide',
  'site.footer.desktopApp': 'Application Desktop',
  'site.footer.updates': 'Mises à jour',
  'site.footer.skills': 'Skills',
  'site.footer.configuration': 'Configuration',
  'site.footer.changelog': 'Changelog',
  'site.footer.resources': 'Ressources',
  'site.footer.documentation': 'Documentation',
  'site.footer.faq': 'FAQ',
  'site.footer.ourStory': 'Notre histoire',
  'site.footer.company': 'Entreprise',
  'site.footer.license': 'Licence',
  'site.footer.reportIssue': 'Signaler un problème',
  'site.footer.termsLink': 'Conditions',
  'site.footer.privacyLink': 'Confidentialité',
}
