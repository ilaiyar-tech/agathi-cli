// plugins/dirty2clean/src/repository/workshop.repository.ts
import { Repository } from '@common/infrastructure/repositories/base-repository';
import { WorkshopProfile, WorkshopZones } from './models';

export class WorkshopRepository extends Repository<WorkshopProfile, WorkshopZones> {
  // workshop-specific repository methods here...
}
