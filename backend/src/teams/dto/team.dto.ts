import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateTeamDto {
  @IsString()
  @IsOptional()
  name?: string;
}

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  role?: string; // "admin", "member", "viewer"
}

export class UpdateMemberRoleDto {
  @IsString()
  @IsNotEmpty()
  role: string;
}

export class TeamResponse {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  memberCount: number;
  createdAt: Date;
}

export class TeamMemberResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  joinedAt: Date;
}
