import type { GigData } from '../types/gig.ts';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createEmptyGigFormData(): Omit<GigData, 'publicId' | 'adminToken' | 'updatedAt'> {
  return {
    title: '',
    ensemble: '',
    date: getTodayDateString(),
    venue: '',
    address: '',
    generalNotes: '',
    schedule: [
      {
        id: 'sch-1',
        time: '',
        endTime: '',
        title: '',
        description: '',
        location: '',
        highlight: false,
      },
    ],
    contacts: [],
    backstage: {
      doorCode: '',
      greenRoom: '',
      wifiName: '',
      wifiPassword: '',
      dressCodeText: '',
      dressCodeColors: [],
      foodInfo: '',
      parkingInfo: '',
    },
    setlistEnabled: false,
    setlist: [],
  };
}

// Dummy-data för demoläget (visas på /g/demo-soul)
export const DEMO_GIG_SOUL: Omit<GigData, 'publicId' | 'adminToken' | 'updatedAt'> = {
  title: 'Soul & Brass Night – Live på Fasching',
  ensemble: 'Norrsken Soul Collective (9-mannaband)',
  date: getTodayDateString(),
  venue: 'Fasching',
  address: 'Kungsgatan 63, 111 22 Stockholm',
  generalNotes:
    'Load-in via lastfickan på baksidan. Huseffekt och backline (Fender Twin, Ampeg SVT, Nord Stage 3) står på scen.',
  schedule: [
    {
      id: 'bd-1',
      time: '16:00',
      endTime: '16:45',
      title: 'Lastning (Load-in) & PA-rigg',
      description: 'Rytmsektion och blås lastar in via bakre lastkajen.',
      location: 'Lastkajen / Stora scenen',
    },
    {
      id: 'bd-2',
      time: '16:45',
      endTime: '18:00',
      title: 'Soundcheck (Fullt band)',
      description: 'Linecheck 16:45, gemensamt soundcheck 17:15 (vi kör låt 1, 4 och 9).',
      location: 'Stora scenen',
    },
    {
      id: 'bd-3',
      time: '18:00',
      endTime: '19:15',
      title: 'Middag & Logehäng',
      description: 'Varm kvällsmat i restaurangen. Beställning är förbokad på bandlistan.',
      location: 'Restaurangen & Loge A',
    },
    {
      id: 'bd-4',
      time: '19:00',
      title: 'Dörrar öppnar för publik',
      description: 'Scenen låst för instrumentjustering efter 18:55.',
      location: 'Salongen',
    },
    {
      id: 'bd-5',
      time: '20:00',
      endTime: '20:50',
      title: 'Set 1 (Konsertstart)',
      description: 'Samling vid scentrapps-ingången 19:50. Intro-tape rullar 19:59.',
      location: 'Stora scenen',
      highlight: true,
    },
    {
      id: 'bd-6',
      time: '20:50',
      endTime: '21:15',
      title: 'Paus (25 min)',
      description: 'Stäm om gitarrer och fyll på vatten innan Set 2.',
      location: 'Backstage Loge A',
    },
    {
      id: 'bd-7',
      time: '21:15',
      endTime: '22:15',
      title: 'Set 2 + Extranummer',
      description: 'Hög energi från start! Inklusive gästsolist på låt 4.',
      location: 'Stora scenen',
      highlight: true,
    },
    {
      id: 'bd-8',
      time: '22:30',
      endTime: '23:15',
      title: 'Rivning & Utlastning (Load-out)',
      description: 'Alla packar egen utrustning först så hustekniker kan riva mikrofoner.',
      location: 'Scenen / Lastkajen',
    },
  ],
  contacts: [
    {
      id: 'bc-1',
      name: 'Simon Berg',
      role: 'Kapellmästare / Bas',
      phone: '070-555 19 82',
    },
    {
      id: 'bc-2',
      name: 'Hanna Nyberg',
      role: 'Husets Producent',
      phone: '073-441 80 90',
    },
    {
      id: 'bc-3',
      name: 'Marcus Wallin',
      role: 'FOH / Monitor-tekniker',
      phone: '076-908 77 11',
    },
  ],
  backstage: {
    doorCode: '8841#',
    greenRoom: 'Loge A & B (bakom scenen, höger korridor)',
    wifiName: 'Fasching_Artist_5G',
    wifiPassword: 'GrooveNight2026!',
    dressCodeText:
      '70-tals klubbsoul: midnattsblått, vinrött och rostorange. Kavaj eller skjorta med uppvikta ärmar.',
    dressCodeColors: [
      { id: 'bdc-1', name: 'Midnattsblå', hex: '#1E293B' },
      { id: 'bdc-2', name: 'Burgundy / Vinröd', hex: '#7F1D1D' },
      { id: 'bdc-3', name: 'Bärnsten / Guld', hex: '#D97706' },
    ],
    foodInfo:
      'Varm middag kl 18:00 i restaurangen + 2 dryckesbiljetter per musiker. Frukt, nötter, kaffe och ingefärste finns i Loge A.',
    parkingInfo:
      '15 min fri ilastning vid lastkajen (slå på varningsblinkers, lämna regnr i baren). Därefter P-hus Continental.',
  },
  setlistEnabled: true,
  setlist: [
    {
      id: 'bs-1',
      setHeader: 'Set 1',
      title: 'Midnight Express (Intro Jam)',
      key: 'Fm',
      tempo: '114 BPM',
      soloistOrNotes: 'Trummor + bas 8 takter -> blås-stabs på tecken',
    },
    {
      id: 'bs-2',
      title: 'Golden Hour Groove',
      key: 'Bb',
      tempo: '108 BPM',
      soloistOrNotes: 'Lead: Sara • Tenorsax-solo: Leo (16 takter)',
    },
    {
      id: 'bs-3',
      title: 'Keep On Moving',
      key: 'Eb',
      tempo: '122 BPM',
      soloistOrNotes: 'Direkt övergång från föregående låt (ingen paus)',
    },
    {
      id: 'bs-4',
      title: 'Stockholm Rain',
      key: 'Cm',
      tempo: '74 BPM',
      soloistOrNotes: 'Rhodes-intro • Gitarrsolo på slutet',
    },
    {
      id: 'bs-5',
      setHeader: 'Set 2',
      title: 'Brass on Fire',
      key: 'Gm',
      tempo: '126 BPM',
      soloistOrNotes: 'Blåssektionen öppnar a cappella vid scenkanten',
    },
    {
      id: 'bs-6',
      title: 'Tell Me Somethin’ Good',
      key: 'Ab',
      tempo: '96 BPM',
      soloistOrNotes: 'Talkbox / Clavinet • Gästsång: Viktor',
    },
    {
      id: 'bs-7',
      title: 'Superstition / Crosstown Medley',
      key: 'Ebm',
      tempo: '102 BPM',
      soloistOrNotes: 'Extranummer • Presentation av bandet i bryggan',
    },
  ],
};

