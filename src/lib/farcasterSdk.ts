import sdk from '@farcaster/miniapp-sdk';
// hello world
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
    let user = null;

    if (windowSdk?.context?.user) {
      user = windowSdk.context.user;
    } else if (window.farcaster?.user) {
      user = window.farcaster.user;
    } else if ('context' in sdk && (sdk as any).context?.user) {
      user = (sdk as any).context.user;
    }

    if (!user) return null;

    // Extract only the primitive values we need
    return {
      fid: typeof user.fid === 'number' ? user.fid : undefined,
      username: typeof user.username === 'string' ? user.username : undefined,
      displayName: typeof user.displayName === 'string' ? user.displayName : undefined,
      pfpUrl: typeof user.pfpUrl === 'string' ? user.pfpUrl : undefined,
    };
  } catch (error) {
    console.error('Error accessing Farcaster context:', error);
    return null;
  }
};

export { sdk };