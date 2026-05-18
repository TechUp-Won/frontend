"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadTossPayments, ANONYMOUS } from "@tosspayments/tosspayments-sdk";
import { ArrowLeft, MapPin, CreditCard, Loader2 } from "lucide-react";
import { apiFetch } from "@/app/lib/api";

interface CartItem {
  cartItemId: number;
  id: number;
  name: string;
  price: number;
  discountedPrice: number;
  discountRate: number;
  thumbnail: string;
  variantId: number;
  variantName: string;
  quantity: number;
  stock: number;
  status: string;
}

interface CartResponse {
  cartId: number;
  cartItems: CartItem[];
  summary: { originalTotalAmount: number; discountTotalAmount: number };
}

interface ShippingAddress {
  shippingAddressId: number;
  recipientName: string;
  recipientPhone: string;
  zipCode: string;
  address1: string;
  address2: string;
  isDefault: boolean;
  memo: string;
}

interface PreviewItem {
  productId: number;
  variantId: number;
  productName: string;
  variantName: string;
  thumbnailUrl: string;
  price: number;
  discountedPrice: number;
  quantity: number;
  itemOriginalAmount: number;
  itemDiscountAmount: number;
  itemFinalAmount: number;
}

interface PreviewResponse {
  items: PreviewItem[];
  summary: { originalAmount: number; discountAmount: number; finalAmount: number };
}

interface OrderCreateResponse {
  orderInfo: {
    orderId: number;
    orderNumber: string;
    orderTitle: string;
    originalAmount: number;
    discountAmount: number;
    pointUsedAmount: number;
    finalAmount: number;
  };
  paymentInfo: {
    paymentId: number;
    tossOrderId: string;
    amount: number;
    orderName: string;
  };
}

interface CheckoutResponse {
  paymentId: number;
  clientKey: string;
  tossOrderId: string;
  amount: number;
  orderName: string;
  successUrl: string;
  failUrl: string;
}

