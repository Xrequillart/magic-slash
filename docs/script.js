// Initialize Feather Icons
feather.replace();

// Fetch version from package.json
const versionBadge = document.getElementById("version-badge");
fetch("https://raw.githubusercontent.com/xrequillart/magic-slash/main/package.json")
  .then(response => response.json())
  .then(data => {
    versionBadge.textContent = `v${data.version}`;
  })
  .catch(() => {
    versionBadge.textContent = "v0.0.0";
  });

// Language Selector
const langSelector = document.getElementById("lang-selector");
const langSelectorBtn = document.getElementById("lang-selector-btn");
const langOptions = document.querySelectorAll(".lang-option");

function updateLangOptions() {
  const currentLang = document.documentElement.lang;
  langOptions.forEach((option) => {
    option.classList.toggle(
      "active",
      option.dataset.value === currentLang,
    );
  });
}

langSelectorBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  langSelector.classList.toggle("open");
});

langOptions.forEach((option) => {
  option.addEventListener("click", () => {
    const lang = option.dataset.value;
    document.documentElement.lang = lang;
    langSelector.classList.remove("open");
    updateLangOptions();
    localStorage.setItem("preferred-lang", lang);
  });
});

document.addEventListener("click", (e) => {
  if (!langSelector.contains(e.target)) {
    langSelector.classList.remove("open");
  }
});

// Load saved language preference
const savedLang = localStorage.getItem("preferred-lang");
if (savedLang) {
  document.documentElement.lang = savedLang;
}
updateLangOptions();

// Zoom Effect on Scroll (bidirectionnel) avec phases Logo -> Tagline -> Terminal
const zoomSpacer = document.querySelector(".zoom-spacer");
const zoomOverlay = document.querySelector(".zoom-overlay");
const scrollIndicator = document.querySelector(".scroll-indicator");
const workflowDemoZoom = document.querySelector(".workflow-demo");
const terminalsContainer = document.querySelector(".terminals-container");
const introLogo = document.querySelector(".intro-logo");
const introTagline = document.querySelector(".intro-tagline");

// Configuration
const startScale = 5; // Zoom max (en haut) - très zoomé
const endScale = 1; // Zoom normal (après scroll)
const scrollDistance = window.innerHeight * 9; // 9x la hauteur pour une animation beaucoup plus lente au scroll

// Phases de l'animation (en % du scroll total)
const PHASE_LOGO_END = 0.2; // Logo visible jusqu'à 20%
const PHASE_LOGO_FADE = 0.3; // Logo complètement disparu à 30%
const PHASE_TAGLINE_START = 0.32; // Tagline commence à apparaître à 32%
const PHASE_TAGLINE_VISIBLE = 0.4; // Tagline complètement visible à 40%
const PHASE_TAGLINE_END = 0.55; // Tagline visible jusqu'à 55%
const PHASE_TAGLINE_FADE = 0.65; // Tagline complètement disparu à 65%
// Phases d'apparition des terminaux (un par un, espacés)
const PHASE_TERMINAL_LEFT = 0.76;       // 1er: gauche
const PHASE_TERMINAL_RIGHT = 0.80;      // 2ème: droite
const PHASE_TERMINAL_TOP_LEFT = 0.84;   // 3ème: haut-gauche
const PHASE_TERMINAL_TOP_RIGHT = 0.88;  // 4ème: haut-droite
const PHASE_TERMINAL_BOTTOM_LEFT = 0.92;  // 5ème: bas-gauche
const PHASE_TERMINAL_BOTTOM_RIGHT = 0.96; // 6ème: bas-droite

const PHASE_ZOOM_START = 0.6; // Dézoom commence à 60%
const PHASE_TERMINAL_PIN_START = 0.75; // Terminal ralentit à cette phase
const PHASE_TERMINAL_PIN_END = 0.95; // Terminal accélère à nouveau
const TERMINAL_PIN_SCALE = 1.5; // Scale atteint au début du ralentissement
const TERMINAL_SLOW_END_SCALE = 1.15; // Scale atteint à la fin du ralentissement (très lent)

let isInZoomZone = true;

let terminalAnimationStarted = false;
let terminalAnimationComplete = false;
let showScrollIndicatorEarly = false;
let lastScrollProgress = 0; // Pour détecter le scroll vers le haut
let animationTimeouts = []; // Pour stocker et annuler les timeouts

// Multi-terminal mode variables
let multiTerminalMode = false;
let zoomEndScrollY = null; // Position du scroll quand le zoom se termine
const terminalSlots = {
  left: { created: false, phase: PHASE_TERMINAL_LEFT },
  right: { created: false, phase: PHASE_TERMINAL_RIGHT },
  'top-left': { created: false, phase: PHASE_TERMINAL_TOP_LEFT },
  'top-right': { created: false, phase: PHASE_TERMINAL_TOP_RIGHT },
  'bottom-left': { created: false, phase: PHASE_TERMINAL_BOTTOM_LEFT },
  'bottom-right': { created: false, phase: PHASE_TERMINAL_BOTTOM_RIGHT }
};

// Initialisation
function initZoomEffect() {
  workflowDemoZoom.classList.add("zoom-mode");
  workflowDemoZoom.classList.add("visible");
  terminalsContainer.classList.add("zoom-mode");
  terminalsContainer.style.setProperty("--zoom-scale", startScale);
  workflowDemoZoom.style.opacity = 0.15; // Terminal quasi-invisible au début
  document.body.classList.add("zoom-active");

  // Afficher l'indicateur de scroll après 2s si l'utilisateur n'a pas scrollé
  setTimeout(() => {
    if (window.scrollY < 10) {
      showScrollIndicatorEarly = true;
      scrollIndicator.classList.remove("hidden");
      scrollIndicator.style.opacity = 1;
    }
  }, 2000);
}

// IDs de tickets Jira différents pour chaque terminal
const terminalTicketIds = {
  'left': 'PROJ-18',
  'right': 'PROJ-95',
  'top-left': 'PROJ-7',
  'top-right': 'PROJ-156',
  'bottom-left': 'PROJ-63',
  'bottom-right': 'PROJ-204'
};

