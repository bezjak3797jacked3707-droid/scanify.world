import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'world.scanify.app',
  appName: 'Scanify',
  webDir: 'public',
  server: {
    url: 'https://scanify.world',
    cleartext: false,
  },
};

export default config;
