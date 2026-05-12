"use client";

import ThemeToggle from "@/app/components/ThemeToggle";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  MessageCircle,
  Users,
  Bell,
  Pin,
  Plus,
  Star,
  X,
  MessageSquare,
  UserPlus,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
interface ChatRoomItem {
  chatRoomId: number;
  roomType: "SINGLE" | "GROUP" | "ALARM";
  roomTitle: string;
  roomImage: string | null;
  lastMessageContent: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  participantCount: number;
  isPinned?: boolean;
}

interface FriendItem {
  id: number;
  userId: number;
  nickname: string;
  name: string;
  image: string | null;
  alias: string | null;
  memo: string | null;
  status: "ACTIVE" | "HIDDEN" | "BLOCK";
  isFavorite: boolean;
  phone: string;
  gender: "MALE" | "FEMALE" | "NONE";
  birthDate: string | null;
  chatRoomId: number | null; // 이미 1:1 채팅방이 있으면 해당 ID
}

// ── Mock Data ──────────────────────────────────────────────────
const MOCK_FRIENDS: FriendItem[] = [
  { id: 1, userId: 2, nickname: "김민수", name: "김민수", image: null, alias: null, memo: "프론트엔드 개발자", status: "ACTIVE", isFavorite: true, phone: "010-1234-5678", gender: "MALE", birthDate: "1998-03-15", chatRoomId: 1 },
  { id: 2, userId: 3, nickname: "이서윤", name: "이서윤", image: null, alias: "서윤이", memo: "디자이너", status: "ACTIVE", isFavorite: true, phone: "010-2345-6789", gender: "FEMALE", birthDate: "1999-07-22", chatRoomId: 3 },
  { id: 3, userId: 4, nickname: "박지훈", name: "박지훈", image: null, alias: null, memo: null, status: "ACTIVE", isFavorite: false, phone: "010-3456-7890", gender: "MALE", birthDate: "1997-11-08", chatRoomId: null },
  { id: 4, userId: 5, nickname: "최유진", name: "최유진", image: null, alias: "유진씨", memo: "백엔드 개발자", status: "ACTIVE", isFavorite: false, phone: "010-4567-8901", gender: "FEMALE", birthDate: "2000-01-30", chatRoomId: null },
  { id: 5, userId: 6, nickname: "정하늘", name: "정하늘", image: null, alias: null, memo: "PM", status: "ACTIVE", isFavorite: false, phone: "010-5678-9012", gender: "NONE", birthDate: "1996-05-12", chatRoomId: null },
  { id: 6, userId: 7, nickname: "한소희", name: "한소희", image: null, alias: "소희", memo: null, status: "ACTIVE", isFavorite: true, phone: "010-6789-0123", gender: "FEMALE", birthDate: "1999-09-03", chatRoomId: null },
  { id: 7, userId: 8, nickname: "오동건", name: "오동건", image: null, alias: null, memo: "스터디 멤버", status: "ACTIVE", isFavorite: false, phone: "010-7890-1234", gender: "MALE", birthDate: "1998-12-25", chatRoomId: null },
];

