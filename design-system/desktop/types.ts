import type { ComponentType, CSSProperties } from 'react'

/**
 * An icon, as this folder is allowed to know it.
 *
 * NOT `LucideIcon`, even though this folder now owns `lucide-react` and could name
 * it. The type says what a component must ACCEPT to be drawn here, and tying that
 * to one library's own type would make every brand mark in `brand.tsx` — none of
 * which come from Lucide — a second-class citizen needing a cast.
 *
 * Structurally this is what a Lucide icon IS, so `<Banner icon={BotMessageSquare}>`
 * type-checks in either app with no cast: the call site keeps its own library and
 * this folder keeps its independence. Any component taking these two props works
 * too — a design system should not care who drew the glyph.
 *
 * `style` is in here for exactly one reason and it is a good one: a brand's own
 * colour. Claude Code's coral is `#D97757`, it is not a token and must never become
 * one, so the two cards that paint the mark in it pass an inline style. Everything
 * else colours an icon with a class.
 */
export type IconComponent = ComponentType<{ className?: string; style?: CSSProperties }>
