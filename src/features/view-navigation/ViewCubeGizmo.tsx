import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ViewCubeControl } from './ViewCubeControl'
import { ViewCubeGizmoHelper } from './ViewCubeGizmoHelper'
import { buildViewCubeFaceLabels, type ViewCubeFaceLabelKey } from './viewCubeFaces'

/** Odstęp od prawego górnego rogu widoku (px). */
const VIEW_CUBE_MARGIN: [number, number] = [76, 76]

export function ViewCubeGizmo() {
  const { t } = useTranslation()
  const faces = useMemo(
    () => buildViewCubeFaceLabels((key) => t(key as ViewCubeFaceLabelKey)),
    [t],
  )

  return (
    <ViewCubeGizmoHelper alignment="top-right" margin={VIEW_CUBE_MARGIN}>
      <ViewCubeControl
        faces={faces}
        color="#c5cad1"
        hoverColor="#e8ebf0"
        textColor="#3d4555"
        strokeColor="#7a8494"
        opacity={0.96}
        font="600 22px system-ui, Segoe UI, sans-serif"
      />
    </ViewCubeGizmoHelper>
  )
}
