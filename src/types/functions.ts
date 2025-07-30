export interface EdgeFunction {
  id: string;
  slug: string;
  name: string;
  description?: string;
  code: string;
  status: 'draft' | 'active' | 'error';
  created_at: string;
  updated_at: string;
  deployed_at?: string;
  created_by?: string;
}

export interface CreateFunctionRequest {
  name: string;
  slug?: string;
  code: string;
  description?: string;
  status?: 'draft' | 'active';
}

export interface UpdateFunctionRequest {
  name?: string;
  code?: string;
  description?: string;
  status?: 'draft' | 'active' | 'error';
}