export default function CheckoutPage() {
  const router = useRouter();

  const [orderItems, setOrderItems] = useState<{ variantId: number; quantity: number }[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [isDirect, setIsDirect] = useState(false);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [payMethod, setPayMethod] = useState<"CARD" | "VIRTUAL_ACCOUNT" | "TRANSFER">("CARD");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    void initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initialize() {
    setLoading(true);
    try {
      let items: { variantId: number; quantity: number }[] = [];

      const directRaw =
        typeof window !== "undefined" ? sessionStorage.getItem("directOrder") : null;
      const urlIsDirect =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("mode") === "direct";

      if (urlIsDirect && directRaw) {
        try {
          const direct = JSON.parse(directRaw) as {
            productId: number;
            variantId: number;
            quantity: number;
          };
          items = [{ variantId: direct.variantId, quantity: direct.quantity }];
          setIsDirect(true);
        } catch {
          setError("바로구매 정보가 올바르지 않습니다.");
          return;
        }
      } else {
        const cartRes = await apiFetch<CartResponse>("/api/v1/carts");
        if (!cartRes.ok || !cartRes.data) {
          setError("장바구니 정보를 불러오지 못했습니다.");
          return;
        }
        const cartData = cartRes.data;
        if (!cartData.cartItems || cartData.cartItems.length === 0) {
          setError("장바구니가 비어있습니다.");
          return;
        }
        items = cartData.cartItems.map((it) => ({
          variantId: it.variantId,
          quantity: it.quantity,
        }));
      }

      setOrderItems(items);

      const previewRes = await apiFetch<PreviewResponse>("/api/v1/orders/preview", {
        method: "POST",
        body: JSON.stringify({ items }),
      });
      if (previewRes.ok && previewRes.data) {
        setPreview(previewRes.data);
      } else {
        setError(previewRes.message || "주문 미리보기 생성에 실패했습니다.");
        return;
      }

      const addrRes = await apiFetch<{ addresses: ShippingAddress[] }>(
        "/api/v1/shipping/addresses"
      );
      if (addrRes.ok && addrRes.data?.addresses) {
        setAddresses(addrRes.data.addresses);
        const def = addrRes.data.addresses.find((a) => a.isDefault) ?? addrRes.data.addresses[0];
        if (def) setSelectedAddressId(def.shippingAddressId);
      }
    } catch (e) {
      console.error(e);
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePay() {
    if (!preview || orderItems.length === 0) return;
    const addr = addresses.find((a) => a.shippingAddressId === selectedAddressId);
    if (!addr) {
      alert("배송지를 선택해주세요. 등록된 배송지가 없다면 먼저 등록해주세요.");
      router.push("/shipping");
      return;
    }

    setProcessing(true);
    setError("");
    try {
      const items = orderItems;

      const createRes = await apiFetch<OrderCreateResponse>("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          items,
          delivery: {
            recipientName: addr.recipientName,
            recipientPhone: addr.recipientPhone,
            zipcode: addr.zipCode,
            address: addr.address1,
            addressDetail: addr.address2 || "",
            memo: addr.memo || "",
          },
          pointUsedAmount: 0,
        }),
      });

      if (!createRes.ok || !createRes.data) {
        setError(createRes.message || "주문 생성에 실패했습니다.");
        setProcessing(false);
        return;
      }

      const { paymentInfo } = createRes.data;

      const checkoutRes = await apiFetch<CheckoutResponse>(
        `/api/v1/payments/${paymentInfo.paymentId}/checkout`
      );
      if (!checkoutRes.ok || !checkoutRes.data) {
        setError(checkoutRes.message || "결제창 정보를 불러오지 못했습니다.");
        setProcessing(false);
        return;
      }

      const checkout = checkoutRes.data;

      sessionStorage.setItem(
        "pendingPayment",
        JSON.stringify({
          paymentId: checkout.paymentId,
          tossOrderId: checkout.tossOrderId,
          amount: checkout.amount,
        })
      );
      if (isDirect) sessionStorage.removeItem("directOrder");

      const tossPayments = await loadTossPayments(checkout.clientKey);
      const payment = tossPayments.payment({ customerKey: ANONYMOUS });

      const baseReq = {
        amount: { currency: "KRW" as const, value: checkout.amount },
        orderId: checkout.tossOrderId,
        orderName: checkout.orderName,
        successUrl: window.location.origin + "/payments/success",
        failUrl: window.location.origin + "/payments/fail",
      };
      if (payMethod === "CARD") {
        await payment.requestPayment({
          ...baseReq,
          method: "CARD",
          card: {
            useEscrow: false,
            flowMode: "DEFAULT",
            useCardPoint: false,
            useAppCardOnly: false,
          },
        });
      } else if (payMethod === "VIRTUAL_ACCOUNT") {
        await payment.requestPayment({
          ...baseReq,
          method: "VIRTUAL_ACCOUNT",
          virtualAccount: {
            cashReceipt: { type: "소득공제" },
            useEscrow: false,
            validHours: 24,
          },
        });
      } else {
        await payment.requestPayment({
          ...baseReq,
          method: "TRANSFER",
          transfer: { cashReceipt: { type: "소득공제" }, useEscrow: false },
        });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "결제 요청 중 오류가 발생했습니다.";
      console.error(e);
      setError(message);
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-drac-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-drac-pink" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-drac-bg text-drac-fg font-sans">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-drac-bg/80 border-b border-drac-comment/50">
        <div className="max-w-3xl mx-auto h-16 px-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-drac-fg">
            <div className="w-10 h-10 rounded-full bg-drac-current flex items-center justify-center">
              <ArrowLeft size={20} />
            </div>
            <span className="font-semibold">뒤로</span>
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CreditCard size={20} className="text-drac-purple" /> 주문/결제
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-32">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium" data-testid="checkout-error">
            {error}
          </div>
        )}

        <section className="bg-drac-bg border border-drac-current rounded-3xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <MapPin size={20} className="text-drac-purple" /> 배송지
            </h2>
            <button
              onClick={() => router.push("/shipping")}
              className="text-sm font-bold text-drac-purple hover:underline"
            >
              관리
            </button>
          </div>
          {addresses.length === 0 ? (
            <div className="text-sm text-drac-comment">
              등록된 배송지가 없습니다. 먼저{" "}
              <button onClick={() => router.push("/shipping")} className="text-drac-purple underline">
                배송지 등록
              </button>
              을 진행해주세요.
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <label
                  key={addr.shippingAddressId}
                  className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
                    selectedAddressId === addr.shippingAddressId
                      ? "border-drac-purple bg-drac-purple/5"
                      : "border-drac-current hover:border-drac-comment/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="addr"
                    checked={selectedAddressId === addr.shippingAddressId}
                    onChange={() => setSelectedAddressId(addr.shippingAddressId)}
                    className="mt-1"
                    data-testid={`addr-radio-${addr.shippingAddressId}`}
                  />
                  <div className="text-sm">
                    <div className="font-bold">
                      {addr.recipientName} <span className="text-drac-comment font-normal">· {addr.recipientPhone}</span>
                      {addr.isDefault && (
                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-drac-purple text-white">기본</span>
                      )}
                    </div>
                    <div className="text-drac-comment mt-1">
                      [{addr.zipCode}] {addr.address1} {addr.address2}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>

        <section className="bg-drac-bg border border-drac-current rounded-3xl p-6">
          <h2 className="font-bold text-lg mb-4">주문 상품</h2>
          <div className="space-y-3">
            {preview?.items.map((item) => (
              <div
                key={item.variantId}
                className="flex justify-between items-start text-sm border-b border-drac-current last:border-b-0 pb-3 last:pb-0"
              >
                <div>
                  <div className="font-semibold">{item.productName}</div>
                  <div className="text-drac-comment text-xs mt-0.5">
                    {item.variantName} · {item.quantity}개
                  </div>
                </div>
                <div className="font-bold">{item.itemFinalAmount.toLocaleString()}원</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-drac-bg border border-drac-current rounded-3xl p-6">
          <h2 className="font-bold text-lg mb-4">결제 수단</h2>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "CARD", label: "카드/간편결제" },
                { id: "VIRTUAL_ACCOUNT", label: "가상계좌" },
                { id: "TRANSFER", label: "계좌이체" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                data-testid={`pay-method-${m.id}`}
                onClick={() => setPayMethod(m.id)}
                className={`py-3 rounded-2xl border text-sm font-bold ${
                  payMethod === m.id
                    ? "border-drac-purple bg-drac-purple/10 text-drac-fg"
                    : "border-drac-current text-drac-comment"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-drac-bg border border-drac-current rounded-3xl p-6">
          <h2 className="font-bold text-lg mb-4">결제 금액</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-drac-comment">상품 금액</dt>
              <dd>{preview?.summary.originalAmount.toLocaleString()}원</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-drac-comment">할인 금액</dt>
              <dd className="text-drac-pink">-{preview?.summary.discountAmount.toLocaleString()}원</dd>
            </div>
            <div className="flex justify-between pt-3 mt-3 border-t border-drac-current">
              <dt className="font-bold">최종 결제 금액</dt>
              <dd className="font-black text-xl text-drac-pink" data-testid="checkout-final-amount">
                {preview?.summary.finalAmount.toLocaleString()}원
              </dd>
            </div>
          </dl>
        </section>

        <button
          onClick={handlePay}
          disabled={processing || !preview || addresses.length === 0}
          data-testid="pay-button"
          className="w-full py-4.5 bg-drac-purple text-drac-bg font-bold rounded-2xl hover:bg-drac-purple/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
        >
          {processing ? <Loader2 size={20} className="animate-spin" /> : <CreditCard size={20} />}
          {processing ? "결제 진행중..." : `${preview?.summary.finalAmount.toLocaleString() ?? 0}원 결제하기`}
        </button>
      </main>
    </div>
  );
}
