


export interface AnalysisResult {
  songStructure: string;
  musicalElements: string;
  lyricalComponents: string;
  productionElements: string;
  creativeTechnicalAspects: string;
  regenerationPrompt: string;
}

// Represents a track that can be displayed and played, from any source.
export interface Track {
  url: string; // local: Blob URL, spotify: Spotify URI
  source: 'local' | 'spotify';
  name: string;
  duration: number; // seconds

  // --- Local Only ---
  file?: File;
  relativePath?: string;
  createdAt?: string; // Timestamp when the track was added

  // --- Spotify Only ---
  id?: string; // Spotify track ID
  artists?: string[];
  album?: string;
  albumArtUrl?: string;
}

export interface Playlist {
  id: string;
  name: string;
  trackUrls: string[];
  system?: boolean;
}

export interface ListeningStats {
  totalPlayTime: number;
  playCounts: { [url: string]: number };
  history: string[];
}

export interface TrackMetadata {
  likes: { [url: string]: boolean };
  ratings: { [url: string]: number };
  analysis?: { [url: string]: AnalysisResult };
  lyrics?: { [url: string]: string };
}

export interface SoundboardPad {
  id: number;
  name: string;
  soundUrl: string; // Base64 Data URI
}

export type SoundboardSheetData = {
  [sheet: number]: SoundboardPad[];
};