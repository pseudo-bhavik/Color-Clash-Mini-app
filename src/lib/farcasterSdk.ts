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
    console.log('Attempting to get Farcaster context...');
    console.log('SDK object:', sdk);
    console.log('SDK context:', sdk.context);

    // Try to get user from the SDK
    const user = sdk.context?.user;

    console.log('Raw user data from SDK:', user);
    console.log('User properties:', user ? Object.keys(user) : 'null');

    if (!user) {
      console.log('No user found in SDK context');
      return null;
    }

    // Log each property type and value
    console.log('fid type:', typeof user.fid, 'value:', user.fid);
    console.log('username type:', typeof user.username, 'value:', user.username);
    console.log('displayName type:', typeof user.displayName, 'value:', user.displayName);

    // Extract only the primitive values we need
    const extractedData = {
      fid: user.fid,
      username: user.username,
      displayName: user.displayName,
      pfpUrl: user.pfpUrl,
    };

    console.log('Extracted user data:', extractedData);

    return extractedData;
  } catch (error) {
    console.error('Error accessing Farcaster context:', error);
    return null;
  }
};

export { sdk };