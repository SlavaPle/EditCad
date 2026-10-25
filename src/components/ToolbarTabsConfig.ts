export type ToolbarTabId = 'file' | 'edit' | 'view'

export type ToolbarActionId =
  | 'open'
  | 'save'
  | 'saveAs'
  | 'paste'
  | 'settings'
  | 'editLimits'
  | 'editAppearance'
  | 'editMates'
  | 'viewEdgesOnly'
  | 'viewSolid'
  | 'viewSolidTextured'
  | 'viewSolidWithEdges'
  | 'createPhantom'
  | 'addPart'
  | 'createAttachment'

export interface ToolbarTabConfig {
  id: ToolbarTabId
  labelKey: string
  actions: ToolbarActionId[]
}

export const TOOLBAR_TABS: ToolbarTabConfig[] = [
  {
    id: 'file',
    labelKey: 'toolbar.tabFile',
    actions: [
      'open',
      'save',
      'saveAs',
      'paste',
      'addPart',
      'createPhantom',
      'createAttachment',
    ],
  },
  {
    id: 'edit',
    labelKey: 'toolbar.tabEdit',
    actions: ['editLimits', 'editAppearance', 'editMates'],
  },
  {
    id: 'view',
    labelKey: 'toolbar.tabView',
    actions: ['viewEdgesOnly', 'viewSolid', 'viewSolidTextured', 'viewSolidWithEdges'],
  },
]

export const DEFAULT_TOOLBAR_TAB_ID: ToolbarTabId = 'file'
