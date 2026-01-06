import { IsString, IsNotEmpty, IsInt, IsOptional, Min } from 'class-validator';

export class CreateContainerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  row: number;

  @IsString()
  @IsNotEmpty()
  column: string; // A, B, C, etc.

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  color?: string; // Hex color for visual identification

  @IsString()
  @IsOptional()
  parentId?: string; // Parent container ID for hierarchy

  @IsString()
  @IsOptional()
  teamId?: string; // Team ID for shared containers
}

export class UpdateContainerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  row?: number;

  @IsString()
  @IsOptional()
  column?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  teamId?: string;
}

export class ContainerResponse {
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
  path: string; // Full path like "Garage > Shelf A > Box 1"
  createdAt: Date;
  updatedAt: Date;
}