const MOCK_ROOMS: ChatRoomItem[] = [
  { chatRoomId: 1, roomType: "SINGLE", roomTitle: "김민수", roomImage: null, lastMessageContent: "네 알겠습니다! 내일 오후 3시에 만나요 👋", lastMessageAt: "2026-05-11T10:32:00", unreadCount: 3, participantCount: 2, isPinned: true },
  { chatRoomId: 2, roomType: "GROUP", roomTitle: "프로젝트 팀채팅", roomImage: null, lastMessageContent: "디자인 시안 업로드했어요~ 확인 부탁드립니다", lastMessageAt: "2026-05-11T09:15:00", unreadCount: 12, participantCount: 5, isPinned: true },
  { chatRoomId: 3, roomType: "SINGLE", roomTitle: "이서윤", roomImage: null, lastMessageContent: "사진 보내드릴게요 잠시만요!", lastMessageAt: "2026-05-11T08:45:00", unreadCount: 1, participantCount: 2 },
  { chatRoomId: 4, roomType: "GROUP", roomTitle: "동아리 모임방", roomImage: null, lastMessageContent: "이번 주 토요일 정기모임 참석 가능하신 분?", lastMessageAt: "2026-05-10T22:10:00", unreadCount: 0, participantCount: 12 },
  { chatRoomId: 5, roomType: "SINGLE", roomTitle: "박지훈", roomImage: null, lastMessageContent: "ㅋㅋㅋ 진짜요? 대박", lastMessageAt: "2026-05-10T18:30:00", unreadCount: 0, participantCount: 2 },
  { chatRoomId: 6, roomType: "ALARM", roomTitle: "주문 알림", roomImage: null, lastMessageContent: "주문하신 상품이 배송을 시작했습니다.", lastMessageAt: "2026-05-10T14:20:00", unreadCount: 2, participantCount: 1 },
  { chatRoomId: 7, roomType: "SINGLE", roomTitle: "최유진", roomImage: null, lastMessageContent: "감사합니다 :)", lastMessageAt: "2026-05-09T21:00:00", unreadCount: 0, participantCount: 2 },
  { chatRoomId: 8, roomType: "GROUP", roomTitle: "개발 스터디", roomImage: null, lastMessageContent: "다음 주 발표 주제 정했나요?", lastMessageAt: "2026-05-09T16:45:00", unreadCount: 5, participantCount: 8 },
];

// ── Helpers ────────────────────────────────────────────────────
function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: true });
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return ["일","월","화","수","목","금","토"][date.getDay()] + "요일";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getGradient(id: number): string {
  const g = ["from-drac-cyan to-drac-purple","from-drac-pink to-drac-orange","from-drac-green to-drac-cyan","from-drac-purple to-drac-pink","from-drac-orange to-drac-yellow","from-drac-cyan to-drac-green","from-drac-pink to-drac-purple","from-drac-yellow to-drac-orange"];
  return g[id % g.length];
}

function getRoomIcon(t: string) {
  if (t === "GROUP") return <Users size={18} />;
  if (t === "ALARM") return <Bell size={18} />;
  return <MessageCircle size={18} />;
}

