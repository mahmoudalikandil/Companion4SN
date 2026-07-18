export interface ActiveInstanceData {
  url: string;
  token: string;
  table: string | null;
  flowSysId: string | null;
  catItemSysId: string | null;
  catItemName: string | null;
  catItemTable: string | null;
  instanceName?: string;
  username?: string;
  user?: string;
}

declare global {
  interface Window {
    activeInstanceData: ActiveInstanceData | null;
    usTimer?: number;
  }
}
