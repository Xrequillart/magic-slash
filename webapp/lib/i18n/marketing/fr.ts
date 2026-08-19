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
  'site.hero.title': 'Vous décrivez.<br>Ça se construit.',
  'site.hero.subtitle':
    'Magic Slash travaille sur le produit que vous avez déjà — et mène chaque chantier jusqu’au bout.',
  'site.hero.cta': 'Commencer gratuitement',
  'site.hero.howCta': 'Voir comment ça marche',

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
  'site.how.commandsTitle': 'Les sept commandes',
  'site.how.commandsIntro':
    'Tapez <strong>/magic:</strong> pour les retrouver toutes d’un coup.',
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
  'site.footer.howItWorks': 'Comment ça marche',
  'site.footer.gettingStarted': 'Démarrage rapide',
  'site.footer.updates': 'Mises à jour',
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
