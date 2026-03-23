feather.replace();

// ── i18n translations ──
var i18n = {
    en: {
        // Nav
        'nav.resources': 'Resources',
        'nav.getStarted': 'Get started',
        'nav.documentationCategory': '<i data-feather="book"></i> Documentation',
        'nav.gettingStarted': 'Getting Started',
        'nav.skillsReference': 'Skills Reference',
        'nav.configuration': 'Configuration',
        'nav.viewAllDocs': 'View all docs <i data-feather="arrow-right"></i>',
        'nav.communityCategory': '<i data-feather="users"></i> Community',
        'nav.faq': 'FAQ',
        'nav.updatesCategory': '<i data-feather="zap"></i> Updates',
        'nav.changelog': 'Changelog <span class="version-badge" id="latestVersion"></span>',
        // Hero
        'hero.title': 'Just start<br>build faster',
        'hero.subtitle': 'AI-powered skills for Claude Code — from Jira tickets to pull requests.',
        'hero.cta': 'Get started',
        // Desktop mockup
        'desktop.newAgent': 'New agent',
        'desktop.skills': 'Skills',
        'desktop.settings': 'Settings',
        'desktop.agents': 'Agents',
        'desktop.inProgress': 'In Progress',
        'desktop.ticketTitle': 'Add JWT auth middleware',
        'desktop.ticketDesc': 'Implement token validation and refresh logic for the API gateway.',
        'desktop.repositories': 'Repositories',
        'desktop.filesChanged': '3 files changed',
        'desktop.aheadOfMain': '2 ahead of main',
        // Section 1 — Seven Skills
        'section1.title': '7 skills.<br>Entire workflow.',
        'section1.subtitle': 'From ticket to merge in seven slash commands.',
        'section1.startDesc': '<b style="color:#000">/magic:start</b> grabs your ticket and creates the branch.',
        'section1.continueDesc': '<b style="color:#000">/magic:continue</b> resumes work on an existing ticket.',
        'section1.commitDesc': '<b style="color:#000">/magic:commit</b> stages, splits, and writes your commit message.',
        'section1.prDesc': '<b style="color:#000">/magic:pr</b> pushes and creates the pull request.',
        'section1.reviewDesc': '<b style="color:#000">/magic:review</b> reviews a PR with your team conventions.',
        'section1.resolveDesc': '<b style="color:#000">/magic:resolve</b> addresses review comments and pushes fixes.',
        'section1.doneDesc': '<b style="color:#000">/magic:done</b> finalizes after merge — cleans up and updates Jira.',
        'section1.prefixHint': 'Type <b style="color:#000">/magic:</b> to find all commands at once.',
        'section1.noContext': 'No context switching. No copy-pasting ticket IDs. Just flow.',
        'section1.seeDocs': 'See docs',
        // Section 2 — Skills Manager
        'section2.skillsTitle': 'Skills',
        'section2.newSkill': 'New skill',
        'section2.startDesc': 'Fetch ticket and create branch',
        'section2.continueDesc': 'Resume work on existing ticket',
        'section2.commitDesc': 'Smart commit with context',
        'section2.prDesc': 'Push and create pull request',
        'section2.reviewDesc': 'Review PR with team conventions',
        'section2.resolveDesc': 'Address review comments',
        'section2.doneDesc': 'Finalize after merge',
        'section2.deployDesc': 'Build, test and deploy to staging',
        'section2.title': 'Manage Claude Code skills.',
        'section2.p1': 'Add, edit and organize your Claude Code skills directly from the desktop app. Each skill is a simple markdown file — no config files to hunt down.',
        'section2.p2': 'Built-in skills get you started instantly. Create custom ones for your team\'s workflows, deploy pipelines, or code standards.',
        'section2.seeDocs': 'See docs',
        // Section 3 — Configuration
        'section3.title': 'One config.<br>Every repo.',
        'section3.p1': 'Tailor commit style, PR templates, and language per repository. Choose between Conventional Commits, Angular, Gitmoji, or free-form formats.',
        'section3.p2': 'Write commits in English or French. Auto-sync Jira tickets and use your own PR templates with AI-powered summaries.',
        'section3.seeDocs': 'See docs',
        'section3.commitFormat': 'Commit format',
        'section3.language': 'Language',
        'section3.jiraSync': 'Jira sync',
        'section3.prTemplate': 'PR template',
        // Section 4 — Multi-Agent
        'section4.agents': 'Agents',
        'section4.title': '12 agents.<br>One window.',
        'section4.p1': 'Launch parallel Claude Code instances and see everything at a glance. Visual status per agent, macOS native notifications, and drag-and-drop to reorder.',
        'section4.p2': 'Info sidebar with full agent context. Color-coded projects for instant recognition.',
        'section4.seeDocs': 'See docs',
        // Section 5 — Integrations
        'section5.title': 'Plugs into your stack.',
        'section5.p1': 'Native integrations with GitHub for PRs, issues, and reviews. Jira for tickets and status sync. VS Code to open files and projects.',
        'section5.p2': 'Full Git support with worktrees and branches. Everything connected, nothing manual.',
        'section5.seeDocs': 'See docs',
        // Section 6 — Ticket Context
        'section6.agentInfo': 'Agent info',
        'section6.inProgress': 'In Progress',
        'section6.ticketTitle': 'Add user authentication flow',
        'section6.ticketDesc': 'Implement OAuth 2.0 login with Google and GitHub providers. Add session management and token refresh logic.',
        'section6.filesChanged': '3 files changed',
        'section6.noCommits': 'No committed changes',
        'section6.title': 'Your ticket, always in context.',
        'section6.p1': 'When you <b style="color:#000">/magic:start</b> a ticket, magic-slash fetches the title, description, and metadata from Jira or GitHub Issues. Every command you run knows what you\'re working on.',
        'section6.p2': 'Commit messages reference the right ticket. PRs include the full context. No more tab-switching to copy-paste issue details.',
        'section6.seeDocs': 'See docs',
        // CTA
        'cta.title': 'Start in 30 seconds.',
        'cta.subtitle': 'Install magic-slash and transform your workflow.',
        // Footer
        'footer.tagline': 'Made for developers who ship.'
    },
    fr: {
        // Nav
        'nav.resources': 'Ressources',
        'nav.getStarted': 'Commencer',
        'nav.documentationCategory': '<i data-feather="book"></i> Documentation',
        'nav.gettingStarted': 'Démarrage rapide',
        'nav.skillsReference': 'Référence des skills',
        'nav.configuration': 'Configuration',
        'nav.viewAllDocs': 'Voir toute la doc <i data-feather="arrow-right"></i>',
        'nav.communityCategory': '<i data-feather="users"></i> Communauté',
        'nav.faq': 'FAQ',
        'nav.updatesCategory': '<i data-feather="zap"></i> Mises à jour',
        'nav.changelog': 'Changelog <span class="version-badge" id="latestVersion"></span>',
        // Hero
        'hero.title': 'Dite start,<br>construisez plus vite',
        'hero.subtitle': 'Une application, des skills Claude Code. Une tâche à une pull request automatiquement.',
        'hero.cta': 'Commencer',
        // Desktop mockup
        'desktop.newAgent': 'Nouvel agent',
        'desktop.skills': 'Skills',
        'desktop.settings': 'Paramètres',
        'desktop.agents': 'Agents',
        'desktop.inProgress': 'En cours',
        'desktop.ticketTitle': 'Ajouter le middleware d\'auth JWT',
        'desktop.ticketDesc': 'Implémenter la validation des tokens et la logique de rafraîchissement pour la passerelle API.',
        'desktop.repositories': 'Dépôts',
        'desktop.filesChanged': '3 fichiers modifiés',
        'desktop.aheadOfMain': '2 en avance sur main',
        // Section 1 — Seven Skills
        'section1.title': '7 skills.<br>Tout le workflow.',
        'section1.subtitle': 'Du ticket au merge en sept commandes slash.',
        'section1.startDesc': '<b style="color:#000">/magic:start</b> récupère votre ticket et crée la branche.',
        'section1.continueDesc': '<b style="color:#000">/magic:continue</b> reprend le travail sur un ticket existant.',
        'section1.commitDesc': '<b style="color:#000">/magic:commit</b> indexe, découpe et rédige votre message de commit.',
        'section1.prDesc': '<b style="color:#000">/magic:pr</b> pousse et crée la pull request.',
        'section1.reviewDesc': '<b style="color:#000">/magic:review</b> review une PR selon les conventions d\'équipe.',
        'section1.resolveDesc': '<b style="color:#000">/magic:resolve</b> traite les commentaires de review et pousse les corrections.',
        'section1.doneDesc': '<b style="color:#000">/magic:done</b> finalise après le merge — nettoie et met à jour Jira.',
        'section1.prefixHint': 'Tapez <b style="color:#000">/magic:</b> pour retrouver toutes les commandes.',
        'section1.noContext': 'Pas de changement de contexte. Pas de copier-coller d\'identifiants. Juste du flow.',
        'section1.seeDocs': 'Voir la doc',
        // Section 2 — Skills Manager
        'section2.skillsTitle': 'Skills',
        'section2.newSkill': 'Nouveau skill',
        'section2.startDesc': 'Récupérer le ticket et créer la branche',
        'section2.continueDesc': 'Reprendre le travail sur un ticket existant',
        'section2.commitDesc': 'Commit intelligent avec contexte',
        'section2.prDesc': 'Pousser et créer la pull request',
        'section2.reviewDesc': 'Revue de PR selon les conventions d\'équipe',
        'section2.resolveDesc': 'Traiter les commentaires de review',
        'section2.doneDesc': 'Finaliser après le merge',
        'section2.deployDesc': 'Builder, tester et déployer en staging',
        'section2.title': 'Gérez les skills Claude Code.',
        'section2.p1': 'Ajoutez, éditez et organisez vos skills Claude Code directement depuis l\'application desktop. Chaque skill est un simple fichier markdown — pas de fichiers de config à chercher.',
        'section2.p2': 'Les skills intégrés vous lancent immédiatement. Créez-en sur mesure pour les workflows de votre équipe, vos pipelines de déploiement ou vos standards de code.',
        'section2.seeDocs': 'Voir la doc',
        // Section 3 — Configuration
        'section3.title': 'Une config.<br>Chaque repo.',
        'section3.p1': 'Adaptez le style de commit, les templates de PR et la langue par dépôt. Choisissez entre Conventional Commits, Angular, Gitmoji ou format libre.',
        'section3.p2': 'Rédigez vos commits en anglais ou en français. Synchronisez automatiquement les tickets Jira et utilisez vos propres templates de PR avec des résumés générés par IA.',
        'section3.seeDocs': 'Voir la doc',
        'section3.commitFormat': 'Format de commit',
        'section3.language': 'Langue',
        'section3.jiraSync': 'Sync Jira',
        'section3.prTemplate': 'Template de PR',
        // Section 4 — Multi-Agent
        'section4.agents': 'Agents',
        'section4.title': '12 agents.<br>Une fenêtre.',
        'section4.p1': 'Lancez des instances Claude Code en parallèle et voyez tout d\'un coup d\'œil. Statut visuel par agent, notifications natives macOS et glisser-déposer pour réorganiser.',
        'section4.p2': 'Barre latérale d\'info avec le contexte complet de l\'agent. Projets colorés pour une reconnaissance instantanée.',
        'section4.seeDocs': 'Voir la doc',
        // Section 5 — Integrations
        'section5.title': 'Se branche sur votre stack.',
        'section5.p1': 'Intégrations natives avec GitHub pour les PRs, issues et revues. Jira pour les tickets et la synchronisation de statut. VS Code pour ouvrir fichiers et projets.',
        'section5.p2': 'Support complet de Git avec worktrees et branches. Tout est connecté, rien n\'est manuel.',
        'section5.seeDocs': 'Voir la doc',
        // Section 6 — Ticket Context
        'section6.agentInfo': 'Info agent',
        'section6.inProgress': 'En cours',
        'section6.ticketTitle': 'Ajouter le flux d\'authentification utilisateur',
        'section6.ticketDesc': 'Implémenter la connexion OAuth 2.0 avec Google et GitHub. Ajouter la gestion des sessions et la logique de rafraîchissement des tokens.',
        'section6.filesChanged': '3 fichiers modifiés',
        'section6.noCommits': 'Aucun commit',
        'section6.title': 'Votre ticket, toujours en contexte.',
        'section6.p1': 'Quand vous faites <b style="color:#000">/magic:start</b> sur un ticket, magic-slash récupère le titre, la description et les métadonnées depuis Jira ou GitHub Issues. Chaque commande que vous lancez sait sur quoi vous travaillez.',
        'section6.p2': 'Les messages de commit référencent le bon ticket. Les PRs incluent le contexte complet. Fini les allers-retours entre onglets pour copier-coller les détails des issues.',
        'section6.seeDocs': 'Voir la doc',
        // CTA
        'cta.title': 'Lancez-vous en 30 secondes.',
        'cta.subtitle': 'Installez magic-slash et transformez votre workflow.',
        // Footer
        'footer.tagline': 'Fait pour les développeurs qui livrent.'
    }
};