// ── Component ──────────────────────────────────────────────────
export default function ChatPage() {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [tab, setTab] = useState<"friends" | "chats">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<FriendItem | null>(null);

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    setIsAuthed(true);
  }, [router]);

  // Friends filtering
  const filteredFriends = useMemo(() => {
    const active = MOCK_FRIENDS.filter((f) => f.status === "ACTIVE");
    if (!searchQuery.trim()) return active;
    const q = searchQuery.toLowerCase();
    return active.filter((f) => f.nickname.toLowerCase().includes(q) || f.alias?.toLowerCase().includes(q) || f.name.toLowerCase().includes(q));
  }, [searchQuery]);

  const favoriteFriends = filteredFriends.filter((f) => f.isFavorite);
  const normalFriends = filteredFriends.filter((f) => !f.isFavorite);

  // Chat rooms filtering & sorting
  const sortedRooms = useMemo(() => {
    let rooms = MOCK_ROOMS;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rooms = rooms.filter((r) => r.roomTitle.toLowerCase().includes(q) || r.lastMessageContent?.toLowerCase().includes(q));
    }
    const pinned = rooms.filter((r) => r.isPinned);
    const unpinned = rooms.filter((r) => !r.isPinned);
    return [...pinned, ...unpinned];
  }, [searchQuery]);

  const totalUnread = MOCK_ROOMS.reduce((s, r) => s + r.unreadCount, 0);

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-drac-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-drac-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-drac-bg text-drac-fg font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-drac-bg/80 border-b border-drac-comment/20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="w-9 h-9 rounded-full bg-drac-current flex items-center justify-center hover:bg-drac-comment/30 text-drac-fg transition-colors">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-bold text-drac-fg">
              {tab === "friends" ? "친구" : "채팅"}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button className="w-9 h-9 rounded-full hover:bg-drac-current flex items-center justify-center text-drac-fg transition-colors">
              {tab === "friends" ? <UserPlus size={20} /> : <Plus size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 pt-2">
        <div className="flex bg-drac-current rounded-xl p-1 gap-1">
          <button
            onClick={() => { setTab("friends"); setSearchQuery(""); }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${tab === "friends" ? "bg-drac-bg text-drac-fg shadow-sm" : "text-drac-comment hover:text-drac-fg"}`}
          >
            <Users size={16} />
            친구
            <span className="text-[11px] text-drac-comment font-medium">{MOCK_FRIENDS.filter(f => f.status === "ACTIVE").length}</span>
          </button>
          <button
            onClick={() => { setTab("chats"); setSearchQuery(""); }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${tab === "chats" ? "bg-drac-bg text-drac-fg shadow-sm" : "text-drac-comment hover:text-drac-fg"}`}
          >
            <MessageCircle size={16} />
            채팅
            {totalUnread > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-drac-pink text-white text-[10px] font-bold rounded-full">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 pt-3 pb-1">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-drac-comment w-4 h-4 group-focus-within:text-drac-pink transition-colors" />
          <input
            type="text"
            placeholder={tab === "friends" ? "친구 검색..." : "채팅방 검색..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-drac-current border border-transparent rounded-xl outline-none focus:bg-drac-bg focus:border-drac-comment/50 text-sm text-drac-fg placeholder:text-drac-comment/60 transition-all"
          />
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full pb-8">
        {tab === "friends" ? (
          /* ═══ Friends Tab ═══ */
          filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-16 h-16 bg-drac-current rounded-full flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-drac-comment" />
              </div>
              <h3 className="text-lg font-bold text-drac-fg mb-1">친구가 없습니다</h3>
              <p className="text-sm text-drac-comment">새로운 친구를 추가해보세요.</p>
            </div>
          ) : (
            <div>
              {/* My Profile */}
              <div className="px-4 sm:px-6 py-4 border-b border-drac-current/60">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-drac-purple to-drac-cyan flex items-center justify-center text-white text-lg font-bold shadow-md">나</div>
                  <div>
                    <p className="font-semibold text-[15px] text-drac-fg">나</p>
                    <p className="text-xs text-drac-comment mt-0.5">내 프로필</p>
                  </div>
                </div>
              </div>

              {/* Favorites */}
              {favoriteFriends.length > 0 && (
                <div>
                  <div className="px-4 sm:px-6 pt-4 pb-1.5">
                    <p className="text-[11px] font-semibold text-drac-comment tracking-wider uppercase flex items-center gap-1">
                      <Star size={11} className="fill-drac-yellow text-drac-yellow" /> 즐겨찾기
                      <span className="ml-1 text-drac-comment/60">{favoriteFriends.length}</span>
                    </p>
                  </div>
                  <ul>
                    {favoriteFriends.map((f) => (
                      <FriendRow key={f.id} friend={f} onSelect={setSelectedFriend} />
                    ))}
                  </ul>
                </div>
              )}

              {/* Normal friends */}
              <div>
                <div className="px-4 sm:px-6 pt-4 pb-1.5">
                  <p className="text-[11px] font-semibold text-drac-comment tracking-wider uppercase">
                    친구 <span className="ml-1 text-drac-comment/60">{normalFriends.length}</span>
                  </p>
                </div>
                <ul>
                  {normalFriends.map((f) => (
                    <FriendRow key={f.id} friend={f} onSelect={setSelectedFriend} />
                  ))}
                </ul>
              </div>
            </div>
          )
        ) : (
          /* ═══ Chats Tab ═══ */
          sortedRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-16 h-16 bg-drac-current rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-7 h-7 text-drac-comment" />
              </div>
              <h3 className="text-lg font-bold text-drac-fg mb-1">채팅방이 없습니다</h3>
              <p className="text-sm text-drac-comment">새로운 채팅을 시작해보세요.</p>
            </div>
          ) : (
            <ul className="divide-y divide-drac-current/60">
              {sortedRooms.map((room) => (
                <li key={room.chatRoomId}>
                  <Link href={`/chat/${room.chatRoomId}`} className="flex items-center gap-3.5 px-4 sm:px-6 py-3.5 hover:bg-drac-current/40 active:bg-drac-current/60 transition-colors cursor-pointer">
                    <div className="relative shrink-0">
                      <div className={`w-13 h-13 rounded-full bg-gradient-to-tr ${getGradient(room.chatRoomId)} flex items-center justify-center text-white shadow-md`}>
                        {getRoomIcon(room.roomType)}
                      </div>
                      {room.roomType === "GROUP" && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-drac-current border-2 border-drac-bg rounded-full flex items-center justify-center text-[9px] font-bold text-drac-fg">{room.participantCount}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {room.isPinned && <Pin size={12} className="text-drac-comment shrink-0 rotate-45" />}
                          <span className="font-semibold text-[15px] text-drac-fg truncate">{room.roomTitle}</span>
                        </div>
                        <span className="text-[11px] text-drac-comment shrink-0 ml-2">{formatTime(room.lastMessageAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-drac-comment truncate pr-2">{room.lastMessageContent || "대화를 시작해보세요."}</p>
                        {room.unreadCount > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-drac-pink text-white text-[11px] font-bold rounded-full shrink-0">{room.unreadCount > 99 ? "99+" : room.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )
        )}
      </main>

      {/* ═══ Friend Profile Modal ═══ */}
      {selectedFriend && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={() => setSelectedFriend(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-drac-bg rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm shadow-2xl border border-drac-current overflow-hidden animate-[slideUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Profile Header */}
            <div className="relative h-32 bg-gradient-to-br from-drac-purple/30 via-drac-cyan/20 to-drac-pink/30">
              <button onClick={() => setSelectedFriend(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-drac-bg/80 backdrop-blur-sm flex items-center justify-center text-drac-fg hover:bg-drac-bg transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex justify-center -mt-12">
              <div className={`w-24 h-24 rounded-full bg-gradient-to-tr ${getGradient(selectedFriend.userId)} flex items-center justify-center text-white text-3xl font-bold shadow-lg border-4 border-drac-bg`}>
                {selectedFriend.nickname.charAt(0)}
              </div>
            </div>

            {/* Info */}
            <div className="text-center px-6 pt-3 pb-2">
              <h2 className="text-xl font-bold text-drac-fg">{selectedFriend.nickname}</h2>
              {selectedFriend.alias && (
                <p className="text-sm text-drac-comment mt-0.5">별명: {selectedFriend.alias}</p>
              )}
              {selectedFriend.memo && (
                <p className="text-sm text-drac-pink mt-1 italic">&quot;{selectedFriend.memo}&quot;</p>
              )}
            </div>

            {/* Details */}
            <div className="mx-6 mt-2 mb-4 bg-drac-current rounded-2xl p-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-drac-comment">이름</span>
                <span className="text-drac-fg font-medium">{selectedFriend.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-drac-comment">전화번호</span>
                <span className="text-drac-fg font-medium">{selectedFriend.phone}</span>
              </div>
              {selectedFriend.birthDate && (
                <div className="flex justify-between">
                  <span className="text-drac-comment">생일</span>
                  <span className="text-drac-fg font-medium">{selectedFriend.birthDate}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="px-6 pb-6 pt-1 flex gap-3">
              <button
                onClick={() => {
                  setSelectedFriend(null);
                  if (selectedFriend.chatRoomId) {
                    router.push(`/chat/${selectedFriend.chatRoomId}`);
                  } else {
                    // 새 채팅방 생성 후 이동 (임시로 userId 기반)
                    router.push(`/chat/${selectedFriend.userId}`);
                  }
                }}
                className="flex-1 py-3.5 bg-drac-purple text-white font-bold rounded-2xl hover:bg-drac-purple/80 transition-colors shadow-md shadow-drac-purple/20 flex items-center justify-center gap-2 text-sm"
              >
                <MessageSquare size={18} />
                채팅하기
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Friend Row Sub-component ────────────────────────────────────
function FriendRow({ friend, onSelect }: { friend: FriendItem; onSelect: (f: FriendItem) => void }) {
  return (
    <li>
      <button
        onClick={() => onSelect(friend)}
        className="w-full flex items-center gap-3.5 px-4 sm:px-6 py-2.5 hover:bg-drac-current/40 active:bg-drac-current/60 transition-colors text-left"
      >
        <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${getGradient(friend.userId)} flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0`}>
          {friend.nickname.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] text-drac-fg truncate">
            {friend.alias || friend.nickname}
          </p>
          {friend.memo && (
            <p className="text-xs text-drac-comment truncate mt-0.5">{friend.memo}</p>
          )}
        </div>
        {friend.isFavorite && (
          <Star size={14} className="fill-drac-yellow text-drac-yellow shrink-0" />
        )}
      </button>
    </li>
  );
}
