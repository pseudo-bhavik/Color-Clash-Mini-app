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
    const context = sdk.context;

    if (!context?.user) {
      return null;
    }

    return {
      fid: context.user.fid,
      username: context.user.username,
      displayName: context.user.displayName,
      pfpUrl: context.user.pfpUrl,
    };
  } catch (error) {
    console.error('Error accessing Farcaster context:', error);
    return null;
  }
};

export { sdk };
