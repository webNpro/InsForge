import { apiClient } from '@/lib/api/client';

export interface StoredFile {
  bucket: string;
  key: string;
  size: number;
  mime_type?: string;
  uploaded_at: string;
  url: string;
}

export interface ListObjectsResponse {
  bucket: string;
  prefix?: string;
  objects: StoredFile[];
}

export interface ListObjectsParams {
  prefix?: string;
  limit?: number;
  offset?: number;
}

export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
}

export const storageService = {
  // List all buckets
  async listBuckets(): Promise<Array<{ name: string; public: boolean; created_at?: string }>> {
    const response = await apiClient.request('/storage/buckets', {
      headers: apiClient.withApiKey(),
    });
    // Traditional REST: API returns array directly
    return response;
  },

  // List objects in a bucket
  async listObjects(
    bucket: string,
    params?: ListObjectsParams,
    searchQuery?: string
  ): Promise<{ data: ListObjectsResponse; meta: { pagination: PaginationMeta } }> {
    const searchParams = new URLSearchParams();
    if (params?.prefix) {
      searchParams.append('prefix', params.prefix);
    }
    if (params?.limit) {
      searchParams.append('limit', params.limit.toString());
    }
    if (params?.offset) {
      searchParams.append('offset', params.offset.toString());
    }
    if (searchQuery && searchQuery.trim()) {
      searchParams.append('search', searchQuery.trim());
    }

    const url = `/storage/${encodeURIComponent(bucket)}${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await apiClient.request(url, {
      headers: apiClient.withApiKey(),
      returnFullResponse: true,
    });

    // Transform the response to match expected format
    // Backend returns: { bucket, objects, pagination, ... }
    // Frontend expects: { data: { objects }, meta: { pagination } }
    return {
      data: {
        bucket: response.bucket,
        objects: response.objects || [],
      },
      meta: {
        pagination: {
          total: parseInt(response.pagination?.total) || 0,
          limit: response.pagination?.limit || 100,
          offset: response.pagination?.offset || 0,
        },
      },
    };
  },

  // Upload a file to bucket
  async uploadFile(bucket: string, key: string, file: File): Promise<StoredFile> {
    const formData = new FormData();
    formData.append('file', file);

    // Use fetch directly for file uploads to avoid Content-Type header issues
    const response = await fetch(
      `/api/storage/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`,
      {
        method: 'PUT',
        headers: {
          'x-api-key': apiClient.getApiKey() || '',
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      // Traditional REST error format
      throw new Error(error.message || error.error || 'Upload failed');
    }

    const result = await response.json();
    // Traditional REST: response returned directly
    return result;
  },

  // Get download URL for a file
  getDownloadUrl(bucket: string, key: string): string {
    return `/api/storage/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`;
  },

  // Download a file (returns blob)
  async downloadFile(bucket: string, key: string): Promise<Blob> {
    const response = await fetch(this.getDownloadUrl(bucket, key), {
      headers: {
        'x-api-key': apiClient.getApiKey() || '',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    return await response.blob();
  },

  // Delete a file
  async deleteFile(bucket: string, key: string): Promise<void> {
    await apiClient.request(`/storage/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: apiClient.withApiKey(),
    });
  },

  // Create a new bucket
  async createBucket(bucket: string, isPublic: boolean = true): Promise<void> {
    await apiClient.request('/storage/buckets', {
      method: 'POST',
      headers: apiClient.withApiKey(),
      body: JSON.stringify({ bucket, public: isPublic }),
    });
  },

  // Delete entire bucket
  async deleteBucket(bucket: string): Promise<void> {
    await apiClient.request(`/storage/${encodeURIComponent(bucket)}`, {
      method: 'DELETE',
      headers: apiClient.withApiKey(),
    });
  },

  // Edit bucket (update visibility or other config)
  async editBucket(bucket: string, config: { public: boolean }): Promise<void> {
    await apiClient.request(`/storage/buckets/${encodeURIComponent(bucket)}`, {
      method: 'PATCH',
      headers: apiClient.withApiKey(),
      body: JSON.stringify(config),
    });
  },
};
