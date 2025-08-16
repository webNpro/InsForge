export interface McpUsageRecord {
  id?: string;
  tool_name: string;
  call_count: number;
  date: string;
}

export interface McpUsageSummary {
  total_calls: number;
  start_date: string;
  end_date: string;
  tools: {
    tool_name: string;
    count: number;
  }[];
}