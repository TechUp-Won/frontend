"use client";

import ThemeToggle from "@/app/components/ThemeToggle";
import { apiFetch } from "@/app/lib/apiFetch";
import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { Client } from "@stomp/stompjs";
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Gift,
  Smile,
  MoreVertical,
  Phone,
  Search,
  Users,
  Heart,
  Reply,
  ChevronDown,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
interface ChatMessageItem {
  messageId: number;
  senderId: number;
  isMe: boolean;
  senderName: string;
  content: string;
  messageType: "TEXT" | "IMAGE" | "GIFT" | "ALARM";
  likeCount: number;
  createdAt: string;
  answerMessage?: {
    messageId: number;
    senderName: string;
    content: string;
  } | null;
}

interface RoomInfo {
  chatRoomId: number;
  roomTitle: string;
  roomType: "SINGLE" | "GROUP" | "ALARM";
  participantCount: number;
  participants?: { userId: number; nickname: string }[];
}

// myUserId는 런타임에 localStorage에서 읽어옴 (아래 컴포넌트 state 참고)

// ── Helpers ────────────────────────────────────────────────────
function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function getAvatarColor(id: number): string {
  const colors = [
    "from-drac-cyan to-drac-purple",
    "from-drac-pink to-drac-orange",
    "from-drac-green to-drac-cyan",
    "from-drac-purple to-drac-pink",
    "from-drac-orange to-drac-yellow",
  ];
  return colors[id % colors.length];
}

function shouldShowDateDivider(
  messages: ChatMessageItem[],
  index: number
): boolean {
  if (index === 0) return true;
  const curr = new Date(messages[index].createdAt).toDateString();
  const prev = new Date(messages[index - 1].createdAt).toDateString();
  return curr !== prev;
}

function shouldShowAvatar(messages: ChatMessageItem[], index: number): boolean {
  const msg = messages[index];
  if (msg.isMe) return false;
  if (index === 0) return true;
  return messages[index - 1].senderId !== msg.senderId;
}

function shouldShowTime(messages: ChatMessageItem[], index: number): boolean {
  const msg = messages[index];
  if (index === messages.length - 1) return true;
  const next = messages[index + 1];
  if (next.senderId !== msg.senderId) return true;
  const currMin = new Date(msg.createdAt).getMinutes();
  const nextMin = new Date(next.createdAt).getMinutes();
  return currMin !== nextMin;
}

