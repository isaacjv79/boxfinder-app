import AsyncStorage from '@react-native-async-storage/async-storage';
import {Container, ContainerWithItems, Item, Team} from '../types';

const STORAGE_KEYS = {
  CONTAINERS: '@boxfinder_containers',
  CONTAINER_DETAILS: '@boxfinder_container_details',
  BORROWED_ITEMS: '@boxfinder_borrowed_items',
  TEAMS: '@boxfinder_teams',
  LAST_SYNC: '@boxfinder_last_sync',
};

interface CachedContainerDetails {
  [containerId: string]: ContainerWithItems;
}

class OfflineStorage {
  // Containers
  async getContainers(): Promise<Container[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CONTAINERS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting cached containers:', error);
      return [];
    }
  }

  async setContainers(containers: Container[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CONTAINERS,
        JSON.stringify(containers),
      );
      await this.setLastSync();
    } catch (error) {
      console.error('Error caching containers:', error);
    }
  }

  async updateContainer(container: Container): Promise<void> {
    try {
      const containers = await this.getContainers();
      const index = containers.findIndex(c => c.id === container.id);
      if (index >= 0) {
        containers[index] = container;
      } else {
        containers.push(container);
      }
      await this.setContainers(containers);
    } catch (error) {
      console.error('Error updating cached container:', error);
    }
  }

  async deleteContainer(containerId: string): Promise<void> {
    try {
      const containers = await this.getContainers();
      const filtered = containers.filter(c => c.id !== containerId);
      await this.setContainers(filtered);
      // Also remove from details cache
      await this.removeContainerDetail(containerId);
    } catch (error) {
      console.error('Error deleting cached container:', error);
    }
  }

  // Container Details (with items)
  async getContainerDetail(
    containerId: string,
  ): Promise<ContainerWithItems | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CONTAINER_DETAILS);
      if (!data) return null;
      const details: CachedContainerDetails = JSON.parse(data);
      return details[containerId] || null;
    } catch (error) {
      console.error('Error getting cached container detail:', error);
      return null;
    }
  }

  async setContainerDetail(
    containerId: string,
    detail: ContainerWithItems,
  ): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CONTAINER_DETAILS);
      const details: CachedContainerDetails = data ? JSON.parse(data) : {};
      details[containerId] = detail;
      await AsyncStorage.setItem(
        STORAGE_KEYS.CONTAINER_DETAILS,
        JSON.stringify(details),
      );
    } catch (error) {
      console.error('Error caching container detail:', error);
    }
  }

  async removeContainerDetail(containerId: string): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CONTAINER_DETAILS);
      if (!data) return;
      const details: CachedContainerDetails = JSON.parse(data);
      delete details[containerId];
      await AsyncStorage.setItem(
        STORAGE_KEYS.CONTAINER_DETAILS,
        JSON.stringify(details),
      );
    } catch (error) {
      console.error('Error removing cached container detail:', error);
    }
  }

  // Update item within cached container detail
  async updateItemInCache(item: Item): Promise<void> {
    try {
      const detail = await this.getContainerDetail(item.containerId);
      if (detail) {
        const index = detail.items.findIndex(i => i.id === item.id);
        if (index >= 0) {
          detail.items[index] = item;
          await this.setContainerDetail(item.containerId, detail);
        }
      }
    } catch (error) {
      console.error('Error updating item in cache:', error);
    }
  }

  // Delete item from cached container detail
  async deleteItemFromCache(
    itemId: string,
    containerId: string,
  ): Promise<void> {
    try {
      const detail = await this.getContainerDetail(containerId);
      if (detail) {
        detail.items = detail.items.filter(i => i.id !== itemId);
        detail.itemCount = detail.items.length;
        await this.setContainerDetail(containerId, detail);
      }
    } catch (error) {
      console.error('Error deleting item from cache:', error);
    }
  }

  // Borrowed Items
  async getBorrowedItems(): Promise<Item[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BORROWED_ITEMS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting cached borrowed items:', error);
      return [];
    }
  }

  async setBorrowedItems(items: Item[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.BORROWED_ITEMS,
        JSON.stringify(items),
      );
    } catch (error) {
      console.error('Error caching borrowed items:', error);
    }
  }

  // Teams
  async getTeams(): Promise<Team[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TEAMS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting cached teams:', error);
      return [];
    }
  }

  async setTeams(teams: Team[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
    } catch (error) {
      console.error('Error caching teams:', error);
    }
  }

  // Search (local search through cached data)
  async searchItemsLocally(query: string): Promise<Item[]> {
    const lowerQuery = query.toLowerCase();
    const results: Item[] = [];

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CONTAINER_DETAILS);
      if (!data) return results;

      const details: CachedContainerDetails = JSON.parse(data);
      for (const containerId in details) {
        const container = details[containerId];
        for (const item of container.items) {
          if (
            item.name.toLowerCase().includes(lowerQuery) ||
            item.description?.toLowerCase().includes(lowerQuery) ||
            item.aiTags?.some(tag => tag.toLowerCase().includes(lowerQuery))
          ) {
            results.push(item);
          }
        }
      }
    } catch (error) {
      console.error('Error searching locally:', error);
    }

    return results;
  }

  // Last sync timestamp
  async getLastSync(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    } catch (error) {
      console.error('Error getting last sync:', error);
      return null;
    }
  }

  async setLastSync(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_SYNC,
        new Date().toISOString(),
      );
    } catch (error) {
      console.error('Error setting last sync:', error);
    }
  }

  // Clear all cached data (on logout)
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CONTAINERS,
        STORAGE_KEYS.CONTAINER_DETAILS,
        STORAGE_KEYS.BORROWED_ITEMS,
        STORAGE_KEYS.TEAMS,
        STORAGE_KEYS.LAST_SYNC,
      ]);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

export const offlineStorage = new OfflineStorage();
