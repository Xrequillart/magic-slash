import { CircleUserRound, Cog, FolderGit2, ListTodo, NotebookPen, Sparkles } from '@ds/desktop/icons'
import { SidebarPagesEditor, Text, type IconComponent, type SidebarPagesEditorItem } from '@ds/desktop'
import { Modal } from '../../components/Modal'
import { useConfig } from '../../hooks/useConfig'
import { showToast } from '../../components/Toast'
import { useT, type MessageKey } from '../../i18n'
import { isSidebarPageShown, SIDEBAR_OPT_IN_PAGES, sidebarPageOrder, type SidebarPageId } from '../../../types'

/**
 * THE SIDEBAR'S MENU, ARRANGED: which pages it draws and in what order, opened from the
 * Application page's Sidebar card.
 *
 * Every change is written as it is made, like the quick settings sheet's editor: there is
 * no Save, because the column behind the dialog redraws on each write and is its own
 * preview. The marks and names are the ones Sidebar.tsx draws, so a row here reads as the
 * row it moves.
 */
const PAGES: Record<SidebarPageId, { icon: IconComponent; label: MessageKey }> = {
  plans: { icon: NotebookPen, label: 'sidebar.plans' },
  tasks: { icon: ListTodo, label: 'sidebar.tasks' },
  skills: { icon: Sparkles, label: 'sidebar.skills' },
  repositories: { icon: FolderGit2, label: 'settings.tab.repositories' },
  settings: { icon: Cog, label: 'accountMenu.settings' },
  account: { icon: CircleUserRound, label: 'settings.tab.account' },
}

export function SidebarPagesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const t = useT()
  const { config, updateSidebarPages } = useConfig()
  const hidden = config?.sidebarHidden ?? []
  const shown = config?.sidebarShown ?? []

  const items: SidebarPagesEditorItem[] = sidebarPageOrder(config?.sidebarOrder).map((id) => ({
    id,
    icon: PAGES[id].icon,
    label: t(PAGES[id].label),
    visible: isSidebarPageShown(id, hidden, shown),
  }))

  const write = async (patch: { order?: SidebarPageId[]; hidden?: SidebarPageId[]; shown?: SidebarPageId[] }) => {
    try {
      await updateSidebarPages(patch)
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('settings.application.sidebar.modalTitle')}>
      <div className="flex flex-col gap-3">
        <SidebarPagesEditor
          items={items}
          onReorder={(ids) => void write({ order: ids as SidebarPageId[] })}
          // An opt-in page is put ON the menu (`shown`), any other is taken OFF it (`hidden`).
          onVisibilityChange={(id, visible) => {
            const page = id as SidebarPageId
            const others = (list: SidebarPageId[]) => list.filter((x) => x !== page)
            void write(SIDEBAR_OPT_IN_PAGES.includes(page)
              ? { shown: visible ? [...others(shown), page] : others(shown) }
              : { hidden: visible ? others(hidden) : [...others(hidden), page] })
          }}
          showLabel={t('settings.application.sidebar.show')}
          hideLabel={t('settings.application.sidebar.hide')}
          moveLabel={(label) => t('settings.application.sidebar.move', { page: label })}
          visibilityLabel={(label) => t('settings.application.sidebar.visibility', { page: label })}
        />
        <Text size="xs" tone="secondary">{t('settings.application.sidebar.footnote')}</Text>
      </div>
    </Modal>
  )
}
