import axios, {AxiosInstance, AxiosError} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthResponse,
  Container,
  ContainerWithItems,
  CreateContainerDto,
  Item,
  CreateItemDto,
  UpdateItemDto,
  BorrowItemDto,
  Team,
  TeamWithMembers,
} from '../types';
import {offlineStorage} from './offlineStorage';
import {syncQueue} from './syncQueue';
import {networkStatus} from './networkStatus';

// Change this to your backend URL
// Para iPhone fisico, usa la IP de tu Mac en la red local
const API_URL = 'https://boxfinder-api.mefimports.com/api';

// Check if error is a network error
function isNetworkError(error: any): boolean {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    return (
      !axiosError.response ||
      axiosError.code === 'ECONNABORTED' ||
      axiosError.code === 'ERR_NETWORK' ||
      axiosError.message === 'Network Error'
    );
  }
  return false;
}

// Generate temporary ID for offline created entities
function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.api.interceptors.request.use(async config => {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle auth errors
    this.api.interceptors.response.use(
      response => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
        }
        return Promise.reject(error);
      },
    );
  }

  // Auth endpoints (no offline support needed)
  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/register', {
      email,
      password,
      name,
    });
    await this.saveAuthData(response.data);
    return response.data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    await this.saveAuthData(response.data);
    return response.data;
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    await offlineStorage.clearCache();
    await syncQueue.clearQueue();
  }

  async getProfile(): Promise<AuthResponse['user']> {
    const response = await this.api.get<AuthResponse['user']>('/auth/me');
    return response.data;
  }

  private async saveAuthData(data: AuthResponse): Promise<void> {
    await AsyncStorage.setItem('token', data.access_token);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
  }

  // Container endpoints with offline support
  async getContainers(): Promise<Container[]> {
    try {
      const response = await this.api.get<Container[]>('/containers');
      // Cache the data
      await offlineStorage.setContainers(response.data);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        // Return cached data when offline
        return await offlineStorage.getContainers();
      }
      throw error;
    }
  }

  async getContainer(id: string): Promise<ContainerWithItems> {
    try {
      const response = await this.api.get<ContainerWithItems>(
        `/containers/${id}`,
      );
      // Cache the data
      await offlineStorage.setContainerDetail(id, response.data);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        // Return cached data when offline
        const cached = await offlineStorage.getContainerDetail(id);
        if (cached) {
          return cached;
        }
      }
      throw error;
    }
  }

  async getContainerByQr(qrCode: string): Promise<ContainerWithItems> {
    try {
      const response = await this.api.get<ContainerWithItems>(
        `/containers/qr/${qrCode}`,
      );
      await offlineStorage.setContainerDetail(response.data.id, response.data);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        // Try to find in cached containers
        const containers = await offlineStorage.getContainers();
        const container = containers.find(c => c.qrCode === qrCode);
        if (container) {
          const detail = await offlineStorage.getContainerDetail(container.id);
          if (detail) {
            return detail;
          }
        }
      }
      throw error;
    }
  }

  async createContainer(data: CreateContainerDto): Promise<Container> {
    const isOnline = networkStatus.getIsConnected();

    if (isOnline) {
      try {
        const response = await this.api.post<Container>('/containers', data);
        await offlineStorage.updateContainer(response.data);
        return response.data;
      } catch (error) {
        if (!isNetworkError(error)) {
          throw error;
        }
        // Fall through to offline handling
      }
    }

    // Offline: create temporary container and queue for sync
    const tempId = generateTempId();
    const tempContainer: Container = {
      id: tempId,
      name: data.name,
      location: `${data.column}${data.row}`,
      row: data.row,
      column: data.column,
      description: data.description || null,
      qrCode: `temp-qr-${tempId}`,
      color: data.color || null,
      itemCount: 0,
      parentId: data.parentId || null,
      parentName: null,
      teamId: data.teamId || null,
      teamName: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await offlineStorage.updateContainer(tempContainer);
    await syncQueue.addToQueue('CREATE', 'container', tempId, data);

    return tempContainer;
  }

  async updateContainer(
    id: string,
    data: Partial<CreateContainerDto>,
  ): Promise<Container> {
    const isOnline = networkStatus.getIsConnected();

    if (isOnline) {
      try {
        const response = await this.api.put<Container>(
          `/containers/${id}`,
          data,
        );
        await offlineStorage.updateContainer(response.data);
        return response.data;
      } catch (error) {
        if (!isNetworkError(error)) {
          throw error;
        }
      }
    }

    // Offline: update local cache and queue
    const containers = await offlineStorage.getContainers();
    const existing = containers.find(c => c.id === id);
    if (existing) {
      const updated: Container = {
        ...existing,
        name: data.name ?? existing.name,
        row: data.row ?? existing.row,
        column: data.column ?? existing.column,
        location:
          data.column && data.row
            ? `${data.column}${data.row}`
            : existing.location,
        description: data.description ?? existing.description,
        color: data.color ?? existing.color,
        updatedAt: new Date().toISOString(),
      };
      await offlineStorage.updateContainer(updated);
      await syncQueue.addToQueue('UPDATE', 'container', id, data);
      return updated;
    }

    throw new Error('Container not found in cache');
  }

  async deleteContainer(id: string): Promise<void> {
    const isOnline = networkStatus.getIsConnected();

    if (isOnline) {
      try {
        await this.api.delete(`/containers/${id}`);
        await offlineStorage.deleteContainer(id);
        return;
      } catch (error) {
        if (!isNetworkError(error)) {
          throw error;
        }
      }
    }

    // Offline: delete from cache and queue
    await offlineStorage.deleteContainer(id);

    // Only queue if it's not a temp container
    if (!id.startsWith('temp-')) {
      await syncQueue.addToQueue('DELETE', 'container', id, null);
    }
  }

  // Item endpoints with offline support
  async addItem(data: CreateItemDto): Promise<Item> {
    // Adding items with images requires online connection
    const response = await this.api.post<Item>('/items', data);

    // Update container detail cache
    const containerDetail = await offlineStorage.getContainerDetail(
      data.containerId,
    );
    if (containerDetail) {
      containerDetail.items.push(response.data);
      containerDetail.itemCount = containerDetail.items.length;
      await offlineStorage.setContainerDetail(
        data.containerId,
        containerDetail,
      );
    }

    return response.data;
  }

  async getItemsByContainer(containerId: string): Promise<Item[]> {
    try {
      const response = await this.api.get<Item[]>(
        `/items/container/${containerId}`,
      );
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        const cached = await offlineStorage.getContainerDetail(containerId);
        if (cached) {
          return cached.items;
        }
      }
      throw error;
    }
  }

  async searchItems(query: string, category?: string): Promise<Item[]> {
    try {
      const params = new URLSearchParams({query});
      if (category) {
        params.append('category', category);
      }
      const response = await this.api.get<Item[]>(`/items/search?${params}`);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        // Search locally when offline
        return await offlineStorage.searchItemsLocally(query);
      }
      throw error;
    }
  }

  async getItem(id: string): Promise<Item> {
    const response = await this.api.get<Item>(`/items/${id}`);
    return response.data;
  }

  async updateItem(id: string, data: UpdateItemDto): Promise<Item> {
    const isOnline = networkStatus.getIsConnected();

    if (isOnline) {
      try {
        const response = await this.api.put<Item>(`/items/${id}`, data);
        await offlineStorage.updateItemInCache(response.data);
        return response.data;
      } catch (error) {
        if (!isNetworkError(error)) {
          throw error;
        }
      }
    }

    // Offline: queue the operation
    await syncQueue.addToQueue('UPDATE', 'item', id, data);

    // Return a placeholder - the real data will sync later
    return {
      id,
      name: data.name || '',
      description: data.description || null,
      category: data.category || null,
      imageUrl: '',
      thumbnailUrl: null,
      aiTags: data.aiTags || [],
      aiConfidence: null,
      containerId: '',
      containerName: '',
      containerLocation: '',
      isBorrowed: false,
      borrowedTo: null,
      borrowedAt: null,
      borrowedNote: null,
      createdAt: '',
      updatedAt: new Date().toISOString(),
    } as Item;
  }

  async deleteItem(id: string): Promise<void> {
    const isOnline = networkStatus.getIsConnected();

    if (isOnline) {
      try {
        await this.api.delete(`/items/${id}`);
        return;
      } catch (error) {
        if (!isNetworkError(error)) {
          throw error;
        }
      }
    }

    // Queue for sync when online
    await syncQueue.addToQueue('DELETE', 'item', id, null);
  }

  async moveItem(itemId: string, newContainerId: string): Promise<Item> {
    const response = await this.api.put<Item>(
      `/items/${itemId}/move/${newContainerId}`,
    );
    return response.data;
  }

  // Borrowed items with offline support
  async getBorrowedItems(): Promise<Item[]> {
    try {
      const response = await this.api.get<Item[]>('/items/borrowed');
      await offlineStorage.setBorrowedItems(response.data);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        return await offlineStorage.getBorrowedItems();
      }
      throw error;
    }
  }

  async borrowItem(itemId: string, data: BorrowItemDto): Promise<Item> {
    const response = await this.api.put<Item>(`/items/${itemId}/borrow`, data);
    await offlineStorage.updateItemInCache(response.data);
    return response.data;
  }

  async returnItem(itemId: string): Promise<Item> {
    const response = await this.api.put<Item>(`/items/${itemId}/borrow`, {
      isBorrowed: false,
    });
    await offlineStorage.updateItemInCache(response.data);
    return response.data;
  }

  // Team endpoints with offline support
  async getTeams(): Promise<Team[]> {
    try {
      const response = await this.api.get<Team[]>('/teams');
      await offlineStorage.setTeams(response.data);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        return await offlineStorage.getTeams();
      }
      throw error;
    }
  }

  async getTeam(id: string): Promise<TeamWithMembers> {
    const response = await this.api.get<TeamWithMembers>(`/teams/${id}`);
    return response.data;
  }

  async createTeam(name: string): Promise<Team> {
    const response = await this.api.post<Team>('/teams', {name});
    return response.data;
  }

  async updateTeam(id: string, name: string): Promise<Team> {
    const response = await this.api.put<Team>(`/teams/${id}`, {name});
    return response.data;
  }

  async deleteTeam(id: string): Promise<void> {
    await this.api.delete(`/teams/${id}`);
  }

  async inviteTeamMember(
    teamId: string,
    email: string,
    role?: string,
  ): Promise<any> {
    const response = await this.api.post(`/teams/${teamId}/members`, {
      email,
      role: role || 'member',
    });
    return response.data;
  }

  async removeTeamMember(teamId: string, memberId: string): Promise<void> {
    await this.api.delete(`/teams/${teamId}/members/${memberId}`);
  }

  async getTeamContainers(teamId: string): Promise<Container[]> {
    const response = await this.api.get<Container[]>(
      `/teams/${teamId}/containers`,
    );
    return response.data;
  }

  // Container children (hierarchy)
  async getContainerChildren(containerId: string): Promise<Container[]> {
    const response = await this.api.get<Container[]>(
      `/containers/${containerId}/children`,
    );
    return response.data;
  }

  // Sync queue processor
  async processSyncQueue(): Promise<{success: number; failed: number}> {
    return await syncQueue.processQueue(async operation => {
      try {
        switch (operation.entity) {
          case 'container':
            if (operation.type === 'CREATE') {
              const result = await this.api.post<Container>(
                '/containers',
                operation.data,
              );
              // Update cache with real ID
              await offlineStorage.deleteContainer(operation.entityId);
              await offlineStorage.updateContainer(result.data);
              return true;
            } else if (operation.type === 'UPDATE') {
              await this.api.put(
                `/containers/${operation.entityId}`,
                operation.data,
              );
              return true;
            } else if (operation.type === 'DELETE') {
              await this.api.delete(`/containers/${operation.entityId}`);
              return true;
            }
            break;

          case 'item':
            if (operation.type === 'UPDATE') {
              await this.api.put(
                `/items/${operation.entityId}`,
                operation.data,
              );
              return true;
            } else if (operation.type === 'DELETE') {
              await this.api.delete(`/items/${operation.entityId}`);
              return true;
            }
            break;
        }
        return false;
      } catch (error) {
        console.error('Sync operation failed:', error);
        return false;
      }
    });
  }
}

export const api = new ApiService();
