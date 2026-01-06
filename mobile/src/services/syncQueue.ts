import AsyncStorage from '@react-native-async-storage/async-storage';
import {networkStatus} from './networkStatus';

const SYNC_QUEUE_KEY = '@boxfinder_sync_queue';

export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncEntityType = 'container' | 'item';

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  entity: SyncEntityType;
  entityId: string;
  data: any;
  timestamp: string;
  retries: number;
}

type SyncStatusListener = (pendingCount: number) => void;

class SyncQueue {
  private listeners: Set<SyncStatusListener> = new Set();
  private isSyncing: boolean = false;

  // Generate unique ID for operations
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add operation to queue
  async addToQueue(
    type: SyncOperationType,
    entity: SyncEntityType,
    entityId: string,
    data: any,
  ): Promise<string> {
    const operation: SyncOperation = {
      id: this.generateId(),
      type,
      entity,
      entityId,
      data,
      timestamp: new Date().toISOString(),
      retries: 0,
    };

    const queue = await this.getQueue();

    // Check for duplicate operation on same entity
    const existingIndex = queue.findIndex(
      op => op.entity === entity && op.entityId === entityId,
    );

    if (existingIndex >= 0) {
      // If there's already an operation for this entity, update or replace it
      const existing = queue[existingIndex];

      if (type === 'DELETE') {
        // DELETE supersedes any previous operation
        if (existing.type === 'CREATE') {
          // If we created and then deleted, just remove from queue
          queue.splice(existingIndex, 1);
        } else {
          // Replace UPDATE with DELETE
          queue[existingIndex] = operation;
        }
      } else if (type === 'UPDATE') {
        if (existing.type === 'CREATE') {
          // Keep CREATE but merge the update data
          queue[existingIndex].data = {...existing.data, ...data};
        } else {
          // Merge updates
          queue[existingIndex].data = {...existing.data, ...data};
          queue[existingIndex].timestamp = operation.timestamp;
        }
      }
    } else {
      queue.push(operation);
    }

    await this.saveQueue(queue);
    this.notifyListeners();

    return operation.id;
  }

  // Get all pending operations
  async getQueue(): Promise<SyncOperation[]> {
    try {
      const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  // Save queue to storage
  private async saveQueue(queue: SyncOperation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  // Remove operation from queue
  async removeFromQueue(operationId: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter(op => op.id !== operationId);
    await this.saveQueue(filtered);
    this.notifyListeners();
  }

  // Get count of pending operations
  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  // Process queue (called when online)
  async processQueue(
    executor: (operation: SyncOperation) => Promise<boolean>,
  ): Promise<{success: number; failed: number}> {
    if (this.isSyncing) {
      return {success: 0, failed: 0};
    }

    const isConnected = await networkStatus.checkConnection();
    if (!isConnected) {
      return {success: 0, failed: 0};
    }

    this.isSyncing = true;
    let success = 0;
    let failed = 0;

    try {
      const queue = await this.getQueue();

      // Sort by timestamp to process in order
      queue.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      for (const operation of queue) {
        try {
          const result = await executor(operation);
          if (result) {
            await this.removeFromQueue(operation.id);
            success++;
          } else {
            // Increment retry count
            operation.retries++;
            if (operation.retries >= 3) {
              // Max retries reached, remove from queue
              await this.removeFromQueue(operation.id);
              failed++;
            } else {
              // Update retry count in queue
              const currentQueue = await this.getQueue();
              const index = currentQueue.findIndex(
                op => op.id === operation.id,
              );
              if (index >= 0) {
                currentQueue[index] = operation;
                await this.saveQueue(currentQueue);
              }
            }
          }
        } catch (error) {
          console.error('Error processing sync operation:', error);
          failed++;
        }
      }
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    return {success, failed};
  }

  // Clear all pending operations
  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    this.notifyListeners();
  }

  // Subscribe to queue changes
  addListener(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);

    // Immediately call with current count
    this.getPendingCount().then(count => listener(count));

    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListeners() {
    const count = await this.getPendingCount();
    this.listeners.forEach(listener => listener(count));
  }
}

export const syncQueue = new SyncQueue();
