import { Timestamp } from "firebase/firestore";

export interface UserPermissions {
    allowedPages: string[];
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

export interface Users {
    uid?: string;
    name?: string;
    email?: string;
    role?: string;
    isAdmin?: boolean;
    permissions?: UserPermissions;
    createdAt?: Timestamp;
    restaurantId?: string;
    perfil?: string;
}