"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, AlertCircle } from "lucide-react";

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

function getCookie(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? match.split("=").slice(1).join("=") : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export default function OAuth2RedirectPage() {
  const router = useRouter();
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    void (async () => {
      const accessToken = getCookie("access-token");

      if (!accessToken) {
        setIsError(true);
        return;
      }

      // 쿠키에서 즉시 삭제 (60초 만료 전에 선제적으로 제거)
      deleteCookie("access-token");

      // localStorage에 저장
      localStorage.setItem("accessToken", accessToken);

      // JWT 페이로드에서 만료 시간 및 역할 추출
      const payload = decodeJwtPayload(accessToken);
      const exp = payload.exp as number | undefined;
      const role = (payload.role as string | undefined) ?? "USER";

      if (exp) {
        localStorage.setItem("tokenExpiresAt", String(exp * 1000));
      }

      // 사용자 닉네임 조회 후 userInfo 저장 → 메인으로 이동
      try {
        const res = await fetch("/api/v1/users", {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: "include",
        });
        const json = res.ok ? await res.json() : null;
        const nickname = (json?.data?.nickname as string | undefined) ?? "";
        localStorage.setItem(
          "userInfo",
          JSON.stringify({ profileName: nickname, role })
        );
      } catch {
        localStorage.setItem("userInfo", JSON.stringify({ profileName: "", role }));
      } finally {
        router.replace("/");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isError) {
    return (
      <div className="min-h-screen bg-drac-bg flex flex-col items-center justify-center gap-5 px-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-drac-cyan to-drac-purple flex items-center justify-center text-white shadow-lg shadow-drac-purple/30">
          <Sparkles size={28} />
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertCircle size={20} className="text-red-400" />
          <p className="text-drac-fg font-bold">액세스 토큰을 찾을 수 없습니다.</p>
          <p className="text-drac-comment text-sm">다시 로그인해 주세요.</p>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="px-6 py-2.5 bg-drac-purple text-drac-bg font-bold rounded-xl hover:bg-drac-purple/80 transition-colors shadow-md"
        >
          로그인으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-drac-bg flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-drac-cyan to-drac-purple flex items-center justify-center text-white shadow-xl shadow-drac-purple/30 animate-pulse">
        <Sparkles size={32} />
      </div>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-drac-fg font-bold text-lg">소셜 로그인 처리 중...</p>
        <p className="text-drac-comment text-sm">잠시만 기다려 주세요.</p>
      </div>
    </div>
  );
}