// Clone un terminal pour un slot latéral
function cloneTerminalForSlot(suffix) {
  const original = document.querySelector('.terminal-center .workflow-demo');
  const clone = original.cloneNode(true);

  // Modifier les IDs pour éviter les conflits
  clone.querySelectorAll('[id]').forEach(el => {
    el.id = el.id + '-' + suffix;
  });

  // Supprimer le bouton replay des clones
  const replayBtnClone = clone.querySelector('.replay-btn');
  if (replayBtnClone) replayBtnClone.remove();

  // Changer l'ID du ticket Jira partout dans ce terminal
  const ticketId = terminalTicketIds[suffix] || 'PROJ-42';

  // Commande /start
  const commandEl = clone.querySelector('.phase-1-line.cli-prompt .command');
  if (commandEl) {
    commandEl.dataset.text = `/start ${ticketId}`;
  }

  // Remplacer PROJ-42 par le nouveau ticket ID dans tout le contenu textuel
  const replaceTicketId = (element) => {
    if (element.nodeType === Node.TEXT_NODE) {
      element.textContent = element.textContent.replace(/PROJ-42/g, ticketId);
    } else if (element.nodeType === Node.ELEMENT_NODE) {
      // Pour les attributs data-text
      if (element.dataset && element.dataset.text) {
        element.dataset.text = element.dataset.text.replace(/PROJ-42/g, ticketId);
      }
      // Récursion sur les enfants
      element.childNodes.forEach(replaceTicketId);
    }
  };
  replaceTicketId(clone);

  // Reset l'état visuel du clone
  clone.querySelectorAll('.visible, .completed').forEach(el => {
    el.classList.remove('visible', 'completed');
  });
  clone.querySelectorAll('.loader.done').forEach(el => el.classList.remove('done'));
  clone.querySelectorAll('.checkmark.visible, .result.visible').forEach(el => {
    el.classList.remove('visible');
  });
  clone.querySelectorAll('.command').forEach(cmd => {
    cmd.textContent = '';
    cmd.classList.remove('typing');
  });
  clone.querySelectorAll('.diff-file.visible, .diff-line.visible').forEach(el => {
    el.classList.remove('visible');
  });
  const diffContainer = clone.querySelector('.agents-diff-container');
  if (diffContainer) diffContainer.classList.remove('visible');

  // Reset scroll
  const content = clone.querySelector('[id^="terminal-content"]');
  if (content) content.scrollTop = 0;

  return clone;
}

// Anime une instance de terminal spécifique
function animateTerminalInstance(terminalElement) {
  const terminalContentEl = terminalElement.querySelector('[id^="terminal-content"]');
  if (!terminalContentEl) return;

  // Reset scroll
  terminalContentEl.scrollTop = 0;
  terminalElement.classList.add('visible');

  // Helpers locaux qui opèrent sur ce terminal spécifique
  const selectInTerminal = (selector) => terminalElement.querySelector(selector);

  const scrollToEl = (el) => {
    if (!el) return;
    const scrollTarget = el.offsetTop + el.offsetHeight - terminalContentEl.clientHeight + 40;
    if (scrollTarget > terminalContentEl.scrollTop) {
      terminalContentEl.scrollTo({ top: scrollTarget, behavior: 'smooth' });
    }
  };

  const showEl = (selector, delay) => {
    setTimeout(() => {
      const el = selectInTerminal(selector);
      if (el) {
        el.classList.add('visible');
        scrollToEl(el);
      }
    }, delay);
  };

  const completeEl = (selector, delay, showResult = false) => {
    setTimeout(() => {
      const el = selectInTerminal(selector);
      if (el) {
        const loader = el.querySelector('.loader');
        const check = el.querySelector('.checkmark');
        const result = el.querySelector('.result');
        if (loader) loader.classList.add('done');
        if (check) check.classList.add('visible');
        if (showResult && result) result.classList.add('visible');
        scrollToEl(el);
      }
    }, delay);
  };

  // Configuration
  const typeSpeed = 60;
  // Calculer la durée basée sur le texte réel de la commande /start
  const startCmd = terminalElement.querySelector('.phase-1-line.cli-prompt .command');
  const startCmdText = startCmd?.dataset?.text || "/start PROJ-42";
  const startCmdDuration = startCmdText.length * typeSpeed;
  const commitCmdDuration = "/commit".length * typeSpeed;
  const doneCmdDuration = "/done".length * typeSpeed;

  // Fonction de typage locale
  const typeTextLocal = (element, text, speed) => {
    element.classList.add('typing');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(interval);
        element.classList.remove('typing');
      }
    }, speed);
  };

  // ===== PHASE 1: /start =====
  const p1 = 400;

  setTimeout(() => {
    const prompt1 = selectInTerminal('.phase-1-line.cli-prompt');
    const response1 = selectInTerminal('.phase-1-line.cli-response');
    if (prompt1) {
      prompt1.classList.add('visible');
      scrollToEl(prompt1);
    }

    const cmd1 = prompt1?.querySelector('.command');
    if (cmd1 && cmd1.dataset.text) {
      typeTextLocal(cmd1, cmd1.dataset.text, typeSpeed);
    }

    setTimeout(() => {
      if (response1) {
        response1.classList.add('visible');
        scrollToEl(response1);
      }
    }, startCmdDuration + 200);
  }, p1);

  // Animations des statuts phase 1
  const p1Response = p1 + startCmdDuration + 400;
  showEl('.phase-1-status-1', p1Response);
  completeEl('.phase-1-status-1', p1Response + 800);

  showEl('.phase-1-status-2', p1Response + 1000);
  completeEl('.phase-1-status-2', p1Response + 2000, true);

  showEl('.phase-1-status-3', p1Response + 2200);

  showEl('.phase-1-status-4', p1Response + 2500);
  completeEl('.phase-1-status-4', p1Response + 3000);

  showEl('.phase-1-status-5', p1Response + 3200);
  completeEl('.phase-1-status-5', p1Response + 3700);

  showEl('.phase-1-status-6', p1Response + 4000);
  showEl('.phase-1-status-7', p1Response + 4300);

  // Afficher le container de diffs
  setTimeout(() => {
    const diffContainerEl = selectInTerminal('.agents-diff-container');
    if (diffContainerEl) {
      diffContainerEl.classList.add('visible');
      scrollToEl(diffContainerEl);

      const diffFiles = diffContainerEl.querySelectorAll('.diff-file');
      let fileDelay = 0;

      diffFiles.forEach((file) => {
        setTimeout(() => {
          file.classList.add('visible');
          scrollToEl(file);

          const diffLines = file.querySelectorAll('.diff-line');
          diffLines.forEach((line, lineIndex) => {
            setTimeout(() => {
              line.classList.add('visible');
              scrollToEl(line);
            }, lineIndex * 150);
          });
        }, fileDelay);

        fileDelay += 1500;
      });
    }
  }, p1Response + 4800);

  // Compléter "2 agents coding..."
  setTimeout(() => {
    const agentsEl = selectInTerminal('.phase-1-status-7');
    const diffContainerEl = selectInTerminal('.agents-diff-container');
    const fileCount = diffContainerEl ? diffContainerEl.querySelectorAll('.diff-file').length : 0;

    if (agentsEl) {
      const loader = agentsEl.querySelector('.loader');
      const check = agentsEl.querySelector('.checkmark');
      if (loader) loader.classList.add('done');
      if (check) check.classList.add('visible');
      agentsEl.classList.add('completed');
      const agentsText = agentsEl.querySelector('.agents-text');
      if (agentsText) agentsText.textContent = `2 agents done (${fileCount} files updated)`;
    }
  }, p1Response + 9500);

  // ===== PHASE 2: /commit =====
  const p2 = p1Response + 10500;

  setTimeout(() => {
    const prompt2 = selectInTerminal('.phase-2-line.cli-prompt');
    const response2 = selectInTerminal('.phase-2-line.cli-response');
    if (prompt2) {
      prompt2.classList.add('visible');
      scrollToEl(prompt2);
    }

    const cmd2 = prompt2?.querySelector('.command');
    if (cmd2 && cmd2.dataset.text) {
      typeTextLocal(cmd2, cmd2.dataset.text, typeSpeed);
    }

    setTimeout(() => {
      if (response2) {
        response2.classList.add('visible');
        scrollToEl(response2);
      }
    }, commitCmdDuration + 200);
  }, p2);

  const p2Response = p2 + commitCmdDuration + 400;

  showEl('.phase-2-status-0', p2Response);
  showEl('.phase-2-status-1', p2Response + 200);
  completeEl('.phase-2-status-1', p2Response + 1000, true);

  showEl('.phase-2-status-2', p2Response + 1200);
  completeEl('.phase-2-status-2', p2Response + 2000);

  showEl('.phase-2-status-3', p2Response + 2200);

  showEl('.phase-2-status-4', p2Response + 2400);
  completeEl('.phase-2-status-4', p2Response + 3200, true);

  showEl('.phase-2-status-5', p2Response + 3600);
  showEl('.phase-2-status-6', p2Response + 3800);
  completeEl('.phase-2-status-6', p2Response + 4600, true);

  showEl('.phase-2-status-7', p2Response + 4800);
  completeEl('.phase-2-status-7', p2Response + 5600);

  showEl('.phase-2-status-8', p2Response + 5800);

  showEl('.phase-2-status-9', p2Response + 6000);
  completeEl('.phase-2-status-9', p2Response + 6800, true);

  // ===== PHASE 3: /done =====
  const p3 = p2Response + 7500;

  setTimeout(() => {
    const prompt3 = selectInTerminal('.phase-3-line.cli-prompt');
    const response3 = selectInTerminal('.phase-3-line.cli-response');
    if (prompt3) {
      prompt3.classList.add('visible');
      scrollToEl(prompt3);
    }

    const cmd3 = prompt3?.querySelector('.command');
    if (cmd3 && cmd3.dataset.text) {
      typeTextLocal(cmd3, cmd3.dataset.text, typeSpeed);
    }

    setTimeout(() => {
      if (response3) {
        response3.classList.add('visible');
        scrollToEl(response3);
      }
    }, doneCmdDuration + 200);
  }, p3);

  const p3Response = p3 + doneCmdDuration + 400;
  showEl('.phase-3-status-1', p3Response);
  completeEl('.phase-3-status-1', p3Response + 800, true);

  showEl('.phase-3-status-2', p3Response + 1000);
  completeEl('.phase-3-status-2', p3Response + 1800, true);

  showEl('.phase-3-status-3', p3Response + 2000);
  completeEl('.phase-3-status-3', p3Response + 2800, true);

  // Afficher "Task complete!"
  setTimeout(() => {
    const successBanner = selectInTerminal('.phase-3-status-4');
    if (successBanner) {
      successBanner.classList.add('visible');
      scrollToEl(successBanner);
    }
  }, p3Response + 3200);
}

