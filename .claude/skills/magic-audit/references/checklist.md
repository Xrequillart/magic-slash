# Audit Checklist

> Detailed checklist for each docs page. Used by the audit skill to know exactly what to verify.

## skills.html

| ID | Check | Source of truth | Severity |
|----|-------|----------------|----------|
| SK-01 | All 7 skills are listed | `ls skills/*/SKILL.md` | ERROR |
| SK-02 | No extra/removed skills listed | `ls skills/*/SKILL.md` | ERROR |
| SK-03 | Each skill name matches SKILL.md frontmatter `name` | `skills/*/SKILL.md` YAML | ERROR |
| SK-04 | Each skill description is consistent with SKILL.md | `skills/*/SKILL.md` first section | WARNING |
| SK-05 | Feature highlights per skill match actual steps | `skills/*/SKILL.md` step headers | WARNING |
| SK-06 | Skill images referenced exist in docs/ | `ls docs/skill-*.png` | ERROR |
| SK-07 | EN and FR translations describe the same skills | Compare `data-i18n` pairs | WARNING |

## desktop.html

### Docs -> Code (feature still exists?)

Each feature section (`dsk-section dsk-{id}`) in the HTML must have a matching code source. If the code was removed but the docs still advertise the feature, that's an ERROR.

| ID | Feature section | Code source (existence proof) | Severity |
|----|----------------|-------------------------------|----------|
| DT-F01 | `split` | `desktop/src/renderer/pages/Terminals` | ERROR |
| DT-F02 | `tracking` | `Sidebar.tsx` contains agent/status logic | ERROR |
| DT-F03 | `context` | `desktop/src/renderer/components/AgentInfoSidebar.tsx` | ERROR |
| DT-F04 | `keyboard` | `keyboard\|shortcut\|hotkey` grep in `desktop/src/renderer/` | ERROR |
| DT-F05 | `budget` | `budget\|token.*usage` grep in `desktop/src/` | ERROR |
| DT-F06 | `runner` | `runner\|runScript` grep in `desktop/src/` | ERROR |
| DT-F07 | `notifs` | `notification\|toast` grep in `desktop/src/` | ERROR |
| DT-F08 | `updates` | `desktop/src/main/updater.ts` | ERROR |
| DT-F09 | `config` | `desktop/src/renderer/pages/Config` | ERROR |

### Code -> Docs (feature documented?)

Each renderer page and key component must have a corresponding section in the docs. If a feature exists in the code but isn't documented, that's a WARNING (new feature not yet documented).

| ID | Code source | Expected in docs | Severity |
|----|------------|-----------------|----------|
| DT-R01 | `pages/Terminals` | `split` section | WARNING |
| DT-R02 | `pages/Config` | `config` section | WARNING |
| DT-R03 | `pages/Skills` | Mentioned anywhere | WARNING |
| DT-R04 | `pages/QuickLaunch` | Mentioned anywhere | WARNING |
| DT-R05 | `pages/TrayPopover` | Mentioned anywhere (tray integration) | WARNING |
| DT-R06 | `components/UpdateOverlay.tsx` | `updates` section | WARNING |
| DT-R07 | `components/AgentInfoSidebar.tsx` | `context` section | WARNING |
| DT-R08 | `components/WhatsNewModal.tsx` | Mentioned anywhere | WARNING |
| DT-R09 | `components/Toast.tsx` | `notifs` section | WARNING |
| DT-R10 | `main/tray/` | Mentioned anywhere | WARNING |

### Other checks

| ID | Check | Source of truth | Severity |
|----|-------|----------------|----------|
| DT-O01 | Tech stack matches desktop/package.json deps | `desktop/package.json` dependencies | WARNING |
| DT-O02 | Screenshots referenced exist in docs/ | `ls docs/` | ERROR |
| DT-O03 | EN and FR translations describe the same features | Compare `data-i18n` pairs | WARNING |

## documentation.html

### Skills & version

| ID | Check | Source of truth | Severity |
|----|-------|----------------|----------|
| DOC-01 | Prerequisites match install.sh checks | `install/install.sh` prerequisite section | ERROR |
| DOC-02 | All 7 skills documented in reference section | `ls skills/*/SKILL.md` | ERROR |
| DOC-03 | Version numbers match package.json | `package.json` version field | ERROR |

### Desktop section — feature coverage (docs -> code)

