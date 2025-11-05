import type { Playlist, Track, ListeningStats, TrackMetadata } from './types';

// The type stored in the DB doesn't have the temporary object URL.
type StoredTrack = Omit<Track, 'url'>;

let db: IDBDatabase | null = null;

const DB_NAME = 'roboJukeboxDB';
const DB_VERSION = 3; // Incremented version for schema change
const TRACKS_STORE_NAME = 'tracks';
const PLAYLISTS_STORE_NAME = 'playlists';
const STATS_STORE_NAME = 'listeningStats';
const TRACK_METADATA_STORE_NAME = 'trackMetadata';


export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Database error:', request.error);
      reject('Error opening database');
    };

    request.onsuccess = (event) => {
      db = request.result;
      
      db.onclose = () => {
        console.warn('Database connection was closed.');
        db = null;
      };
      
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TRACKS_STORE_NAME)) {
        db.createObjectStore(TRACKS_STORE_NAME, { keyPath: 'relativePath' });
      }
      if (!db.objectStoreNames.contains(PLAYLISTS_STORE_NAME)) {
        db.createObjectStore(PLAYLISTS_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STATS_STORE_NAME)) {
        db.createObjectStore(STATS_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(TRACK_METADATA_STORE_NAME)) {
        db.createObjectStore(TRACK_METADATA_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const addTracks = async (tracks: Track[]): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction(TRACKS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(TRACKS_STORE_NAME);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    tracks.forEach(track => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { url, ...storedTrack } = track;
      store.put(storedTrack);
    });
  });
};

export const getAllTracks = async (): Promise<StoredTrack[]> => {
    const db = await initDB();
    const transaction = db.transaction(TRACKS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(TRACKS_STORE_NAME);
    const request = store.getAll();
  
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('Error fetching tracks:', request.error);
        reject(request.error);
      };
    });
};

export const clearAllData = async (): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction([TRACKS_STORE_NAME, PLAYLISTS_STORE_NAME, STATS_STORE_NAME, TRACK_METADATA_STORE_NAME], 'readwrite');
    const tracksStore = transaction.objectStore(TRACKS_STORE_NAME);
    const playlistsStore = transaction.objectStore(PLAYLISTS_STORE_NAME);
    const statsStore = transaction.objectStore(STATS_STORE_NAME);
    const metadataStore = transaction.objectStore(TRACK_METADATA_STORE_NAME);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        tracksStore.clear();
        playlistsStore.clear();
        statsStore.clear();
        metadataStore.clear();
    });
};

export const savePlaylists = async (playlists: Playlist[]): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(PLAYLISTS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(PLAYLISTS_STORE_NAME);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        store.clear();
        playlists.forEach(playlist => {
            store.put(playlist);
        });
    });
};

export const getAllPlaylists = async (): Promise<Playlist[]> => {
    const db = await initDB();
    const transaction = db.transaction(PLAYLISTS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(PLAYLISTS_STORE_NAME);
    const request = store.getAll();
  
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('Error fetching playlists:', request.error);
        reject(request.error);
      };
    });
};

// --- Listening Stats Functions ---

const STATS_KEY = 'user-stats';

export const getStats = async (): Promise<ListeningStats | null> => {
    const db = await initDB();
    const transaction = db.transaction(STATS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(STATS_STORE_NAME);
    const request = store.get(STATS_KEY);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result?.data ?? null);
        };
        request.onerror = () => {
            console.error('Error fetching stats:', request.error);
            reject(request.error);
        };
    });
};

export const saveStats = async (stats: ListeningStats): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(STATS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STATS_STORE_NAME);
    
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
            console.error('Error saving stats:', transaction.error);
            reject(transaction.error);
        };
        store.put({ id: STATS_KEY, data: stats });
    });
};

export const resetStats = async (): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(STATS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STATS_STORE_NAME);
    
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
            console.error('Error resetting stats:', transaction.error);
            reject(transaction.error);
        };
        const defaultStats: ListeningStats = {
            totalPlayTime: 0,
            playCounts: {},
            history: [],
        };
        store.put({ id: STATS_KEY, data: defaultStats });
    });
};

// --- Track Metadata Functions (Likes/Ratings) ---

const METADATA_KEY = 'user-track-metadata';

export const getTrackMetadata = async (): Promise<TrackMetadata | null> => {
    const db = await initDB();
    const transaction = db.transaction(TRACK_METADATA_STORE_NAME, 'readonly');
    const store = transaction.objectStore(TRACK_METADATA_STORE_NAME);
    const request = store.get(METADATA_KEY);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result?.data ?? null);
        };
        request.onerror = () => {
            console.error('Error fetching track metadata:', request.error);
            reject(request.error);
        };
    });
};

export const saveTrackMetadata = async (metadata: TrackMetadata): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(TRACK_METADATA_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(TRACK_METADATA_STORE_NAME);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
            console.error('Error saving track metadata:', transaction.error);
            reject(transaction.error);
        };
        store.put({ id: METADATA_KEY, data: metadata });
    });
};