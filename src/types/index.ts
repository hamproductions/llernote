export interface Series {
  id: string;
  name: string;
  color: string;
}

export interface Unit {
  id: string;
  name: string;
  additionalInfo?: string | null;
  englishName?: string;
}

export interface Artist {
  id: string;
  name: string;
  characters: string[];
  seriesIds: number[];
  englishName?: string;
}

export interface Cast {
  castTitle: string;
  seiyuu: string;
  note?: string | null;
  englishName?: string;
}

export interface Character {
  id: string;
  seriesId: string;
  series: string;
  seriesColor: string;
  school: string;
  colorName: string;
  colorCode: string;
  fullName: string;
  casts: Cast[];
  units: { name: string; id: string; additionalInfo?: string | null }[];
  birthMonth?: number;
  birthDay?: number;
  hasIcon?: boolean;
  englishName?: string;
}

export interface Song {
  id: string;
  name: string;
  phoneticName?: string;
  seriesIds: number[];
  releasedOn?: string;
  artists?: { id: string; variant?: string | null }[];
  englishName?: string;
}

export type PerformanceStatus = 'upcoming' | 'completed';

export interface Performance {
  id: string;
  tourName: string;
  date: string;
  venue: string;
  seriesIds: string[];
  status: PerformanceStatus;
  hasSetlist: boolean;
  performanceName?: string;
  concertName?: string;
  openTime?: string;
  startTime?: string;
  tourType?: string;
  audience?: boolean;
  canceled?: boolean;
  note?: string;
  category: EventCategory;
}

export type EventCategory = 'live' | 'online' | 'tv';

export type SetlistItemType = 'song' | 'mc' | 'custom' | 'vtr';

export interface SetlistItem {
  id: string;
  type: SetlistItemType;
  position: number;
  songId?: string;
  customSongName?: string;
  title?: string;
  remarks?: string;
}

export interface SetlistSection {
  name: string;
  startIndex: number;
  endIndex: number;
  type: string;
}

export interface Setlist {
  id: string;
  performanceId: string;
  items: SetlistItem[];
  sections: SetlistSection[];
  isActual: boolean;
}
