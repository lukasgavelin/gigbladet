export interface ScheduleItem {
  id: string;
  time: string; // "HH:MM"
  endTime?: string; // "HH:MM"
  title: string;
  description?: string;
  location?: string;
  highlight?: boolean;
}

export interface ContactPerson {
  id: string;
  name: string;
  role: string;
  phone: string;
}

export interface DressCodeColor {
  id: string;
  name: string;
  hex: string;
}

export interface BackstageInfo {
  doorCode: string;
  greenRoom: string;
  wifiName: string;
  wifiPassword: string;
  dressCodeText: string;
  dressCodeColors: DressCodeColor[];
  foodInfo: string;
  parkingInfo: string;
}

export interface SetlistItem {
  id: string;
  title: string;
  key: string;
  tempo: string;
  soloistOrNotes: string;
  setHeader?: string; // Optional section divider before the song, e.g. "Set 1" or "Extranummer"
}

export interface GigData {
  publicId: string;
  adminToken?: string;
  title: string;
  ensemble: string;
  date: string; // "YYYY-MM-DD"
  venue: string;
  address: string;
  generalNotes: string;
  schedule: ScheduleItem[];
  contacts: ContactPerson[];
  backstage: BackstageInfo;
  setlistEnabled: boolean;
  setlist: SetlistItem[];
  updatedAt: string;
}
