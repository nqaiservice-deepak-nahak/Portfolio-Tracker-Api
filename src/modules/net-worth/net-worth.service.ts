import { Injectable } from '@nestjs/common';
import { NetWorthAbstract } from './net-worth.abstract';

@Injectable()
export class NetWorthService extends NetWorthAbstract {}
