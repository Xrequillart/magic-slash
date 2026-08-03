/**
 * The hero mockup's terminal animation: the scripted /magic:start → /magic:done run
 * that plays inside the fake desktop window.
 *
 * Ported ESSENTIALLY VERBATIM from the IIFE in `docs/script.js` (lines 749-1275), and
 * deliberately still imperative. It choreographs dozens of class changes across ~30
 * elements on a timeline of hand-tuned delays; expressing that as React state would be
 * a rewrite, and a rewrite of an animation is a rewrite of how it LOOKS. The subtree it
 * touches is static — React renders it once and never re-renders it — so mutating it
 * from an effect is safe.
 *
 * Three changes against the original:
 *   - Everything is scoped to a root element instead of `document`, so the module has
 *     no globals and can be mounted and torn down with the component.
 *   - `window.replayDesktopTerminal` is gone; the replay button is wired here.
 *   - The `feather.replace()` calls are gone. Icons are lucide elements in the JSX,
 *     already rendered — there is nothing to swap in after the fact.
 *
 * The queried elements are typed `any` on purpose. The original reaches for
 * `.offsetTop`, `.style` and `.innerHTML` on the results of selector lookups, and
 * threading precise element types through 400 lines of ported code would mean editing
 * that code — which is exactly what this file is trying not to do.
 */

/** Mounts the animation on a `.desktop-frame`. Returns a teardown. */
export function mountDesktopTerminal(root: HTMLElement): () => void {
    const q = (selector: string): any => root.querySelector(selector)

    var terminal = q('.desktop-main-terminal');
    var contentEl = q('#desktop-terminal-content');
    if (!terminal || !contentEl) return () => {};

    var desktopTimeouts: any[] = [];
    var desktopAnimationStarted = false;

    function dt(fn: any, delay: any) {
        var id = setTimeout(fn, delay);
        desktopTimeouts.push(id);
        return id;
    }

    function selectIn(selector: any) {
        return terminal.querySelector(selector);
    }

    function lockScroll() {
        contentEl.style.overflowY = 'hidden';
    }
    function unlockScroll() {
        contentEl.style.overflowY = 'auto';
    }

    function scrollToEl(el: any) {
        if (!el) return;
        var scrollTarget = el.offsetTop + el.offsetHeight - contentEl.clientHeight + 40;
        if (scrollTarget > contentEl.scrollTop) {
            contentEl.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        }
    }

    function showEl(selector: any, delay: any) {
        dt(function() {
            var el = selectIn(selector);
            if (el) {
                el.classList.add('visible');
                scrollToEl(el);
            }
        }, delay);
    }

    function completeEl(selector: any, delay: any, showResult?: any) {
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

    function typeText(element: any, text: any, speed: any) {
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
    var agentSpinner = q('#desktop-agent-auth-spinner');
    var agentCheck = q('#desktop-agent-auth-check');
    var agentDot = q('#desktop-agent-auth-dot');

    // Right sidebar elements
    var sidebarFiles = q('#desktop-right-files');
    var sidebarCount = q('#desktop-right-changes-count');
    var sidebarGauge = q('#desktop-right-gauge');
    var sidebarHead = q('#desktop-right-changes-head');
    var sidebarNoChanges = q('#desktop-right-no-changes');
    var sidebarCommits = q('#desktop-right-commits');
    var sidebarAhead = q('#desktop-right-ahead');

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

    function addSidebarFile(index: any) {
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

    function addSidebarCommit(hash: any, msg: any) {
        if (!sidebarCommits) return;
        var div = document.createElement('div');
        div.className = 'desktop-right-commit fade-in';
        div.innerHTML = '<span class="desktop-right-commit-hash">' + hash + '</span>' +
            '<span class="desktop-right-commit-msg">' + msg + '</span>' +
            '<span class="desktop-right-commit-time">now</span>';
        sidebarCommits.insertBefore(div, sidebarCommits.firstChild);
    }

    function showSidebarAhead(count: any) {
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
        var prLink = q('#desktop-right-pr-link');
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
                diffFiles.forEach(function(file: any, fileIndex: any) {
                    dt(function() {
                        file.classList.add('visible');
                        scrollToEl(file);
                        // Add file to sidebar when diff file appears
                        addSidebarFile(fileIndex);
                        var diffLines = file.querySelectorAll('.diff-line');
                        diffLines.forEach(function(line: any, lineIndex: any) {
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
            var prLink = q('#desktop-right-pr-link');
            if (prLink) {
                prLink.classList.add('visible');
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

    // Replay function(global for onclick: any)
        function replay() {
        // Clear all timeouts
        desktopTimeouts.forEach(function(id: any) { clearTimeout(id); });
        desktopTimeouts = [];

        // Reset all visual elements
        terminal.querySelectorAll('.cli-prompt, .cli-response, .cli-status, .cli-agents, .cli-success-banner')
            .forEach(function(el: any) {
                el.classList.remove('visible', 'completed');
            });
        terminal.querySelectorAll('.loader').forEach(function(el: any) { el.classList.remove('done'); });
        terminal.querySelectorAll('.checkmark').forEach(function(el: any) { el.classList.remove('visible'); });
        terminal.querySelectorAll('.result').forEach(function(el: any) { el.classList.remove('visible'); });
        terminal.querySelectorAll('.command').forEach(function(cmd: any) {
            cmd.textContent = '';
            cmd.classList.remove('typing');
        });
        terminal.querySelectorAll('.workflow-line').forEach(function(el: any) { el.classList.remove('visible'); });

        var agentsText = terminal.querySelector('.agents-text');
        if (agentsText) agentsText.textContent = '1 agent coding...';

        var diffContainer = terminal.querySelector('.agents-diff-container');
        if (diffContainer) diffContainer.classList.remove('visible');
        terminal.querySelectorAll('.diff-file').forEach(function(el: any) { el.classList.remove('visible'); });
        terminal.querySelectorAll('.diff-line').forEach(function(el: any) { el.classList.remove('visible'); });

        var btn = terminal.querySelector('.desktop-replay-btn');
        if (btn) btn.classList.remove('visible');

        contentEl.scrollTop = 0;

        // Reset sidebar
        resetSidebar();

        startDesktopTerminalAnimation();
    }

    var replayBtn = q('.desktop-replay-btn');
    if (replayBtn) replayBtn.addEventListener('click', replay);

    // Start when the window scrolls into view, once — the same trigger and threshold
    // the original used, so the animation still begins where the visitor can see it.
    var observer = new IntersectionObserver(function(entries: any) {
        entries.forEach(function(entry: any) {
            if (entry.isIntersecting && !desktopAnimationStarted) {
                desktopAnimationStarted = true;
                startDesktopTerminalAnimation();
            }
        });
    }, { threshold: 0.3 });
    observer.observe(terminal);

    return () => {
        observer.disconnect();
        if (replayBtn) replayBtn.removeEventListener('click', replay);
        desktopTimeouts.forEach(function(id) { clearTimeout(id); });
        desktopTimeouts = [];
    };
}
