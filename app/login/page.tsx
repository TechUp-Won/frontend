"use client";

import ThemeToggle from "@/app/components/ThemeToggle";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowLeft, Mail, Lock, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const json = await res.json();

      if (res.ok && json.data) {
        const { tokenInfo, userInfo } = json.data;
        localStorage.setItem("accessToken", tokenInfo.accessToken);
        localStorage.setItem("userInfo", JSON.stringify(userInfo));
        if (tokenInfo.expiresIn) {
          localStorage.setItem("tokenExpiresAt", String(Date.now() + tokenInfo.expiresIn * 1000));
        }
        
        // 메인 페이지로 이동
        router.push("/");
      } else {
        setErrorMsg(json.message || "이메일 또는 비밀번호가 올바르지 않습니다.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("서버와의 통신에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-drac-current flex flex-col font-sans">
      {/* Header */}
      <header className="absolute top-0 inset-x-0 h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-drac-bg flex items-center justify-center hover:bg-drac-current text-drac-fg hover:text-drac-pink transition-colors shadow-sm">
          <ArrowLeft size={20} />
        </button>
      <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-drac-bg rounded-3xl shadow-xl shadow-amber-400/5 p-8 sm:p-10 border border-drac-current">
          
          <div className="flex flex-col items-center mb-10 text-center">
            <Link href="/" className="flex items-center gap-2 mb-6 group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-drac-cyan to-drac-purple flex items-center justify-center text-white shadow-lg shadow-drac-purple/30 group-hover:scale-105 transition-transform">
                <Sparkles size={24} />
              </div>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-drac-fg tracking-tight mb-2">
              반갑습니다!
            </h1>
            <p className="text-drac-comment text-sm">
              wonkaotalk 계정으로 로그인해주세요.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {errorMsg && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-drac-fg ml-1">이메일</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-drac-comment w-5 h-5" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@wonkaotalk.com" 
                  className="w-full pl-12 pr-4 py-3.5 bg-drac-current border border-drac-comment rounded-2xl outline-none focus:bg-drac-bg focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-drac-fg ml-1">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-drac-comment w-5 h-5" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력해주세요" 
                  className="w-full pl-12 pr-4 py-3.5 bg-drac-current border border-drac-comment rounded-2xl outline-none focus:bg-drac-bg focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 mt-4 bg-drac-purple text-drac-bg font-bold rounded-2xl hover:bg-drac-purple/80 transition-colors shadow-lg shadow-drac-purple/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-lg"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
              ) : null}
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {/* 소셜 로그인 */}
          <div className="mt-8 pt-6 border-t border-drac-current">
            <p className="text-center text-xs font-semibold text-drac-comment tracking-wider mb-4">소셜 계정으로 로그인</p>
            <div className="flex flex-col gap-3">
              <a
                href="http://api.hjo-api-server.shop/oauth2/authorization/google"
                className="w-full py-3.5 flex items-center justify-center gap-3 rounded-2xl border border-drac-comment bg-drac-current hover:border-drac-pink hover:bg-drac-bg transition-all font-bold text-sm text-drac-fg"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
                  <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
                  <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                  <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
                </svg>
                Google로 계속하기
              </a>
              <a
                href="http://api.hjo-api-server.shop/oauth2/authorization/naver"
                className="w-full py-3.5 flex items-center justify-center gap-3 rounded-2xl border border-drac-comment bg-drac-current hover:border-drac-pink hover:bg-drac-bg transition-all font-bold text-sm text-drac-fg"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" fill="#03C75A"/>
                </svg>
                Naver로 계속하기
              </a>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-drac-comment text-sm">
              아직 wonkaotalk 회원이 아니신가요?{' '}
              <Link href="/signup" className="font-bold text-drac-pink hover:text-drac-pink transition-colors ml-1">
                회원가입
              </Link>
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
