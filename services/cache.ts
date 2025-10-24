import { Profile, CommunityWithCreator } from '../types';

// Generic cache factory
const createCache = <T extends { id: string | number }>() => {
  const store = new Map<string | number, { data: T; timestamp: number }>();
  const TTL = 5 * 60 * 1000; // 5 minutes

  const get = (id: string | number): T | null => {
    const entry = store.get(id);
    if (entry && Date.now() - entry.timestamp < TTL) {
      return entry.data;
    }
    if (entry) {
        store.delete(id); // Entry is stale
    }
    return null;
  };

  const set = (data: T) => {
    if (data && data.id) {
        store.set(data.id, { data, timestamp: Date.now() });
    }
  };
  
  const invalidate = (id: string | number) => {
    store.delete(id);
  }

  return { get, set, invalidate };
};

export const profilesCache = createCache<Profile>();
export const communitiesCache = createCache<CommunityWithCreator>();
