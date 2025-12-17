import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Expect tenantId to be set either by auth payload or by path param resolution
    return request.tenantId as string | undefined;
  },
);


