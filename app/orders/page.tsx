"use client";

import ThemeToggle from "@/app/components/ThemeToggle";
import { apiFetch } from "@/app/lib/apiFetch";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CreditCard,
  ReceiptText,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ── 타입 정의 ─────────────────────────────────────────────────────────────────

type OrderStatus =
  | "CREATED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "CANCELED"
  | "EXPIRED"
  | "REFUNDED"
  | "COMPLETED";

type PaymentStatus =
  | "READY"
  | "PENDING"
  | "PAID"
  | "ABORTED"
  | "FAILED"
  | "CANCELED"
  | "INVALID";

interface OrderSummary {
  orderId: number;
  orderNumber: string;
  orderTitle: string;
  orderStatus: OrderStatus;
  finalAmount: number;
  createdAt: string;
}

interface PageInfo {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

interface OrderInfo {
  orderId: number;
  orderNumber: string;
  orderTitle: string;
  originalAmount: number;
  discountAmount: number;
  pointUsedAmount: number;
  finalAmount: number;
}

interface OrderItemInfo {
  productName: string;
  optionSummary: string;
  productAmount: number;
  quantity: number;
  productImageUrl: string;
}

interface PaymentInfo {
  paymentId: number;
  status: PaymentStatus;
  pgProvider: string;
  totalAmount: number;
  requestedAt: string;
  approvedAt: string;
}

interface OrderDetail {
  orderInfo: OrderInfo;
  orderItemInfoList: OrderItemInfo[];
  paymentInfo: PaymentInfo[];
}

// ── 상태 뱃지 헬퍼 ─────────────────────────────────────────────────────────────

const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; icon: React.ReactNode; cls: string }
> = {
  CREATED: {
    label: "주문 생성",
    icon: <Clock size={13} />,
    cls: "bg-drac-comment/20 text-drac-comment border-drac-comment/40",
  },
  PAYMENT_PENDING: {
    label: "결제 대기",
    icon: <Clock size={13} />,
    cls: "bg-drac-yellow/20 text-drac-yellow border-drac-yellow/40",
  },
  PAID: {
    label: "결제 완료",
    icon: <CheckCircle2 size={13} />,
    cls: "bg-drac-green/20 text-drac-green border-drac-green/40",
  },
  CANCELED: {
    label: "주문 취소",
    icon: <XCircle size={13} />,
    cls: "bg-red-500/20 text-red-400 border-red-400/40",
  },
  EXPIRED: {
    label: "기간 만료",
    icon: <AlertCircle size={13} />,
    cls: "bg-drac-comment/20 text-drac-comment border-drac-comment/40",
  },
  REFUNDED: {
    label: "환불 완료",
    icon: <RefreshCcw size={13} />,
    cls: "bg-drac-cyan/20 text-drac-cyan border-drac-cyan/40",
  },
  COMPLETED: {
    label: "구매 확정",
    icon: <CheckCircle2 size={13} />,
    cls: "bg-drac-purple/20 text-drac-purple border-drac-purple/40",
  },
};

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status] ?? {
    label: status,
    icon: null,
    cls: "bg-drac-comment/20 text-drac-comment border-drac-comment/40",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.cls}`}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── 주문 상세 패널 ─────────────────────────────────────────────────────────────

function OrderDetailPanel({ orderId }: { orderId: number }) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiFetch(`/api/v1/orders/${orderId}`);
        const json = await res.json();
        if (json.data) {
          setDetail(json.data as OrderDetail);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  if (loading)
    return (
      <div className="py-6 flex justify-center">
        <Loader2 size={20} className="animate-spin text-drac-comment" />
      </div>
    );

  if (error || !detail)
    return (
      <p className="py-4 text-center text-sm text-drac-comment">
        상세 정보를 불러올 수 없습니다.
      </p>
    );

  const { orderInfo, orderItemInfoList, paymentInfo } = detail;

  return (
    <div className="flex flex-col gap-5 pt-2 pb-4 px-1">
      {/* 상품 목록 */}
      <div className="flex flex-col gap-3">
        {orderItemInfoList.map((item, i) => (
          <div key={i} className="flex items-center gap-4">
            {item.productImageUrl ? (
              <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-drac-current">
                <Image
                  src={item.productImageUrl}
                  alt={item.productName}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-drac-current shrink-0 flex items-center justify-center">
                <Package size={20} className="text-drac-comment" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-drac-fg truncate">{item.productName}</p>
              {item.optionSummary && (
                <p className="text-xs text-drac-comment mt-0.5">{item.optionSummary}</p>
              )}
              <p className="text-xs text-drac-comment mt-1">
                {item.productAmount.toLocaleString()}원 × {item.quantity}개
              </p>
            </div>
            <p className="text-sm font-bold text-drac-fg shrink-0">
              {(item.productAmount * item.quantity).toLocaleString()}원
            </p>
          </div>
        ))}
      </div>

      {/* 금액 요약 */}
      <div className="rounded-2xl bg-drac-current/50 p-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between text-drac-comment">
          <span>상품 금액</span>
          <span>{orderInfo.originalAmount.toLocaleString()}원</span>
        </div>
        {orderInfo.discountAmount > 0 && (
          <div className="flex justify-between text-drac-green">
            <span>할인 금액</span>
            <span>-{orderInfo.discountAmount.toLocaleString()}원</span>
          </div>
        )}
        {orderInfo.pointUsedAmount > 0 && (
          <div className="flex justify-between text-drac-cyan">
            <span>포인트 사용</span>
            <span>-{orderInfo.pointUsedAmount.toLocaleString()}원</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-drac-fg pt-2 border-t border-drac-comment/20 mt-1">
          <span>최종 결제 금액</span>
          <span>{orderInfo.finalAmount.toLocaleString()}원</span>
        </div>
      </div>

      {/* 결제 정보 */}
      {paymentInfo.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-drac-comment tracking-wider">결제 정보</p>
          {paymentInfo.map((p) => (
            <div
              key={p.paymentId}
              className="flex items-center justify-between text-xs text-drac-comment gap-3"
            >
              <span className="flex items-center gap-1.5 shrink-0">
                <CreditCard size={12} className="text-drac-purple" />
                {p.pgProvider === "TOSS_PAYMENTS" ? "토스페이먼츠" : p.pgProvider}
              </span>
              <span className="font-bold text-drac-fg shrink-0">
                {p.totalAmount.toLocaleString()}원
              </span>
              {p.approvedAt && (
                <span className="text-drac-comment truncate">{formatDate(p.approvedAt)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 주문 카드 ─────────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: OrderSummary }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-drac-bg border border-drac-current rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-drac-current/30 transition-colors text-left"
      >
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <OrderStatusBadge status={order.orderStatus} />
            <span className="text-xs text-drac-comment">{formatDate(order.createdAt)}</span>
          </div>
          <p className="text-sm font-bold text-drac-fg truncate">{order.orderTitle}</p>
          <p className="text-xs text-drac-comment font-mono">#{order.orderNumber}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-4">
          <span className="text-base font-extrabold text-drac-fg">
            {order.finalAmount.toLocaleString()}원
          </span>
          {expanded ? (
            <ChevronUp size={18} className="text-drac-comment" />
          ) : (
            <ChevronDown size={18} className="text-drac-comment" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-drac-current px-5">
          <OrderDetailPanel orderId={order.orderId} />
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      router.push("/login");
      return;
    }

    void (async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/v1/orders?page=${page}&size=10`);
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const json = await res.json();
        if (json.data) {
          setOrders((json.data.orders as OrderSummary[]) ?? []);
          setPageInfo((json.data.pageInfo as PageInfo) ?? null);
        }
      } catch (err) {
        console.error("주문 목록 조회 실패", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [page, router]);

  return (
    <div className="min-h-screen bg-drac-bg text-drac-fg font-sans pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-drac-bg/80 border-b border-drac-comment/50 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-drac-current flex items-center justify-center hover:text-drac-pink transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <ReceiptText size={20} className="text-drac-purple" />
            <h1 className="text-lg font-bold">주문 내역</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-drac-current rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-drac-current flex items-center justify-center">
              <Package size={32} className="text-drac-comment" />
            </div>
            <div>
              <p className="font-bold text-drac-fg text-lg mb-1">
                아직 주문 내역이 없습니다
              </p>
              <p className="text-drac-comment text-sm">
                상품을 구매하면 여기서 확인할 수 있어요.
              </p>
            </div>
            <Link
              href="/"
              className="mt-2 px-6 py-2.5 bg-drac-purple text-drac-bg font-bold rounded-xl hover:bg-drac-purple/80 transition-colors shadow-md flex items-center gap-2"
            >
              <Sparkles size={16} />
              쇼핑 계속하기
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <OrderCard key={order.orderId} order={order} />
            ))}

            {/* 페이지네이션 */}
            {pageInfo && pageInfo.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 rounded-xl border border-drac-current text-sm font-bold disabled:opacity-40 hover:border-drac-pink hover:text-drac-pink transition-colors disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <span className="text-sm text-drac-comment">
                  {page + 1} / {pageInfo.totalPages}
                </span>
                <button
                  disabled={!pageInfo.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 rounded-xl border border-drac-current text-sm font-bold disabled:opacity-40 hover:border-drac-pink hover:text-drac-pink transition-colors disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
