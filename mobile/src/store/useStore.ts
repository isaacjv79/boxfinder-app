import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {User, Container, Item} from '../types';
import {api} from '../services/api';
import {syncQueue} from '../services/syncQueue';

interface AppState {
  // Auth state
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Container state
  containers: Container[];
  selectedContainer: Container | null;

  // Search state
  searchResults: Item[];
  searchQuery: string;

  // Offline state
  isOffline: boolean;
  pendingSyncCount: number;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  loadAuthState: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;

  loadContainers: () => Promise<void>;
  addContainer: (
    name: string,
    row: number,
    column: string,
    description?: string,
    color?: string,
    parentId?: string,
    teamId?: string,
  ) => Promise<Container>;
  deleteContainer: (id: string) => Promise<void>;
  setSelectedContainer: (container: Container | null) => void;

  searchItems: (query: string) => Promise<void>;
  clearSearch: () => void;

  // Offline actions
  setOfflineStatus: (isOffline: boolean) => void;
  updatePendingSyncCount: () => Promise<void>;
  syncPendingOperations: () => Promise<{success: number; failed: number}>;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  containers: [],
  selectedContainer: null,
  searchResults: [],
  searchQuery: '',
  isOffline: false,
  pendingSyncCount: 0,

  // Auth actions
  setUser: user => set({user, isAuthenticated: !!user}),
  setToken: token => set({token}),

  loadAuthState: async () => {
    try {
      const [token, userStr] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
      ]);

      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({token, user, isAuthenticated: true, isLoading: false});
      } else {
        set({isLoading: false});
      }
    } catch (error) {
      console.error('Error loading auth state:', error);
      set({isLoading: false});
    }
  },

  login: async (email, password) => {
    const response = await api.login(email, password);
    set({
      user: response.user,
      token: response.access_token,
      isAuthenticated: true,
    });
  },

  register: async (email, password, name) => {
    const response = await api.register(email, password, name);
    set({
      user: response.user,
      token: response.access_token,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    await api.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      containers: [],
      selectedContainer: null,
      searchResults: [],
    });
  },

  // Container actions
  loadContainers: async () => {
    try {
      const containers = await api.getContainers();
      set({containers});
    } catch (error) {
      console.error('Error loading containers:', error);
    }
  },

  addContainer: async (name, row, column, description, color, parentId, teamId) => {
    const container = await api.createContainer({
      name,
      row,
      column,
      description,
      color,
      parentId,
      teamId,
    });
    set(state => ({containers: [...state.containers, container]}));
    return container;
  },

  deleteContainer: async id => {
    await api.deleteContainer(id);
    set(state => ({
      containers: state.containers.filter(c => c.id !== id),
    }));
  },

  setSelectedContainer: container => set({selectedContainer: container}),

  // Search actions
  searchItems: async query => {
    set({searchQuery: query});
    if (query.trim().length < 2) {
      set({searchResults: []});
      return;
    }
    try {
      const results = await api.searchItems(query);
      set({searchResults: results});
    } catch (error) {
      console.error('Error searching items:', error);
    }
  },

  clearSearch: () => set({searchResults: [], searchQuery: ''}),

  // Offline actions
  setOfflineStatus: isOffline => set({isOffline}),

  updatePendingSyncCount: async () => {
    const count = await syncQueue.getPendingCount();
    set({pendingSyncCount: count});
  },

  syncPendingOperations: async () => {
    const result = await api.processSyncQueue();
    // Refresh data after sync
    if (result.success > 0) {
      await get().loadContainers();
      await get().updatePendingSyncCount();
    }
    return result;
  },
}));
