/** Klucz i18n dla tekstu zastępczego modułu wymiarów na lewym panelu. */
export function leftPanelDimensionsPlaceholderI18nKey(hasModel: boolean): string {
  return hasModel
    ? 'leftPanel.dimensions.placeholderReady'
    : 'leftPanel.dimensions.placeholderNoModel'
}
