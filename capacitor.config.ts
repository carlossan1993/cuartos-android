import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.carlossan1993.cuartos',
  appName: 'Odamus',
  webDir: 'dist',
  android: { backgroundColor: '#f6f5f0' },
  plugins: {
    SystemBars: { insetsHandling: 'native', style: 'DARK', initialViewportFitValueHint: 'cover' },
  },
}

export default config
