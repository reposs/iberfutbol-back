import { Injectable, Logger } from '@nestjs/common';
import { FootballDataProvider } from '../../domain/ports/football-data-provider.port';
import { Competition } from '../../../modules/competitions/domain/competition.entity';
import { FormResult, Team } from '../../../modules/teams/domain/team.entity';
import {
  LineupPlayer,
  Match,
  MatchEvent,
  MatchStatus,
  MatchTeamLineup,
} from '../../../modules/matches/domain/match.entity';
import {
  QualificationZone,
  StandingRow,
  StandingTable,
} from '../../../modules/standings/domain/standing.entity';
import { Player } from '../../../modules/players/domain/player.entity';
import { Slug } from '../../domain/value-objects/slug.vo';
import { RealisticSpanishFootballProvider } from './realistic-spanish-football.provider';

interface ClubStaticMetadata {
  slug: string;
  officialName: string;
  shortName: string;
  code: string;
  city: string;
  autonomousCommunity: string;
  stadium: string;
  capacity: number;
  founded: number;
  coach: string;
  primaryColor: string;
  secondaryColor: string;
}

const SPANISH_CLUB_METADATA: Record<string, ClubStaticMetadata> = {
  barcelona: {
    slug: 'fc-barcelona',
    officialName: 'FC Barcelona',
    shortName: 'Barcelona',
    code: 'BAR',
    city: 'Barcelona',
    autonomousCommunity: 'Cataluña',
    stadium: 'Estadi Olímpic Lluís Companys / Spotify Camp Nou',
    capacity: 55926,
    founded: 1899,
    coach: 'Hansi Flick',
    primaryColor: '#a50044',
    secondaryColor: '#004d98',
  },
  'real madrid': {
    slug: 'real-madrid',
    officialName: 'Real Madrid CF',
    shortName: 'Real Madrid',
    code: 'RMA',
    city: 'Madrid',
    autonomousCommunity: 'Comunidad de Madrid',
    stadium: 'Estadio Santiago Bernabéu',
    capacity: 85000,
    founded: 1902,
    coach: 'Carlo Ancelotti',
    primaryColor: '#ffffff',
    secondaryColor: '#1e3a8a',
  },
  'atletico madrid': {
    slug: 'atletico-de-madrid',
    officialName: 'Atlético de Madrid',
    shortName: 'Atlético',
    code: 'ATM',
    city: 'Madrid',
    autonomousCommunity: 'Comunidad de Madrid',
    stadium: 'Riyadh Air Metropolitano',
    capacity: 70460,
    founded: 1903,
    coach: 'Diego Pablo Simeone',
    primaryColor: '#cb3524',
    secondaryColor: '#272e61',
  },
  'athletic club': {
    slug: 'athletic-club',
    officialName: 'Athletic Club',
    shortName: 'Athletic',
    code: 'ATH',
    city: 'Bilbao',
    autonomousCommunity: 'País Vasco',
    stadium: 'Estadio de San Mamés',
    capacity: 53289,
    founded: 1898,
    coach: 'Ernesto Valverde',
    primaryColor: '#e11d48',
    secondaryColor: '#ffffff',
  },
  villarreal: {
    slug: 'villarreal-cf',
    officialName: 'Villarreal CF',
    shortName: 'Villarreal',
    code: 'VIL',
    city: 'Vila-real',
    autonomousCommunity: 'Comunidad Valenciana',
    stadium: 'Estadio de la Cerámica',
    capacity: 23000,
    founded: 1923,
    coach: 'Marcelino García Toral',
    primaryColor: '#facc15',
    secondaryColor: '#1e3a8a',
  },
  'real betis': {
    slug: 'real-betis',
    officialName: 'Real Betis Balompié',
    shortName: 'Real Betis',
    code: 'BET',
    city: 'Sevilla',
    autonomousCommunity: 'Andalucía',
    stadium: 'Estadio Benito Villamarín',
    capacity: 60721,
    founded: 1907,
    coach: 'Manuel Pellegrini',
    primaryColor: '#16a34a',
    secondaryColor: '#ffffff',
  },
  'real sociedad ii': {
    slug: 'real-sociedad-b',
    officialName: 'Real Sociedad B (Sanse)',
    shortName: 'R. Sociedad B',
    code: 'RSB',
    city: 'San Sebastián',
    autonomousCommunity: 'País Vasco',
    stadium: 'Instalaciones de Zubieta / Reale Arena',
    capacity: 2500,
    founded: 1951,
    coach: 'Sergio Francisco',
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
  },
  'rc celta fortuna': {
    slug: 'celta-fortuna',
    officialName: 'RC Celta Fortuna',
    shortName: 'Celta Fortuna',
    code: 'CFO',
    city: 'Vigo',
    autonomousCommunity: 'Galicia',
    stadium: 'Municipal de Barreiro / Abanca-Balaídos',
    capacity: 4500,
    founded: 1927,
    coach: 'Fredi Álvarez',
    primaryColor: '#38bdf8',
    secondaryColor: '#ffffff',
  },
  'real sociedad': {
    slug: 'real-sociedad',
    officialName: 'Real Sociedad de Fútbol',
    shortName: 'Real Sociedad',
    code: 'RSO',
    city: 'San Sebastián',
    autonomousCommunity: 'País Vasco',
    stadium: 'Reale Arena (Anoeta)',
    capacity: 39500,
    founded: 1909,
    coach: 'Pellegrino Matarazzo',
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
  },
  sevilla: {
    slug: 'sevilla-fc',
    officialName: 'Sevilla FC',
    shortName: 'Sevilla',
    code: 'SEV',
    city: 'Sevilla',
    autonomousCommunity: 'Andalucía',
    stadium: 'Estadio Ramón Sánchez-Pizjuán',
    capacity: 43883,
    founded: 1890,
    coach: 'Quique Sánchez Flores',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
  },
  osasuna: {
    slug: 'ca-osasuna',
    officialName: 'CA Osasuna',
    shortName: 'Osasuna',
    code: 'OSA',
    city: 'Pamplona',
    autonomousCommunity: 'Navarra',
    stadium: 'Estadio El Sadar',
    capacity: 23576,
    founded: 1920,
    coach: 'Vicente Moreno',
    primaryColor: '#b91c1c',
    secondaryColor: '#1e3a8a',
  },
  'celta vigo': {
    slug: 'rc-celta',
    officialName: 'RC Celta de Vigo',
    shortName: 'Celta',
    code: 'CEL',
    city: 'Vigo',
    autonomousCommunity: 'Galicia',
    stadium: 'Estadio Abanca-Balaídos',
    capacity: 29000,
    founded: 1923,
    coach: 'Claudio Giráldez',
    primaryColor: '#38bdf8',
    secondaryColor: '#ffffff',
  },
  mallorca: {
    slug: 'rcd-mallorca',
    officialName: 'RCD Mallorca',
    shortName: 'Mallorca',
    code: 'MLL',
    city: 'Palma',
    autonomousCommunity: 'Islas Baleares',
    stadium: 'Estadi Mallorca Son Moix',
    capacity: 23142,
    founded: 1916,
    coach: 'Jagoba Arrasate',
    primaryColor: '#dc2626',
    secondaryColor: '#000000',
  },
  girona: {
    slug: 'girona-fc',
    officialName: 'Girona FC',
    shortName: 'Girona',
    code: 'GIR',
    city: 'Girona',
    autonomousCommunity: 'Cataluña',
    stadium: 'Estadi Municipal de Montilivi',
    capacity: 14624,
    founded: 1930,
    coach: 'Míchel Sánchez',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
  },
  'rayo vallecano': {
    slug: 'rayo-vallecano',
    officialName: 'Rayo Vallecano de Madrid',
    shortName: 'Rayo Vallecano',
    code: 'RAY',
    city: 'Madrid',
    autonomousCommunity: 'Comunidad de Madrid',
    stadium: 'Estadio de Vallecas',
    capacity: 14708,
    founded: 1924,
    coach: 'Iñigo Pérez',
    primaryColor: '#ffffff',
    secondaryColor: '#dc2626',
  },
  getafe: {
    slug: 'getafe-cf',
    officialName: 'Getafe CF',
    shortName: 'Getafe',
    code: 'GET',
    city: 'Getafe',
    autonomousCommunity: 'Comunidad de Madrid',
    stadium: 'Coliseum',
    capacity: 16500,
    founded: 1983,
    coach: 'José Bordalás',
    primaryColor: '#1d4ed8',
    secondaryColor: '#ffffff',
  },
  espanyol: {
    slug: 'rcd-espanyol',
    officialName: 'RCD Espanyol de Barcelona',
    shortName: 'Espanyol',
    code: 'ESP',
    city: 'Cornellà-El Prat',
    autonomousCommunity: 'Cataluña',
    stadium: 'RCDE Stadium',
    capacity: 40000,
    founded: 1900,
    coach: 'Manolo González',
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
  },
  valencia: {
    slug: 'valencia-cf',
    officialName: 'Valencia CF',
    shortName: 'Valencia',
    code: 'VAL',
    city: 'Valencia',
    autonomousCommunity: 'Comunidad Valenciana',
    stadium: 'Camp de Mestalla',
    capacity: 49430,
    founded: 1919,
    coach: 'Carlos Corberán',
    primaryColor: '#f97316',
    secondaryColor: '#000000',
  },
  alaves: {
    slug: 'deportivo-alaves',
    officialName: 'Deportivo Alavés',
    shortName: 'Alavés',
    code: 'ALA',
    city: 'Vitoria-Gasteiz',
    autonomousCommunity: 'País Vasco',
    stadium: 'Estadio de Mendizorroza',
    capacity: 19840,
    founded: 1921,
    coach: 'Luis García Plaza',
    primaryColor: '#1d4ed8',
    secondaryColor: '#ffffff',
  },
  'racing santander': {
    slug: 'racing-de-santander',
    officialName: 'Real Racing Club de Santander',
    shortName: 'Racing',
    code: 'RAC',
    city: 'Santander',
    autonomousCommunity: 'Cantabria',
    stadium: 'Campos de Sport de El Sardinero',
    capacity: 22222,
    founded: 1913,
    coach: 'José Alberto López',
    primaryColor: '#16a34a',
    secondaryColor: '#ffffff',
  },
  'real zaragoza': {
    slug: 'real-zaragoza',
    officialName: 'Real Zaragoza',
    shortName: 'R. Zaragoza',
    code: 'ZAR',
    city: 'Zaragoza',
    autonomousCommunity: 'Aragón',
    stadium: 'Estadio de La Romareda',
    capacity: 33608,
    founded: 1932,
    coach: 'Miguel Ángel Ramírez',
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
  },
  malaga: {
    slug: 'malaga-cf',
    officialName: 'Málaga CF',
    shortName: 'Málaga',
    code: 'MAL',
    city: 'Málaga',
    autonomousCommunity: 'Andalucía',
    stadium: 'Estadio La Rosaleda',
    capacity: 30044,
    founded: 1904,
    coach: 'Sergio Pellicer',
    primaryColor: '#38bdf8',
    secondaryColor: '#ffffff',
  },
  'real oviedo': {
    slug: 'real-oviedo',
    officialName: 'Real Oviedo',
    shortName: 'R. Oviedo',
    code: 'OVI',
    city: 'Oviedo',
    autonomousCommunity: 'Asturias',
    stadium: 'Estadio Carlos Tartiere',
    capacity: 30500,
    founded: 1926,
    coach: 'Javi Calleja',
    primaryColor: '#1d4ed8',
    secondaryColor: '#ffffff',
  },
  'sporting gijon': {
    slug: 'real-sporting',
    officialName: 'Real Sporting de Gijón',
    shortName: 'Sporting',
    code: 'SPO',
    city: 'Gijón',
    autonomousCommunity: 'Asturias',
    stadium: 'Estadio El Molinón',
    capacity: 30000,
    founded: 1905,
    coach: 'Rubén Albés',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
  },
  'deportivo la coruna': {
    slug: 'deportivo-de-la-coruna',
    officialName: 'RC Deportivo de La Coruña',
    shortName: 'Deportivo',
    code: 'DEP',
    city: 'A Coruña',
    autonomousCommunity: 'Galicia',
    stadium: 'Estadio Abanca-Riazor',
    capacity: 32490,
    founded: 1906,
    coach: 'Óscar Gilsanz',
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
  },
  elche: {
    slug: 'elche-cf',
    officialName: 'Elche CF',
    shortName: 'Elche',
    code: 'ELC',
    city: 'Elche',
    autonomousCommunity: 'Comunidad Valenciana',
    stadium: 'Estadio Martínez Valero',
    capacity: 31388,
    founded: 1923,
    coach: 'Eder Sarabia',
    primaryColor: '#16a34a',
    secondaryColor: '#ffffff',
  },
  almeria: {
    slug: 'ud-almeria',
    officialName: 'UD Almería',
    shortName: 'Almería',
    code: 'ALM',
    city: 'Almería',
    autonomousCommunity: 'Andalucía',
    stadium: 'UD Almería Stadium',
    capacity: 18331,
    founded: 1989,
    coach: 'Rubi',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
  },
  granada: {
    slug: 'granada-cf',
    officialName: 'Granada CF',
    shortName: 'Granada',
    code: 'GRA',
    city: 'Granada',
    autonomousCommunity: 'Andalucía',
    stadium: 'Estadio Nuevo Los Cármenes',
    capacity: 19336,
    founded: 1931,
    coach: 'Fran Escribá',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
  },
  levante: {
    slug: 'levante-ud',
    officialName: 'Levante UD',
    shortName: 'Levante',
    code: 'LEV',
    city: 'Valencia',
    autonomousCommunity: 'Comunidad Valenciana',
    stadium: 'Estadi Ciutat de València',
    capacity: 26354,
    founded: 1909,
    coach: 'Julián Calero',
    primaryColor: '#1e3a8a',
    secondaryColor: '#dc2626',
  },
};

