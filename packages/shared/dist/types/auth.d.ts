import { UserRole } from '../constants/enums';
export interface User {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface LoginRequest {
    username: string;
    password: string;
}
export interface LoginResponse {
    user: Omit<User, 'createdAt' | 'updatedAt'>;
    token: string;
}
export interface AuthPayload {
    id: string;
    username: string;
    role: UserRole;
}
