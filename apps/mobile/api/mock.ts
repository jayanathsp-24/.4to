export type Space = { id: string; name: string; description?: string; progress: number; total: number; cover: string; inviteCode?: string };
export type Photo = { id: string; uri: string; takenAt: string };
export type Friend = { id: string; name: string; username: string };
export type Notification = { id: string; title: string; detail: string; unread: boolean };
import type { TreeOverview } from "../features/tree/layout";

export const mockSpaces: Space[] = [
  { id: "coast", name: "Coast Weekend", description: "Three days by the sea", progress: 4, total: 6, cover: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e", inviteCode: "COAST26" },
  { id: "graduation", name: "Graduation", description: "Campus, family & friends", progress: 2, total: 5, cover: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1", inviteCode: "GRAD26" },
];

export const mockPhotos: Photo[] = [
  { id: "1", uri: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee", takenAt: "2026-08-10" },
  { id: "2", uri: "https://images.unsplash.com/photo-1501785888041-af3ef285b470", takenAt: "2026-08-11" },
  { id: "3", uri: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e", takenAt: "2026-08-12" },
  { id: "4", uri: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d", takenAt: "2026-08-12" },
];

export const mockFriends: Friend[] = [
  { id: "f1", name: "Maya Perera", username: "maya" },
  { id: "f2", name: "Theo Silva", username: "theo" },
];

export const mockNotifications: Notification[] = [
  { id: "n1", title: "Maya shared 12 photos", detail: "Coast Weekend", unread: true },
  { id: "n2", title: "Friend request", detail: "@theo wants to be friends", unread: true },
];

export const mockTree: TreeOverview = {
  user: { id: "demo", username: "demo", avatarUrl: "https://i.pravatar.cc/160?img=5" },
  root: {
    id: "root",
    name: "Photo Tree",
    photoCount: 247,
    spaces: [],
    branches: [
      {
        id: "branch-coast",
        name: "Coast Weekend",
        photoCount: 42,
        branches: [],
        spaces: [
          { spaceId: "coast", name: "Coast Weekend", startDate: "Aug 8–10, 2026", endDate: "Aug 10", coverThumbUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e", status: "active", memberCount: 6, sharedPhotoCount: 42, myContributionPending: false },
        ],
      },
      {
        id: "branch-bali",
        name: "Bali Trip",
        photoCount: 67,
        branches: [],
        spaces: [
          { spaceId: "bali", name: "Bali Trip", startDate: "Dec 1–8, 2024", endDate: "Dec 8", coverThumbUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4", status: "closed", memberCount: 4, sharedPhotoCount: 67, myContributionPending: false },
        ],
      },
      {
        id: "branch-christmas",
        name: "Christmas 2024",
        photoCount: 54,
        branches: [],
        spaces: [
          { spaceId: "christmas", name: "Christmas 2024", startDate: "Dec 25–26, 2024", endDate: "Dec 26", coverThumbUrl: "https://images.unsplash.com/photo-1512389098783-66b81f86e199", status: "archived", memberCount: 8, sharedPhotoCount: 54, myContributionPending: false },
        ],
      },
      {
        id: "branch-roadtrip",
        name: "Road Trip 2026",
        photoCount: 28,
        branches: [],
        spaces: [
          { spaceId: "road-trip", name: "Road Trip 2026", startDate: "Mar 1–5, 2026", endDate: "Mar 5", coverThumbUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800", status: "active", memberCount: 3, sharedPhotoCount: 0, myContributionPending: true },
        ],
      },
      {
        id: "branch-hike",
        name: "Highlands Hike",
        photoCount: 52,
        branches: [],
        spaces: [
          { spaceId: "hike", name: "Highlands Hike", startDate: "Apr 21–23, 2026", endDate: "Apr 23", coverThumbUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b", status: "active", memberCount: 5, sharedPhotoCount: 0, myContributionPending: true },
        ],
      },
      {
        id: "branch-graduation",
        name: "Graduation",
        photoCount: 36,
        branches: [],
        spaces: [
          { spaceId: "graduation", name: "Graduation", startDate: "Jun 18, 2026", endDate: "Jun 18", coverThumbUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1", status: "closed", memberCount: 5, sharedPhotoCount: 36, myContributionPending: false },
        ],
      },
    ],
  },
};
