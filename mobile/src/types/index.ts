// User types
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// Team types
export interface Team {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  memberCount: number;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  joinedAt: string;
}

export interface TeamWithMembers extends Team {
  members: TeamMember[];
}

// Container types
export interface Container {
  id: string;
  name: string;
  location: string;
  row: number;
  column: string;
  description: string | null;
  qrCode: string;
  color: string | null;
  itemCount: number;
  parentId: string | null;
  parentName: string | null;
  teamId: string | null;
  teamName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContainerWithItems extends Container {
  items: Item[];
  children?: ContainerChild[];
  path?: string;
}

export interface ContainerChild {
  id: string;
  name: string;
  location?: string;
}

export interface CreateContainerDto {
  name: string;
  row: number;
  column: string;
  description?: string;
  color?: string;
  parentId?: string;
  teamId?: string;
}

// Item types
export interface Item {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  aiTags: string[];
  aiConfidence: number | null;
  containerId: string;
  containerName: string;
  containerLocation: string;
  // Borrowed tracking
  isBorrowed: boolean;
  borrowedTo: string | null;
  borrowedAt: string | null;
  borrowedNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemDto {
  containerId: string;
  imageBase64: string;
  name?: string;
  description?: string;
  category?: string;
}

export interface UpdateItemDto {
  name?: string;
  description?: string;
  category?: string;
  aiTags?: string[];
}

export interface BorrowItemDto {
  isBorrowed: boolean;
  borrowedTo?: string;
  borrowedNote?: string;
}

export interface SearchResult {
  items: Item[];
  query: string;
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  ContainerDetail: { containerId: string };
  AddItems: { containerId: string; qrCode: string };
  EditItem: { item: Item };
  BorrowedItems: undefined;
  Teams: undefined;
  TeamDetail: { teamId: string };
  Search: undefined;
  QRScanner: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Scanner: undefined;
  SearchTab: undefined;
  Settings: undefined;
};
