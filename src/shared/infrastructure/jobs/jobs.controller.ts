import { BadRequestException, Controller, Get, Param, Post } from '@nestjs/common';
import {
  FootballJobsScheduler,
  JobExecutionLog,
  JobIdentifier,
  SystemObservabilitySnapshot,
} from './football-jobs.scheduler';

const VALID_JOBS: JobIdentifier[] = [
  'live-matches',
  'post-match-ai',
  'standings-round',
  'news-timeline',
  'cache-cleanup',
];

@Controller('jobs')
export class JobsController {
  constructor(private readonly scheduler: FootballJobsScheduler) {}

  @Get('status')
  async getStatus(): Promise<SystemObservabilitySnapshot> {
    return this.scheduler.getObservabilitySnapshot();
  }

  @Post('run/:jobName')
  async runJob(@Param('jobName') jobName: string): Promise<JobExecutionLog> {
    if (!VALID_JOBS.includes(jobName as JobIdentifier)) {
      throw new BadRequestException(
        `Job '${jobName}' no válido. Opciones permitidas: ${VALID_JOBS.join(', ')}`,
      );
    }
    return this.scheduler.runJobByName(jobName as JobIdentifier);
  }
}