// Fonction pour réinitialiser l'animation du terminal central
function resetTerminalAnimation() {
  // Annuler tous les timeouts en cours
  animationTimeouts.forEach(id => clearTimeout(id));
  animationTimeouts = [];

  terminalAnimationStarted = false;
  terminalAnimationComplete = false;

  // Reset multi-terminal mode
  if (multiTerminalMode) {
    multiTerminalMode = false;
    terminalsContainer.classList.remove('multi-mode');
    // Reset tous les slots
    Object.keys(terminalSlots).forEach(slotName => {
      terminalSlots[slotName].created = false;
      const slotElement = document.querySelector(`.terminal-${slotName}`);
      slotElement.innerHTML = '';
      slotElement.classList.remove('visible');
    });
  }

  // Reset tous les éléments visuels du terminal central uniquement
  const centerTerminalEl = document.querySelector(".terminal-center");
  centerTerminalEl
    .querySelectorAll(
      ".cli-prompt, .cli-response, .cli-status, .cli-section-title, .cli-item, .cli-agents, .cli-success-banner",
    )
    .forEach((el) => {
      el.classList.remove("visible");
      el.classList.remove("completed");
    });
  centerTerminalEl
    .querySelectorAll(".loader")
    .forEach((el) => el.classList.remove("done"));
  centerTerminalEl
    .querySelectorAll(".checkmark")
    .forEach((el) => el.classList.remove("visible"));
  centerTerminalEl
    .querySelectorAll(".result")
    .forEach((el) => el.classList.remove("visible"));
  centerTerminalEl.querySelectorAll(".command").forEach((cmd) => {
    cmd.textContent = "";
    cmd.classList.remove("typing");
  });
  const agentsText = centerTerminalEl.querySelector(".agents-text");
  if (agentsText) agentsText.textContent = "2 agents coding...";
  const diffContainer = centerTerminalEl.querySelector(
    ".agents-diff-container",
  );
  if (diffContainer) diffContainer.classList.remove("visible");
  centerTerminalEl
    .querySelectorAll(".diff-file")
    .forEach((el) => el.classList.remove("visible"));
  centerTerminalEl
    .querySelectorAll(".diff-line")
    .forEach((el) => el.classList.remove("visible"));
  const replayBtnEl = centerTerminalEl.querySelector(".replay-btn");
  if (replayBtnEl) replayBtnEl.classList.remove("visible");
  terminalContent.scrollTop = 0;
}

