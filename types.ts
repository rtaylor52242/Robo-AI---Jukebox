
export interface AnalysisResult {
  songStructure: string;
  musicalElements: string;
  lyricalComponents: string;
  productionElements: string;
  creativeTechnicalAspects: string;
  regenerationPrompt: string;
}

export interface Track {
  file: File;
  url: string;
  relativePath: string;
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
}