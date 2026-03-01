import { useState } from 'react'
import { Toolbar } from './components/Toolbar'
import { Viewer3D } from './components/Viewer3D'
import { LeftPanel } from './components/LeftPanel'
import { RightPanel } from './components/RightPanel'
import styles from './App.module.css'

function App() {
  const [modelKey, setModelKey] = useState(0)

  const handleReset = () => {
    setModelKey((k) => k + 1)
  }

  return (
    <div className={styles.app}>
      <Toolbar onReset={handleReset} />
      <div className={styles.main}>
        <LeftPanel />
        <div className={styles.viewport}>
          <Viewer3D key={modelKey} />
        </div>
        <RightPanel />
      </div>
    </div>
  )
}

export default App
