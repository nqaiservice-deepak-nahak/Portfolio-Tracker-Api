import { Injectable } from '@nestjs/common';
import { ExportsAbstract } from './exports.abstract';

@Injectable()
export class ExportsService extends ExportsAbstract {}
