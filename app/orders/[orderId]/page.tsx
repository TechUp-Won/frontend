"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Package, Loader2, MapPin, CreditCard, XCircle, Trash2 } from "lucide-react";
import { apiFetch } from "@/app/lib/api";

type OrderStatus =
  | "CREATED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "CANCELED"
  | "EXPIRED"
  | "REFUNDED"
  | "COMPLETED";

interface OrderDetailResponse {
  orderInfo: {
    orderId: number;
    orderNumber: string;
    orderTitle: string;
    originalAmount: number;
    discountAmount: number;
    pointUsedAmount: number;
    finalAmount: number;
  };
  orderItemInfoList: {
    productName: string;
    optionSummary: string;
    productAmount: number;
    quantity: number;
    productImageUrl: string;
  }[];
  paymentInfo: {
    paymentId: number;
    status: string;
    pgProvider: string;
    totalAmount: number;
    requestedAt: string;
    approvedAt: string | null;
  }[];
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  CREATED: "주문생성",
  PAYMENT_PENDING: "결제대기",
  PAID: "결제완료",
  CANCELED: "취소됨",
  EXPIRED: "만료됨",
  REFUNDED: "환불됨",
  COMPLETED: "구매확정",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  READY: "결제 준비",
  PENDING: "결제 진행 중",
  PAID: "결제 완료",
  FAILED: "결제 실패",
  ABORTED: "결제 중단",
  CANCELED: "결제 취소",
  INVALID: "비정상 결제",
};

export default function OrderDetailPage() {
  const router = useRouter();
  const { orderId } = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const orderStatus = searchParams.get("status") as OrderStatus | null;
  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<"cancel" | "delete" | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    void fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function handleCancel() {
    if (!confirm("주문을 취소하시겠습니까?")) return;
    setActionLoading("cancel");
    setActionError("");
    const res = await apiFetch(`/api/v1/orders/${orderId}/cancel`, { method: "PATCH" });
    setActionLoading(null);
    if (res.ok) {
      router.replace("/orders");
    } else {
      setActionError(res.message || "주문 취소에 실패했습니다.");
    }
  }

  async function handleDelete() {
    if (!confirm("주문 내역을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.")) return;
    setActionLoading("delete");
    setActionError("");
    const res = await apiFetch(`/api/v1/orders/${orderId}`, { method: "DELETE" });
    setActionLoading(null);
    if (res.ok) {
      router.replace("/orders");
    } else {
      setActionError(res.message || "주문 삭제에 실패했습니다.");
    }
  }

  async function fetchOrder() {
    setLoading(true);
    const res = await apiFetch<OrderDetailResponse>(`/api/v1/orders/${orderId}`);
    if (res.ok && res.data) {
      setOrder(res.data);
    } else {
      setError(res.message || "주문 정보를 불러오지 못했습니다.");
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-drac-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-drac-pink" size={32} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-drac-bg flex flex-col items-center justify-center gap-4 text-drac-fg p-6">
        <p className="text-red-400">{error || "주문을 찾을 수 없습니다."}</p>
        <button onClick={() => router.back()} className="text-drac-purple underline">뒤로</button>
      </div>
    );
  }

  const { orderInfo, orderItemInfoList, paymentInfo } = order;
  const latestPayment = paymentInfo[paymentInfo.length - 1];

  return (
    <div className="min-h-screen bg-drac-bg text-drac-fg font-sans">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-drac-bg/80 border-b border-drac-comment/50">
        <div className="max-w-3xl mx-auto h-16 px-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-drac-current flex items-center justify-center">
              <ArrowLeft size={20} />
            </div>
            <span className="font-semibold">뒤로</span>
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package size={20} className="text-drac-purple" /> 주문 상세
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        {/* 주문 번호 / 상태 */}
        <section className="bg-drac-bg border border-drac-current rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-drac-comment font-mono mb-1">{orderInfo.orderNumber}</p>
              <p className="font-bold text-lg">{orderInfo.orderTitle}</p>
            </div>
          </div>
          <p className="text-xs text-drac-comment mt-2">주문 번호</p>
        </section>

        {/* 주문 상품 */}
        <section className="bg-drac-bg border border-drac-current rounded-3xl p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Package size={18} className="text-drac-purple" /> 주문 상품
          </h2>
          <ul className="space-y-3">
            {orderItemInfoList.map((item, i) => (
              <li key={i} className="flex gap-4 pb-3 border-b border-drac-current last:border-b-0 last:pb-0">
                {item.productImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.productImageUrl}
                    alt={item.productName}
                    className="w-16 h-16 rounded-xl object-cover bg-drac-current shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{item.productName}</p>
                  <p className="text-sm text-drac-comment">{item.optionSummary} · {item.quantity}개</p>
                  <p className="text-sm font-bold mt-1">
                    {(item.productAmount * item.quantity).toLocaleString()}원
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 결제 금액 */}
        <section className="bg-drac-bg border border-drac-current rounded-3xl p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-drac-purple" /> 결제 금액
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-drac-comment">상품 금액</dt>
              <dd>{orderInfo.originalAmount.toLocaleString()}원</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-drac-comment">할인 금액</dt>
              <dd className="text-drac-pink">-{orderInfo.discountAmount.toLocaleString()}원</dd>
            </div>
            {orderInfo.pointUsedAmount > 0 && (
              <div className="flex justify-between">
                <dt className="text-drac-comment">포인트 사용</dt>
                <dd className="text-drac-cyan">-{orderInfo.pointUsedAmount.toLocaleString()}원</dd>
              </div>
            )}
            <div className="flex justify-between pt-3 mt-1 border-t border-drac-current">
              <dt className="font-bold">최종 결제 금액</dt>
              <dd className="font-black text-xl text-drac-pink">{orderInfo.finalAmount.toLocaleString()}원</dd>
            </div>
          </dl>
        </section>

        {/* 결제 정보 */}
        {latestPayment && (
          <section className="bg-drac-bg border border-drac-current rounded-3xl p-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-drac-purple" /> 결제 정보
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-drac-comment">결제 상태</dt>
                <dd className="font-semibold">
                  {PAYMENT_STATUS_LABEL[latestPayment.status] ?? latestPayment.status}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-drac-comment">결제 수단</dt>
                <dd>{latestPayment.pgProvider}</dd>
              </div>
              {latestPayment.approvedAt && (
                <div className="flex justify-between">
                  <dt className="text-drac-comment">승인 시각</dt>
                  <dd className="text-xs">{new Date(latestPayment.approvedAt).toLocaleString("ko-KR")}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {/* 액션 에러 */}
        {actionError && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">{actionError}</div>
        )}

        {/* 취소 / 삭제 버튼 */}
        <div className="flex gap-3 pt-2">
          {orderStatus === "PAYMENT_PENDING" && (
            <button
              onClick={handleCancel}
              disabled={actionLoading !== null}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border border-drac-orange text-drac-orange font-bold hover:bg-drac-orange/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === "cancel" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <XCircle size={18} />
              )}
              주문 취소
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={actionLoading !== null}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-400 text-red-400 font-bold hover:bg-red-400/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {actionLoading === "delete" ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
            주문 삭제
          </button>
        </div>
      </main>
    </div>
  );
}
