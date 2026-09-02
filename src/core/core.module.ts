import { Global, Module } from '@nestjs/common';
import { getProviders, importProviders, exportProviders } from './providers';

@Global()
@Module({
  providers: [...getProviders()],
  imports: [...importProviders()],
  exports: [...exportProviders()],
})
export class CoreModule {}