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
        // 성공 시 로컬 스토리지에 토큰 및 유저 정보 저장
        const { tokenInfo, userInfo } = json.data;
        localStorage.setItem("accessToken", tokenInfo.accessToken);
        localStorage.setItem("userInfo", JSON.stringify(userInfo));
        
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

          <div className="mt-8 pt-6 border-t border-drac-current text-center">
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
