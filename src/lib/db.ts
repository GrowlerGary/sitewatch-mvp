import { Website, MonitorLog } from './types';

// In-memory storage for serverless environment
let websites: Website[] = [];
let logs: MonitorLog[] = [];

export function getAllWebsites(): Website[] {
  return websites;
}

export function getWebsiteById(id: string): Website | null {
  return websites.find(site => site.id === id) || null;
}

export function addWebsite(website: Omit<Website, 'id' | 'createdAt'>): Website {
  const newSite: Website = {
    ...website,
    id: Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
  };
  websites.push(newSite);
  return newSite;
}

export function updateWebsite(id: string, updates: Partial<Website>): Website | null {
  const index = websites.findIndex(site => site.id === id);
  if (index === -1) return null;
  
  websites[index] = { ...websites[index], ...updates };
  return websites[index];
}

export function deleteWebsite(id: string): boolean {
  const initialLength = websites.length;
  websites = websites.filter(site => site.id !== id);
  return websites.length < initialLength;
}

export function addMonitorLog(log: Omit<MonitorLog, 'id'>): MonitorLog {
  const newLog: MonitorLog = {
    ...log,
    id: Math.random().toString(36).substring(2, 9),
  };
  logs.push(newLog);
  
  // Keep only last 1000 logs
  if (logs.length > 1000) {
    logs.shift();
  }
  
  return newLog;
}

export function getAllLogs(): MonitorLog[] {
  return logs;
}

export function getLogsForWebsite(websiteId: string): MonitorLog[] {
  return logs.filter(log => log.websiteId === websiteId).slice(-50);
}
