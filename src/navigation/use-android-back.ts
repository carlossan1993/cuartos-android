import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { attachAndroidBack } from './back-controller'
import { backController } from './use-back'

export function useAndroidBack() {
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return
    let disposed = false, remove: (() => void) | undefined
    void import('@capacitor/app').then(({ App }) => {
      if (!disposed) remove = attachAndroidBack(App, () => backController.request(), () => setFailed(true))
    }).catch(() => { if (!disposed) setFailed(true) })
    return () => { disposed = true; remove?.() }
  }, [attempt])
  return { failed, retry: () => { setFailed(false); setAttempt(n => n + 1) } }
}