// ── Typewriter animation for h1 ──
function typewriterH1(h1, html) {
    // Parse HTML to extract text segments and <br> positions
    // e.g. "Just start<br>build faster" → ["Just start", "build faster"]
    var lines = html.split(/<br\s*\/?>/i);
    h1.innerHTML = '';
    h1.classList.add('typewriter');
    h1.classList.remove('typewriter-done');

    var charQueue = [];
    lines.forEach(function(line, lineIndex) {
        for (var i = 0; i < line.length; i++) {
            charQueue.push({ type: 'char', value: line[i] });
        }
        if (lineIndex < lines.length - 1) {
            charQueue.push({ type: 'br' });
        }
    });

    var idx = 0;
    var speed = 70;
    var pauseDuration = 400;
    var currentSpan = document.createElement('span');
    h1.appendChild(currentSpan);

    function typeNext() {
        if (idx >= charQueue.length) {
            setTimeout(function() {
                h1.classList.add('typewriter-done');
                revealHeroElements();
            }, 600);
            return;
        }
        var item = charQueue[idx];
        idx++;
        if (item.type === 'br') {
            h1.appendChild(document.createElement('br'));
            currentSpan = document.createElement('span');
            h1.appendChild(currentSpan);
            setTimeout(typeNext, pauseDuration);
        } else {
            currentSpan.textContent += item.value;
            setTimeout(typeNext, speed);
        }
    }

    drawTrails();
    setTimeout(typeNext, speed);
}