const OFFICIAL_CLUB_LOGO_BY_SLUG: Record<string, string> = {
  'real-murcia':
    'https://r2.thesportsdb.com/images/media/team/badge/zoo96h1747995489.png',
  'recreativo-de-huelva':
    'https://r2.thesportsdb.com/images/media/team/badge/s2pii11626207918.png',
  'sd-ponferradina':
    'https://r2.thesportsdb.com/images/media/team/badge/lnq4821626202014.png',
  ponferradina:
    'https://r2.thesportsdb.com/images/media/team/badge/lnq4821626202014.png',
  'gimnastic-de-tarragona':
    'https://r2.thesportsdb.com/images/media/team/badge/tpytry1447591259.png',
  'cultural-leonesa':
    'https://r2.thesportsdb.com/images/media/team/badge/yk28a51677472494.png',
  numancia:
    'https://r2.thesportsdb.com/images/media/team/badge/csil0b1535206624.png',
  'cd-numancia':
    'https://r2.thesportsdb.com/images/media/team/badge/csil0b1535206624.png',
  'real-avila':
    'https://r2.thesportsdb.com/images/media/team/badge/ymdv3f1730648785.png',
  'ud-logrones':
    'https://r2.thesportsdb.com/images/media/team/badge/k64thp1732833216.png',
  'ce-europa':
    'https://r2.thesportsdb.com/images/media/team/badge/xdfie41784675774.png',
  'ud-ibiza': 'https://a.espncdn.com/i/teamlogos/soccer/500/20229.png',
  'pontevedra-cf': `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M18 12h64v42c0 24-32 36-32 36S18 78 18 54V12z" fill="#7f1d1d" stroke="#facc15" stroke-width="5"/><path d="M50 18v66M26 38h48" stroke="#1d4ed8" stroke-width="8"/><circle cx="50" cy="38" r="10" fill="#facc15"/></svg>',
  )}`,
  'celta-fortuna': 'https://a.espncdn.com/i/teamlogos/soccer/500/85.png',
  'real-sociedad-b': 'https://a.espncdn.com/i/teamlogos/soccer/500/89.png',
  'seleccion-espanola': 'https://a.espncdn.com/i/teamlogos/countries/500/esp.png',
};

@Injectable()
export class LiveSpanishFootballProvider implements FootballDataProvider {
  public readonly providerName =
    'LiveSpanishFootballProvider (Datos Reales en Vivo · LaLiga / Segunda / Copa / RFEF)';
  private readonly logger = new Logger(LiveSpanishFootballProvider.name);
  private readonly baseUrl = 'https://site.api.espn.com/apis';

  private cachedStandings = new Map<
    string,
    { expiresAt: number; data: StandingTable }
  >();
  private cachedTeams: { expiresAt: number; data: Team[] } | null = null;
  private cachedMatches: { expiresAt: number; data: Match[] } | null = null;
  private cachedPlayers: { expiresAt: number; data: Player[] } | null = null;
  private readonly espnTeamIdBySlug = new Map<
    string,
    { id: string; leagueCode: string; team: Team }
  >();

  constructor(
    private readonly fallbackProvider: RealisticSpanishFootballProvider,
  ) {}

  private resolveClubLogoBySlug(slug: string): string | undefined {
    return (
      this.espnTeamIdBySlug.get(slug)?.team.logoUrl ||
      OFFICIAL_CLUB_LOGO_BY_SLUG[slug]
    );
  }

  async fetchCompetitions(): Promise<Competition[]> {
    const baseComps = await this.fallbackProvider.fetchCompetitions();
    try {
      const laligaTable = await this.fetchStandings('laliga-ea-sports');
      const hyperTable = await this.fetchStandings('laliga-hypermotion');

      return baseComps.map((c) => {
        if (c.slug === 'laliga-ea-sports' && laligaTable) {
          return {
            ...c,
            currentSeason: laligaTable.season,
            currentMatchday: laligaTable.matchday,
          };
        }
        if (c.slug === 'laliga-hypermotion' && hyperTable) {
          return {
            ...c,
            currentSeason: hyperTable.season,
            currentMatchday: hyperTable.matchday,
          };
        }
        return c;
      });
    } catch {
      return baseComps;
    }
  }

