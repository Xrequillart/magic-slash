import { Text } from './Text'

/**
 * THE LINE A CARD DRAWS WHERE ITS CONTENT WOULD BE, when there is none.
 *
 * `text-sm text-text-secondary/50 text-center py-2`, spelled three times on one settings
 * page: the Claude account with nothing read off disk, the rate limits with no agent
 * having reported any, the spend with no history. Three cards saying the same kind of
 * thing in three places that could each have been edited without the others.
 *
 * `FactList` and `UsageTable` draw their own — a list knows when it is empty. IT IS
 * EXPORTED ANYWAY, because the third case has no such owner: the rate limits are two
 * separate gauges the page assembles, so the CARD is empty without any one component
 * being able to say so. That is the rule for reaching for it — a card whose content is
 * not a single component, and never a page wanting a quiet centred sentence.
 *
 * CENTRED, where every other line in these cards is flush left. That is the whole of how
 * it reads as an absence rather than as the first row of a list that failed to load.
 */
export function EmptyLine({ children }: { children: string }) {
  return (
    <Text size="sm" tone="secondary" className="block py-2 text-center opacity-50">
      {children}
    </Text>
  )
}
