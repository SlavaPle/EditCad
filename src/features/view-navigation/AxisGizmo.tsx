import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AxisGizmoControl } from './AxisGizmoControl'
import { AxisGizmoHelper } from './AxisGizmoHelper'
import {
  AXIS_GIZMO_COLORS,
  AXIS_GIZMO_MARGIN,
  buildAxisGizmoLabels,
  type AxisGizmoLabelKey,
} from './axisGizmoConfig'

/** Osie współrzędnych w lewym dolnym rogu — synchronizacja z kamerą i kostką widoku. */
export function AxisGizmo() {
  const { t } = useTranslation()
  const labels = useMemo(
    () => buildAxisGizmoLabels((key) => t(key as AxisGizmoLabelKey)),
    [t],
  )

  return (
    <AxisGizmoHelper alignment="bottom-left" margin={AXIS_GIZMO_MARGIN}>
      <AxisGizmoControl labels={labels} colors={AXIS_GIZMO_COLORS} />
    </AxisGizmoHelper>
  )
}
