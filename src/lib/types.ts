export interface Website {
  id: string;
  url: string;
  name: string;
  status: 'up' | 'down' | 'unknown';
  lastChecked: string | null;
  sslExpiryDate: string | null;
  sslDaysRemaining: number | null;
  responseTime: number | null;
  lastError: string | null;
  createdAt: string;
}

export interface MonitorLog {
  id: string;
  websiteId: string;
  status: 'up' | 'down';
  responseTime: number | null;
  error: string | null;
  sslDaysRemaining: number | null;
  checkedAt: string;
}
