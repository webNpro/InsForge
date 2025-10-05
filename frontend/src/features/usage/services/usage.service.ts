import { apiClient } from '@/lib/api/client';

export interface McpUsageRecord {
  tool_name: string;
  success: boolean;
  created_at: string;
}

export interface McpUsageResponse {
  records: McpUsageRecord[];
}

export class UsageService {
  /**
   * Get MCP usage records
   */
  async getMcpUsage(limit: number = 5, success: boolean = true): Promise<McpUsageRecord[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      success: success.toString(),
    });

    const data = (await apiClient.request(`/usage/mcp?${params.toString()}`, {
      headers: apiClient.withAccessToken(),
    })) as McpUsageResponse;

    return data.records || [];
  }

  /**
   * Check if user has completed onboarding based on MCP usage
   */
  async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const records = await this.getMcpUsage(1, true);
      return records.length > 0;
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      return false;
    }
  }
}

export const usageService = new UsageService();
