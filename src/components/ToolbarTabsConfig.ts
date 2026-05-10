export type ToolbarTabId = 'file' | 'edit'

export type ToolbarActionId = 'open' | 'save' | 'saveAs' | 'settings' | 'editLimits'

export interface ToolbarTabConfig {
  id: ToolbarTabId
  labelKey: string
  actions: ToolbarActionId[]
}

export const TOOLBAR_TABS: ToolbarTabConfig[] = [
  {
    id: 'file',
    labelKey: 'toolbar.tabFile',
    actions: ['open', 'save', 'saveAs', 'settings']
  },
  {
    id: 'edit',
    labelKey: 'toolbar.tabEdit',
    actions: ['editLimits']
  }
]

export const DEFAULT_TOOLBAR_TAB_ID: ToolbarTabId = 'file'
