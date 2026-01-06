import NetInfo, {NetInfoState} from '@react-native-community/netinfo';

type NetworkStatusListener = (isConnected: boolean) => void;

class NetworkStatusManager {
  private listeners: Set<NetworkStatusListener> = new Set();
  private isConnected: boolean = true;
  private unsubscribe: (() => void) | null = null;

  initialize() {
    if (this.unsubscribe) {
      return;
    }

    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected ?? false;

      // Notify listeners only when status changes
      if (wasConnected !== this.isConnected) {
        this.notifyListeners();
      }
    });

    // Get initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      this.isConnected = state.isConnected ?? false;
      this.notifyListeners();
    });
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      listener(this.isConnected);
    });
  }

  addListener(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current status
    listener(this.isConnected);

    return () => {
      this.listeners.delete(listener);
    };
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  async checkConnection(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isConnected = state.isConnected ?? false;
    return this.isConnected;
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
  }
}

export const networkStatus = new NetworkStatusManager();
