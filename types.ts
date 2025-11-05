export interface Track {
  file: File;
  url: string;
  relativePath: string;
}

// FIX: Added missing type definitions to resolve import errors across multiple components.
export interface Playlist {
  id: string;
  name: string;
  trackUrls: string[];
}

export interface ListeningStats {
  totalPlayTime: number;
  playCounts: { [url: string]: number };
  history: string[];
}

export interface TrackMetadata {
  likes: { [url: string]: boolean };
  ratings: { [url: string]: number };
}