// Gérer le scroll pour l'effet de zoom (bidirectionnel) avec phases
function handleZoomScroll() {
  const scrollY = window.scrollY;
  const progress = Math.min(Math.max(scrollY / scrollDistance, 0), 1);

  // Détecter le scroll vers le haut et reset l'animation si on remonte assez
  if (terminalAnimationStarted && progress < PHASE_ZOOM_START && lastScrollProgress >= PHASE_ZOOM_START) {
    resetTerminalAnimation();
  }
  lastScrollProgress = progress;

  // Zone de zoom (progress < 1)
  if (progress < 1) {
    if (!isInZoomZone) {
      // On revient dans la zone de zoom
      isInZoomZone = true;
      zoomEndScrollY = null; // Reset la position de fin de zoom

      workflowDemoZoom.style.transition = "none";
      workflowDemoZoom.classList.add("zoom-mode");
      terminalsContainer.classList.remove("zoom-complete");
      terminalsContainer.classList.add("zoom-mode");

      // Effacer les styles inline pour laisser les classes CSS prendre le relais
      terminalsContainer.style.top = "";
      terminalsContainer.style.left = "";
      terminalsContainer.style.transform = "";

      workflowDemoZoom.offsetHeight;
      workflowDemoZoom.style.transition = "";
      zoomOverlay.classList.remove("hidden");
      introLogo.classList.remove("hidden");
      document.body.classList.add("zoom-active");
      document.body.classList.remove("zoom-complete");

      // Reset l'animation du terminal pour qu'elle puisse redémarrer
      if (terminalAnimationStarted && progress < PHASE_ZOOM_START) {
        resetTerminalAnimation();
      }
    }

    // === PHASE 1: LOGO ===
    // Logo visible de 0% à PHASE_LOGO_END, puis fade out jusqu'à PHASE_LOGO_FADE
    // + effet de zoom progressif pendant le scroll
    if (progress <= PHASE_LOGO_END) {
      introLogo.classList.remove("hidden");
      introLogo.style.opacity = 1;
      // Zoom de 1 à 1.5 pendant cette phase
      const logoZoom = 1 + (progress / PHASE_LOGO_END) * 0.5;
      introLogo.style.transform = `translate(-50%, -50%) scale(${logoZoom})`;
    } else if (progress <= PHASE_LOGO_FADE) {
      // Fade out progressif + continue le zoom
      const logoFadeProgress =
        (progress - PHASE_LOGO_END) / (PHASE_LOGO_FADE - PHASE_LOGO_END);
      introLogo.style.opacity = 1 - logoFadeProgress;
      const logoZoom = 1.5 + logoFadeProgress * 0.8; // Continue à zoomer pendant le fade
      introLogo.style.transform = `translate(-50%, -50%) scale(${logoZoom})`;
    } else {
      introLogo.style.opacity = 0;
      introLogo.classList.add("hidden");
    }

    // === PHASE 2: TAGLINE ===
    // Tagline fade in de PHASE_TAGLINE_START à PHASE_TAGLINE_VISIBLE
    // Tagline visible jusqu'à PHASE_TAGLINE_END, puis fade out jusqu'à PHASE_TAGLINE_FADE
    // + effet de zoom progressif pendant le scroll
    if (progress < PHASE_TAGLINE_START) {
      introTagline.classList.remove("visible");
      introTagline.style.opacity = 0;
      introTagline.style.transform = "translate(-50%, -50%) scale(1)";
    } else if (progress <= PHASE_TAGLINE_VISIBLE) {
      // Fade in progressif
      const taglineFadeIn =
        (progress - PHASE_TAGLINE_START) /
        (PHASE_TAGLINE_VISIBLE - PHASE_TAGLINE_START);
      introTagline.style.opacity = taglineFadeIn;
      introTagline.classList.add("visible");
      const taglineZoom = 1 + taglineFadeIn * 0.1;
      introTagline.style.transform = `translate(-50%, -50%) scale(${taglineZoom})`;
    } else if (progress <= PHASE_TAGLINE_END) {
      // Pleinement visible + zoom progressif
      introTagline.classList.add("visible");
      introTagline.style.opacity = 1;
      const phaseProgress =
        (progress - PHASE_TAGLINE_VISIBLE) /
        (PHASE_TAGLINE_END - PHASE_TAGLINE_VISIBLE);
      const taglineZoom = 1.1 + phaseProgress * 0.3;
      introTagline.style.transform = `translate(-50%, -50%) scale(${taglineZoom})`;
    } else if (progress <= PHASE_TAGLINE_FADE) {
      // Fade out progressif + continue le zoom
      const taglineFadeOut =
        (progress - PHASE_TAGLINE_END) /
        (PHASE_TAGLINE_FADE - PHASE_TAGLINE_END);
      introTagline.style.opacity = 1 - taglineFadeOut;
      const taglineZoom = 1.4 + taglineFadeOut * 0.6;
      introTagline.style.transform = `translate(-50%, -50%) scale(${taglineZoom})`;
    } else {
      introTagline.style.opacity = 0;
      introTagline.classList.remove("visible");
    }

    // === PHASE 3: ZOOM DU TERMINAL ===
    // Le terminal reste très zoomé jusqu'à PHASE_ZOOM_START puis dézoome
    // Avec une phase de "pin" où le terminal se bloque à une taille intermédiaire
    if (progress <= PHASE_ZOOM_START) {
      // Garder le zoom max pendant les phases logo/tagline
      terminalsContainer.style.setProperty("--zoom-scale", startScale);
      // Terminal légèrement transparent pendant logo/tagline
      workflowDemoZoom.style.opacity = 0.15;
    } else if (progress <= PHASE_TERMINAL_PIN_START) {
      // Démarrer l'animation du terminal une seule fois
      if (!terminalAnimationStarted) {
        terminalAnimationStarted = true;
        setTimeout(animateTerminal, 300);
      }

      // Phase 1: Dézoom de startScale (5) à TERMINAL_PIN_SCALE (2.2)
      const zoomProgress =
        (progress - PHASE_ZOOM_START) /
        (PHASE_TERMINAL_PIN_START - PHASE_ZOOM_START);
      const currentScale =
        startScale - (startScale - TERMINAL_PIN_SCALE) * zoomProgress;
      terminalsContainer.style.setProperty("--zoom-scale", currentScale);
      // Ramener progressivement l'opacité à 1
      const opacityProgress = Math.min(zoomProgress * 2, 1);
      workflowDemoZoom.style.opacity = 0.15 + 0.85 * opacityProgress;
    } else if (progress <= PHASE_TERMINAL_PIN_END) {
      // Démarrer l'animation si pas encore fait (scroll rapide)
      if (!terminalAnimationStarted) {
        terminalAnimationStarted = true;
        setTimeout(animateTerminal, 300);
      }

      // Activer le mode multi-terminal
      if (!multiTerminalMode) {
        multiTerminalMode = true;
        terminalsContainer.classList.add('multi-mode');
      }

      // Gestion des terminaux selon le scroll (apparition/disparition)
      Object.keys(terminalSlots).forEach(slotName => {
        const slot = terminalSlots[slotName];
        const slotElement = document.querySelector(`.terminal-${slotName}`);

        if (progress >= slot.phase) {
          // Faire apparaître ce terminal
          if (!slot.created) {
            slot.created = true;
            const clone = cloneTerminalForSlot(slotName);
            slotElement.appendChild(clone);
            slotElement.offsetHeight; // Force reflow
            slotElement.classList.add('visible');
            setTimeout(() => animateTerminalInstance(clone), 100);
          }
        } else {
          // Faire disparaître ce terminal
          if (slot.created) {
            slot.created = false;
            slotElement.classList.remove('visible');
            setTimeout(() => {
              slotElement.innerHTML = '';
            }, 400);
          }
        }
      });

      // Phase 2: Dézoom TRÈS LENT de TERMINAL_PIN_SCALE à TERMINAL_SLOW_END_SCALE
      const slowZoomProgress =
        (progress - PHASE_TERMINAL_PIN_START) /
        (PHASE_TERMINAL_PIN_END - PHASE_TERMINAL_PIN_START);
      const currentScale =
        TERMINAL_PIN_SCALE -
        (TERMINAL_PIN_SCALE - TERMINAL_SLOW_END_SCALE) * slowZoomProgress;
      terminalsContainer.style.setProperty("--zoom-scale", currentScale);
      workflowDemoZoom.style.opacity = 1;
    } else {
      // Démarrer l'animation si pas encore fait (scroll très rapide)
      if (!terminalAnimationStarted) {
        terminalAnimationStarted = true;
        setTimeout(animateTerminal, 300);
      }

      // Activer le mode multi-terminal si pas encore fait
      if (!multiTerminalMode) {
        multiTerminalMode = true;
        terminalsContainer.classList.add('multi-mode');
      }

      // Créer tous les terminaux s'ils n'existent pas encore (scroll rapide)
      Object.keys(terminalSlots).forEach(slotName => {
        const slot = terminalSlots[slotName];
        if (!slot.created) {
          slot.created = true;
          const slotElement = document.querySelector(`.terminal-${slotName}`);
          const clone = cloneTerminalForSlot(slotName);
          slotElement.appendChild(clone);
          slotElement.offsetHeight;
          slotElement.classList.add('visible');
          setTimeout(() => animateTerminalInstance(clone), 100);
        }
      });

      // Phase 3: Dézoom de TERMINAL_SLOW_END_SCALE à endScale (1)
      const zoomProgress =
        (progress - PHASE_TERMINAL_PIN_END) /
        (1 - PHASE_TERMINAL_PIN_END);
      const currentScale =
        TERMINAL_SLOW_END_SCALE -
        (TERMINAL_SLOW_END_SCALE - endScale) * zoomProgress;
      terminalsContainer.style.setProperty("--zoom-scale", currentScale);
      workflowDemoZoom.style.opacity = 1;
    }

    // Opacité de l'overlay (reste noir jusqu'à la fin de l'animation)
    if (progress <= PHASE_TERMINAL_PIN_END) {
      zoomOverlay.style.opacity = 1;
    } else {
      // Fade out rapide à la toute fin
      const overlayProgress =
        (progress - PHASE_TERMINAL_PIN_END) /
        (1 - PHASE_TERMINAL_PIN_END);
      zoomOverlay.style.opacity = 1 - overlayProgress;
    }

    // Indicateur de scroll
    if (showScrollIndicatorEarly || terminalAnimationComplete) {
      if (progress < 0.05) {
        scrollIndicator.style.opacity = 1;
        scrollIndicator.classList.remove("hidden");
      } else if (progress < 0.15) {
        // Fade out progressif
        scrollIndicator.style.opacity = Math.max(
          0,
          1 - (progress - 0.05) * 10,
        );
      } else {
        scrollIndicator.style.opacity = 0;
        scrollIndicator.classList.add("hidden");
      }
    }
  } else {
    // Hors zone de zoom (page normale)
    if (isInZoomZone) {
      isInZoomZone = false;
      // Stocker la position du scroll au moment où le zoom se termine
      zoomEndScrollY = scrollY;

      // Garder zoom-mode mais fixer le scale à 1
      // Ne PAS changer de classe pour éviter tout changement de style
      terminalsContainer.style.setProperty("--zoom-scale", endScale);
      // Définir la position initiale en pixels pour permettre le scroll pixel-perfect
      const viewportCenterY = window.innerHeight / 2;
      terminalsContainer.style.top = viewportCenterY + "px";
      terminalsContainer.style.transform = "translate(-50%, -50%) scale(1)";

      workflowDemoZoom.style.transition = "none";
      workflowDemoZoom.classList.remove("zoom-mode");
      workflowDemoZoom.offsetHeight;
      workflowDemoZoom.style.transition = "";

      zoomOverlay.classList.add("hidden");
      scrollIndicator.classList.add("hidden");
      introLogo.classList.add("hidden");
      introTagline.classList.remove("visible");
      document.body.classList.remove("zoom-active");
      document.body.classList.add("zoom-complete");
    }

    // Simuler le scroll des terminaux après la fin du zoom
    if (zoomEndScrollY !== null) {
      const scrollOffset = scrollY - zoomEndScrollY;
      // Position initiale = centre du viewport (50%), puis on soustrait le scroll en pixels
      const viewportCenterY = window.innerHeight / 2;
      const newTopPx = viewportCenterY - scrollOffset;
      // Utiliser top en pixels au lieu de transform pour un défilement pixel-perfect
      terminalsContainer.style.top = newTopPx + "px";
      terminalsContainer.style.transform = "translate(-50%, -50%) scale(1)";
    }
  }
}

