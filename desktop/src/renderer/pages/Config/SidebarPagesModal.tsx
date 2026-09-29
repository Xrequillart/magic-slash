import { FolderGit2, ListTodo, NotebookPen, Sparkles } from '@ds/desktop/icons'
import { SidebarPagesEditor, Text, type IconComponent, type SidebarPagesEditorItem } from '@ds/desktop'
import { Modal } from '../../components/Modal'
import { useConfig } from '../../hooks/useConfig'
import { showToast } from '../../components/Toast'
import { useT, type MessageKey } from '../../i18n'
import { sidebarPageOrder, type SidebarPageId } from '../../../types'

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
}

export function SidebarPagesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const t = useT()
  const { config, updateSidebarPages } = useConfig()
  const hidden = config?.sidebarHidden ?? []

  const items: SidebarPagesEditorItem[] = sidebarPageOrder(config?.sidebarOrder).map((id) => ({
    id,
    icon: PAGES[id].icon,
    label: t(PAGES[id].label),
    visible: !hidden.includes(id),
  }))

  const write = async (patch: { order?: SidebarPageId[]; hidden?: SidebarPageId[] }) => {
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
          onVisibilityChange={(id, visible) => void write({
            hidden: visible
              ? hidden.filter((x) => x !== id)
              : [...hidden.filter((x) => x !== id), id as SidebarPageId],
          })}
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
