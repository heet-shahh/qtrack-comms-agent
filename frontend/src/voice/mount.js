// Bridge between the vanilla-JS qTrack mock and the React voice widget. The mock
// calls mountVoiceAgent(el, props) wherever a live call belongs; unmount tears
// the React root down when the call surface closes.
import React from 'react'
import { createRoot } from 'react-dom/client'
import VoiceAgent from './VoiceAgent.jsx'

const roots = new WeakMap()

export function mountVoiceAgent(el, props = {}) {
  if (!el) return
  let root = roots.get(el)
  if (!root) {
    root = createRoot(el)
    roots.set(el, root)
  }
  root.render(React.createElement(VoiceAgent, props))
}

export function unmountVoiceAgent(el) {
  const root = roots.get(el)
  if (root) {
    root.unmount()
    roots.delete(el)
  }
}