// ── Fade-in hero elements after typewriter ──
function revealHeroElements() {
    var els = document.querySelectorAll('.hero-fade, .header-fade');
    var delay = 0;
    els.forEach(function(el) {
        setTimeout(function() { el.classList.add('visible'); }, delay);
        delay += 150;
    });
}

// ── Trail draw animation ──
function initTrails() {
    document.querySelectorAll('.trail').forEach(function(g) {
        var path = g.querySelector('path');
        if (!path) return;
        var len = path.getTotalLength();
        path.style.setProperty('--trail-len', len);
        g.classList.remove('draw');
    });
}

function drawTrails() {
    var trails = Array.prototype.slice.call(document.querySelectorAll('.trail'));
    trails.sort(function(a, b) {
        var orderA = parseInt(a.getAttribute('data-draw-order'), 10);
        var orderB = parseInt(b.getAttribute('data-draw-order'), 10);
        if (isNaN(orderA)) orderA = 9999;
        if (isNaN(orderB)) orderB = 9999;
        return orderA - orderB;
    });
    var cumulative = 0;
    trails.forEach(function(g, i) {
        var customDelay = g.getAttribute('data-draw-delay');
        if (i === 0) {
            cumulative = 0;
        } else if (customDelay) {
            cumulative += parseInt(customDelay, 10);
        } else {
            cumulative += 300;
        }
        setTimeout(function() { g.classList.add('draw'); }, cumulative);
    });
}