// ── Component ──────────────────────────────────────────────────
export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;
  const [isAuthed, setIsAuthed] = useState(false);

  const [room, setRoom] = useState<RoomInfo>({
    chatRoomId: Number(roomId),
    roomTitle: "채팅방",
    roomType: "SINGLE",
    participantCount: 2,
    participants: [],
  });
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [olderCursorId, setOlderCursorId] = useState<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessageItem | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stompClientRef = useRef<Client | null>(null);
  const myUserIdRef = useRef<number>(0);
  // 낙관적 메시지의 tempId → 실제 messageId 교체용
  const pendingTempIdRef = useRef<number | null>(null);

  const parseMessage = useCallback((m: any): ChatMessageItem => ({
    messageId: m.messageId,
    senderId: m.senderId ?? 0,
    isMe: m.isMe ?? false,
    senderName: m.nickname ?? m.senderName ?? "알 수 없음",
    content: m.content ?? "",
    messageType: m.messageType ?? "TEXT",
    likeCount: m.likeCount ?? 0,
    createdAt: m.createdAt ?? new Date().toISOString(),
    answerMessage: m.answerMessage ?? null,
  }), []);

  // REST로 최신 메시지를 가져와 기존 목록에 병합 (중복 제외)
  const fetchAndMergeLatest = useCallback(async (knownIds: Set<number>) => {
    try {
      const res = await apiFetch(`/api/v1/chats/${roomId}/messages?size=20`);
      if (!res.ok) return;
      const json = await res.json();
      // 백엔드는 DESC 순서로 반환 → ASC로 뒤집음
      const fetched: ChatMessageItem[] = [...(json.data?.messageList ?? [])]
        .reverse()
        .map(parseMessage);
      const toAdd = fetched.filter((m) => !knownIds.has(m.messageId));
      if (toAdd.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.filter(m => m.messageId > 0).map(m => m.messageId));
          const reallyNew = toAdd.filter(m => !existingIds.has(m.messageId));
          if (reallyNew.length === 0) return prev;
          // 낙관적 메시지(tempId < 0)는 유지, 실제 ID로 정렬
          const withoutTemp = prev.filter(m => m.messageId > 0);
          return [...withoutTemp, ...reallyNew].sort((a, b) => a.messageId - b.messageId);
        });
      }
    } catch (e) {
      console.error("fetchAndMergeLatest error", e);
    }
  }, [roomId, parseMessage]);

  const loadOlderMessages = useCallback(async () => {
    if (!hasOlderMessages || loadingOlder || olderCursorId === null) return;
    setLoadingOlder(true);

    const scrollEl = scrollContainerRef.current;
    const prevScrollHeight = scrollEl?.scrollHeight ?? 0;

    try {
      const res = await apiFetch(
        `/api/v1/chats/${roomId}/messages?cursorId=${olderCursorId}&size=20`
      );
      if (!res.ok) return;
      const json = await res.json();
      const older: ChatMessageItem[] = [...(json.data?.messageList ?? [])]
        .reverse()
        .map(parseMessage);

      setMessages((prev) => {
        const existingIds = new Set(prev.filter((m) => m.messageId > 0).map((m) => m.messageId));
        const toAdd = older.filter((m) => !existingIds.has(m.messageId));
        return [...toAdd, ...prev];
      });
      setHasOlderMessages(json.data?.hasNext ?? false);
      setOlderCursorId(json.data?.nextCursorId ?? null);

      // 스크롤 위치 복원: 이전 scrollHeight와의 차이만큼 보정
      requestAnimationFrame(() => {
        if (scrollEl) {
          scrollEl.scrollTop = scrollEl.scrollHeight - prevScrollHeight;
        }
      });
    } catch (e) {
      console.error("loadOlderMessages error", e);
    } finally {
      setLoadingOlder(false);
    }
  }, [hasOlderMessages, loadingOlder, olderCursorId, roomId, parseMessage]);

  // Auth guard & 초기 데이터 로드
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    setIsAuthed(true);

    const userInfoRaw = localStorage.getItem("userInfo");
    myUserIdRef.current = userInfoRaw ? (JSON.parse(userInfoRaw).authId ?? 0) : 0;

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [roomRes, msgRes] = await Promise.all([
          apiFetch("/api/v1/chats"),
          apiFetch(`/api/v1/chats/${roomId}/messages?size=100`),
        ]);

        if (roomRes.ok) {
          const json = await roomRes.json();
          const rooms = json.data?.rooms ?? [];
          const found = rooms.find((r: any) => r.chatRoomId === Number(roomId));
          if (found) {
            setRoom({
              chatRoomId: found.chatRoomId,
              roomTitle: found.roomTitle ?? "채팅방",
              roomType: found.roomType,
              participantCount: found.participantCount ?? 2,
              participants: [],
            });
          }
        }

        if (msgRes.ok) {
          const json = await msgRes.json();
          // 백엔드가 DESC로 반환 → ASC 정렬
          const msgs = [...(json.data?.messageList ?? [])].reverse().map(parseMessage);
          setMessages(msgs);
          setHasOlderMessages(json.data?.hasNext ?? false);
          setOlderCursorId(json.data?.nextCursorId ?? null);
        }
      } catch (err) {
        console.error("Failed to load chat details", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [roomId, router, parseMessage]);

  // STOMP WebSocket 연결
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token || !roomId) return;

    const client = new Client({
      brokerURL: "ws://localhost:8080/ws",
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/sub/chat/room/${roomId}`, (frame) => {
          try {
            const data = JSON.parse(frame.body);
            const incomingId: number = data.messageId;

            setMessages((prev) => {
              const knownIds = new Set(prev.filter(m => m.messageId > 0).map(m => m.messageId));

              if (knownIds.has(incomingId)) {
                // 이미 아는 메시지 → 낙관적 tempId 교체만
                const tempId = pendingTempIdRef.current;
                if (tempId !== null) {
                  pendingTempIdRef.current = null;
                  return prev.map(m => m.messageId === tempId ? { ...m, messageId: incomingId } : m);
                }
                return prev;
              }

              // 모르는 messageId → REST로 전체 fetch (비동기, setState 밖에서)
              fetchAndMergeLatest(knownIds);
              return prev;
            });
          } catch (e) {
            console.error("STOMP message parse error", e);
          }
        });
      },
      onStompError: (frame) => {
        console.error("STOMP error", frame.headers["message"]);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
      stompClientRef.current = null;
    };
  }, [roomId, fetchAndMergeLatest]);

  // Auto-scroll to bottom on mount and when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(distFromBottom > 200);
    if (el.scrollTop < 80 && hasOlderMessages && !loadingOlder) {
      loadOlderMessages();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const content = inputValue.trim();
    const currentReplyTo = replyTo;
    setInputValue("");
    setReplyTo(null);

    // 낙관적 업데이트: 즉시 화면에 표시 (tempId는 음수)
    const tempId = -Date.now();
    const userInfoRaw = localStorage.getItem("userInfo");
    const nickname = userInfoRaw ? (JSON.parse(userInfoRaw).nickname ?? "나") : "나";
    const optimistic: ChatMessageItem = {
      messageId: tempId,
      senderId: myUserIdRef.current,
      isMe: true,
      senderName: nickname,
      content,
      messageType: "TEXT",
      likeCount: 0,
      createdAt: new Date().toISOString(),
      answerMessage: currentReplyTo
        ? { messageId: currentReplyTo.messageId, senderName: currentReplyTo.senderName, content: currentReplyTo.content }
        : null,
    };
    pendingTempIdRef.current = tempId;
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await apiFetch(`/api/v1/chats/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          messageType: "TEXT",
          answerMessageId: currentReplyTo ? currentReplyTo.messageId : null,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const realId: number = json.data?.messageId;
        if (realId) {
          // REST 응답으로 tempId를 실제 ID로 교체 (STOMP가 늦게 오는 경우 대비)
          pendingTempIdRef.current = null;
          setMessages((prev) =>
            prev.map((m) => (m.messageId === tempId ? { ...m, messageId: realId } : m))
          );
        }
      } else {
        // 전송 실패 시 낙관적 메시지 제거
        pendingTempIdRef.current = null;
        setMessages((prev) => prev.filter((m) => m.messageId !== tempId));
      }
    } catch (err) {
      console.error(err);
      pendingTempIdRef.current = null;
      setMessages((prev) => prev.filter((m) => m.messageId !== tempId));
    }
  };

  if (!isAuthed || loading) {
    return (
      <div className="h-screen bg-drac-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-drac-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-drac-bg text-drac-fg font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 z-50 backdrop-blur-xl bg-drac-bg/90 border-b border-drac-comment/20">
        <div className="max-w-2xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => router.push("/chat")}
              className="w-9 h-9 rounded-full bg-drac-current flex items-center justify-center hover:bg-drac-comment/30 text-drac-fg transition-colors shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-[15px] font-bold text-drac-fg truncate">
                  {room.roomTitle}
                </h1>
                {room.roomType === "GROUP" && (
                  <span className="text-xs text-drac-comment font-medium">
                    {room.participantCount}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <ThemeToggle />
            <button className="w-9 h-9 rounded-full hover:bg-drac-current flex items-center justify-center text-drac-comment transition-colors">
              <Search size={18} />
            </button>
            {room.roomType !== "ALARM" && (
              <button className="w-9 h-9 rounded-full hover:bg-drac-current flex items-center justify-center text-drac-comment transition-colors">
                <Phone size={18} />
              </button>
            )}
            <button className="w-9 h-9 rounded-full hover:bg-drac-current flex items-center justify-center text-drac-comment transition-colors">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-4 scroll-smooth"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 80%, color-mix(in srgb, var(--drac-purple) 8%, transparent) 0%, transparent 50%), radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--drac-cyan) 8%, transparent) 0%, transparent 50%)",
          backgroundSize: "100% 100%",
          backgroundAttachment: "fixed",
          opacity: 1,
        }}
      >
        <div className="max-w-2xl mx-auto space-y-0.5">
          {loadingOlder && (
            <div className="flex justify-center py-3">
              <div className="w-5 h-5 border-2 border-drac-purple border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!hasOlderMessages && messages.length > 0 && (
            <div className="flex justify-center py-3">
              <span className="text-[11px] text-drac-comment/60 bg-drac-current/50 px-3 py-1 rounded-full">
                대화의 시작입니다
              </span>
            </div>
          )}
          {messages.length === 0 && (
            <div className="flex justify-center items-center h-32 text-drac-comment text-sm">
              첫 메시지를 보내보세요.
            </div>
          )}
          {messages.map((msg, index) => {
            const isMe = msg.isMe;
            const showDate = shouldShowDateDivider(messages, index);
            const showAvatar = shouldShowAvatar(messages, index);
            const showTime = shouldShowTime(messages, index);

            return (
              <div key={msg.messageId}>
                {/* Date Divider */}
                {showDate && (
                  <div className="flex items-center justify-center my-5">
                    <span className="px-4 py-1.5 bg-drac-current/80 backdrop-blur-sm text-drac-comment text-[11px] font-medium rounded-full">
                      {formatDateDivider(msg.createdAt)}
                    </span>
                  </div>
                )}

                {/* Message Row */}
                <div
                  className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"} ${showAvatar || isMe ? "mt-3" : "mt-0.5"}`}
                >
                  {/* Avatar (only for others) */}
                  {!isMe && (
                    <div className="w-9 shrink-0">
                      {showAvatar && (
                        <div
                          className={`w-9 h-9 rounded-full bg-gradient-to-tr ${getAvatarColor(msg.senderId)} flex items-center justify-center text-white text-xs font-bold shadow-md`}
                        >
                          {msg.senderName.charAt(0)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bubble area */}
                  <div
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%] sm:max-w-[65%]`}
                  >
                    {/* Sender Name (group only, for others) */}
                    {!isMe && showAvatar && room.roomType === "GROUP" && (
                      <span className="text-[12px] font-semibold text-drac-comment mb-1 ml-1">
                        {msg.senderName}
                      </span>
                    )}

                    {/* Reply reference */}
                    {msg.answerMessage && (
                      <div
                        className={`text-[11px] px-3 py-1.5 mb-0.5 rounded-xl ${
                          isMe
                            ? "bg-drac-purple/20 text-drac-purple"
                            : "bg-drac-current text-drac-comment"
                        } max-w-full truncate`}
                      >
                        <span className="font-semibold">
                          {msg.answerMessage.senderName}
                        </span>
                        <span className="mx-1">·</span>
                        <span className="opacity-80">
                          {msg.answerMessage.content}
                        </span>
                      </div>
                    )}

                    <div
                      className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {/* Bubble */}
                      <div
                        className={`group relative px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed break-words whitespace-pre-wrap transition-shadow ${
                          isMe
                            ? "bg-drac-purple text-white rounded-br-md shadow-md shadow-drac-purple/20"
                            : "bg-drac-current text-drac-fg rounded-bl-md shadow-sm"
                        }`}
                      >
                        {msg.content}

                        {/* Like indicator */}
                        {msg.likeCount > 0 && (
                          <span
                            className={`absolute -bottom-2.5 ${isMe ? "left-1" : "right-1"} flex items-center gap-0.5 bg-drac-bg border border-drac-current rounded-full px-1.5 py-0.5 text-[10px] shadow-sm`}
                          >
                            <Heart
                              size={10}
                              className="fill-drac-pink text-drac-pink"
                            />
                            <span className="text-drac-fg font-medium">
                              {msg.likeCount}
                            </span>
                          </span>
                        )}

                        {/* Hover actions */}
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 ${isMe ? "-left-16" : "-right-16"} hidden group-hover:flex items-center gap-0.5`}
                        >
                          <button
                            onClick={() => setReplyTo(msg)}
                            className="w-7 h-7 rounded-full bg-drac-current hover:bg-drac-comment/30 flex items-center justify-center text-drac-comment transition-colors"
                          >
                            <Reply size={13} />
                          </button>
                          <button className="w-7 h-7 rounded-full bg-drac-current hover:bg-drac-comment/30 flex items-center justify-center text-drac-comment transition-colors">
                            <Heart size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Time */}
                      {showTime && (
                        <span className="text-[10px] text-drac-comment/70 shrink-0 pb-0.5">
                          {formatMessageTime(msg.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 w-10 h-10 bg-drac-current border border-drac-comment/30 rounded-full flex items-center justify-center text-drac-fg shadow-lg hover:bg-drac-comment/30 transition-colors z-40"
        >
          <ChevronDown size={20} />
        </button>
      )}

      {/* Reply Bar */}
      {replyTo && (
        <div className="shrink-0 bg-drac-current/80 backdrop-blur-sm border-t border-drac-comment/20 px-4 sm:px-6 py-2">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <Reply size={14} className="text-drac-purple shrink-0" />
            <div className="flex-1 min-w-0 text-xs">
              <span className="font-semibold text-drac-purple">
                {replyTo.senderName}
              </span>
              <span className="text-drac-comment mx-1">·</span>
              <span className="text-drac-comment truncate">
                {replyTo.content}
              </span>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="text-drac-comment hover:text-drac-fg text-lg leading-none transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="shrink-0 bg-drac-bg border-t border-drac-comment/20">
        <form
          onSubmit={handleSend}
          className="max-w-2xl mx-auto px-3 sm:px-6 py-3 flex items-end gap-2"
        >
          {/* Attachment Buttons */}
          <div className="flex items-center gap-0.5 shrink-0 pb-1">
            <button
              type="button"
              className="w-9 h-9 rounded-full hover:bg-drac-current flex items-center justify-center text-drac-comment transition-colors"
            >
              <ImageIcon size={20} />
            </button>
            <button
              type="button"
              className="w-9 h-9 rounded-full hover:bg-drac-current flex items-center justify-center text-drac-comment transition-colors"
            >
              <Gift size={20} />
            </button>
          </div>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as unknown as FormEvent);
                }
              }}
              placeholder="메시지를 입력하세요..."
              rows={1}
              className="w-full resize-none bg-drac-current border border-transparent rounded-2xl px-4 py-2.5 pr-10 text-sm text-drac-fg placeholder:text-drac-comment/60 outline-none focus:border-drac-comment/40 transition-all max-h-32"
              style={{ minHeight: "40px" }}
            />
            <button
              type="button"
              className="absolute right-3 bottom-2.5 text-drac-comment hover:text-drac-yellow transition-colors"
            >
              <Smile size={18} />
            </button>
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="w-10 h-10 rounded-full bg-drac-purple text-white flex items-center justify-center hover:bg-drac-purple/80 transition-all shadow-md shadow-drac-purple/20 disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed shrink-0"
          >
            <Send size={18} className="translate-x-[1px]" />
          </button>
        </form>
      </div>
    </div>
  );
}
