interface NeynarUserData {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  profile: {
    bio: {
      text: string;
    };
  };
}

interface NeynarBulkUsersResponse {
  users: NeynarUserData[];
}

interface CachedUserData {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  cachedAt: number;
}

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;
const CACHE_KEY_PREFIX = 'neynar_user_';

class NeynarService {
  private apiKey: string;
  private baseUrl = 'https://api.neynar.com';

  constructor() {
    this.apiKey = import.meta.env.VITE_NEYNAR_API_KEY || '';

    if (!this.apiKey) {
      console.warn('Neynar API key not configured');
    }
  }

  private getCachedUser(fid: number): CachedUserData | null {
    try {
      const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${fid}`);
      if (!cached) return null;

      const data = JSON.parse(cached) as CachedUserData;
      const now = Date.now();

      if (now - data.cachedAt < CACHE_DURATION) {
        console.log(`Using cached data for FID ${fid}`);
        return data;
      }

      localStorage.removeItem(`${CACHE_KEY_PREFIX}${fid}`);
      return null;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  private setCachedUser(fid: number, data: Omit<CachedUserData, 'cachedAt'>): void {
    try {
      const cacheData: CachedUserData = {
        ...data,
        cachedAt: Date.now()
      };
      localStorage.setItem(`${CACHE_KEY_PREFIX}${fid}`, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error writing cache:', error);
    }
  }

  async getUserByFid(fid: number): Promise<CachedUserData | null> {
    if (!this.apiKey) {
      console.error('Cannot fetch user: Neynar API key not configured');
      return null;
    }

    const cached = this.getCachedUser(fid);
    if (cached) return cached;

    try {
      console.log(`Fetching user data for FID ${fid} from Neynar API...`);

      const response = await fetch(
        `${this.baseUrl}/v2/farcaster/user/bulk?fids=${fid}`,
        {
          method: 'GET',
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        console.error(`Neynar API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: NeynarBulkUsersResponse = await response.json();

      if (!data.users || data.users.length === 0) {
        console.log(`No user found for FID ${fid}`);
        return null;
      }

      const user = data.users[0];
      const userData: Omit<CachedUserData, 'cachedAt'> = {
        fid: user.fid,
        username: user.username,
        displayName: user.display_name,
        pfpUrl: user.pfp_url
      };

      this.setCachedUser(fid, userData);
      console.log(`Successfully fetched and cached user data for FID ${fid}:`, userData);

      return { ...userData, cachedAt: Date.now() };
    } catch (error) {
      console.error(`Error fetching user from Neynar API:`, error);
      return null;
    }
  }

  async getUsersByFids(fids: number[]): Promise<Map<number, CachedUserData>> {
    const result = new Map<number, CachedUserData>();

    if (!this.apiKey || fids.length === 0) {
      return result;
    }

    const uncachedFids: number[] = [];

    for (const fid of fids) {
      const cached = this.getCachedUser(fid);
      if (cached) {
        result.set(fid, cached);
      } else {
        uncachedFids.push(fid);
      }
    }

    if (uncachedFids.length === 0) {
      return result;
    }

    try {
      console.log(`Fetching ${uncachedFids.length} users from Neynar API...`);

      const response = await fetch(
        `${this.baseUrl}/v2/farcaster/user/bulk?fids=${uncachedFids.join(',')}`,
        {
          method: 'GET',
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        console.error(`Neynar API error: ${response.status} ${response.statusText}`);
        return result;
      }

      const data: NeynarBulkUsersResponse = await response.json();

      for (const user of data.users) {
        const userData: Omit<CachedUserData, 'cachedAt'> = {
          fid: user.fid,
          username: user.username,
          displayName: user.display_name,
          pfpUrl: user.pfp_url
        };

        this.setCachedUser(user.fid, userData);
        result.set(user.fid, { ...userData, cachedAt: Date.now() });
      }

      console.log(`Successfully fetched and cached ${data.users.length} users`);
    } catch (error) {
      console.error('Error fetching users from Neynar API:', error);
    }

    return result;
  }

  clearCache(): void {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
      console.log('Neynar cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

export const neynarService = new NeynarService();