// Forcer le scroll à 0 au chargement
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);

// Initialiser
initZoomEffect();

// Écouter le scroll
window.addEventListener("scroll", handleZoomScroll);

// Copy Command
function copyCommand(elementId) {
  const el = document.getElementById(elementId);
  const text = el.textContent.trim();
  navigator.clipboard.writeText(text).then(() => {
    const btn = el.closest(".install-box").querySelector(".copy-btn");
    btn.innerHTML = '<i data-feather="check"></i>';
    feather.replace();
    setTimeout(() => {
      btn.innerHTML = '<i data-feather="copy"></i>';
      feather.replace();
    }, 2000);
  });
}

// Animated title with commands
const commands = ["/start PROJ-42", "/commit", "/done"];
let cmdIndex = 0;
let charIndex = 0;
let isDeleting = false;
const titleElement = document.querySelector(".title-commands");
const typeSpeedTitle = 80;
const deleteSpeed = 50;
const pauseTime = 2500;

function typeCommand() {
  const currentCmd = commands[cmdIndex];

  if (isDeleting) {
    titleElement.textContent = currentCmd.substring(0, charIndex - 1);
    charIndex--;
  } else {
    titleElement.textContent = currentCmd.substring(0, charIndex + 1);
    charIndex++;
  }

  let delay = isDeleting ? deleteSpeed : typeSpeedTitle;

  if (!isDeleting && charIndex === currentCmd.length) {
    delay = pauseTime;
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    cmdIndex = (cmdIndex + 1) % commands.length;
    delay = 400;
  }

  setTimeout(typeCommand, delay);
}

