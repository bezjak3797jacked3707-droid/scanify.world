import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'world.scanify.app',
  appName: 'Scanify',
  webDir: 'public',
  server: {
    url: 'https://www.scanify.world',
    cleartext: false,
  },
  plugins: {
    SocialLogin: {
      google: {
        iOSClientId: '331795866866-p13hvpk792sn2qihd0bcp94j0c9dhscn.apps.googleusercontent.com',
      },
    },
  },
};

export default config;
