import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type NetworkStatusCallback = (isOnline: boolean, state: NetInfoState) => void;

class NetworkService {
  private isOnline: boolean = true;
  private listeners: Set<NetworkStatusCallback> = new Set();
  private unsubscribe: (() => void) | null = null;

  public init() {
    if (this.unsubscribe) return;

    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      const changed = this.isOnline !== online;
      this.isOnline = online;

      this.listeners.forEach((callback) => callback(online, state));

      if (changed && online) {
        console.log('[NETWORK] Connection restored. Triggering sync...');
      }
    });

    NetInfo.fetch().then((state) => {
      this.isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
    });
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }

  public async checkConnection(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
    return this.isOnline;
  }

  public subscribe(callback: NetworkStatusCallback): () => void {
    this.listeners.add(callback);
    callback(this.isOnline, {} as NetInfoState);

    return () => {
      this.listeners.delete(callback);
    };
  }

  public destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
  }
}

export const networkService = new NetworkService();
