import { useEffect, useLayoutEffect, useRef } from 'react'
import { projectStore } from '../state/project-store'
import { createBackController } from './back-controller'

export const backController = createBackController(() => projectStore.getState().pending !== null)
export function useBackAction(handle: () => boolean, priority = 10) {
  const current = useRef(handle)
  useLayoutEffect(() => { current.current = handle })
  useLayoutEffect(() => backController.add(() => current.current(), priority), [priority])
}
export function useViewport() {
  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const viewport = window.visualViewport
        document.documentElement.style.setProperty('--viewport-height', `${viewport?.height ?? innerHeight}px`)
        document.documentElement.style.setProperty('--viewport-top', `${viewport?.offsetTop ?? 0}px`)
        const focused = document.activeElement
        if (focused instanceof HTMLElement && focused.matches('input, select, textarea') && focused.closest('.tool-dialog-content')) focused.scrollIntoView({ block: 'nearest' })
      })
    }
    update(); window.addEventListener('resize', update); window.visualViewport?.addEventListener('resize', update); window.visualViewport?.addEventListener('scroll', update)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', update); window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update) }
  }, [])
}
