"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { apiFetch } from "@/app/lib/api";

function PaymentFailContent() {
  const router = useRouter();
  const params = useSearchParams();

  const [state, setState] = useState<"loading" | "done">("loading");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const codeParam = params.get("code") || "UNKNOWN";
    const messageParam = params.get("message") || "결제가 실패했습니다.";
    const orderIdParam = params.get("orderId");

    setCode(codeParam);
    setMessage(messageParam);

    const pendingRaw = sessionStorage.getItem("pendingPayment");
    if (!pendingRaw) {
      setState("done");
      return;
    }

    try {
      const pending = JSON.parse(pendingRaw) as {
        paymentId: number;
        tossOrderId: string;
        amount: number;
      };

      void apiFetch(`/api/v1/payments/${pending.paymentId}/fail`, {
        method: "POST",
        body: JSON.stringify({
          orderId: orderIdParam || pending.tossOrderId,
          code: codeParam,
          message: messageParam,
        }),
      }).finally(() => {
        sessionStorage.removeItem("pendingPayment");
        setState("done");
      });
    } catch {
      setState("done");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-drac-bg flex flex-col items-center justify-center gap-4 text-drac-fg">
        <Loader2 size={48} className="text-drac-pink animate-spin" />
        <p className="font-semibold">결제 실패 처리 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-drac-bg flex flex-col items-center justify-center gap-4 text-drac-fg p-6">
      <AlertCircle size={56} className="text-red-500" data-testid="payment-fail-icon" />
      <h1 className="text-2xl font-bold">결제에 실패했습니다</h1>
      <dl className="bg-drac-current rounded-2xl p-6 w-full max-w-md text-sm space-y-2">
        <div className="flex justify-between">
          <dt className="text-drac-comment">에러 코드</dt>
          <dd className="font-mono text-xs" data-testid="fail-code">{code}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-drac-comment">사유</dt>
          <dd className="text-right" data-testid="fail-message">{message}</dd>
        </div>
      </dl>
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => router.push("/cart")}
          className="px-6 py-3 bg-drac-purple text-drac-bg font-bold rounded-xl"
        >
          장바구니로
        </button>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 border border-drac-current font-bold rounded-xl"
        >
          홈으로
        </button>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-drac-bg flex flex-col items-center justify-center gap-4 text-drac-fg">
        <Loader2 size={48} className="text-drac-pink animate-spin" />
      </div>
    }>
      <PaymentFailContent />
    </Suspense>
  );
}
