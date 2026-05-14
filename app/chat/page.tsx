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
  friendId: number;
  targetId: number;
  name: string;
  alias: string | null;
  image: string | null;
  isFavorite: boolean;
}

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

  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [rooms, setRooms] = useState<ChatRoomItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Auth guard & Data Fetch
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    setIsAuthed(true);

    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [friendsRes, chatsRes] = await Promise.all([
          fetch("/api/v1/friends", {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch("/api/v1/chats", {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (friendsRes.ok) {
          const fJson = await friendsRes.json();
          setFriends(fJson.data?.friends || []);
        }

        if (chatsRes.ok) {
          const cJson = await chatsRes.json();
          setRooms(cJson.data?.rooms || []);
        }
      } catch (err) {
        console.error("Failed to fetch friends or chats", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [router]);

  // Friends filtering
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter((f) => f.name?.toLowerCase().includes(q) || f.alias?.toLowerCase().includes(q));
  }, [searchQuery, friends]);

  const favoriteFriends = filteredFriends.filter((f) => f.isFavorite);
  const normalFriends = filteredFriends.filter((f) => !f.isFavorite);

  // Chat rooms filtering & sorting
  const sortedRooms = useMemo(() => {
    let currentRooms = rooms;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      currentRooms = currentRooms.filter((r) => r.roomTitle?.toLowerCase().includes(q) || r.lastMessageContent?.toLowerCase().includes(q));
    }
    const pinned = currentRooms.filter((r) => r.isPinned);
    const unpinned = currentRooms.filter((r) => !r.isPinned);
    return [...pinned, ...unpinned];
  }, [searchQuery, rooms]);

  const totalUnread = rooms.reduce((s, r) => s + (r.unreadCount || 0), 0);

  if (!isAuthed || loadingData) {
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
            <span className="text-[11px] text-drac-comment font-medium">{friends.length}</span>
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
                      <FriendRow key={f.friendId} friend={f} onSelect={setSelectedFriend} />
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
                    <FriendRow key={f.friendId} friend={f} onSelect={setSelectedFriend} />
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
              <div className={`w-24 h-24 rounded-full bg-gradient-to-tr ${getGradient(selectedFriend.targetId)} flex items-center justify-center text-white text-3xl font-bold shadow-lg border-4 border-drac-bg`}>
                {(selectedFriend.alias || selectedFriend.name).charAt(0)}
              </div>
            </div>

            {/* Info */}
            <div className="text-center px-6 pt-3 pb-2">
              <h2 className="text-xl font-bold text-drac-fg">{selectedFriend.alias || selectedFriend.name}</h2>
              {selectedFriend.alias && (
                <p className="text-sm text-drac-comment mt-0.5">이름: {selectedFriend.name}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="px-6 pb-6 pt-4 flex gap-3">
              <button
                onClick={async () => {
                  // 채팅방 생성 요청
                  try {
                    const token = localStorage.getItem("accessToken");
                    const res = await fetch("/api/v1/chats", {
                      method: "POST",
                      headers: { 
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({ 
                        participantIds: [selectedFriend.targetId], 
                        roomType: "SINGLE" 
                      })
                    });
                    
                    if (res.ok) {
                      const json = await res.json();
                      const chatRoomId = json.data?.chatRoomId || json.data?.id;
                      if (chatRoomId) {
                        router.push(`/chat/${chatRoomId}`);
                      } else {
                        // fallback
                        router.push(`/chat/${selectedFriend.targetId}`);
                      }
                    } else {
                      alert("채팅방을 생성할 수 없습니다.");
                    }
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setSelectedFriend(null);
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
        <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${getGradient(friend.targetId)} flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0`}>
          {(friend.alias || friend.name).charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] text-drac-fg truncate">
            {friend.alias || friend.name}
          </p>
        </div>
        {friend.isFavorite && (
          <Star size={14} className="fill-drac-yellow text-drac-yellow shrink-0" />
        )}
      </button>
    </li>
  );
}
