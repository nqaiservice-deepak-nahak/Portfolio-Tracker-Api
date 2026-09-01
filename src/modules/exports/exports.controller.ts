import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Exports')
@Controller('exports')
export class ExportsController {}
