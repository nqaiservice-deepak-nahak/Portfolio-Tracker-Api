import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('NetWorth')
@Controller('net-worth')
export class NetWorthController {}
