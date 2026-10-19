import { Module } from '@nestjs/common';
import { AI_CONTENT_GENERATOR } from './domain/ai-content-generator.port';
import {
  MatchContextBuilder,
  PlayerContextBuilder,
  RoundContextBuilder,
  TeamContextBuilder,
} from './application/context-builders';
import { AiOutputValidator } from './application/ai-output.validator';
import {
  ConfigurableAiGeneratorAdapter,
  PromptLoaderService,
  StructuredDataAiAdapter,
} from './infrastructure/ai-providers.adapter';

@Module({
  providers: [
    PromptLoaderService,
    StructuredDataAiAdapter,
    ConfigurableAiGeneratorAdapter,
    MatchContextBuilder,
    RoundContextBuilder,
    TeamContextBuilder,
    PlayerContextBuilder,
    AiOutputValidator,
    {
      provide: AI_CONTENT_GENERATOR,
      useExisting: ConfigurableAiGeneratorAdapter,
    },
  ],
  exports: [
    AI_CONTENT_GENERATOR,
    PromptLoaderService,
    MatchContextBuilder,
    RoundContextBuilder,
    TeamContextBuilder,
    PlayerContextBuilder,
    AiOutputValidator,
  ],
})
export class AiModule {}
