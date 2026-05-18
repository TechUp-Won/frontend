"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { apiFetch } from "@/app/lib/api";

interface ConfirmResponse {
  paymentId: number;
  orderId: number;
  tossOrderId: string;
  paymentKey: string;
  amount: number;
  status: string;
  method: string;
  approvedAt: string;
  receiptUrl: string;
}

export default function PaymentSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [result, setResult] = useState<ConfirmResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = params.get("amount");

    if (!paymentKey || !orderId || !amount) {
      setErrorMsg("결제 정보가 올바르지 않습니다.");
      setState("error");
      return;
    }

    const pendingRaw = sessionStorage.getItem("pendingPayment");
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw) as {
          paymentId: number;
          tossOrderId: string;
          amount: number;
        };
        if (pending.tossOrderId !== orderId || pending.amount !== Number(amount)) {
          setErrorMsg("결제 정보가 일치하지 않습니다. 위변조 가능성이 있어 결제를 진행하지 않습니다.");
          setState("error");
          return;
        }
      } catch {
        // ignore
      }
    }

    void confirm(paymentKey, orderId, Number(amount));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirm(paymentKey: string, orderId: string, amount: number) {
    const res = await apiFetch<ConfirmResponse>("/api/v1/payments/confirm", {
      method: "POST",
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
    if (res.ok && res.data) {
      setResult(res.data);
      setState("success");
      sessionStorage.removeItem("pendingPayment");
    } else {
      setErrorMsg(res.message || "결제 승인에 실패했습니다.");
      setState("error");
    }
  }

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-drac-bg flex flex-col items-center justify-center gap-4 text-drac-fg">
        <Loader2 size={48} className="text-drac-pink animate-spin" />
        <p className="font-semibold">결제 승인 중...</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen bg-drac-bg flex flex-col items-center justify-center gap-4 text-drac-fg p-6">
        <AlertCircle size={56} className="text-red-500" />
        <h1 className="text-2xl font-bold">결제 승인 실패</h1>
        <p className="text-drac-comment text-center" data-testid="confirm-error">{errorMsg}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-6 py-3 bg-drac-purple text-drac-bg font-bold rounded-xl"
        >
          홈으로
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-drac-bg flex flex-col items-center justify-center gap-4 text-drac-fg p-6">
      <CheckCircle2 size={56} className="text-green-500" data-testid="payment-success-icon" />
      <h1 className="text-2xl font-bold">결제가 완료되었습니다</h1>
      {result && (
        <dl className="bg-drac-current rounded-2xl p-6 w-full max-w-md text-sm space-y-2">
          <div className="flex justify-between">
            <dt className="text-drac-comment">주문번호</dt>
            <dd className="font-mono text-xs">{result.tossOrderId}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-drac-comment">결제 수단</dt>
            <dd>{result.method}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-drac-comment">결제 금액</dt>
            <dd className="font-bold text-drac-pink" data-testid="paid-amount">
              {result.amount.toLocaleString()}원
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-drac-comment">승인 시각</dt>
            <dd className="text-xs">{result.approvedAt}</dd>
          </div>
        </dl>
      )}
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-drac-purple text-drac-bg font-bold rounded-xl"
        >
          홈으로
        </button>
        {result?.receiptUrl && (
          <a
            href={result.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3 border border-drac-current font-bold rounded-xl"
          >
            영수증
          </a>
        )}
      </div>
    </div>
  );
}