setTimeout(typeCommand, 1000);

// Terminal Animation - Claude Code CLI Style
// Cibler spécifiquement le terminal central pour éviter les conflits avec les clones
const centralTerminal = document.querySelector(".terminal-center");
const workflowDemo = centralTerminal.querySelector(".workflow-demo");
const terminalContent = document.getElementById("terminal-content");
const phaseDots = centralTerminal.querySelectorAll(".phase-dot");
const replayBtn = centralTerminal.querySelector(".replay-btn");

function setPhase(phaseNum) {
  phaseDots.forEach((dot, i) => {
    dot.classList.toggle("active", i + 1 === phaseNum);
  });
}

// Fonction pour taper le texte caractère par caractère
function typeText(element, text, speed = 50) {
  return new Promise((resolve) => {
    element.classList.add("typing");
    element.textContent = "";
    let i = 0;

    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        const id = setTimeout(type, speed);
        animationTimeouts.push(id);
      } else {
        element.classList.remove("typing");
        resolve();
      }
    }
    type();
  });
}

// Désactiver le scroll manuel du terminal si l'utilisateur scroll la page
window.addEventListener(
  "scroll",
  () => {
    if (window.scrollY > 10) {
      terminalContent.style.pointerEvents = "none";
    }
  },
  { passive: true },
);

// Fonction pour scroller vers un élément
function scrollToElement(el) {
  if (!el) return;
  const lineTop = el.offsetTop;
  const lineHeight = el.offsetHeight;
  const containerHeight = terminalContent.clientHeight;
  const scrollTarget = lineTop + lineHeight - containerHeight + 40;
  if (scrollTarget > terminalContent.scrollTop) {
    terminalContent.scrollTo({
      top: scrollTarget,
      behavior: "smooth",
    });
  }
}

// Fonction pour afficher un élément avec animation (dans le terminal central)
function showElement(selector, delay) {
  const id = setTimeout(() => {
    const el = centralTerminal.querySelector(selector);
    if (el) {
      el.classList.add("visible");
      scrollToElement(el);
    }
  }, delay);
  animationTimeouts.push(id);
}

// Fonction pour créer l'effet de paillettes
function createSparkles(element) {
  const colors = [
    "#a855f7",
    "#22c55e",
    "#facc15",
    "#3b82f6",
    "#ec4899",
    "#f97316",
    "#14b8a6",
  ];
  const sparkleCount = 30;

  // Créer le conteneur de paillettes
  const container = document.createElement("div");
  container.className = "sparkles-container";
  element.appendChild(container);

  // Créer les paillettes
  for (let i = 0; i < sparkleCount; i++) {
    const sparkle = document.createElement("div");
    sparkle.className = "sparkle" + (Math.random() > 0.5 ? " star" : "");

    // Position et direction aléatoires
    const angle =
      (Math.PI * 2 * i) / sparkleCount + (Math.random() - 0.5) * 0.5;
    const distance = 60 + Math.random() * 80;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    sparkle.style.setProperty("--tx", tx + "px");
    sparkle.style.setProperty("--ty", ty + "px");
    sparkle.style.setProperty(
      "--sparkle-color",
      colors[Math.floor(Math.random() * colors.length)],
    );
    sparkle.style.background =
      colors[Math.floor(Math.random() * colors.length)];
    sparkle.style.animationDelay = Math.random() * 0.2 + "s";
    sparkle.style.animationDuration = 0.6 + Math.random() * 0.4 + "s";

    container.appendChild(sparkle);
  }

  // Ajouter l'animation de pulse
  element.classList.add("celebrate");

  // Nettoyer après l'animation
  setTimeout(() => {
    container.remove();
    element.classList.remove("celebrate");
  }, 1500);
}

// Fonction pour terminer un loader et afficher le checkmark (dans le terminal central)
function completeStatus(selector, delay, showResult = false) {
  const id = setTimeout(() => {
    const el = centralTerminal.querySelector(selector);
    if (el) {
      const loader = el.querySelector(".loader");
      const check = el.querySelector(".checkmark");
      const result = el.querySelector(".result");
      if (loader) loader.classList.add("done");
      if (check) check.classList.add("visible");
      if (showResult && result) result.classList.add("visible");
      scrollToElement(el);
    }
  }, delay);
  animationTimeouts.push(id);
}

