import React from 'react'
import { useStore } from './store/useStore'
import AdminApp from './admin/AdminApp'
import NavigatorApp from './navigator/NavigatorApp'

export default function App() {
  const mode = useStore((s) => s.mode)
  const toast = useStore((s) => s.toast)
  return (
    <>
      {mode === 'admin' ? <AdminApp /> : <NavigatorApp />}
      {toast && <div className="toast">{toast.msg}</div>}
    </>
  )
}
