import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kravex.app',
  appName: 'Kravex',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#030712',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      iosSplashResourceName: 'splash'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#030712'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  }
}

export default config