  async fetchStandings(competitionSlug: string): Promise<StandingTable | null> {
    const normalized =
      competitionSlug === 'laliga'
        ? 'laliga-ea-sports'
        : competitionSlug === 'segunda'
          ? 'laliga-hypermotion'
          : competitionSlug;

    const cached = this.cachedStandings.get(normalized);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    if (
      normalized !== 'laliga-ea-sports' &&
      normalized !== 'laliga-hypermotion'
    ) {
      const fbTable = await this.fallbackProvider.fetchStandings(normalized);
      if (!fbTable) return null;
      return {
        ...fbTable,
        rows: fbTable.rows.map((r) => ({
          ...r,
          logoUrl: r.logoUrl || this.resolveClubLogoBySlug(r.teamSlug),
        })),
      };
    }

    const leagueCode = normalized === 'laliga-ea-sports' ? 'esp.1' : 'esp.2';
    const competitionName =
      normalized === 'laliga-ea-sports'
        ? 'LaLiga EA Sports'
        : 'LaLiga Hypermotion';

    try {
      const res = await fetch(
        `${this.baseUrl}/v2/sports/soccer/${leagueCode}/standings`,
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const raw = (await res.json()) as {
        season?: { year?: number; displayName?: string };
        children?: Array<{
          standings?: {
            entries?: Array<{
              team?: {
                id?: string;
                displayName?: string;
                shortDisplayName?: string;
                abbreviation?: string;
                color?: string;
                alternateColor?: string;
                logos?: Array<{ href?: string }>;
              };
              stats?: Array<{ name?: string; value?: number }>;
            }>;
          };
        }>;
      };

      const entries = raw.children?.[0]?.standings?.entries ?? [];
      if (entries.length === 0) {
        return this.fallbackProvider.fetchStandings(normalized);
      }

      const rows: StandingRow[] = entries.map((entry, index) => {
        const rawName = entry.team?.displayName ?? `Club ${index + 1}`;
        const meta = this.resolveClubMeta(rawName, entry.team);
        const statMap = new Map<string, number>();
        for (const s of entry.stats ?? []) {
          if (s.name && typeof s.value === 'number') {
            statMap.set(s.name, s.value);
          }
        }

        const position = statMap.get('rank') ?? index + 1;
        const played = statMap.get('gamesPlayed') ?? 0;
        const won = statMap.get('wins') ?? 0;
        const drawn = statMap.get('ties') ?? 0;
        const lost = statMap.get('losses') ?? 0;
        const goalsFor = statMap.get('pointsFor') ?? 0;
        const goalsAgainst = statMap.get('pointsAgainst') ?? 0;
        const goalDifference =
          statMap.get('pointDifferential') ?? goalsFor - goalsAgainst;
        const points = statMap.get('points') ?? won * 3 + drawn;
        const logoUrl = entry.team?.logos?.[0]?.href;

        const { zone, zoneLabel } = this.computeQualificationZone(
          normalized,
          position,
          entries.length,
        );

        const recentForm = this.deriveFormFromRecord(won, drawn, lost);

        return {
          position,
          teamSlug: meta.slug,
          teamName: meta.officialName,
          teamShortName: meta.shortName,
          teamCode: meta.code,
          primaryColor: meta.primaryColor,
          secondaryColor: meta.secondaryColor,
          logoUrl,
          played,
          won,
          drawn,
          lost,
          goalsFor,
          goalsAgainst,
          goalDifference,
          points,
          recentForm,
          zone,
          zoneLabel,
        };
      });

      rows.sort((a, b) => a.position - b.position);

      const maxPlayed = rows.reduce((acc, r) => Math.max(acc, r.played), 1);
      const year = raw.season?.year ?? new Date().getFullYear();
      const seasonLabel = `${year}/${String((year + 1) % 100).padStart(2, '0')}`;

      const table: StandingTable = {
        competitionSlug: normalized,
        competitionName,
        season: seasonLabel,
        matchday: maxPlayed,
        updatedAt: new Date().toISOString(),
        rows,
        legend:
          normalized === 'laliga-ea-sports'
            ? [
                {
                  zone: 'CHAMPIONS_LEAGUE',
                  label: 'UEFA Champions League (1º - 4º)',
                  colorHex: '#10b981',
                },
                {
                  zone: 'EUROPA_LEAGUE',
                  label: 'UEFA Europa League (5º)',
                  colorHex: '#3b82f6',
                },
                {
                  zone: 'CONFERENCE_LEAGUE',
                  label: 'UEFA Conference League (6º)',
                  colorHex: '#06b6d4',
                },
                {
                  zone: 'RELEGATION',
                  label: 'Descenso a LaLiga Hypermotion (18º - 20º)',
                  colorHex: '#ef4444',
                },
              ]
            : [
                {
                  zone: 'DIRECT_PROMOTION',
                  label: 'Ascenso Directo a LaLiga EA Sports (1º - 2º)',
                  colorHex: '#10b981',
                },
                {
                  zone: 'PROMOTION_PLAYOFF',
                  label: 'Playoff de Ascenso (3º - 6º)',
                  colorHex: '#f59e0b',
                },
                {
                  zone: 'RELEGATION',
                  label: 'Descenso a Primera Federación (19º - 22º)',
                  colorHex: '#ef4444',
                },
              ],
      };

      this.cachedStandings.set(normalized, {
        expiresAt: Date.now() + 5 * 60 * 1000,
        data: table,
      });

      return table;
    } catch (err) {
      this.logger.warn(
        `Fallo al consultar clasificación en vivo (${normalized}): ${
          err instanceof Error ? err.message : 'Error'
        }. Usando respaldo.`,
      );
      return this.fallbackProvider.fetchStandings(normalized);
    }
  }

  async fetchAllTeams(): Promise<Team[]> {
    if (this.cachedTeams && this.cachedTeams.expiresAt > Date.now()) {
      return this.cachedTeams.data;
    }

    try {
      const [laligaRes, hyperRes, fallbackTeams] = await Promise.all([
        fetch(`${this.baseUrl}/v2/sports/soccer/esp.1/standings`),
        fetch(`${this.baseUrl}/v2/sports/soccer/esp.2/standings`),
        this.fallbackProvider.fetchAllTeams(),
      ]);

      const teams: Team[] = [];
      const seenSlugs = new Set<string>();

      const processStandingsJson = async (
        res: Response,
        competitionSlug: string,
        competitionName: string,
        leagueCode: string,
      ) => {
        if (!res.ok) return;
        const json = (await res.json()) as {
          children?: Array<{
            standings?: {
              entries?: Array<{
                team?: {
                  id?: string;
                  displayName?: string;
                  shortDisplayName?: string;
                  abbreviation?: string;
                  color?: string;
                  alternateColor?: string;
                  logos?: Array<{ href?: string }>;
                };
                stats?: Array<{ name?: string; value?: number }>;
              }>;
            };
          }>;
        };

        const entries = json.children?.[0]?.standings?.entries ?? [];
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const rawName = entry.team?.displayName ?? `Club ${i + 1}`;
          const meta = this.resolveClubMeta(rawName, entry.team);
          if (seenSlugs.has(meta.slug)) continue;
          seenSlugs.add(meta.slug);

          const statMap = new Map<string, number>();
          for (const s of entry.stats ?? []) {
            if (s.name && typeof s.value === 'number') {
              statMap.set(s.name, s.value);
            }
          }

          const position = statMap.get('rank') ?? i + 1;
          const played = statMap.get('gamesPlayed') ?? 0;
          const won = statMap.get('wins') ?? 0;
          const drawn = statMap.get('ties') ?? 0;
          const lost = statMap.get('losses') ?? 0;
          const goalsFor = statMap.get('pointsFor') ?? 0;
          const goalsAgainst = statMap.get('pointsAgainst') ?? 0;
          const goalDifference =
            statMap.get('pointDifferential') ?? goalsFor - goalsAgainst;
          const points = statMap.get('points') ?? won * 3 + drawn;
          const logoUrl = entry.team?.logos?.[0]?.href;

          const teamObj: Team = {
            id: `team-${entry.team?.id ?? meta.slug}`,
            slug: meta.slug,
            name: meta.officialName,
            shortName: meta.shortName,
            code: meta.code,
            city: meta.city,
            autonomousCommunity: meta.autonomousCommunity,
            stadium: meta.stadium,
            stadiumCapacity: meta.capacity,
            foundedYear: meta.founded,
            coach: meta.coach,
            primaryColor: meta.primaryColor,
            secondaryColor: meta.secondaryColor,
            logoUrl,
            competitionSlug,
            competitionName,
            standing: {
              position,
              points,
              played,
              won,
              drawn,
              lost,
              goalsFor,
              goalsAgainst,
              goalDifference,
              recentForm: this.deriveFormFromRecord(won, drawn, lost),
            },
            stats: {
              possessionAvg: Number(
                Math.min(
                  66,
                  Math.max(42, 50 + (20 - position) * 0.65),
                ).toFixed(1),
              ),
              shotsPerGame: Number(
                Math.max(
                  9.5,
                  (goalsFor / Math.max(1, played)) * 5.2 + 7.2,
                ).toFixed(1),
              ),
              cleanSheets: Math.max(
                1,
                Math.round(played - goalsAgainst * 0.55),
              ),
              topScorerName: 'Máximo goleador de plantilla',
              topScorerGoals: Math.max(2, Math.round(goalsFor * 0.34)),
            },
            isFeatured:
              (competitionSlug === 'laliga-ea-sports' && position <= 8) ||
              (competitionSlug === 'laliga-hypermotion' && position <= 3),
          };

          teams.push(teamObj);
          if (entry.team?.id) {
            this.espnTeamIdBySlug.set(meta.slug, {
              id: entry.team.id,
              leagueCode,
              team: teamObj,
            });
          }
        }
      };

      await processStandingsJson(
        laligaRes,
        'laliga-ea-sports',
        'LaLiga EA Sports',
        'esp.1',
      );
      await processStandingsJson(
        hyperRes,
        'laliga-hypermotion',
        'LaLiga Hypermotion',
        'esp.2',
      );

      // Include Primera RFEF, Segunda RFEF, and Selección Española teams not in 1ª/2ª
      for (const fbTeam of fallbackTeams) {
        if (
          !seenSlugs.has(fbTeam.slug) &&
          fbTeam.competitionSlug !== 'laliga-ea-sports' &&
          fbTeam.competitionSlug !== 'laliga-hypermotion'
        ) {
          seenSlugs.add(fbTeam.slug);
          teams.push({
            ...fbTeam,
            logoUrl:
              fbTeam.logoUrl || this.resolveClubLogoBySlug(fbTeam.slug),
          });
        }
      }

      if (teams.length > 0) {
        this.cachedTeams = {
          expiresAt: Date.now() + 10 * 60 * 1000,
          data: teams,
        };
        return teams;
      }
    } catch (err) {
      this.logger.warn(
        `Error al sincronizar clubes reales: ${
          err instanceof Error ? err.message : 'Error'
        }`,
      );
    }

    return this.fallbackProvider.fetchAllTeams();
  }

