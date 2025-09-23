// OAuth provider data from external providers
export interface OAuthIdentityData {
  sub?: string; // Subject identifier from provider
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  [key: string]: string | boolean | number | undefined;
}

// Auth database record
export interface AuthRecord {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

// Identity record for OAuth providers
export interface IdentifiesRecord {
  auth_id: string;
  provider?: string;
  provider_id?: string;
  identity_data?: OAuthIdentityData;
  email?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// Superuser auth record
export interface SuperUserAuthRecord {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

// Superuser profile record
export interface SuperUserProfileRecord {
  id: string;
  auth_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
