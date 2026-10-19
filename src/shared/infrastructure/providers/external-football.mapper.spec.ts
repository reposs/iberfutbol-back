import {
  ExternalFootballMapper,
  ExternalMatchDto,
} from './external-football.mapper';
import { MatchStatus } from '../../../modules/matches/domain/match.entity';
import { Slug } from '../../domain/value-objects/slug.vo';

describe('ExternalFootballMapper & Slug Value Object', () => {
  it('should normalize Spanish accents and special characters into SEO slugs', () => {
    const slug = Slug.create('Atlético de Madrid & Real Betis (Jornada 10)');
    expect(slug.toString()).toBe('atletico-de-madrid-real-betis-jornada-10');
  });

  it('should map ExternalMatchDto into normalized Domain Match entity', () => {
    const rawDto: ExternalMatchDto = {
      externalId: 9012,
      competitionCode: 'PD',
      competitionName: 'LaLiga EA Sports',
      competitionShortName: 'LaLiga',
      matchday: 10,
      utcDate: '2026-10-18T19:00:00Z',
      status: 'IN_PLAY',
      minute: 68,
      venue: 'Spotify Camp Nou',
      city: 'Barcelona',
      refereeName: 'Ricardo de Burgos Bengoetxea',
      homeTeam: {
        name: 'FC Barcelona',
        shortName: 'Barcelona',
        tla: 'BAR',
        primaryColor: '#a50044',
        secondaryColor: '#004d98',
        goals: 2,
      },
      awayTeam: {
        name: 'Sevilla FC',
        shortName: 'Sevilla',
        tla: 'SEV',
        primaryColor: '#dc2626',
        secondaryColor: '#ffffff',
        goals: 1,
      },
    };

    const domainMatch = ExternalFootballMapper.toDomainMatch(rawDto);

    expect(domainMatch.slug).toBe('barcelona-sevilla-j10');
    expect(domainMatch.status).toBe(MatchStatus.LIVE);
    expect(domainMatch.liveMinute).toBe(68);
    expect(domainMatch.homeTeam.score).toBe(2);
    expect(domainMatch.awayTeam.score).toBe(1);
    expect(domainMatch.competitionSlug).toBe('laliga-ea-sports');
  });
});
