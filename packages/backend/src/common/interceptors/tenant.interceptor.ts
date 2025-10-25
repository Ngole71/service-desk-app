import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Extract tenant from subdomain or header
    const host = request.headers.host;
    const tenantHeader = request.headers['x-tenant-id'];

    if (tenantHeader) {
      request.tenantId = tenantHeader;
    } else if (host) {
      // Extract subdomain from host (e.g., tenant1.example.com -> tenant1)
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') {
        request.subdomain = subdomain;
      }
    }

    // Tenant will be resolved from user object after authentication
    // or from the subdomain/header

    return next.handle();
  }
}
