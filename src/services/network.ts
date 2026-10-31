/**
 * Network Listener Service
 * 
 * Maqsad:
 * Internet connection ki har tabdeeli par nazar rakhna.
 * Jaise hi user Airplane Mode off karega ya 2G network restore hoga,
 * yeh service foran Queue Manager ko signal bhejegi ke "Internet aa gaya, pending reports bhejo!".
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type NetworkStatusCallback = (isOnline: boolean, state: NetInfoState) => void;

class NetworkService {
  private isOnline: boolean = true;
  private listeners: Set<NetworkStatusCallback> = new Set();
  private unsubscribe: (() => void) | null = null;

  /**
   * Network listener start karna
   */
  public init() {
    if (this.unsubscribe) return;

    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      // isConnected = phone kisi network se jura hai ya nahi
      // isInternetReachable = kya waqai internet chal raha hai ya sirf local wifi hai
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      const changed = this.isOnline !== online;
      this.isOnline = online;

      console.log(`[NETWORK] Connection state: ${state.type}, Online: ${online}`);

      // Subscribed components aur queue ko update notify karein
      this.listeners.forEach((callback) => callback(online, state));

      if (changed && online) {
        console.log('[NETWORK] Internet restored! Triggering auto-sync...');
      }
    });

    // Pehli baar status check karein
    NetInfo.fetch().then((state) => {
      this.isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
    });
  }

  /**
   * Current online status maloom karna
   */
  public getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Fresh status fetch karna
   */
  public async checkConnection(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
    return this.isOnline;
  }

  /**
   * Components / Services ko subscribe karne ka tareeqa
   */
  public subscribe(callback: NetworkStatusCallback): () => void {
    this.listeners.add(callback);
    // Foran current status provide karein
    callback(this.isOnline, {} as NetInfoState);

    // Unsubscribe function return karein
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Cleanup
   */
  public destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
  }
}

export const networkService = new NetworkService();