  async fetchTeamsByCompetition(competitionSlug: string): Promise<Team[]> {
    const all = await this.fetchAllTeams();
    return all.filter((t) => t.competitionSlug === competitionSlug);
  }

  async fetchAllMatches(): Promise<Match[]> {
    if (this.cachedMatches && this.cachedMatches.expiresAt > Date.now()) {
      return this.cachedMatches.data;
    }

    try {
      await this.fetchAllTeams();

      // Determine ESPN's current date and build a 9-day window around it (yesterday, today, tomorrow + weekend/midweek)
      const baseSbRes = await fetch(
        `${this.baseUrl}/site/v2/sports/soccer/esp.1/scoreboard`,
      );
      const baseSb = baseSbRes.ok
        ? ((await baseSbRes.json()) as { day?: { date?: string } })
        : null;

      const anchorIso =
        baseSb?.day?.date ?? new Date().toISOString().split('T')[0];

      const offsets = [-2, -1, 0, 1, 2, 5, 6, 7];
      const dateTokens = offsets.map((off) =>
        this.addDaysIso(anchorIso, off).replace(/-/g, ''),
      );

      const leagues = [
        {
          code: 'esp.1',
          slug: 'laliga-ea-sports',
          name: 'LaLiga EA Sports',
          shortName: 'LaLiga',
        },
        {
          code: 'esp.2',
          slug: 'laliga-hypermotion',
          name: 'LaLiga Hypermotion',
          shortName: 'Segunda',
        },
        {
          code: 'esp.copa_del_rey',
          slug: 'copa-del-rey',
          name: 'Copa de S.M. el Rey',
          shortName: 'Copa del Rey',
        },
      ];

      const allMatches: Match[] = [];
      const seenMatchIds = new Set<string>();

      const requests: Array<Promise<void>> = [];

      for (const league of leagues) {
        for (const dateToken of dateTokens) {
          requests.push(
            (async () => {
              try {
                const res = await fetch(
                  `${this.baseUrl}/site/v2/sports/soccer/${league.code}/scoreboard?dates=${dateToken}`,
                );
                if (!res.ok) return;
                const data = (await res.json()) as {
                  events?: Array<Record<string, unknown>>;
                };
                for (const ev of data.events ?? []) {
                  const id = String(ev.id ?? '');
                  if (!id || seenMatchIds.has(id)) continue;
                  seenMatchIds.add(id);
                  const mapped = this.mapEspnEventToMatch(
                    ev,
                    league.slug,
                    league.name,
                    league.shortName,
                  );
                  if (mapped) {
                    allMatches.push(mapped);
                  }
                }
              } catch {
                // ignore individual day fetch failure
              }
            })(),
          );
        }
      }

      // Also fetch default active round of Copa del Rey (so Copa del Rey always has its real eliminatorias)
      requests.push(
        (async () => {
          try {
            const copaRes = await fetch(
              `${this.baseUrl}/site/v2/sports/soccer/esp.copa_del_rey/scoreboard`,
            );
            if (!copaRes.ok) return;
            const copaData = (await copaRes.json()) as {
              events?: Array<Record<string, unknown>>;
            };
            for (const ev of copaData.events ?? []) {
              const id = String(ev.id ?? '');
              if (!id || seenMatchIds.has(id)) continue;
              seenMatchIds.add(id);
              const mapped = this.mapEspnEventToMatch(
                ev,
                'copa-del-rey',
                'Copa de S.M. el Rey',
                'Copa del Rey',
              );
              if (mapped) {
                allMatches.push(mapped);
              }
            }
          } catch {
            // ignore
          }
        })(),
      );

      // Also fetch real Spain National Team schedule from ESPN (team 164)
      requests.push(
        (async () => {
          try {
            const spainRes = await fetch(
              `${this.baseUrl}/site/v2/sports/soccer/all/teams/164/schedule`,
            );
            if (!spainRes.ok) return;
            const spainData = (await spainRes.json()) as {
              events?: Array<Record<string, unknown>>;
            };
            for (const ev of (spainData.events ?? []).slice(0, 6)) {
              const id = String(ev.id ?? '');
              if (!id || seenMatchIds.has(id)) continue;
              seenMatchIds.add(id);
              const mapped = this.mapEspnEventToMatch(
                ev,
                'seleccion-espanola',
                'Selección Española Absoluta',
                'Selección',
              );
              if (mapped) {
                allMatches.push(mapped);
              }
            }
          } catch {
            // ignore
          }
        })(),
      );

      await Promise.all(requests);

      // Include Primera Federación & Segunda Federación matches so all 6 competition tabs have matches
      const fallbackMatches = await this.fallbackProvider.fetchAllMatches();
      for (const fbMatch of fallbackMatches) {
        if (
          fbMatch.competitionSlug === 'primera-federacion' ||
          fbMatch.competitionSlug === 'segunda-federacion'
        ) {
          allMatches.push({
            ...fbMatch,
            homeTeam: {
              ...fbMatch.homeTeam,
              logoUrl:
                fbMatch.homeTeam.logoUrl ||
                this.resolveClubLogoBySlug(fbMatch.homeTeam.slug),
            },
            awayTeam: {
              ...fbMatch.awayTeam,
              logoUrl:
                fbMatch.awayTeam.logoUrl ||
                this.resolveClubLogoBySlug(fbMatch.awayTeam.slug),
            },
          });
        }
      }

      // Enrich recent & today LaLiga/Segunda matches with starting XI lineups & referee from summary endpoint
      const priorityMatches = allMatches
        .filter(
          (m) =>
            m.id.startsWith('espn-') &&
            (m.dateIso === anchorIso ||
              m.dateIso === this.addDaysIso(anchorIso, -1) ||
              m.dateIso === this.addDaysIso(anchorIso, 1)),
        )
        .slice(0, 14);

      await Promise.all(
        priorityMatches.map((match) => this.enrichMatchWithSummary(match)),
      );

      if (allMatches.length > 0) {
        allMatches.sort((a, b) =>
          `${a.dateIso}T${a.kickoffTime}`.localeCompare(
            `${b.dateIso}T${b.kickoffTime}`,
          ),
        );
        this.cachedMatches = {
          expiresAt: Date.now() + 90 * 1000,
          data: allMatches,
        };
        return allMatches;
      }
    } catch (err) {
      this.logger.warn(
        `Error al obtener partidos reales en vivo: ${
          err instanceof Error ? err.message : 'Error'
        }`,
      );
    }

    return this.fallbackProvider.fetchAllMatches();
  }

  async enrichMatchWithSummary(match: Match): Promise<Match> {
    if (!match.id.startsWith('espn-')) {
      return match;
    }
    const rawEventId = match.id.replace('espn-', '');
    const leagueCode =
      match.competitionSlug === 'laliga-ea-sports'
        ? 'esp.1'
        : match.competitionSlug === 'laliga-hypermotion'
          ? 'esp.2'
          : match.competitionSlug === 'seleccion-espanola'
            ? 'uefa.nations'
            : 'esp.copa_del_rey';
    try {
      const sumRes = await fetch(
        `${this.baseUrl}/site/v2/sports/soccer/${leagueCode}/summary?event=${rawEventId}`,
      );
      if (!sumRes.ok) return match;
      const sum = (await sumRes.json()) as {
        rosters?: Array<{
          homeAway?: string;
          formation?: string;
          roster?: Array<{
            starter?: boolean;
            jersey?: string;
            athlete?: { displayName?: string };
            position?: { abbreviation?: string };
          }>;
        }>;
        gameInfo?: {
          attendance?: number;
          officials?: Array<{ fullName?: string; displayName?: string }>;
        };
      };

      if (sum.gameInfo?.attendance && sum.gameInfo.attendance > 0) {
        match.attendance = sum.gameInfo.attendance;
      }
      const official =
        sum.gameInfo?.officials?.[0]?.fullName ??
        sum.gameInfo?.officials?.[0]?.displayName;
      if (official) {
        match.referee = official;
      }

      for (const r of sum.rosters ?? []) {
        const lineup = this.mapEspnRosterToLineup(
          r,
          r.homeAway === 'home' ? match.homeTeam.slug : match.awayTeam.slug,
        );
        if (lineup) {
          if (r.homeAway === 'home') {
            match.homeLineup = lineup;
          } else {
            match.awayLineup = lineup;
          }
        }
      }
    } catch {
      // ignore summary enrichment failure
    }
    return match;
  }

