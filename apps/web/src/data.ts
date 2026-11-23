export type Space = {
  id: string
  name: string
  description: string
  dates: string
  cover: string
  progress: number
  total: number
  unread?: number
  inviteCode?: string
  handle?: string
  coverPhotoId?: string
  branchName?: string
}

export type Photo = { id: string; src: string; by: string; takenAt: string }
export type Person = { id: string; name: string; username: string; avatar: string; role?: string }
export type Notice = { id: string; title: string; detail: string; unread: boolean; time: string }

export const spaces: Space[] = [
  { id: 'coast', name: 'Coast Weekend', handle: 'coast_weekend', description: 'Three days of sun, salt and long dinners.', dates: 'Aug 8–10, 2026', cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85', progress: 4, total: 6, unread: 3, inviteCode: 'COAST26', branchName: 'Trips / 2024' },
  { id: 'graduation', name: 'Graduation', handle: 'graduation_2026', description: 'Campus, family and everyone we love.', dates: 'Jun 18, 2026', cover: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=85', progress: 2, total: 5, inviteCode: 'GRAD26', branchName: 'Trips / 2025' },
  { id: 'hike', name: 'Highlands Hike', handle: 'highlands_hike', description: 'Clouds at the peak and good company.', dates: 'Apr 21–23, 2026', cover: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85', progress: 5, total: 5, inviteCode: 'HIKE26', branchName: 'Trips / 2025' },
  { id: 'bali', name: 'Bali Trip', handle: 'bali_2024', description: 'Rice fields, temples and the sea.', dates: 'Dec 1–8, 2024', cover: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=85', progress: 4, total: 4, inviteCode: 'BALI24', branchName: 'Trips / 2024' },
  { id: 'christmas', name: 'Christmas 2024', handle: 'christmas_2024', description: 'Family, food and fairy lights.', dates: 'Dec 25–26, 2024', cover: 'https://images.unsplash.com/photo-1512389098783-66b81f86e199?auto=format&fit=crop&w=1200&q=85', progress: 6, total: 8, inviteCode: 'XMAS24', branchName: 'Family' },
  { id: 'road-trip', name: 'Road Trip 2026', handle: 'road_trip_2026', description: 'Open roads and open skies.', dates: 'Mar 1–5, 2026', cover: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=85', progress: 0, total: 3, inviteCode: 'ROAD26', branchName: 'New Growth' },
]

export const photos: Photo[] = [
  { id: 'p1', src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85', by: 'Maya', takenAt: 'Aug 8' },
  { id: 'p2', src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=900&q=85', by: 'Theo', takenAt: 'Aug 8' },
  { id: 'p3', src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=85', by: 'You', takenAt: 'Aug 9' },
  { id: 'p4', src: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=900&q=85', by: 'Lena', takenAt: 'Aug 9' },
  { id: 'p5', src: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=85', by: 'Maya', takenAt: 'Aug 10' },
  { id: 'p6', src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=85', by: 'Theo', takenAt: 'Aug 10' },
]

export const people: Person[] = [
  { id: 'u1', name: 'Maya Perera', username: 'maya', avatar: 'https://i.pravatar.cc/160?img=47', role: 'Admin' },
  { id: 'u2', name: 'Theo Silva', username: 'theo', avatar: 'https://i.pravatar.cc/160?img=12', role: 'Member' },
  { id: 'u3', name: 'Lena Ortiz', username: 'lena', avatar: 'https://i.pravatar.cc/160?img=32', role: 'Member' },
  { id: 'u4', name: 'Sam Chen', username: 'sam', avatar: 'https://i.pravatar.cc/160?img=68', role: 'Member' },
]

export const notices: Notice[] = [
  { id: 'n1', title: 'Maya shared 12 photos', detail: 'Coast Weekend', unread: true, time: '8 min' },
  { id: 'n2', title: 'Theo wants to be friends', detail: '@theo sent you a request', unread: true, time: '1 hr' },
  { id: 'n3', title: 'Coast Weekend reminder', detail: '3 of 6 members still need to add photos', unread: false, time: 'Yesterday' },
]
