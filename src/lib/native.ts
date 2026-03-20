import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { StatusBar, Style } from '@capacitor/status-bar'
import { App } from '@capacitor/app'

export const isNative = Capacitor.isNativePlatform()

export async function hapticFeedback(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
  if (!isNative) return
  const styleMap = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy }
  await Haptics.impact({ style: styleMap[style] })
}

export async function setupStatusBar(): Promise<void> {
  if (!isNative) return
  await StatusBar.setStyle({ style: Style.Dark })
  await StatusBar.setBackgroundColor({ color: '#030712' })
}

export function setupBackButton(callback: () => void): () => void {
  if (!isNative) return () => {}
  const listener = App.addListener('backButton', callback)
  return () => { listener.then(l => l.remove()) }
}
