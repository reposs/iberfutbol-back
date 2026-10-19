import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetStandingsUseCase } from '../application/get-standings.use-case';
import { StandingTable } from '../domain/standing.entity';

@ApiTags('Standings')
@Controller('standings')
export class StandingsController {
  constructor(private readonly getStandingsUseCase: GetStandingsUseCase) {}

  @Get(':competition')
  @ApiOperation({
    summary:
      'Obtener tabla de clasificación con zonas (Champions, Europa, Ascenso, Playoff, Descenso)',
  })
  async getByCompetition(
    @Param('competition') competition: string,
  ): Promise<StandingTable> {
    return this.getStandingsUseCase.execute(competition);
  }
}
