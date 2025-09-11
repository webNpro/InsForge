import type { UserSchema } from '@insforge/shared-schemas';

export interface User extends UserSchema {
  provider_type: string;
  identities: {
    provider: string;
  }[];
}