initTrails();

// ── setLanguage ──
function setLanguage(lang) {
    var translations = i18n[lang];
    if (!translations) return;

    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        if (translations[key] === undefined) return;
        // Skip h1 — handled by typewriter
        if (el.tagName === 'H1') return;
        if (el.hasAttribute('data-i18n-html')) {
            el.innerHTML = translations[key];
        } else {
            el.textContent = translations[key];
        }
    });

    // Reset fade elements and trails, replay typewriter
    document.querySelectorAll('.hero-fade, .header-fade').forEach(function(el) {
        el.classList.remove('visible');
    });
    initTrails();
    var h1 = document.querySelector('h1[data-i18n="hero.title"]');
    if (h1 && translations['hero.title']) {
        typewriterH1(h1, translations['hero.title']);
    }

    // Re-render feather icons after innerHTML replacements
    feather.replace();

    // Restore version badge if available
    if (window.__latestVersion) {
        var versionEl = document.getElementById('latestVersion');
        if (versionEl) versionEl.textContent = window.__latestVersion;
    }

    // Update html lang attribute
    document.documentElement.lang = lang;

    // Update lang label in header
    var langLabel = document.getElementById('langLabel');
    if (langLabel) langLabel.textContent = lang.toUpperCase();

    // Toggle active class on lang options
    document.querySelectorAll('.lang-option').forEach(function(opt) {
        if (opt.dataset.lang === lang) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });

    // Persist choice
    localStorage.setItem('magic-slash-lang', lang);
}

// ── Init language (default EN, respect localStorage) ──
(function() {
    var saved = localStorage.getItem('magic-slash-lang');
    setLanguage((saved && i18n[saved]) ? saved : 'en');
})();

// Language dropdown toggle
(function() {
    var toggle = document.getElementById('langToggle');
    var dropdown = document.getElementById('langDropdown');
    var options = dropdown.querySelectorAll('.lang-option');

    toggle.addEventListener('click', function(e) {
        e.stopPropagation();
        // Close nav dropdowns
        document.querySelectorAll('.header-nav-item').forEach(function(item) { item.classList.remove('open'); });
        dropdown.classList.toggle('open');
        toggle.classList.toggle('open');
    });

    options.forEach(function(opt) {
        opt.addEventListener('click', function(e) {
            e.preventDefault();
            setLanguage(opt.dataset.lang);
            dropdown.classList.remove('open');
            toggle.classList.remove('open');
        });
    });

    document.addEventListener('click', function() {
        dropdown.classList.remove('open');
        toggle.classList.remove('open');
    });
})();

// Nav dropdowns (Products, Resources) — toggle on click
(function() {
    var navItems = document.querySelectorAll('.header-nav-item');
    navItems.forEach(function(item) {
        var dd = item.querySelector('.header-dropdown');
        if (!dd) return;
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            // Close lang dropdown
            document.getElementById('langDropdown').classList.remove('open');
            document.getElementById('langToggle').classList.remove('open');
            var wasOpen = item.classList.contains('open');
            // Close all other nav dropdowns
            navItems.forEach(function(other) { other.classList.remove('open'); });
            if (!wasOpen) {
                item.classList.add('open');
            }
        });
    });
    document.addEventListener('click', function() {
        navItems.forEach(function(item) { item.classList.remove('open'); });
    });
})();


(function() {
    var hero = document.querySelector('.hero');
    var siteHeader = document.querySelector('.site-header');

    window.addEventListener('scroll', function() {
        if (window.scrollY > 0) {
            siteHeader.classList.add('scrolled');
        } else {
            siteHeader.classList.remove('scrolled');
        }
        if (window.scrollY > 600) {
            siteHeader.classList.add('past-hero');
        } else {
            siteHeader.classList.remove('past-hero');
        }
    });
})();


function copyCommand(btn) {
    var codeEl = btn.parentElement.querySelector('code');
    navigator.clipboard.writeText(codeEl.textContent);
    btn.innerHTML = '';
    var icon = document.createElement('i');
    icon.setAttribute('data-feather', 'check');
    btn.appendChild(icon);
    feather.replace();
    setTimeout(function() {
        btn.innerHTML = '';
        var copyIcon = document.createElement('i');
        copyIcon.setAttribute('data-feather', 'copy');
        btn.appendChild(copyIcon);
        feather.replace();
    }, 2000);
}

