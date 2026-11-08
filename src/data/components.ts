import type { ComponentType } from '../types';

export interface ComponentDef {
  kind: ComponentType;
  label: string;
  group: 'Clients & Edge' | 'Compute' | 'Storage' | 'Messaging' | 'Other';
  color: string; // tailwind-free hex so it works in both themes
  icon: string; // svg path data, 24x24, stroke icons
}

export const COMPONENTS: ComponentDef[] = [
  { kind: 'client', label: 'Web Client', group: 'Clients & Edge', color: '#64748b', icon: 'M3 5h18v11H3zM8 20h8M12 16v4' },
  { kind: 'mobile', label: 'Mobile App', group: 'Clients & Edge', color: '#64748b', icon: 'M7 2h10v20H7zM11 18h2' },
  { kind: 'dns', label: 'DNS', group: 'Clients & Edge', color: '#0891b2', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18' },
  { kind: 'cdn', label: 'CDN', group: 'Clients & Edge', color: '#0891b2', icon: 'M6 18a4 4 0 0 1 0-8 6 6 0 0 1 11.5-1.5A4.5 4.5 0 0 1 18 18z' },
  { kind: 'lb', label: 'Load Balancer', group: 'Clients & Edge', color: '#7c3aed', icon: 'M12 3v6M12 9l-7 6M12 9l7 6M12 9v6M3 15h4v5H3zM10 15h4v5h-4zM17 15h4v5h-4z' },
  { kind: 'gateway', label: 'API Gateway', group: 'Clients & Edge', color: '#7c3aed', icon: 'M4 4h16v16H4zM4 12h16M12 4v16' },
  { kind: 'service', label: 'Service', group: 'Compute', color: '#2563eb', icon: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01' },
  { kind: 'worker', label: 'Worker', group: 'Compute', color: '#2563eb', icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2' },
  { kind: 'cache', label: 'Cache', group: 'Storage', color: '#dc2626', icon: 'M13 2L4 14h7l-1 8 9-12h-7z' },
  { kind: 'sql', label: 'SQL Database', group: 'Storage', color: '#16a34a', icon: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3' },
  { kind: 'nosql', label: 'NoSQL Database', group: 'Storage', color: '#16a34a', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
  { kind: 'blob', label: 'Object Storage', group: 'Storage', color: '#ca8a04', icon: 'M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10' },
  { kind: 'search', label: 'Search Index', group: 'Storage', color: '#ca8a04', icon: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5' },
  { kind: 'warehouse', label: 'Data Warehouse', group: 'Storage', color: '#ca8a04', icon: 'M3 21V9l9-6 9 6v12zM8 21v-6h8v6' },
  { kind: 'queue', label: 'Message Queue', group: 'Messaging', color: '#ea580c', icon: 'M3 8h18v8H3zM8 8v8M13 8v8M18 8v8' },
  { kind: 'pubsub', label: 'Pub/Sub / Stream', group: 'Messaging', color: '#ea580c', icon: 'M5 12h4M15 12h4M12 5v4M12 15v4M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' },
  { kind: 'coordinator', label: 'Coordination', group: 'Other', color: '#475569', icon: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5' },
  { kind: 'external', label: 'External API', group: 'Other', color: '#475569', icon: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6' },
  { kind: 'note', label: 'Text Note', group: 'Other', color: '#a3a3a3', icon: 'M5 4h14v16H5zM8 9h8M8 13h8M8 17h5' },
];

export const COMPONENT_BY_KIND = Object.fromEntries(COMPONENTS.map((c) => [c.kind, c])) as Record<ComponentType, ComponentDef>;

export const COMPONENT_GROUPS = ['Clients & Edge', 'Compute', 'Storage', 'Messaging', 'Other'] as const;
