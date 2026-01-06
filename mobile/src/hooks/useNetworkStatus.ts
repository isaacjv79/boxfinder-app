import {useState, useEffect} from 'react';
import {networkStatus} from '../services/networkStatus';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(
    networkStatus.getIsConnected(),
  );

  useEffect(() => {
    const unsubscribe = networkStatus.addListener(connected => {
      setIsConnected(connected);
    });

    return unsubscribe;
  }, []);

  return {
    isConnected,
    isOffline: !isConnected,
  };
}