Each desktop feature that exists in the code should be documented somewhere in documentation.html (in the "Desktop App" section, "Updates" section, or elsewhere).

| ID | Desktop feature | Code source | Expected doc coverage | Severity |
|----|----------------|------------|----------------------|----------|
| DOC-D01 | Split view / terminals | `pages/Terminals` | `split\|side by side` | WARNING |
| DOC-D02 | Agent tracking | `Sidebar.tsx` agent state | `tracking\|agent.*status` | WARNING |
| DOC-D03 | Context panel | `AgentInfoSidebar.tsx` | `context.*panel\|agent.*info` | WARNING |
| DOC-D04 | Keyboard shortcuts | keyboard handling in renderer | `keyboard\|shortcut` | WARNING |
| DOC-D05 | Token budget | budget tracking in src | `budget\|token.*usage` | WARNING |
| DOC-D06 | Script runner | runner logic in src | `runner\|script.*run` | WARNING |
| DOC-D07 | Notifications | Toast + notification logic | `notification` | WARNING |
| DOC-D08 | Auto-updates | `main/updater.ts` | `auto.update\|electron.updater` | WARNING |
| DOC-D09 | Quick Launch / Cmd+K | `pages/QuickLaunch` | `quick.*launch\|command.*palette` | WARNING |
| DOC-D10 | Tray integration | `pages/TrayPopover` + `main/tray/` | `tray\|menu.*bar` | WARNING |
| DOC-D11 | What's New modal | `WhatsNewModal.tsx` | `what.*new\|release.*note` | WARNING |
| DOC-D12 | Skills browsing page | `pages/Skills` | `skills.*page\|skills.*browse` | WARNING |

### Desktop section — reverse check (docs still valid?)

Each feature documented in the desktop section must still exist in the code.

| ID | Check | Source of truth | Severity |
|----|-------|----------------|----------|
| DOC-R01 | Each `<h3>` in desktop section maps to existing code | `desktop/src/` | ERROR |

### Updates section completeness

| ID | Check | Source of truth | Severity |
|----|-------|----------------|----------|
| DOC-U01 | Desktop app updates documented | `desktop/src/main/updater.ts` | WARNING |
| DOC-U02 | Skills auto-update documented | `desktop/src/main/skills-updater.ts` | WARNING |
| DOC-U03 | Manual update check documented | Settings / re-install instructions | WARNING |

### Other checks

| ID | Check | Source of truth | Severity |
|----|-------|----------------|----------|
| DOC-O01 | Config format matches actual config structure | `~/.config/magic-slash/config.json` or README | WARNING |
| DOC-O02 | CLI commands match install/magic-slash script | `install/magic-slash` | WARNING |
| DOC-O03 | Troubleshooting references real error scenarios | Skills error handling sections | WARNING |

## index.html

| ID | Check | Source of truth | Severity |
|----|-------|----------------|----------|
| IDX-01 | Number of skills mentioned is 7 | `ls skills/*/SKILL.md \| wc -l` | ERROR |
| IDX-02 | Feature highlights match actual capabilities | Skills + Desktop features | WARNING |
| IDX-03 | Internal links are valid | Check href targets exist | ERROR |
| IDX-04 | Images referenced exist in docs/ | `ls docs/*.png` | ERROR |
| IDX-05 | EN and FR translations are consistent | Compare `data-i18n` pairs | WARNING |

## Version consistency

| ID | Check | Source of truth | Severity |
|----|-------|----------------|----------|
| VER-01 | package.json (root) is reference | — | — |
| VER-02 | desktop/package.json matches | Root package.json | ERROR |
| VER-03 | README.md matches | Root package.json | ERROR |
| VER-04 | docs/documentation.html matches (2 occurrences) | Root package.json | ERROR |
| VER-05 | All 7 SKILL.md files match | Root package.json | ERROR |
| VER-06 | Sidebar.tsx matches | Root package.json | ERROR |
| VER-07 | install.sh fallback matches | Root package.json | ERROR |

## Images and assets

| ID | Check | Source of truth | Severity |
|----|-------|----------------|----------|
| IMG-01 | All `src="..."` image references resolve to existing files | `docs/` directory listing | ERROR |
| IMG-02 | No orphaned skill images (image exists but skill removed) | Skills list vs `docs/skill-*.png` | WARNING |