  async fetchMatchesByDate(
    dateIso: string,
    competitionSlug?: string,
  ): Promise<Match[]> {
    const all = await this.fetchAllMatches();
    return all.filter((m) => {
      const sameDate = m.dateIso === dateIso;
      const sameComp =
        !competitionSlug ||
        competitionSlug === 'todos' ||
        m.competitionSlug === competitionSlug;
      return sameDate && sameComp;
    });
  }

  async fetchPlayers(): Promise<Player[]> {
    if (this.cachedPlayers && this.cachedPlayers.expiresAt > Date.now()) {
      return this.cachedPlayers.data;
    }

    try {
      await this.fetchAllTeams();

      // Include both LaLiga EA Sports and LaLiga Hypermotion clubs so both league filters have real players
      const targetSlugs = [
        'fc-barcelona',
        'real-madrid',
        'atletico-de-madrid',
        'athletic-club',
        'villarreal-cf',
        'real-sociedad',
        'real-betis',
        'sevilla-fc',
        'ca-osasuna',
        'rc-celta',
        'deportivo-de-la-coruna',
        'racing-de-santander',
        'valencia-cf',
        'ud-almeria',
        'girona-fc',
        'rcd-mallorca',
        'real-sporting',
        'real-oviedo',
        'granada-cf',
        'real-valladolid',
        'ud-las-palmas',
        'cd-leganes',
        'cadiz-cf',
      ];

      const players: Player[] = [];
      const seenPlayerSlugs = new Set<string>();

      await Promise.all(
        targetSlugs.map(async (teamSlug) => {
          const entry = this.espnTeamIdBySlug.get(teamSlug);
          if (!entry) return;

          try {
            const res = await fetch(
              `${this.baseUrl}/site/v2/sports/soccer/${entry.leagueCode}/teams/${entry.id}/roster`,
            );
            if (!res.ok) return;
            const data = (await res.json()) as {
              athletes?: Array<{
                id?: string;
                displayName?: string;
                fullName?: string;
                jersey?: string;
                age?: number;
                citizenship?: string;
                position?: { abbreviation?: string; displayName?: string };
                statistics?: {
                  splits?: {
                    categories?: Array<{
                      name?: string;
                      stats?: Array<{ name?: string; value?: number }>;
                    }>;
                  };
                };
              }>;
            };

            const teamPlayers: Player[] = [];
            for (const ath of data.athletes ?? []) {
              const name = ath.displayName ?? ath.fullName;
              if (!name) continue;
              const slug = Slug.create(name).toString();
              if (seenPlayerSlugs.has(slug)) continue;

              const statMap = new Map<string, number>();
              for (const cat of ath.statistics?.splits?.categories ?? []) {
                for (const st of cat.stats ?? []) {
                  if (st.name && typeof st.value === 'number') {
                    statMap.set(st.name, st.value);
                  }
                }
              }

              const appearances = statMap.get('appearances') ?? 0;
              const subIns = statMap.get('subIns') ?? 0;
              const goals = statMap.get('totalGoals') ?? 0;
              const assists = statMap.get('goalAssists') ?? 0;
              const yellowCards = statMap.get('yellowCards') ?? 0;
              const redCards = statMap.get('redCards') ?? 0;

              if (appearances === 0 && goals === 0 && assists === 0) {
                continue;
              }

              seenPlayerSlugs.add(slug);
              const starts = Math.max(0, appearances - subIns);
              const minutesPlayed = Math.max(
                appearances * 15,
                starts * 82 + subIns * 24,
              );

              const posInfo = this.mapAthletePosition(
                ath.position?.abbreviation,
              );
              const rating = Number(
                Math.min(
                  9.2,
                  Math.max(
                    6.5,
                    6.8 +
                      goals * 0.18 +
                      assists * 0.14 +
                      Math.min(0.4, appearances * 0.03),
                  ),
                ).toFixed(1),
              );

              teamPlayers.push({
                id: `pl-${ath.id ?? slug}`,
                slug,
                name,
                shirtNumber: parseInt(ath.jersey ?? '0', 10) || 9,
                position: posInfo.position,
                positionCode: posInfo.positionCode,
                age: ath.age ?? 24,
                nationality: this.translateCountryToSpanish(
                  ath.citizenship ?? 'Spain',
                ),
                teamSlug: entry.team.slug,
                teamName: entry.team.name,
                teamShortName: entry.team.shortName,
                teamPrimaryColor: entry.team.primaryColor,
                teamLogoUrl: entry.team.logoUrl,
                competitionSlug: entry.team.competitionSlug,
                stats: {
                  appearances,
                  minutesPlayed,
                  goals,
                  assists,
                  yellowCards,
                  redCards,
                  rating,
                },
                isFeatured: goals >= 3 || assists >= 3 || rating >= 7.6,
              });
            }

            // Update club's top scorer from real roster stats
            const topScorer = [...teamPlayers].sort(
              (a, b) =>
                b.stats.goals - a.stats.goals ||
                b.stats.assists - a.stats.assists,
            )[0];
            if (topScorer) {
              entry.team.stats.topScorerName = topScorer.name;
              entry.team.stats.topScorerGoals = topScorer.stats.goals;
            }

            players.push(...teamPlayers);
          } catch {
            // ignore individual roster error
          }
        }),
      );

      // Include Primera Federación & Segunda Federación players so all competition filters in /jugadores work
      const fbPlayers = await this.fallbackProvider.fetchPlayers();
      for (const fbp of fbPlayers) {
        if (
          !seenPlayerSlugs.has(fbp.slug) &&
          (fbp.competitionSlug === 'primera-federacion' ||
            fbp.competitionSlug === 'segunda-federacion')
        ) {
          seenPlayerSlugs.add(fbp.slug);
          players.push({
            ...fbp,
            teamLogoUrl:
              fbp.teamLogoUrl || this.resolveClubLogoBySlug(fbp.teamSlug),
          });
        }
      }

      if (players.length > 0) {
        players.sort(
          (a, b) =>
            b.stats.goals - a.stats.goals ||
            b.stats.assists - a.stats.assists ||
            b.stats.rating - a.stats.rating,
        );
        await this.enrichPlayersWithRealPhotos(players);
        this.cachedPlayers = {
          expiresAt: Date.now() + 15 * 60 * 1000,
          data: players,
        };
        return players;
      }
    } catch (err) {
      this.logger.warn(
        `Error al sincronizar jugadores reales: ${
          err instanceof Error ? err.message : 'Error'
        }`,
      );
    }

    return this.fallbackProvider.fetchPlayers();
  }

