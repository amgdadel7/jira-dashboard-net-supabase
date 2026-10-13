/**
 * Global, dependency-free toast bus — any component can surface a Jira-style
 * flag notification without prop threading. App listens once and renders them.
 */
export function notify(title: string, desc?: string) {
  window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { title, desc } }));
}

export const TOAST_EVENT = 'nexus-toast';

export interface ToastPayload {
  title: string;
  desc?: string;
}