// Fetch latest version from GitHub
fetch('https://api.github.com/repos/xrequillart/magic-slash/releases/latest')
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.tag_name) {
            window.__latestVersion = data.tag_name;
            document.getElementById('latestVersion').textContent = data.tag_name;
            var headerBadge = document.getElementById('headerVersion');
            headerBadge.textContent = data.tag_name;
            headerBadge.href = data.html_url;
            headerBadge.target = '_blank';
        }
    })
    .catch(function() {});

// ── Desktop terminal animation ──
(function() {
    var terminal = document.querySelector('.desktop-main-terminal');
    if (!terminal) return;

    var contentEl = document.getElementById('desktop-terminal-content');
    if (!contentEl) return;

    var desktopTimeouts = [];
    var desktopAnimationStarted = false;

    function dt(fn, delay) {
        var id = setTimeout(fn, delay);
        desktopTimeouts.push(id);
        return id;
    }

    function selectIn(selector) {
        return terminal.querySelector(selector);
    }

    function lockScroll() {
        contentEl.style.overflowY = 'hidden';
    }
    function unlockScroll() {
        contentEl.style.overflowY = 'auto';
    }

    function scrollToEl(el) {
        if (!el) return;
        var scrollTarget = el.offsetTop + el.offsetHeight - contentEl.clientHeight + 40;
        if (scrollTarget > contentEl.scrollTop) {
            contentEl.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        }
    }

    function showEl(selector, delay) {
        dt(function() {
            var el = selectIn(selector);
            if (el) {
                el.classList.add('visible');
                scrollToEl(el);
            }
        }, delay);
    }

    function completeEl(selector, delay, showResult) {
        dt(function() {
            var el = selectIn(selector);
            if (el) {
                var loader = el.querySelector('.loader');
                var check = el.querySelector('.checkmark');
                var result = el.querySelector('.result');
                if (loader) loader.classList.add('done');
                if (check) check.classList.add('visible');
                if (showResult && result) result.classList.add('visible');
                scrollToEl(el);
            }
        }, delay);
    }

    function typeText(element, text, speed) {
        element.classList.add('typing');
        var i = 0;
        var interval = setInterval(function() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(interval);
                element.classList.remove('typing');
            }
        }, speed);
    }

    // Sidebar elements
    // Left sidebar agent elements
    var agentSpinner = document.getElementById('desktop-agent-auth-spinner');
    var agentCheck = document.getElementById('desktop-agent-auth-check');
    var agentDot = document.getElementById('desktop-agent-auth-dot');

    // Right sidebar elements
    var sidebarFiles = document.getElementById('desktop-right-files');
    var sidebarCount = document.getElementById('desktop-right-changes-count');
    var sidebarGauge = document.getElementById('desktop-right-gauge');
    var sidebarHead = document.getElementById('desktop-right-changes-head');
    var sidebarNoChanges = document.getElementById('desktop-right-no-changes');
    var sidebarCommits = document.getElementById('desktop-right-commits');
    var sidebarAhead = document.getElementById('desktop-right-ahead');

    // Sidebar file data matching the terminal diff files
    var sidebarFileData = [
        { name: 'src/middleware/auth.ts', added: 4, removed: 0 },
        { name: 'src/middleware/refresh.ts', added: 4, removed: 0 },
        { name: 'src/routes/index.ts', added: 2, removed: 1 }
    ];

    var sidebarFileCount = 0;

    function updateSidebarCount() {
        if (!sidebarCount) return;
        sidebarCount.textContent = sidebarFileCount + (sidebarFileCount === 1 ? ' file changed' : ' files changed');
        sidebarCount.classList.remove('fade-in');
        void sidebarCount.offsetWidth;
        sidebarCount.classList.add('fade-in');
    }

    function updateSidebarGauge() {
        if (!sidebarGauge) return;
        var totalAdded = 0;
        var totalRemoved = 0;
        for (var i = 0; i < sidebarFileCount; i++) {
            totalAdded += sidebarFileData[i].added;
            totalRemoved += sidebarFileData[i].removed;
        }
        var total = totalAdded + totalRemoved;
        var slots = 6;
        var greenSlots = total > 0 ? Math.round((totalAdded / total) * slots) : 0;
        var redSlots = total > 0 ? Math.round((totalRemoved / total) * slots) : 0;
        var neutralSlots = slots - greenSlots - redSlots;
        var html = '';
        for (var g = 0; g < greenSlots; g++) html += '<span class="g"></span>';
        for (var r = 0; r < redSlots; r++) html += '<span class="r"></span>';
        for (var n = 0; n < neutralSlots; n++) html += '<span class="n"></span>';
        sidebarGauge.innerHTML = html;
    }

    function addSidebarFile(index) {
        if (!sidebarFiles) return;
        if (sidebarNoChanges) sidebarNoChanges.classList.add('hidden');
        if (sidebarHead) sidebarHead.classList.remove('hidden');
        var data = sidebarFileData[index];
        var div = document.createElement('div');
        div.className = 'desktop-right-change-file fade-in';
        var text = data.name;
        if (data.added > 0) text += ' <span class="added">+' + data.added + '</span>';
        if (data.removed > 0) text += ' <span class="removed">-' + data.removed + '</span>';
        div.innerHTML = text;
        sidebarFiles.appendChild(div);
        sidebarFileCount++;
        updateSidebarCount();
        updateSidebarGauge();
    }

    function addSidebarCommit(hash, msg) {
        if (!sidebarCommits) return;
        var div = document.createElement('div');
        div.className = 'desktop-right-commit fade-in';
        div.innerHTML = '<span class="desktop-right-commit-hash">' + hash + '</span>' +
            '<span class="desktop-right-commit-msg">' + msg + '</span>' +
            '<span class="desktop-right-commit-time">now</span>';
        sidebarCommits.insertBefore(div, sidebarCommits.firstChild);
    }

    function showSidebarAhead(count) {
        if (!sidebarAhead) return;
        sidebarAhead.textContent = count + ' ahead of main';
        sidebarAhead.classList.add('fade-in');
    }

    function resetSidebar() {
        // Left sidebar agent reset
        if (agentSpinner) agentSpinner.classList.remove('active');
        if (agentCheck) agentCheck.classList.remove('visible');
        if (agentDot) agentDot.classList.remove('blue-to-green');
        sidebarFileCount = 0;
        if (sidebarFiles) sidebarFiles.innerHTML = '';
        if (sidebarCount) { sidebarCount.textContent = ''; sidebarCount.classList.remove('fade-in'); }
        if (sidebarGauge) sidebarGauge.innerHTML = '';
        if (sidebarCommits) sidebarCommits.innerHTML = '';
        if (sidebarHead) sidebarHead.classList.add('hidden');
        if (sidebarNoChanges) sidebarNoChanges.classList.remove('hidden');
        if (sidebarAhead) { sidebarAhead.textContent = ''; sidebarAhead.classList.remove('fade-in'); }
        var prLink = document.getElementById('desktop-right-pr-link');
        if (prLink) prLink.classList.remove('visible');
    }

    function startDesktopTerminalAnimation() {
        lockScroll();
        var typeSpeed = 60;
        var startCmdText = '/magic:start PROJ-142';
        var startCmdDuration = startCmdText.length * typeSpeed;
        var commitCmdDuration = '/magic:commit'.length * typeSpeed;
        var prCmdDuration = '/magic:pr'.length * typeSpeed;
        var reviewCmdDuration = '/magic:review 87'.length * typeSpeed;
        var resolveCmdDuration = '/magic:resolve'.length * typeSpeed;
        var doneCmdDuration = '/magic:done'.length * typeSpeed;

        // ===== PHASE 1: /start =====
        var p1 = 400;

        dt(function() {
            var prompt1 = selectIn('.phase-1-line.cli-prompt');
            var response1 = selectIn('.phase-1-line.cli-response');
            if (prompt1) {
                prompt1.classList.add('visible');
                scrollToEl(prompt1);
            }
            var cmd1 = prompt1 ? prompt1.querySelector('.command') : null;
            if (cmd1 && cmd1.dataset.text) {
                typeText(cmd1, cmd1.dataset.text, typeSpeed);
            }
            dt(function() {
                if (response1) {
                    response1.classList.add('visible');
                    scrollToEl(response1);
                }
            }, startCmdDuration + 200);
        }, p1);

        var p1Response = p1 + startCmdDuration + 400;
        showEl('.phase-1-status-1', p1Response);
        completeEl('.phase-1-status-1', p1Response + 800);

        showEl('.phase-1-status-2', p1Response + 1000);
        completeEl('.phase-1-status-2', p1Response + 2000, true);

        showEl('.phase-1-status-3', p1Response + 2200);
        completeEl('.phase-1-status-3', p1Response + 3000, true);

        showEl('.phase-1-status-4', p1Response + 3300);
        showEl('.phase-1-status-5', p1Response + 3600);

        // Left sidebar: start spinner when /start begins
        dt(function() {
            if (agentSpinner) agentSpinner.classList.add('active');
        }, p1);

        // Diff reveal + sidebar sync
        dt(function() {
            var diffContainer = selectIn('.agents-diff-container');
            if (diffContainer) {
                diffContainer.classList.add('visible');
                scrollToEl(diffContainer);

                var diffFiles = diffContainer.querySelectorAll('.diff-file');
                var fileDelay = 0;
                diffFiles.forEach(function(file, fileIndex) {
                    dt(function() {
                        file.classList.add('visible');
                        scrollToEl(file);
                        // Add file to sidebar when diff file appears
                        addSidebarFile(fileIndex);
                        var diffLines = file.querySelectorAll('.diff-line');
                        diffLines.forEach(function(line, lineIndex) {
                            dt(function() {
                                line.classList.add('visible');
                                scrollToEl(line);
                            }, lineIndex * 150);
                        });
                    }, fileDelay);
                    fileDelay += 1200;
                });
            }
        }, p1Response + 4100);

        // Complete agent
        dt(function() {
            var agentsEl = selectIn('.phase-1-status-5');
            var diffContainer = selectIn('.agents-diff-container');
            var fileCount = diffContainer ? diffContainer.querySelectorAll('.diff-file').length : 0;
            if (agentsEl) {
                var loader = agentsEl.querySelector('.loader');
                var check = agentsEl.querySelector('.checkmark');
                if (loader) loader.classList.add('done');
                if (check) check.classList.add('visible');
                agentsEl.classList.add('completed');
                var agentsText = agentsEl.querySelector('.agents-text');
                if (agentsText) agentsText.textContent = '1 agent done (' + fileCount + ' files updated)';
            }
        }, p1Response + 8500);

        // ===== PHASE 2: /commit =====
        var p2 = p1Response + 9500;

        dt(function() {
            var prompt2 = selectIn('.phase-2-line.cli-prompt');
            var response2 = selectIn('.phase-2-line.cli-response');
            if (prompt2) {
                prompt2.classList.add('visible');
                scrollToEl(prompt2);
            }
            var cmd2 = prompt2 ? prompt2.querySelector('.command') : null;
            if (cmd2 && cmd2.dataset.text) {
                typeText(cmd2, cmd2.dataset.text, typeSpeed);
            }
            dt(function() {
                if (response2) {
                    response2.classList.add('visible');
                    scrollToEl(response2);
                }
            }, commitCmdDuration + 200);
        }, p2);

        var p2Response = p2 + commitCmdDuration + 400;
        showEl('.phase-2-status-1', p2Response);
        completeEl('.phase-2-status-1', p2Response + 800, true);

        showEl('.phase-2-status-2', p2Response + 1000);
        completeEl('.phase-2-status-2', p2Response + 1800);

        showEl('.phase-2-status-3', p2Response + 2000);

        showEl('.phase-2-status-4', p2Response + 2200);
        completeEl('.phase-2-status-4', p2Response + 3000, true);

        // Sidebar: add commit and clear files changed when "Commit created!"
        dt(function() {
            if (sidebarFiles) sidebarFiles.innerHTML = '';
            if (sidebarCount) sidebarCount.textContent = '';
            if (sidebarGauge) sidebarGauge.innerHTML = '';
            if (sidebarHead) sidebarHead.classList.add('hidden');
            if (sidebarNoChanges) sidebarNoChanges.classList.remove('hidden');
            sidebarFileCount = 0;
            addSidebarCommit('a3f9c2d', 'feat(auth): add JWT middleware');
            showSidebarAhead(1);
        }, p2Response + 3000);

        // ===== PHASE 3: /pr =====
        var p3 = p2Response + 3800;

        dt(function() {
            var prompt3 = selectIn('.phase-3-line.cli-prompt');
            var response3 = selectIn('.phase-3-line.cli-response');
            if (prompt3) {
                prompt3.classList.add('visible');
                scrollToEl(prompt3);
            }
            var cmd3 = prompt3 ? prompt3.querySelector('.command') : null;
            if (cmd3 && cmd3.dataset.text) {
                typeText(cmd3, cmd3.dataset.text, typeSpeed);
            }
            dt(function() {
                if (response3) {
                    response3.classList.add('visible');
                    scrollToEl(response3);
                }
            }, prCmdDuration + 200);
        }, p3);

        var p3Response = p3 + prCmdDuration + 400;
        showEl('.phase-3-status-1', p3Response);
        completeEl('.phase-3-status-1', p3Response + 800, true);

        showEl('.phase-3-status-2', p3Response + 1000);
        completeEl('.phase-3-status-2', p3Response + 1800, true);

        // Sidebar: show PR link when PR is created
        dt(function() {
            var prLink = document.getElementById('desktop-right-pr-link');
            if (prLink) {
                prLink.classList.add('visible');
                feather.replace();
            }
        }, p3Response + 1800);

        showEl('.phase-3-status-3', p3Response + 2000);
        completeEl('.phase-3-status-3', p3Response + 2800, true);

        // ===== PHASE 4: /review =====
        var p4 = p3Response + 3600;

        dt(function() {
            var prompt4 = selectIn('.phase-4-line.cli-prompt');
            var response4 = selectIn('.phase-4-line.cli-response');
            if (prompt4) {
                prompt4.classList.add('visible');
                scrollToEl(prompt4);
            }
            var cmd4 = prompt4 ? prompt4.querySelector('.command') : null;
            if (cmd4 && cmd4.dataset.text) {
                typeText(cmd4, cmd4.dataset.text, typeSpeed);
            }
            dt(function() {
                if (response4) {
                    response4.classList.add('visible');
                    scrollToEl(response4);
                }
            }, reviewCmdDuration + 200);
        }, p4);

        var p4Response = p4 + reviewCmdDuration + 400;
        showEl('.phase-4-status-1', p4Response);
        completeEl('.phase-4-status-1', p4Response + 800, true);

        showEl('.phase-4-status-2', p4Response + 1000);
        completeEl('.phase-4-status-2', p4Response + 2000, true);

        showEl('.phase-4-status-3', p4Response + 2200);

        // ===== PHASE 5: /resolve =====
        var p5 = p4Response + 3000;

        dt(function() {
            var prompt5 = selectIn('.phase-5-line.cli-prompt');
            var response5 = selectIn('.phase-5-line.cli-response');
            if (prompt5) {
                prompt5.classList.add('visible');
                scrollToEl(prompt5);
            }
            var cmd5 = prompt5 ? prompt5.querySelector('.command') : null;
            if (cmd5 && cmd5.dataset.text) {
                typeText(cmd5, cmd5.dataset.text, typeSpeed);
            }
            dt(function() {
                if (response5) {
                    response5.classList.add('visible');
                    scrollToEl(response5);
                }
            }, resolveCmdDuration + 200);
        }, p5);

        var p5Response = p5 + resolveCmdDuration + 400;
        showEl('.phase-5-status-1', p5Response);
        completeEl('.phase-5-status-1', p5Response + 800, true);

        showEl('.phase-5-status-2', p5Response + 1000);
        completeEl('.phase-5-status-2', p5Response + 1800, true);

        showEl('.phase-5-status-3', p5Response + 2000);
        completeEl('.phase-5-status-3', p5Response + 2800, true);

        // ===== PHASE 6: /done =====
        var p6 = p5Response + 3600;

        dt(function() {
            var prompt6 = selectIn('.phase-6-line.cli-prompt');
            var response6 = selectIn('.phase-6-line.cli-response');
            if (prompt6) {
                prompt6.classList.add('visible');
                scrollToEl(prompt6);
            }
            var cmd6 = prompt6 ? prompt6.querySelector('.command') : null;
            if (cmd6 && cmd6.dataset.text) {
                typeText(cmd6, cmd6.dataset.text, typeSpeed);
            }
            dt(function() {
                if (response6) {
                    response6.classList.add('visible');
                    scrollToEl(response6);
                }
            }, doneCmdDuration + 200);
        }, p6);

        var p6Response = p6 + doneCmdDuration + 400;
        showEl('.phase-6-status-1', p6Response);
        completeEl('.phase-6-status-1', p6Response + 800, true);

        showEl('.phase-6-status-2', p6Response + 1000);
        completeEl('.phase-6-status-2', p6Response + 1800, true);

        showEl('.phase-6-status-3', p6Response + 2000);
        completeEl('.phase-6-status-3', p6Response + 2800, true);

        // Success banner
        dt(function() {
            var banner = selectIn('.phase-6-status-4');
            if (banner) {
                banner.classList.add('visible');
                scrollToEl(banner);
            }
            // Left sidebar: spinner → check
            if (agentSpinner) agentSpinner.classList.remove('active');
            if (agentCheck) agentCheck.classList.add('visible');
            if (agentDot) agentDot.classList.add('blue-to-green');
        }, p6Response + 3200);

        // Show replay button
        dt(function() {
            var btn = terminal.querySelector('.desktop-replay-btn');
            if (btn) btn.classList.add('visible');
            unlockScroll();
        }, p6Response + 3800);
    }

    // Replay function (global for onclick)
    window.replayDesktopTerminal = function() {
        // Clear all timeouts
        desktopTimeouts.forEach(function(id) { clearTimeout(id); });
        desktopTimeouts = [];

        // Reset all visual elements
        terminal.querySelectorAll('.cli-prompt, .cli-response, .cli-status, .cli-agents, .cli-success-banner')
            .forEach(function(el) {
                el.classList.remove('visible', 'completed');
            });
        terminal.querySelectorAll('.loader').forEach(function(el) { el.classList.remove('done'); });
        terminal.querySelectorAll('.checkmark').forEach(function(el) { el.classList.remove('visible'); });
        terminal.querySelectorAll('.result').forEach(function(el) { el.classList.remove('visible'); });
        terminal.querySelectorAll('.command').forEach(function(cmd) {
            cmd.textContent = '';
            cmd.classList.remove('typing');
        });
        terminal.querySelectorAll('.workflow-line').forEach(function(el) { el.classList.remove('visible'); });

        var agentsText = terminal.querySelector('.agents-text');
        if (agentsText) agentsText.textContent = '1 agent coding...';

        var diffContainer = terminal.querySelector('.agents-diff-container');
        if (diffContainer) diffContainer.classList.remove('visible');
        terminal.querySelectorAll('.diff-file').forEach(function(el) { el.classList.remove('visible'); });
        terminal.querySelectorAll('.diff-line').forEach(function(el) { el.classList.remove('visible'); });

        var btn = terminal.querySelector('.desktop-replay-btn');
        if (btn) btn.classList.remove('visible');

        contentEl.scrollTop = 0;

        // Reset sidebar
        resetSidebar();

        startDesktopTerminalAnimation();
    };

    // IntersectionObserver to trigger animation on scroll
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting && !desktopAnimationStarted) {
                desktopAnimationStarted = true;
                startDesktopTerminalAnimation();
                // Re-render feather icons for the new elements
                feather.replace();
            }
        });
    }, { threshold: 0.3 });

    observer.observe(terminal);
})();