  private async enrichPlayersWithRealPhotos(players: Player[]): Promise<void> {
    const normalizeName = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const directVerifiedPhotos: Record<string, string> = {
      'miguel de la fuente':
        'https://r2.thesportsdb.com/images/media/player/cutout/3h6nxb1787220667.png',
      gavi: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Gavi_France_v_Spain_7.24.26-275_%28cropped%29.jpg/500px-Gavi_France_v_Spain_7.24.26-275_%28cropped%29.jpg',
      natan:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/S%C3%A9rie_A1_Bragantino_1x0_Corinthians_%2852632859764%29_-_Natan.jpg/500px-S%C3%A9rie_A1_Bragantino_1x0_Corinthians_%2852632859764%29_-_Natan.jpg',
      antony:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Antony_-_Betis_-_Partido_Betis_vs_Valencia.jpg/500px-Antony_-_Betis_-_Partido_Betis_vs_Valencia.jpg',
      'jesus vazquez':
        'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/JES%C3%9AS_V%C3%81ZQUEZ_2021.jpg/500px-JES%C3%9AS_V%C3%81ZQUEZ_2021.jpg',
      'nacho vidal':
        'https://upload.wikimedia.org/wikipedia/commons/f/f2/CSC_0149_%2829636216028%29_Nacho_%28cropped%29.jpg',
      'joan garcia':
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Joan_Garcia_Argentina_v_Spain_19_July_2026-009.jpg/500px-Joan_Garcia_Argentina_v_Spain_19_July_2026-009.jpg',
      'andre almeida':
        'https://upload.wikimedia.org/wikipedia/commons/b/b1/Valencia_CF_vs_Real_Sociedad_-_LALIGA_-_Andr%C3%A9_Almeida.jpg',
      'valentin gomez':
        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Entrenamiento_Argentina_Sub20_previo_al_mundial_-_BugWarp_%2845%29_%28cropped%29.jpg/500px-Entrenamiento_Argentina_Sub20_previo_al_mundial_-_BugWarp_%2845%29_%28cropped%29.jpg',
      'mikel goti':
        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Mikel_Goti_Lopez.jpg/500px-Mikel_Goti_Lopez.jpg',
      'yaser asprilla':
        'https://r2.thesportsdb.com/images/media/player/cutout/zhugc41773916009.png',
      'pedro leon sanchez':
        'https://r2.thesportsdb.com/images/media/player/cutout/9j1upc1603220577.png',
      'brian cipenga':
        'https://r2.thesportsdb.com/images/media/player/cutout/fpcbfy1787221199.png',
      'juan latasa':
        'https://r2.thesportsdb.com/images/media/player/cutout/4342901678795282.png',
      'carlos dominguez':
        'https://r2.thesportsdb.com/images/media/player/cutout/g78ly81724492381.png',
      'javi munoz':
        'https://r2.thesportsdb.com/images/media/player/cutout/vgeccq1762430266.png',
      'julien ponceau':
        'https://r2.thesportsdb.com/images/media/player/cutout/qlx8cy1727955023.png',
      'alberto moleiro':
        'https://r2.thesportsdb.com/images/media/player/cutout/89qaq61762888929.png',
      'alex sala':
        'https://r2.thesportsdb.com/images/media/player/cutout/5fmcl51619092284.png',
    };

    const photoByNormalizedName = new Map<string, string>(
      Object.entries(directVerifiedPhotos),
    );

    const ageByNormalizedName = new Map<string, number>();
    for (const p of players) {
      ageByNormalizedName.set(normalizeName(p.name), p.age);
    }

    const isVerifiedFootballerPage = (
      page: {
        title?: string;
        description?: string;
        categories?: Array<{ title?: string }>;
        thumbnail?: { source?: string };
      },
      expectedAge?: number,
    ): boolean => {
      const src = page.thumbnail?.source ?? '';
      if (!src || !page.title) return false;

      const fileLower = decodeURIComponent(
        src.split('/').pop()?.split('?')[0] ?? '',
      ).toLowerCase();

      const blockedFiles = [
        'miguel_de_la_fuente',
        'icon_of_saint',
        'liber_chronicarum',
        'commune_',
        'panorama',
        'thalys',
        'andreu_martin',
        'diegosanchez',
        'miguel_calatayud',
        'jorge_salinas',
        'julio_diaz',
        'gaspar_campos',
        'donald_j._trump',
        'juan_arango_2012',
        'zenit-benfica',
        'iker_martinez',
        'jorge_dominguez',
        'diagne-faye',
        'victor_fernandez',
        'fonsi_nieto',
        'coat_of_arms',
        'escudo',
        'flag_of',
        'mapa',
        'logo',
        '14th_century',
        '15th_century',
        '16th_century',
        '17th_century',
        '18th_century',
        '19th_century',
        'in_1950',
      ];
      if (blockedFiles.some((b) => fileLower.includes(b))) {
        return false;
      }

      const desc = normalizeName(page.description ?? '');
      const cats = (page.categories ?? [])
        .map((c) => normalizeName(c.title ?? ''))
        .join(' | ');

      if (cats.includes('fallecidos') || cats.includes('deaths')) {
        return false;
      }

      const blockedDescriptions = [
        'sacerdote',
        'religioso',
        'fraile',
        'santo',
        'hijo del rey',
        'municipio',
        'comuna',
        'localidad',
        'escritor',
        'historietista',
        'actor',
        'presentador',
        'militar',
        'politico',
        'pintor',
        'nombre masculino',
        'desambiguacion',
        'disambiguation',
        'railway',
        'train',
        'sailor',
        'regatista',
        'martial artist',
        'piloto',
        'motociclismo',
        'entrenador',
        'manager',
      ];
      if (blockedDescriptions.some((b) => desc.includes(b))) {
        return false;
      }

      // Check birth years in description or categories against player's age
      const yearMatches = [
        ...desc.matchAll(/\b(1[5-9]\d\d|20[0-1]\d)\b/g),
        ...cats.matchAll(
          /(?:nacidos en |births )?(1[5-9]\d\d|20[0-1]\d)(?: births)?/g,
        ),
      ];
      for (const m of yearMatches) {
        const y = parseInt(m[1], 10);
        if (y < 1984) return false;
        if (expectedAge) {
          const approxBirthYear = 2025 - expectedAge;
          if (Math.abs(y - approxBirthYear) > 4) {
            return false;
          }
        }
      }

      const hasFootballDesc =
        desc.includes('futbolista') ||
        desc.includes('footballer') ||
        desc.includes('soccer player') ||
        desc.includes('football player');
      const hasFootballCat =
        (cats.includes('futbolistas') || cats.includes('footballers')) &&
        (cats.includes('personas vivas') || cats.includes('living people'));

      return hasFootballDesc || hasFootballCat;
    };

    const remainingNames = Array.from(
      new Set(
        players
          .map((p) => p.name)
          .filter((n) => !photoByNormalizedName.has(normalizeName(n))),
      ),
    );

    const chunks: string[][] = [];
    for (let i = 0; i < remainingNames.length; i += 45) {
      chunks.push(remainingNames.slice(i, i + 45));
    }

    const fetchWikiChunk = async (lang: 'es' | 'en', names: string[]) => {
      try {
        const titlesParam = encodeURIComponent(names.join('|'));
        const url = `https://${lang}.wikipedia.org/w/api.php?action=query&redirects=1&prop=pageimages|description|categories&cllimit=max&pithumbsize=400&format=json&titles=${titlesParam}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'IberFutbol/1.0 (https://iberfutbol.es)' },
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          query?: {
            redirects?: Array<{ from: string; to: string }>;
            normalized?: Array<{ from: string; to: string }>;
            pages?: Record<
              string,
              {
                title?: string;
                description?: string;
                categories?: Array<{ title?: string }>;
                thumbnail?: { source?: string };
              }
            >;
          };
        };

        const pages = Object.values(json.query?.pages ?? {});
        const reverseMap = new Map<string, string[]>();
        const registerAlias = (from: string, to: string) => {
          const list = reverseMap.get(to) ?? [];
          list.push(from);
          reverseMap.set(to, list);
        };
        for (const r of json.query?.redirects ?? []) {
          registerAlias(r.from, r.to);
        }
        for (const n of json.query?.normalized ?? []) {
          registerAlias(n.from, n.to);
        }

        for (const page of pages) {
          const src = page.thumbnail?.source;
          const title = page.title;
          if (!src || !title) continue;
          const aliases = [title, ...(reverseMap.get(title) ?? [])];
          const expectedAge = aliases
            .map((a) => ageByNormalizedName.get(normalizeName(a)))
            .find((age) => typeof age === 'number');

          if (!isVerifiedFootballerPage(page, expectedAge)) {
            continue;
          }

          for (const alias of aliases) {
            photoByNormalizedName.set(normalizeName(alias), src);
          }
        }
      } catch {
        // ignore wiki batch error
      }
    };

    // Execute in small parallel pairs so Wikipedia API does not rate-limit
    for (let i = 0; i < chunks.length; i += 2) {
      const pair = chunks.slice(i, i + 2);
      await Promise.all([
        ...pair.map((c) => fetchWikiChunk('en', c)),
        ...pair.map((c) => fetchWikiChunk('es', c)),
      ]);
    }

    for (const p of players) {
      const found = photoByNormalizedName.get(normalizeName(p.name));
      if (found) {
        p.photoUrl = found;
      }
    }

    // For top/featured players still missing a photo, query TheSportsDB verifying Sport=Soccer, exact name & birth year
    const missingPriority = players.filter((p) => !p.photoUrl).slice(0, 25);
    await Promise.all(
      missingPriority.map(async (p) => {
        try {
          const res = await fetch(
            `https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p=${encodeURIComponent(
              p.name,
            )}`,
          );
          if (!res.ok) return;
          const json = (await res.json()) as {
            player?: Array<{
              strPlayer?: string;
              strSport?: string;
              dateBorn?: string;
              strCutout?: string;
              strThumb?: string;
            }>;
          };
          const targetNorm = normalizeName(p.name);
          const approxBirthYear = 2025 - p.age;
          const match = (json.player ?? []).find((cand) => {
            if (cand.strSport !== 'Soccer') return false;
            if (normalizeName(cand.strPlayer ?? '') !== targetNorm) {
              return false;
            }
            if (cand.dateBorn) {
              const birthYear = parseInt(cand.dateBorn.slice(0, 4), 10);
              if (
                !Number.isNaN(birthYear) &&
                (birthYear < 1984 || Math.abs(birthYear - approxBirthYear) > 3)
              ) {
                return false;
              }
            }
            return Boolean(cand.strCutout || cand.strThumb);
          });
          const img = match?.strCutout || match?.strThumb;
          if (img) {
            p.photoUrl = img;
          }
        } catch {
          // ignore individual lookup error
        }
      }),
    );

    // Ensure every remaining squad player has a realistic footballer portrait SVG (never 2-letter initials)
    for (const p of players) {
      if (!p.photoUrl) {
        p.photoUrl = this.buildPlayerPortraitSvgDataUri(p);
      }
    }
  }

  private buildPlayerPortraitSvgDataUri(player: Player): string {
    const primary =
      player.teamPrimaryColor === '#ffffff'
        ? '#1e3a8a'
        : player.teamPrimaryColor || '#10b981';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="${primary}"/></linearGradient></defs><rect width="120" height="120" rx="24" fill="url(#bg)"/><circle cx="60" cy="40" r="19" fill="#f1c27d"/><path d="M41 34c2-12 36-12 38 0-4-5-12-7-19-7s-15 2-19 7z" fill="#1e293b"/><rect x="52" y="56" width="16" height="10" rx="4" fill="#e0ac69"/><path d="M22 120c3-30 20-48 38-48s35 18 38 48z" fill="${primary}" stroke="#ffffff" stroke-width="2" stroke-opacity="0.35"/><path d="M48 64l12 12 12-12" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/><text x="60" y="106" text-anchor="middle" fill="#ffffff" font-family="monospace" font-weight="900" font-size="22">#${player.shirtNumber}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  private mapEspnEventToMatch(
    ev: Record<string, unknown>,
    competitionSlug: string,
    competitionName: string,
    competitionShortName: string,
  ): Match | null {
    const competitions = ev.competitions as
      | Array<Record<string, unknown>>
      | undefined;
    const comp = competitions?.[0];
    if (!comp) return null;

    const competitors = comp.competitors as
      | Array<Record<string, unknown>>
      | undefined;
    if (!competitors || competitors.length < 2) return null;

    const homeComp =
      competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
    const awayComp =
      competitors.find((c) => c.homeAway === 'away') ?? competitors[1];

    const homeTeamRaw = (homeComp.team ?? {}) as {
      id?: string;
      displayName?: string;
      shortDisplayName?: string;
      abbreviation?: string;
      color?: string;
      alternateColor?: string;
      logo?: string;
      logos?: Array<{ href?: string }>;
    };
    const awayTeamRaw = (awayComp.team ?? {}) as {
      id?: string;
      displayName?: string;
      shortDisplayName?: string;
      abbreviation?: string;
      color?: string;
      alternateColor?: string;
      logo?: string;
      logos?: Array<{ href?: string }>;
    };

    const homeMeta = this.resolveClubMeta(
      homeTeamRaw.displayName ?? 'Local',
      homeTeamRaw,
    );
    const awayMeta = this.resolveClubMeta(
      awayTeamRaw.displayName ?? 'Visitante',
      awayTeamRaw,
    );

    const statusObj = (ev.status ?? comp.status ?? {}) as {
      displayClock?: string;
      type?: { state?: string; name?: string; completed?: boolean };
    };
    const state = statusObj.type?.state ?? 'pre';
    const status: MatchStatus =
      state === 'in'
        ? MatchStatus.LIVE
        : state === 'post' || statusObj.type?.completed
          ? MatchStatus.FINISHED
          : MatchStatus.UPCOMING;

    const rawDateStr = String(ev.date ?? new Date().toISOString());
    const dateObj = new Date(rawDateStr);
    const dateIso = rawDateStr.slice(0, 10);

    const madridTime = new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(dateObj);

    const readScore = (raw: unknown): number => {
      const candidate =
        raw && typeof raw === 'object'
          ? ((raw as { displayValue?: string; value?: number }).displayValue ??
            (raw as { value?: number }).value)
          : raw;
      const parsed = parseInt(String(candidate ?? '0'), 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    };
    const homeScore =
      status === MatchStatus.UPCOMING ? null : readScore(homeComp.score);
    const awayScore =
      status === MatchStatus.UPCOMING ? null : readScore(awayComp.score);

    const venueObj = (comp.venue ?? {}) as {
      fullName?: string;
      address?: { city?: string };
    };
    const stadium = venueObj.fullName || homeMeta.stadium;
    const city = venueObj.address?.city || homeMeta.city;

    // Extract real match events (goals, yellow cards, red cards)
    const details = (comp.details ?? []) as Array<{
      clock?: { displayValue?: string; value?: number };
      team?: { id?: string };
      scoringPlay?: boolean;
      yellowCard?: boolean;
      redCard?: boolean;
      penaltyKick?: boolean;
      ownGoal?: boolean;
      athletesInvolved?: Array<{ displayName?: string }>;
    }>;

    const events: MatchEvent[] = details
      .map((d, idx): MatchEvent | null => {
        const minuteStr = d.clock?.displayValue ?? '0';
        const minute =
          parseInt(minuteStr.replace(/[^0-9]/g, ''), 10) ||
          Math.round((d.clock?.value ?? 60) / 60);
        const teamSide: 'HOME' | 'AWAY' =
          d.team?.id === homeTeamRaw.id ? 'HOME' : 'AWAY';
        const primaryAthlete =
          d.athletesInvolved?.[0]?.displayName ?? 'Jugador';
        const secondaryAthlete = d.athletesInvolved?.[1]?.displayName;

        if (d.scoringPlay) {
          return {
            id: `ev-${ev.id}-${idx}`,
            minute,
            teamSide,
            type: 'GOAL',
            playerName: primaryAthlete,
            playerSlug: Slug.create(primaryAthlete).toString(),
            assistOrReplacedBy: secondaryAthlete,
            detail: d.penaltyKick
              ? 'Gol de penalti'
              : d.ownGoal
                ? 'Gol en propia puerta'
                : 'Gol oficial del acta',
          };
        }
        if (d.redCard) {
          return {
            id: `ev-${ev.id}-${idx}`,
            minute,
            teamSide,
            type: 'RED_CARD',
            playerName: primaryAthlete,
            detail: 'Tarjeta roja registrada en acta',
          };
        }
        if (d.yellowCard) {
          return {
            id: `ev-${ev.id}-${idx}`,
            minute,
            teamSide,
            type: 'YELLOW_CARD',
            playerName: primaryAthlete,
            detail: 'Amonestación oficial',
          };
        }
        return null;
      })
      .filter((item): item is MatchEvent => item !== null)
      .sort((a, b) => a.minute - b.minute);

    // Extract real match statistics
    const readStat = (
      compEntry: Record<string, unknown>,
      statName: string,
      fallbackVal: number,
    ): number => {
      const statsArr = (compEntry.statistics ?? []) as Array<{
        name?: string;
        displayValue?: string;
      }>;
      const found = statsArr.find((s) => s.name === statName);
      if (!found?.displayValue) return fallbackVal;
      const parsed = parseFloat(found.displayValue);
      return Number.isNaN(parsed) ? fallbackVal : parsed;
    };

    const homePoss = Math.round(readStat(homeComp, 'possessionPct', 50));
    const awayPoss = 100 - homePoss;
    const homeShots = Math.round(readStat(homeComp, 'totalShots', 0));
    const awayShots = Math.round(readStat(awayComp, 'totalShots', 0));
    const homeSot = Math.round(readStat(homeComp, 'shotsOnTarget', 0));
    const awaySot = Math.round(readStat(awayComp, 'shotsOnTarget', 0));
    const homeCorners = Math.round(readStat(homeComp, 'wonCorners', 0));
    const awayCorners = Math.round(readStat(awayComp, 'wonCorners', 0));
    const homeFouls = Math.round(readStat(homeComp, 'foulsCommitted', 0));
    const awayFouls = Math.round(readStat(awayComp, 'foulsCommitted', 0));

    const homeXg = Number(
      Math.max(
        (homeScore ?? 0) * 0.45,
        homeSot * 0.28 + (homeShots - homeSot) * 0.06,
      ).toFixed(2),
    );
    const awayXg = Number(
      Math.max(
        (awayScore ?? 0) * 0.45,
        awaySot * 0.28 + (awayShots - awaySot) * 0.06,
      ).toFixed(2),
    );

    const matchSlug = Slug.create(
      `${homeMeta.shortName}-${awayMeta.shortName}`,
    ).toString();

    const matchday =
      this.cachedStandings.get(competitionSlug)?.data.matchday ?? 10;

    const scorersText = events
      .filter((e) => e.type === 'GOAL')
      .map((e) => `${e.playerName} (${e.minute}')`)
      .join(', ');

    const aiSummaryTitle =
      status === MatchStatus.FINISHED
        ? `Resultado oficial en ${stadium}: ${homeMeta.shortName} ${homeScore} - ${awayScore} ${awayMeta.shortName}`
        : status === MatchStatus.LIVE
          ? `En directo en ${stadium}: ${homeMeta.shortName} ${homeScore} - ${awayScore} ${awayMeta.shortName}`
          : `Previa oficial: ${homeMeta.officialName} recibe al ${awayMeta.officialName} en ${stadium}`;

    const aiSummaryText =
      status === MatchStatus.UPCOMING
        ? `Duelo oficial de ${competitionName} programado en ${stadium} (${city}) a las ${madridTime}h.`
        : `Encuentro oficial de ${competitionName} disputado en ${stadium} (${city}) con marcador ${homeScore}-${awayScore}${
            scorersText ? `. Goleadores en acta: ${scorersText}` : ''
          }. Posesión registrada: ${homePoss}% vs ${awayPoss}% y ${homeShots}-${awayShots} en remates totales.`;

    const homeLogoUrl =
      homeTeamRaw.logo ||
      homeTeamRaw.logos?.[0]?.href ||
      this.resolveClubLogoBySlug(homeMeta.slug) ||
      (homeTeamRaw.id
        ? `https://a.espncdn.com/i/teamlogos/soccer/500/${homeTeamRaw.id}.png`
        : undefined);

    const awayLogoUrl =
      awayTeamRaw.logo ||
      awayTeamRaw.logos?.[0]?.href ||
      this.resolveClubLogoBySlug(awayMeta.slug) ||
      (awayTeamRaw.id
        ? `https://a.espncdn.com/i/teamlogos/soccer/500/${awayTeamRaw.id}.png`
        : undefined);

    return {
      id: `espn-${ev.id}`,
      slug: matchSlug,
      competitionSlug,
      competitionName,
      competitionShortName,
      matchday,
      roundLabel: `Jornada ${matchday}`,
      dateIso,
      kickoffTime: madridTime,
      status,
      liveMinute:
        status === MatchStatus.LIVE
          ? parseInt(
              (statusObj.displayClock ?? '45').replace(/[^0-9]/g, ''),
              10,
            ) || 45
          : undefined,
      stadium,
      city,
      referee: 'Comité Técnico de Árbitros RFEF',
      attendance: Number(comp.attendance ?? 0) || undefined,
      broadcastChannel:
        competitionSlug === 'laliga-ea-sports'
          ? 'Movistar LaLiga / DAZN'
          : competitionSlug === 'laliga-hypermotion'
            ? 'LaLiga TV Hypermotion'
            : 'RFEF TV / Teledeporte',
      homeTeam: {
        slug: homeMeta.slug,
        name: homeMeta.officialName,
        shortName: homeMeta.shortName,
        code: homeMeta.code,
        primaryColor: homeMeta.primaryColor,
        secondaryColor: homeMeta.secondaryColor,
        logoUrl: homeLogoUrl,
        score: homeScore,
      },
      awayTeam: {
        slug: awayMeta.slug,
        name: awayMeta.officialName,
        shortName: awayMeta.shortName,
        code: awayMeta.code,
        primaryColor: awayMeta.primaryColor,
        secondaryColor: awayMeta.secondaryColor,
        logoUrl: awayLogoUrl,
        score: awayScore,
      },
      events,
      statistics:
        status !== MatchStatus.UPCOMING && (homeShots > 0 || awayShots > 0)
          ? {
              possession: [homePoss, awayPoss],
              shots: [homeShots, awayShots],
              shotsOnTarget: [homeSot, awaySot],
              corners: [homeCorners, awayCorners],
              fouls: [homeFouls, awayFouls],
              yellowCards: [
                events.filter(
                  (e) => e.teamSide === 'HOME' && e.type === 'YELLOW_CARD',
                ).length,
                events.filter(
                  (e) => e.teamSide === 'AWAY' && e.type === 'YELLOW_CARD',
                ).length,
              ],
              redCards: [
                events.filter(
                  (e) => e.teamSide === 'HOME' && e.type === 'RED_CARD',
                ).length,
                events.filter(
                  (e) => e.teamSide === 'AWAY' && e.type === 'RED_CARD',
                ).length,
              ],
              expectedGoals: [homeXg, awayXg],
            }
          : undefined,
      aiSummaryTitle,
      aiSummaryText,
      isFeatured:
        competitionSlug === 'laliga-ea-sports' ||
        homeMeta.slug === 'racing-de-santander' ||
        awayMeta.slug === 'racing-de-santander',
    };
  }

  private mapEspnRosterToLineup(
    rosterData: {
      formation?: string;
      roster?: Array<{
        starter?: boolean;
        jersey?: string;
        athlete?: { displayName?: string };
        position?: { abbreviation?: string };
      }>;
    },
    teamSlug: string,
  ): MatchTeamLineup | undefined {
    const entries = rosterData.roster ?? [];
    if (entries.length === 0) return undefined;

    const mapPlayer = (p: (typeof entries)[number]): LineupPlayer => {
      const name = p.athlete?.displayName ?? 'Jugador';
      const pos = this.mapAthletePosition(p.position?.abbreviation);
      return {
        number: parseInt(p.jersey ?? '0', 10) || 1,
        name,
        slug: Slug.create(name).toString(),
        position: pos.positionCode,
      };
    };

    const startingXI = entries.filter((e) => e.starter).map(mapPlayer);
    const substitutes = entries
      .filter((e) => !e.starter)
      .slice(0, 9)
      .map(mapPlayer);

    if (startingXI.length === 0) return undefined;

    const clubCoach =
      Array.from(Object.values(SPANISH_CLUB_METADATA)).find(
        (m) => m.slug === teamSlug,
      )?.coach ?? 'Entrenador Oficial';

    return {
      formation: rosterData.formation || '4-3-3',
      coach: clubCoach,
      startingXI,
      substitutes,
    };
  }

  private resolveClubMeta(
    displayName: string,
    rawTeam?: {
      shortDisplayName?: string;
      abbreviation?: string;
      color?: string;
      alternateColor?: string;
    },
  ): ClubStaticMetadata {
    const cleanKey = displayName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    if (cleanKey === 'spain' || cleanKey === 'espana') {
      return {
        slug: 'seleccion-espanola',
        officialName: 'Selección Española',
        shortName: 'España',
        code: 'ESP',
        city: 'Madrid / Sevilla',
        autonomousCommunity: 'España',
        stadium: 'Estadio de La Cartuja',
        capacity: 60000,
        founded: 1920,
        coach: 'Luis de la Fuente',
        primaryColor: '#dc2626',
        secondaryColor: '#facc15',
      };
    }

    if (SPANISH_CLUB_METADATA[cleanKey]) {
      return SPANISH_CLUB_METADATA[cleanKey];
    }

    const isReserveTeam = /\b(ii|b|fortuna|castilla|atletic|promesas)\b/.test(
      cleanKey,
    );
    if (!isReserveTeam) {
      for (const [k, meta] of Object.entries(SPANISH_CLUB_METADATA)) {
        if (cleanKey.includes(k) || k.includes(cleanKey)) {
          return meta;
        }
      }
    }

    const slug = Slug.create(displayName).toString();
    const primary = rawTeam?.color ? `#${rawTeam.color}` : '#10b981';
    const secondary = rawTeam?.alternateColor
      ? `#${rawTeam.alternateColor}`
      : '#1e293b';

    return {
      slug,
      officialName: displayName,
      shortName: rawTeam?.shortDisplayName || displayName,
      code:
        rawTeam?.abbreviation ||
        displayName.slice(0, 3).toUpperCase(),
      city: displayName.replace(/^(Real|CD|UD|SD|RC|CF|FC)\s+/i, ''),
      autonomousCommunity: 'España',
      stadium: `Estadio Municipal de ${displayName}`,
      capacity: 18500,
      founded: 1925,
      coach: 'Cuerpo Técnico Oficial',
      primaryColor: primary,
      secondaryColor: secondary,
    };
  }

  private computeQualificationZone(
    competitionSlug: string,
    position: number,
    totalTeams: number,
  ): { zone: QualificationZone; zoneLabel?: string } {
    if (competitionSlug === 'laliga-ea-sports') {
      if (position <= 4) {
        return { zone: 'CHAMPIONS_LEAGUE', zoneLabel: 'Champions League' };
      }
      if (position === 5) {
        return { zone: 'EUROPA_LEAGUE', zoneLabel: 'Europa League' };
      }
      if (position === 6) {
        return { zone: 'CONFERENCE_LEAGUE', zoneLabel: 'Conference League' };
      }
      if (position > totalTeams - 3) {
        return { zone: 'RELEGATION', zoneLabel: 'Descenso' };
      }
      return { zone: 'NONE' };
    }

    if (position <= 2) {
      return { zone: 'DIRECT_PROMOTION', zoneLabel: 'Ascenso Directo' };
    }
    if (position <= 6) {
      return { zone: 'PROMOTION_PLAYOFF', zoneLabel: 'Playoff Ascenso' };
    }
    if (position > totalTeams - 4) {
      return { zone: 'RELEGATION', zoneLabel: 'Descenso' };
    }
    return { zone: 'NONE' };
  }

  private deriveFormFromRecord(
    won: number,
    drawn: number,
    lost: number,
  ): FormResult[] {
    const total = Math.max(1, won + drawn + lost);
    const winRatio = won / total;
    const drawRatio = drawn / total;
    const form: FormResult[] = [];
    const seeds = [0.15, 0.55, 0.35, 0.75, 0.25];
    for (const s of seeds) {
      if (s <= winRatio) {
        form.push('W');
      } else if (s <= winRatio + drawRatio) {
        form.push('D');
      } else {
        form.push('L');
      }
    }
    return form;
  }

  private mapAthletePosition(abbr?: string): {
    position: Player['position'];
    positionCode: Player['positionCode'];
  } {
    const clean = (abbr || 'M').toUpperCase();
    if (clean === 'G' || clean === 'GK') {
      return { position: 'Portero', positionCode: 'POR' };
    }
    if (clean.includes('D') || clean === 'CB' || clean === 'LB' || clean === 'RB') {
      return { position: 'Defensa', positionCode: 'DEF' };
    }
    if (clean.includes('F') || clean === 'ST' || clean === 'CF' || clean === 'LW' || clean === 'RW') {
      return { position: 'Delantero', positionCode: 'DEL' };
    }
    return { position: 'Centrocampista', positionCode: 'MED' };
  }

  private translateCountryToSpanish(country: string): string {
    const map: Record<string, string> = {
      Spain: 'España',
      France: 'Francia',
      Brazil: 'Brasil',
      Argentina: 'Argentina',
      Uruguay: 'Uruguay',
      Poland: 'Polonia',
      Germany: 'Alemania',
      England: 'Inglaterra',
      Portugal: 'Portugal',
      Croatia: 'Croacia',
      Morocco: 'Marruecos',
      Netherlands: 'Países Bajos',
      Belgium: 'Bélgica',
      Norway: 'Noruega',
      Slovenia: 'Eslovenia',
      Switzerland: 'Suiza',
      Nigeria: 'Nigeria',
      Senegal: 'Senegal',
      Ghana: 'Ghana',
      Colombia: 'Colombia',
    };
    return map[country] || country;
  }

  private addDaysIso(baseIso: string, daysOffset: number): string {
    const [y, m, d] = baseIso.split('-').map((n) => parseInt(n, 10));
    const date = new Date(Date.UTC(y, m - 1, d + daysOffset));
    return date.toISOString().slice(0, 10);
  }
}
