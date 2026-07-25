import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.vinosderemate.colector',
  appName: 'Vinos Colector',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
}

export default config
