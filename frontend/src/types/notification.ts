export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  targetRole?: string | null;
  targetUserId?: number | null;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
  isRead: boolean;
  isResolved: boolean;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationResponse {
  unreadCount: number;
  notifications: NotificationItem[];
}

export interface UnreadNotificationResponse {
  unreadCount: number;
}

export interface NotificationActionResponse {
  message: string;
  updatedCount?: number;
}