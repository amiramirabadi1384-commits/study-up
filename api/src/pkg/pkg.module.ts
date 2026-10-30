import { Module } from '@nestjs/common';
import { PkgService } from './pkg.service.js';
import { AdminPkgController } from './controllers/admin-pkg.controller.js';
import { PublicPkgController } from './controllers/public-pkg.controller.js';
import { UserPkgController } from './controllers/user-pkg.controller.js';

@Module({
  controllers: [AdminPkgController, PublicPkgController, UserPkgController],
  providers: [PkgService],
})
export class PkgModule {}
