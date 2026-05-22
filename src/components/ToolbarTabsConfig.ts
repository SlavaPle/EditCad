export type ToolbarTabId = 'file' | 'edit' | 'view'

export type ToolbarActionId =
  | 'open'
  | 'save'
  | 'saveAs'
  | 'paste'
  | 'settings'
  | 'editLimits'
  | 'editAppearance'
  | 'viewEdgesOnly'
  | 'viewSolid'
  | 'viewSolidTextured'
  | 'viewSolidWithEdges'

export interface ToolbarTabConfig {
  id: ToolbarTabId
  labelKey: string
  actions: ToolbarActionId[]
}

export const TOOLBAR_TABS: ToolbarTabConfig[] = [
  {
    id: 'file',
    labelKey: 'toolbar.tabFile',
    actions: ['open', 'save', 'saveAs', 'paste']
  },
  {
    id: 'edit',
    labelKey: 'toolbar.tabEdit',
    actions: ['editLimits', 'editAppearance']
  },
  {
    id: 'view',
    labelKey: 'toolbar.tabView',
    actions: ['viewEdgesOnly', 'viewSolid', 'viewSolidTextured', 'viewSolidWithEdges']
  }
]

export const DEFAULT_TOOLBAR_TAB_ID: ToolbarTabId = 'file'