function animateTerminal() {
  // Reset scroll position to top before starting animation
  terminalContent.scrollTop = 0;

  workflowDemo.classList.add("visible");
  setPhase(1);

  // Configuration
  const typeSpeed = 60;
  const startCmdDuration = "/start PROJ-42".length * typeSpeed;
  const commitCmdDuration = "/commit".length * typeSpeed;
  const doneCmdDuration = "/done".length * typeSpeed;

  // ===== PHASE 1: /start =====
  const p1 = 400; // Début phase 1

  // Afficher le prompt et taper la commande
  animationTimeouts.push(setTimeout(() => {
    const prompt1 = centralTerminal.querySelector(".phase-1-line.cli-prompt");
    const response1 = centralTerminal.querySelector(
      ".phase-1-line.cli-response",
    );
    if (prompt1) {
      prompt1.classList.add("visible");
      scrollToElement(prompt1);
    }

    const cmd1 = prompt1.querySelector(".command");
    if (cmd1 && cmd1.dataset.text) {
      typeText(cmd1, cmd1.dataset.text, typeSpeed);
    }

    // Afficher la réponse après la frappe
    animationTimeouts.push(setTimeout(() => {
      if (response1) {
        response1.classList.add("visible");
        scrollToElement(response1);
      }
    }, startCmdDuration + 200));
  }, p1));

  // Animations des statuts phase 1
  const p1Response = p1 + startCmdDuration + 400;
  showElement(".phase-1-status-1", p1Response);
  completeStatus(".phase-1-status-1", p1Response + 800);

  showElement(".phase-1-status-2", p1Response + 1000);
  completeStatus(".phase-1-status-2", p1Response + 2000, true);

  showElement(".phase-1-status-3", p1Response + 2200);

  showElement(".phase-1-status-4", p1Response + 2500);
  completeStatus(".phase-1-status-4", p1Response + 3000);

  showElement(".phase-1-status-5", p1Response + 3200);
  completeStatus(".phase-1-status-5", p1Response + 3700);

  showElement(".phase-1-status-6", p1Response + 4000);
  showElement(".phase-1-status-7", p1Response + 4300);

  // Afficher le container de diffs et animer les fichiers
  animationTimeouts.push(setTimeout(() => {
    const diffContainer = centralTerminal.querySelector(
      ".agents-diff-container",
    );
    if (diffContainer) {
      diffContainer.classList.add("visible");
      scrollToElement(diffContainer);

      // Animer chaque fichier avec ses lignes de diff
      const diffFiles = diffContainer.querySelectorAll(".diff-file");
      let fileDelay = 0;

      diffFiles.forEach((file, fileIndex) => {
        animationTimeouts.push(setTimeout(() => {
          file.classList.add("visible");
          scrollToElement(file);

          // Animer chaque ligne de diff dans le fichier
          const diffLines = file.querySelectorAll(".diff-line");
          diffLines.forEach((line, lineIndex) => {
            animationTimeouts.push(setTimeout(() => {
              line.classList.add("visible");
              scrollToElement(line);
            }, lineIndex * 150));
          });
        }, fileDelay));

        fileDelay += 1500; // Délai entre chaque fichier
      });
    }
  }, p1Response + 4800));

  // Compléter "2 agents coding..." après un moment
  animationTimeouts.push(setTimeout(() => {
    const agentsEl = centralTerminal.querySelector(".phase-1-status-7");
    const diffContainer = centralTerminal.querySelector(
      ".agents-diff-container",
    );
    const fileCount = diffContainer
      ? diffContainer.querySelectorAll(".diff-file").length
      : 0;

    if (agentsEl) {
      const loader = agentsEl.querySelector(".loader");
      const check = agentsEl.querySelector(".checkmark");
      if (loader) loader.classList.add("done");
      if (check) check.classList.add("visible");
      agentsEl.classList.add("completed");
      agentsEl.querySelector(".agents-text").textContent =
        `2 agents done (${fileCount} files updated)`;
    }
  }, p1Response + 9500));

  // ===== PHASE 2: /commit =====
  const p2 = p1Response + 10500;
  setPhase(2);

  animationTimeouts.push(setTimeout(() => {
    setPhase(2);
    const prompt2 = centralTerminal.querySelector(".phase-2-line.cli-prompt");
    const response2 = centralTerminal.querySelector(
      ".phase-2-line.cli-response",
    );
    if (prompt2) {
      prompt2.classList.add("visible");
      scrollToElement(prompt2);
    }

    const cmd2 = prompt2.querySelector(".command");
    if (cmd2 && cmd2.dataset.text) {
      typeText(cmd2, cmd2.dataset.text, typeSpeed);
    }

    animationTimeouts.push(setTimeout(() => {
      if (response2) {
        response2.classList.add("visible");
        scrollToElement(response2);
      }
    }, commitCmdDuration + 200));
  }, p2));

  const p2Response = p2 + commitCmdDuration + 400;

  // Commit Back
  showElement(".phase-2-status-0", p2Response);
  showElement(".phase-2-status-1", p2Response + 200);
  completeStatus(".phase-2-status-1", p2Response + 1000, true);

  showElement(".phase-2-status-2", p2Response + 1200);
  completeStatus(".phase-2-status-2", p2Response + 2000);

  showElement(".phase-2-status-3", p2Response + 2200);

  showElement(".phase-2-status-4", p2Response + 2400);
  completeStatus(".phase-2-status-4", p2Response + 3200, true);

  // Commit Front
  showElement(".phase-2-status-5", p2Response + 3600);
  showElement(".phase-2-status-6", p2Response + 3800);
  completeStatus(".phase-2-status-6", p2Response + 4600, true);

  showElement(".phase-2-status-7", p2Response + 4800);
  completeStatus(".phase-2-status-7", p2Response + 5600);

  showElement(".phase-2-status-8", p2Response + 5800);

  showElement(".phase-2-status-9", p2Response + 6000);
  completeStatus(".phase-2-status-9", p2Response + 6800, true);

  // ===== PHASE 3: /done =====
  const p3 = p2Response + 7500;

  animationTimeouts.push(setTimeout(() => {
    setPhase(3);
    const prompt3 = centralTerminal.querySelector(".phase-3-line.cli-prompt");
    const response3 = centralTerminal.querySelector(
      ".phase-3-line.cli-response",
    );
    if (prompt3) {
      prompt3.classList.add("visible");
      scrollToElement(prompt3);
    }

    const cmd3 = prompt3.querySelector(".command");
    if (cmd3 && cmd3.dataset.text) {
      typeText(cmd3, cmd3.dataset.text, typeSpeed);
    }

    animationTimeouts.push(setTimeout(() => {
      if (response3) {
        response3.classList.add("visible");
        scrollToElement(response3);
      }
    }, doneCmdDuration + 200));
  }, p3));

  const p3Response = p3 + doneCmdDuration + 400;
  showElement(".phase-3-status-1", p3Response);
  completeStatus(".phase-3-status-1", p3Response + 800, true);

  showElement(".phase-3-status-2", p3Response + 1000);
  completeStatus(".phase-3-status-2", p3Response + 1800, true);

  showElement(".phase-3-status-3", p3Response + 2000);
  completeStatus(".phase-3-status-3", p3Response + 2800, true);

  // Afficher "Task complete!" avec paillettes
  animationTimeouts.push(setTimeout(() => {
    const successBanner = centralTerminal.querySelector(".phase-3-status-4");
    if (successBanner) {
      successBanner.classList.add("visible");
      scrollToElement(successBanner);
      createSparkles(successBanner);
    }
  }, p3Response + 3200));

  // Bouton replay et afficher l'indicateur de scroll
  animationTimeouts.push(setTimeout(() => {
    replayBtn.classList.add("visible");
    terminalAnimationComplete = true;
    // N'afficher l'indicateur que si on est en haut de page (pas scrollé)
    const scrollIndicator = document.querySelector(".scroll-indicator");
    if (scrollIndicator && window.scrollY < 50) {
      scrollIndicator.classList.remove("hidden");
      scrollIndicator.style.opacity = 1;
    }
  }, p3Response + 4000));
}

