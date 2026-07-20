import React from 'react'
import { useStore } from '../store/useStore'

// POC affordance standing in for real role-based auth: flip between the clinical
// navigator experience and the admin / workflow-management console.
export default function ModeSwitcher() {
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  return (
    <div className="modesw" title="In production this is role-based; here it's a manual toggle">
      <span className="modesw-lab">Viewing as</span>
      <div className="seg">
        <button className={mode === 'navigator' ? 'on' : ''} onClick={() => setMode('navigator')}>Navigator</button>
        <button className={mode === 'admin' ? 'on' : ''} onClick={() => setMode('admin')}>Admin</button>
      </div>
    </div>
  )
}
