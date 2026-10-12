# Web design system

Empty on purpose.

The site's primitives still live in `webapp/components/ui.tsx` — `Button`,
`Card`, `Badge`, `Section` and the rest — and they move here one at a time, the
way the desktop's are, rather than in one migration nobody can review.

Nothing in here may ever import from `../desktop`. See the README one level up.
