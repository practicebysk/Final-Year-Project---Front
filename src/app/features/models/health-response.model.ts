export interface HealthResponse {
  success: boolean;
  status: string;
  database: string;
  uptime: number;
  timestamp: string;
}