function replayTerminal() {
  // Annuler tous les timeouts en cours
  animationTimeouts.forEach(id => clearTimeout(id));
  animationTimeouts = [];

  replayBtn.classList.remove("visible");
  terminalAnimationComplete = false;

  // Reset tous les éléments du terminal central
  centralTerminal
    .querySelectorAll(
      ".cli-prompt, .cli-response, .cli-status, .cli-section-title, .cli-item, .cli-agents, .cli-success-banner",
    )
    .forEach((el) => {
      el.classList.remove("visible");
      el.classList.remove("completed");
    });

  centralTerminal
    .querySelectorAll(".loader")
    .forEach((el) => el.classList.remove("done"));
  centralTerminal
    .querySelectorAll(".checkmark")
    .forEach((el) => el.classList.remove("visible"));
  centralTerminal
    .querySelectorAll(".result")
    .forEach((el) => el.classList.remove("visible"));

  centralTerminal.querySelectorAll(".command").forEach((cmd) => {
    cmd.textContent = "";
    cmd.classList.remove("typing");
  });

  // Reset agents text
  const agentsText = centralTerminal.querySelector(".agents-text");
  if (agentsText) agentsText.textContent = "2 agents coding...";

  // Reset diffs
  const diffContainer = centralTerminal.querySelector(".agents-diff-container");
  if (diffContainer) diffContainer.classList.remove("visible");
  centralTerminal
    .querySelectorAll(".diff-file")
    .forEach((el) => el.classList.remove("visible"));
  centralTerminal
    .querySelectorAll(".diff-line")
    .forEach((el) => el.classList.remove("visible"));

  // Cacher l'indicateur de scroll
  const scrollIndicator = document.querySelector(".scroll-indicator");
  if (scrollIndicator) scrollIndicator.classList.add("hidden");

  terminalContent.scrollTop = 0;

  setTimeout(animateTerminal, 300);
}

// Start terminal animation after page load (now handled by zoom effect)
// Terminal animation is started in initZoomEffect()

// Purple sparkle trail effect
const purpleColors = [
  "#a855f7",
  "#9333ea",
  "#7c3aed",
  "#6366f1",
  "#8b5cf6",
  "#c084fc",
  "#d8b4fe",
  "#a78bfa",
];
let lastTrailTime = 0;
const trailDelay = 25;

document.addEventListener("mousemove", (e) => {
  const now = Date.now();
  if (now - lastTrailTime < trailDelay) return;
  lastTrailTime = now;

  const numSparkles = Math.random() > 0.5 ? 2 : 1;

  for (let i = 0; i < numSparkles; i++) {
    const sparkle = document.createElement("div");
    sparkle.className = "sparkle";

    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = (Math.random() - 0.5) * 20;
    const size = 8 + Math.random() * 12;
    const color =
      purpleColors[Math.floor(Math.random() * purpleColors.length)];
    const rotation = Math.random() * 45;

    sparkle.style.left = e.clientX - size / 2 + offsetX + "px";
    sparkle.style.top = e.clientY - size / 2 + offsetY + "px";
    sparkle.style.width = size + "px";
    sparkle.style.height = size + "px";
    sparkle.style.color = color;
    sparkle.style.filter = `drop-shadow(0 0 ${3 + Math.random() * 4}px ${color})`;
    sparkle.style.transform = `rotate(${rotation}deg)`;
    sparkle.style.animation = `sparkle-fade ${0.4 + Math.random() * 0.3}s ease-out forwards`;

    document.body.appendChild(sparkle);

    setTimeout(() => {
      sparkle.remove();
    }, 700);
  }
});

// Documentation Modal
const docModalOverlay = document.getElementById("doc-modal-overlay");
const docModal = document.getElementById("doc-modal");
const docModalClose = document.getElementById("doc-modal-close");
const docLink = document.getElementById("doc-link");
const docLinkFooter = document.getElementById("doc-link-footer");
const docLinkCta = document.getElementById("doc-link-cta");

function openDocModal(e) {
  e.preventDefault();
  docModalOverlay.classList.add("open");
  docModal.classList.add("open");
  document.body.style.overflow = "hidden";
  feather.replace();
}

function closeDocModal() {
  docModalOverlay.classList.remove("open");
  docModal.classList.remove("open");
  document.body.style.overflow = "";
}

docLink.addEventListener("click", openDocModal);
docLinkFooter.addEventListener("click", openDocModal);
docLinkCta.addEventListener("click", openDocModal);
docModalClose.addEventListener("click", closeDocModal);
docModalOverlay.addEventListener("click", closeDocModal);

// Close on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && docModal.classList.contains("open")) {
    closeDocModal();
  }
});

// Copy code in doc modal
function copyDocCode(elementId) {
  const el = document.getElementById(elementId);
  const text = el.textContent.trim();
  navigator.clipboard.writeText(text).then(() => {
    const btn = el.closest(".doc-code-block").querySelector(".copy-btn");
    btn.innerHTML = '<i data-feather="check"></i>';
    feather.replace();
    setTimeout(() => {
      btn.innerHTML = '<i data-feather="copy"></i>';
      feather.replace();
    }, 2000);
  });
}

// Sidebar navigation
const sidebarLinks = document.querySelectorAll(".doc-sidebar-link");
const docModalBody = document.querySelector(".doc-modal-body");

sidebarLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetId = link.getAttribute("href").substring(1);
    const targetSection = document.getElementById(targetId);

    if (targetSection) {
      targetSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      // Update active state
      sidebarLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    }
  });
});

// Update active link on scroll
docModalBody.addEventListener("scroll", () => {
  const sections = document.querySelectorAll(".doc-section[id]");
  let currentSection = "";

  sections.forEach((section) => {
    const sectionTop = section.offsetTop - docModalBody.offsetTop;
    if (docModalBody.scrollTop >= sectionTop - 100) {
      currentSection = section.getAttribute("id");
    }
  });

  sidebarLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === "#" + currentSection) {
      link.classList.add("active");
    }
  });
});
