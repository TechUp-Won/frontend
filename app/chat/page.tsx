"use client";

import ThemeToggle from "@/app/components/ThemeToggle";
import { apiFetch } from "@/app/lib/apiFetch";
import { useState, useMemo, useEffect, useRef } from "react";
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
  Phone,
  UserCheck,
  Pencil,
  EyeOff,
  ShieldBan,
  Trash2,
  CheckCircle2,
  FileText,
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

interface UserSearchResult {
  userId: number;
  phone: string;
  nickname: string;
  image: string | null;
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
  const [hasNextRooms, setHasNextRooms] = useState(false);
  const [nextRoomCursorId, setNextRoomCursorId] = useState<number | null>(null);
  const [nextRoomLastMessageAt, setNextRoomLastMessageAt] = useState<string | null>(null);
  const [loadingMoreRooms, setLoadingMoreRooms] = useState(false);

  // 친구 추가 모달
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [searchResult, setSearchResult] = useState<UserSearchResult | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addDone, setAddDone] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // 친구 관리 상태
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [editMode, setEditMode] = useState(false); // 별칭·메모 수정 모드
  const [editAlias, setEditAlias] = useState("");
  const [editMemo, setEditMemo] = useState("");

  // Auth guard & Data Fetch
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) { router.replace("/login"); return; }
    setIsAuthed(true);

    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [friendsRes, chatsRes] = await Promise.all([
          apiFetch("/api/v1/friends"),
          apiFetch("/api/v1/chats"),
        ]);
        if (friendsRes.ok) {
          const fJson = await friendsRes.json();
          setFriends(fJson.data?.friends || []);
        }
        if (chatsRes.ok) {
          const cJson = await chatsRes.json();
          setRooms(cJson.data?.rooms || []);
          setHasNextRooms(cJson.data?.hasNext ?? false);
          setNextRoomCursorId(cJson.data?.nextCursorId ?? null);
          setNextRoomLastMessageAt(cJson.data?.nextLastMessageAt ?? null);
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
    return [...currentRooms.filter((r) => r.isPinned), ...currentRooms.filter((r) => !r.isPinned)];
  }, [searchQuery, rooms]);

  const totalUnread = rooms.reduce((s, r) => s + (r.unreadCount || 0), 0);

  const openAddFriend = () => {
    setPhoneInput(""); setSearchResult(null); setSearchError(""); setAddDone(false);
    setAddFriendOpen(true);
    setTimeout(() => phoneInputRef.current?.focus(), 100);
  };

  const openFriendProfile = (f: FriendItem) => {
    setSelectedFriend(f);
    setEditMode(false);
    setEditAlias(f.alias || "");
    setEditMemo("");
  };

  const closeFriendProfile = () => {
    setSelectedFriend(null);
    setEditMode(false);
  };

  const handleSearchUser = async () => {
    const phone = phoneInput.trim();
    if (!/^\d{2,3}-\d{3,4}-\d{4}$/.test(phone)) {
      setSearchError("전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)");
      return;
    }
    setSearching(true); setSearchError(""); setSearchResult(null); setAddDone(false);
    try {
      const res = await apiFetch("/api/v1/users/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (res.ok) {
        const json = await res.json();
        setSearchResult(json.data);
      } else {
        const json = await res.json();
        setSearchError(json.message || "사용자를 찾을 수 없습니다.");
      }
    } catch { setSearchError("검색 중 오류가 발생했습니다."); }
    finally { setSearching(false); }
  };

  const handleAddFriend = async () => {
    if (!searchResult) return;
    setAdding(true);
    try {
      const res = await apiFetch("/api/v1/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: searchResult.userId }),
      });
      if (res.ok) {
        setAddDone(true);
        const friendsRes = await apiFetch("/api/v1/friends");
        if (friendsRes.ok) {
          const json = await friendsRes.json();
          setFriends(json.data?.friends || []);
        }
      } else {
        const json = await res.json();
        setSearchError(json.message || "친구 추가에 실패했습니다.");
      }
    } catch { setSearchError("친구 추가 중 오류가 발생했습니다."); }
    finally { setAdding(false); }
  };

  // ── 친구 관리 핸들러 ──────────────────────────────────────────

  const handleUpdateFriend = async () => {
    if (!selectedFriend) return;
    setFriendActionLoading(true);
    try {
      const res = await apiFetch(`/api/v1/friends/${selectedFriend.friendId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alias: editAlias || undefined,
          memo: editMemo || undefined,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const updated = json.data;
        setFriends((prev) =>
          prev.map((f) =>
            f.friendId === selectedFriend.friendId
              ? { ...f, alias: updated.alias }
              : f
          )
        );
        setSelectedFriend((prev) => prev ? { ...prev, alias: updated.alias } : null);
        setEditMode(false);
        // 채팅방 제목은 별칭 기반이므로 목록 재조회
        apiFetch("/api/v1/chats")
          .then(async (r) => { if (r.ok) setRooms((await r.json()).data?.rooms || []); })
          .catch(() => {});
      } else {
        const json = await res.json().catch(() => ({}));
        alert((json as { message?: string }).message || "수정에 실패했습니다.");
      }
    } catch { alert("네트워크 오류가 발생했습니다."); }
    finally { setFriendActionLoading(false); }
  };

  const handleChangeStatus = async (status: "HIDDEN" | "BLOCK") => {
    if (!selectedFriend) return;
    const label = status === "BLOCK" ? "차단" : "숨기기";
    if (!confirm(`${selectedFriend.alias || selectedFriend.name}님을 ${label}하시겠습니까?`)) return;
    setFriendActionLoading(true);
    try {
      const res = await apiFetch(`/api/v1/friends/${selectedFriend.friendId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setFriends((prev) => prev.filter((f) => f.friendId !== selectedFriend.friendId));
        closeFriendProfile();
      } else {
        const json = await res.json().catch(() => ({}));
        alert((json as { message?: string }).message || `${label} 처리에 실패했습니다.`);
      }
    } catch { alert("네트워크 오류가 발생했습니다."); }
    finally { setFriendActionLoading(false); }
  };

  const handleDeleteFriend = async () => {
    if (!selectedFriend) return;
    if (!confirm(`${selectedFriend.alias || selectedFriend.name}님을 친구 목록에서 삭제하시겠습니까?`)) return;
    setFriendActionLoading(true);
    try {
      const res = await apiFetch(`/api/v1/friends/${selectedFriend.friendId}`, { method: "DELETE" });
      if (res.ok) {
        setFriends((prev) => prev.filter((f) => f.friendId !== selectedFriend.friendId));
        closeFriendProfile();
      } else {
        const json = await res.json().catch(() => ({}));
        alert((json as { message?: string }).message || "삭제에 실패했습니다.");
      }
    } catch { alert("네트워크 오류가 발생했습니다."); }
    finally { setFriendActionLoading(false); }
  };

  const handleLoadMoreRooms = async () => {
    if (!hasNextRooms || loadingMoreRooms) return;
    setLoadingMoreRooms(true);
    try {
      const params = new URLSearchParams({ size: "20" });
      if (nextRoomCursorId) params.set("cursorId", String(nextRoomCursorId));
      if (nextRoomLastMessageAt) params.set("lastMessageAt", nextRoomLastMessageAt);
      const res = await apiFetch(`/api/v1/chats?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setRooms((prev) => [...prev, ...(json.data?.rooms || [])]);
        setHasNextRooms(json.data?.hasNext ?? false);
        setNextRoomCursorId(json.data?.nextCursorId ?? null);
        setNextRoomLastMessageAt(json.data?.nextLastMessageAt ?? null);
      }
    } catch (e) {
      console.error("loadMoreRooms error", e);
    } finally {
      setLoadingMoreRooms(false);
    }
  };

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
            <h1 className="text-lg font-bold text-drac-fg">{tab === "friends" ? "친구" : "채팅"}</h1>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={tab === "friends" ? openAddFriend : undefined}
              className="w-9 h-9 rounded-full hover:bg-drac-current flex items-center justify-center text-drac-fg transition-colors"
            >
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
            <Users size={16} />친구
            <span className="text-[11px] text-drac-comment font-medium">{friends.length}</span>
          </button>
          <button
            onClick={() => { setTab("chats"); setSearchQuery(""); }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${tab === "chats" ? "bg-drac-bg text-drac-fg shadow-sm" : "text-drac-comment hover:text-drac-fg"}`}
          >
            <MessageCircle size={16} />채팅
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
                      <FriendRow key={f.friendId} friend={f} onSelect={openFriendProfile} />
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
                    <FriendRow key={f.friendId} friend={f} onSelect={openFriendProfile} />
                  ))}
                </ul>
              </div>
            </div>
          )
        ) : (
          sortedRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-16 h-16 bg-drac-current rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-7 h-7 text-drac-comment" />
              </div>
              <h3 className="text-lg font-bold text-drac-fg mb-1">채팅방이 없습니다</h3>
              <p className="text-sm text-drac-comment">새로운 채팅을 시작해보세요.</p>
            </div>
          ) : (
            <><ul className="divide-y divide-drac-current/60">
              {sortedRooms.map((room) => (
                <li key={room.chatRoomId}>
                  <Link href={`/chat/${room.chatRoomId}`} className="flex items-center gap-3.5 px-4 sm:px-6 py-3.5 hover:bg-drac-current/40 active:bg-drac-current/60 transition-colors cursor-pointer">
                    <div className="relative shrink-0">
                      <div className={`w-13 h-13 rounded-full bg-gradient-to-tr ${getGradient(room.chatRoomId)} flex items-center justify-center text-white shadow-md overflow-hidden relative`}>
                        {room.roomType === "SINGLE"
                          ? <span className="text-base font-bold">{room.roomTitle?.charAt(0)}</span>
                          : getRoomIcon(room.roomType)}
                        {room.roomImage && (
                          <img src={room.roomImage} alt="" className="absolute inset-0 w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        )}
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
            {hasNextRooms && !searchQuery.trim() && (
              <div className="px-4 sm:px-6 py-4">
                <button
                  onClick={handleLoadMoreRooms}
                  disabled={loadingMoreRooms}
                  className="w-full py-2.5 text-sm font-semibold text-drac-comment hover:text-drac-fg bg-drac-current/40 hover:bg-drac-current rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingMoreRooms ? (
                    <div className="w-4 h-4 border-2 border-drac-comment border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "채팅방 더 보기"
                  )}
                </button>
              </div>
            )}</>
          )
        )}
      </main>

      {/* ═══ 친구 프로필 모달 ═══ */}
      {selectedFriend && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={closeFriendProfile}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-drac-bg rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm shadow-2xl border border-drac-current overflow-hidden animate-[slideUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Profile Header */}
            <div className="relative h-28 bg-gradient-to-br from-drac-purple/30 via-drac-cyan/20 to-drac-pink/30">
              <button onClick={closeFriendProfile} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-drac-bg/80 backdrop-blur-sm flex items-center justify-center text-drac-fg hover:bg-drac-bg transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex justify-center -mt-10">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-tr ${getGradient(selectedFriend.targetId)} flex items-center justify-center text-white text-2xl font-bold shadow-lg border-4 border-drac-bg overflow-hidden`}>
                {(selectedFriend.alias || selectedFriend.name).charAt(0)}
              {selectedFriend.image && (
                <img src={selectedFriend.image} alt="" className="absolute inset-0 w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              </div>
            </div>

            {/* Info */}
            <div className="text-center px-6 pt-2 pb-1">
              <h2 className="text-xl font-bold text-drac-fg">{selectedFriend.alias || selectedFriend.name}</h2>
              {selectedFriend.alias && (
                <p className="text-sm text-drac-comment mt-0.5">이름: {selectedFriend.name}</p>
              )}
              {selectedFriend.isFavorite && (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Star size={12} className="fill-drac-yellow text-drac-yellow" />
                  <span className="text-xs text-drac-yellow font-medium">즐겨찾기</span>
                </div>
              )}
            </div>

            {/* 별칭·메모 수정 폼 */}
            {editMode ? (
              <div className="px-6 pt-3 pb-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-drac-comment mb-1">별칭 <span className="text-drac-comment/50 font-normal">(최대 20자)</span></label>
                  <input
                    type="text"
                    value={editAlias}
                    onChange={(e) => setEditAlias(e.target.value)}
                    maxLength={20}
                    placeholder={selectedFriend.name}
                    className="w-full px-3 py-2.5 bg-drac-current border border-transparent rounded-xl text-sm text-drac-fg placeholder:text-drac-comment/50 focus:border-drac-purple outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-drac-comment mb-1">메모 <span className="text-drac-comment/50 font-normal">(최대 200자)</span></label>
                  <textarea
                    value={editMemo}
                    onChange={(e) => setEditMemo(e.target.value)}
                    maxLength={200}
                    rows={2}
                    placeholder="메모를 입력하세요"
                    className="w-full px-3 py-2.5 bg-drac-current border border-transparent rounded-xl text-sm text-drac-fg placeholder:text-drac-comment/50 focus:border-drac-purple outline-none transition-all resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditMode(false)}
                    className="flex-1 py-2.5 bg-drac-current text-drac-comment font-semibold rounded-xl text-sm hover:bg-drac-comment/20 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleUpdateFriend}
                    disabled={friendActionLoading}
                    className="flex-1 py-2.5 bg-drac-purple text-white font-semibold rounded-xl text-sm hover:bg-drac-purple/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {friendActionLoading
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <CheckCircle2 size={15} />}
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 pb-6 pt-4 space-y-3">
                {/* 채팅하기 */}
                <button
                  onClick={async () => {
                    try {
                      const res = await apiFetch("/api/v1/chats", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ receiverId: selectedFriend.targetId }),
                      });
                      if (res.ok) {
                        const json = await res.json();
                        const chatRoomId = json.data?.chatRoomId;
                        if (chatRoomId) router.push(`/chat/${chatRoomId}`);
                      } else {
                        const json = await res.json().catch(() => ({}));
                        alert((json as { message?: string }).message || "채팅방을 생성할 수 없습니다.");
                      }
                    } catch (e) { console.error(e); }
                    finally { closeFriendProfile(); }
                  }}
                  className="w-full py-3.5 bg-drac-purple text-white font-bold rounded-2xl hover:bg-drac-purple/80 transition-colors shadow-md shadow-drac-purple/20 flex items-center justify-center gap-2 text-sm"
                >
                  <MessageSquare size={18} />채팅하기
                </button>

                {/* 관리 버튼들 */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => { setEditAlias(selectedFriend.alias || ""); setEditMemo(""); setEditMode(true); }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-drac-current hover:bg-drac-comment/20 transition-colors group"
                  >
                    <Pencil size={18} className="text-drac-purple group-hover:text-drac-pink transition-colors" />
                    <span className="text-[10px] font-semibold text-drac-comment">별칭·메모</span>
                  </button>

                  <button
                    onClick={() => handleChangeStatus("HIDDEN")}
                    disabled={friendActionLoading}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-drac-current hover:bg-drac-comment/20 transition-colors group disabled:opacity-50"
                  >
                    <EyeOff size={18} className="text-drac-comment group-hover:text-drac-fg transition-colors" />
                    <span className="text-[10px] font-semibold text-drac-comment">숨기기</span>
                  </button>

                  <button
                    onClick={() => handleChangeStatus("BLOCK")}
                    disabled={friendActionLoading}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-drac-current hover:bg-orange-500/10 transition-colors group disabled:opacity-50"
                  >
                    <ShieldBan size={18} className="text-orange-400 group-hover:text-orange-500 transition-colors" />
                    <span className="text-[10px] font-semibold text-orange-400">차단</span>
                  </button>

                  <button
                    onClick={handleDeleteFriend}
                    disabled={friendActionLoading}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-drac-current hover:bg-red-500/10 transition-colors group disabled:opacity-50"
                  >
                    <Trash2 size={18} className="text-red-400 group-hover:text-red-500 transition-colors" />
                    <span className="text-[10px] font-semibold text-red-400">삭제</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ 친구 추가 모달 ═══ */}
      {addFriendOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={() => setAddFriendOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-drac-bg rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm shadow-2xl border border-drac-current overflow-hidden animate-[slideUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-drac-current">
              <div className="flex items-center gap-2">
                <UserPlus size={20} className="text-drac-purple" />
                <h2 className="text-lg font-bold text-drac-fg">친구 추가</h2>
              </div>
              <button onClick={() => setAddFriendOpen(false)} className="w-8 h-8 rounded-full hover:bg-drac-current flex items-center justify-center text-drac-comment transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-drac-comment">전화번호로 검색</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-drac-comment" />
                    <input
                      ref={phoneInputRef}
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => { setPhoneInput(e.target.value); setSearchError(""); setSearchResult(null); setAddDone(false); }}
                      onKeyDown={(e) => e.key === "Enter" && handleSearchUser()}
                      placeholder="010-1234-5678"
                      className="w-full pl-10 pr-3 py-3 bg-drac-current border border-transparent rounded-xl text-sm text-drac-fg placeholder:text-drac-comment/50 outline-none focus:border-drac-purple transition-all"
                    />
                  </div>
                  <button
                    onClick={handleSearchUser}
                    disabled={searching || !phoneInput.trim()}
                    className="px-4 py-3 bg-drac-purple text-white text-sm font-bold rounded-xl hover:bg-drac-purple/80 transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {searching ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={15} />}
                    검색
                  </button>
                </div>
                {searchError && <p className="text-xs text-red-400 font-medium mt-0.5">{searchError}</p>}
              </div>

              {searchResult && (
                <div className="bg-drac-current rounded-2xl p-4 flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${getGradient(searchResult.userId)} flex items-center justify-center text-white text-lg font-bold shrink-0`}>
                    {searchResult.nickname.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-drac-fg truncate">{searchResult.nickname}</p>
                    <p className="text-xs text-drac-comment mt-0.5">{searchResult.phone}</p>
                  </div>
                  {addDone ? (
                    <div className="flex items-center gap-1.5 text-drac-green text-sm font-bold shrink-0">
                      <UserCheck size={18} />추가됨
                    </div>
                  ) : (
                    <button
                      onClick={handleAddFriend}
                      disabled={adding}
                      className="px-3.5 py-2 bg-drac-purple text-white text-xs font-bold rounded-xl hover:bg-drac-purple/80 transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                    >
                      {adding ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus size={14} />}
                      친구 추가
                    </button>
                  )}
                </div>
              )}
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
        <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${getGradient(friend.targetId)} flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0 overflow-hidden relative`}>
          {(friend.alias || friend.name).charAt(0)}
          {friend.image && (
            <img src={friend.image} alt="" className="absolute inset-0 w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] text-drac-fg truncate">{friend.alias || friend.name}</p>
          {friend.alias && <p className="text-xs text-drac-comment truncate">{friend.name}</p>}
        </div>
        {friend.isFavorite && <Star size={14} className="fill-drac-yellow text-drac-yellow shrink-0" />}
      </button>
    </li>
  );
}