// Dummy-data för demoläget (visas på /g/demo-kor)
export const DEMO_GIG_CHOIR: Omit<GigData, 'publicId' | 'adminToken' | 'updatedAt'> = {
  title: 'Höstkonsert: Nordiskt Ljus',
  ensemble: 'Kammarsångarna',
  date: getTodayDateString(),
  venue: 'Katarina Kyrka',
  address: 'Högbergsgatan 13A, 116 20 Stockholm',
  generalNotes:
    'Ingång via södra porten mot kyrkogården. Kom i god tid så vi hinner lägga upp mappar i logen.',
  schedule: [
    {
      id: 'ch-1',
      time: '15:30',
      endTime: '16:00',
      title: 'Inpassering & samling',
      description: 'Ytterkläder hängs i sakristian. Ta med konsertmapp och vattenflaska.',
      location: 'Sakristian / Södra entrén',
    },
    {
      id: 'ch-2',
      time: '16:00',
      endTime: '16:45',
      title: 'Akustikprov & uppställning',
      description: 'Placering på gradänger och balansering i kyrkorummet.',
      location: 'Koret',
    },
    {
      id: 'ch-3',
      time: '16:45',
      endTime: '17:30',
      title: 'Stämrep & genomsjungning',
      description: 'Fokus på övergångar samt solistinsatser med mikrofoner.',
      location: 'Koret',
    },
    {
      id: 'ch-4',
      time: '17:30',
      endTime: '18:20',
      title: 'Matpaus & ombyte',
      description: 'Matiga wraps, kaffe och frukt serveras i församlingshemmet.',
      location: 'Församlingshemmet (1 tr ner)',
    },
    {
      id: 'ch-5',
      time: '18:30',
      endTime: '18:55',
      title: 'Publikinsläpp & uppsjungning',
      description: 'Kort gemensam stämning och fokus i logen.',
      location: 'Loge / Sakristian',
    },
    {
      id: 'ch-6',
      time: '19:00',
      endTime: '20:15',
      title: 'Konsertstart',
      description: 'Inmarsch i tystnad från norra gången.',
      location: 'Kyrkorummet',
      highlight: true,
    },
  ],
  contacts: [
    {
      id: 'cc-1',
      name: 'Maria Lindqvist',
      role: 'Körledare / Dirigent',
      phone: '070-234 56 78',
    },
    {
      id: 'cc-2',
      name: 'Johan Ek',
      role: 'Producent / Värd',
      phone: '073-890 12 34',
    },
    {
      id: 'cc-3',
      name: 'Erik Sjöberg',
      role: 'Ljud & Ljus',
      phone: '076-112 23 34',
    },
  ],
  backstage: {
    doorCode: '#2408*',
    greenRoom: 'Sakristian & Församlingshemmet (1 tr ner)',
    wifiName: 'Katarina_Guest',
    wifiPassword: 'Kyrkbacken2026',
    dressCodeText:
      'Helklätt svart med en valfri detalj i dämpat guld eller mässing. Svarta skor och svarta konsertmappar.',
    dressCodeColors: [
      { id: 'dc-1', name: 'Konsertsvart', hex: '#121214' },
      { id: 'dc-2', name: 'Antikguld', hex: '#C89D54' },
      { id: 'dc-3', name: 'Mörk grafit', hex: '#27272A' },
    ],
    foodInfo:
      'Wraps (kyckling, halloumi samt vegansk/glutenfri), kaffe, te och frukt finns uppdukat från kl 17:15.',
    parkingInfo:
      'Begränsad gatuparkering på Högbergsgatan (P-taxa 3). Närmaste P-hus är Medborgarplatsen (6 min promenad).',
  },
  setlistEnabled: true,
  setlist: [
    {
      id: 'cs-1',
      setHeader: 'Del I – Skymning',
      title: 'Uti vår hage (arr. Alfvén)',
      key: 'Dm',
      tempo: '76 BPM',
      soloistOrNotes: 'Inleds utspridda längs sidogångarna',
    },
    {
      id: 'cs-2',
      title: 'Som ett blommande mandelträd',
      key: 'F',
      tempo: '68 BPM',
      soloistOrNotes: 'Sopransolo: Klara (takt 18–32)',
    },
    {
      id: 'cs-3',
      title: 'Northern Lights (Gjeilo)',
      key: 'Eb',
      tempo: '60 BPM',
      soloistOrNotes: 'Divisi i samtliga stämmor • Svag dynamik i slutet',
    },
    {
      id: 'cs-4',
      setHeader: 'Del II – Natt & Gryning',
      title: 'Kung Liljekonvalje',
      key: 'Gm',
      tempo: '84 BPM',
      soloistOrNotes: 'Tenorsolo: Anton',
    },
    {
      id: 'cs-5',
      title: 'Aftonen (Alfvén)',
      key: 'Ab',
      tempo: '64 BPM',
      soloistOrNotes: 'Extranummer vid inrop',
    },
  ],
};

export const DEMO_GIGS: Record<string, Omit<GigData, 'publicId' | 'adminToken' | 'updatedAt'>> = {
  'demo-soul': DEMO_GIG_SOUL,
  'demo-kor': DEMO_GIG_CHOIR,
};
