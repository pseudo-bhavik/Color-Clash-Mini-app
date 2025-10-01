import sdk from '@farcaster/miniapp-sdk';

export const initializeFarcasterSdk = async (): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') {
      console.log('Not in browser environment, skipping SDK initialization');
      return false;
    }

    const isFarcasterEnv = !!(
      (window as any).sdk ||
      window.farcaster ||
      window.parent !== window
    );

    if (!isFarcasterEnv) {
      console.log('Not running in Farcaster environment, skipping SDK ready call');
      return false;
    }

    console.log('Initializing Farcaster Mini App SDK...');

    await sdk.actions.ready({ disableNativeGestures: true });

    console.log('Farcaster SDK ready called successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Farcaster SDK:', error);
    return false;
  }
};

export const getFarcasterContext = () => {
  if (typeof window === 'undefined') return null;

  try {
    const windowSdk = (window as any).sdk;
    if (windowSdk?.context?.user) {
      return windowSdk.context.user;
    }

    if (window.farcaster?.user) {
      return window.farcaster.user;
    }

    return sdk.context?.user || null;
  } catch (error) {
    console.error('Error accessing Farcaster context:', error);
    return null;
  }
};

export { sdk };
