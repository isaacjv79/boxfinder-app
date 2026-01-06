import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  containerId: string;

  @IsString()
  @IsNotEmpty()
  imageBase64: string; // Base64 encoded image

  // Optional manual overrides (if user wants to correct AI)
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class CreateItemManualDto {
  @IsString()
  @IsNotEmpty()
  containerId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class UpdateItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsOptional()
  aiTags?: string[];
}

export class BorrowItemDto {
  @IsBoolean()
  isBorrowed: boolean;

  @IsString()
  @IsOptional()
  borrowedTo?: string;

  @IsString()
  @IsOptional()
  borrowedNote?: string;
}

export class SearchItemsDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class ItemResponse {
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
  isBorrowed: boolean;
  borrowedTo: string | null;
  borrowedAt: Date | null;
  borrowedNote: string | null;
  createdAt: Date;
}
