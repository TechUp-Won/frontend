"use client";

import ThemeToggle from "@/app/components/ThemeToggle";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  // Role state
  const [role, setRole] = useState<'USER' | 'SELLER'>('USER');

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");
  const [name, setName] = useState(""); // User Name OR Store Name
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState(""); // User Phone OR Store Phone
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("NONE");
  const [buzNo, setBuzNo] = useState(""); // Business Number for Seller

  // Status states
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [isEmailChecked, setIsEmailChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleCheckEmail = async () => {
    if (!email) {
      setErrorMsg("이메일을 입력해주세요.");
      return;
    }
    const emailRegex = /^[a-zA-Z0-9_+&*-]+(?:\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,7}$/;
    if (!emailRegex.test(email)) {
      setErrorMsg("올바른 이메일 형식이 아닙니다.");
      return;
    }

    setCheckingEmail(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/v1/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const json = await res.json();
      
      if (res.ok && json.data?.isValid) {
        setIsEmailChecked(true);
        setErrorMsg("");
        alert("사용 가능한 이메일입니다.");
      } else {
        setIsEmailChecked(false);
        setErrorMsg("이미 사용 중이거나 사용할 수 없는 이메일입니다.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("이메일 중복 확인에 실패했습니다.");
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();

    if (!isEmailChecked) {
      setErrorMsg("이메일 중복 확인을 먼저 진행해주세요.");
      return;
    }

    if (password !== passwordCheck) {
      setErrorMsg("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (role === 'SELLER' && buzNo.length !== 10) {
      setErrorMsg("사업자 번호는 숫자 10자리여야 합니다.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      let res;
      if (role === 'USER') {
        const payload = {
          email,
          password,
          passwordCheck,
          name,
          nickname,
          phone,
          birthDate: birthDate || null,
          gender
        };

        res = await fetch("/api/v1/users/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        const payload = {
          email,
          password,
          passwordCheck,
          buzNo,
          name,
          phone
        };

        res = await fetch("/api/v1/sellers/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const text = await res.text();
      let json: any = {};
      try {
        if (text) json = JSON.parse(text);
      } catch (e) {
        console.warn("Response is not JSON:", text);
      }

      if (res.ok) {
        alert(`${role === 'USER' ? '회원가입이' : '판매자 회원가입이'} 완료되었습니다! 로그인 페이지로 이동합니다.`);
        router.push("/login");
      } else {
        setErrorMsg(json.message || "회원가입 처리 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("서버와의 통신에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-drac-current flex flex-col font-sans">
      <header className="absolute top-0 inset-x-0 h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-drac-bg flex items-center justify-center hover:bg-drac-current text-drac-fg hover:text-drac-pink transition-colors shadow-sm">
          <ArrowLeft size={20} />
        </button>
      <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-4 py-24">
        <div className="w-full max-w-xl bg-drac-bg rounded-3xl shadow-xl shadow-amber-400/5 p-8 sm:p-10 border border-drac-current">
          
          <div className="flex flex-col items-center mb-8 text-center">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-drac-cyan to-drac-purple flex items-center justify-center text-drac-bg shadow-lg shadow-drac-purple/30 group-hover:scale-105 transition-transform">
                <Sparkles size={20} />
              </div>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-drac-fg tracking-tight">
              회원가입
            </h1>
          </div>

          <div className="flex bg-drac-current rounded-2xl p-1 mb-8 shadow-inner">
            <button 
              type="button"
              onClick={() => setRole('USER')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${role === 'USER' ? 'bg-drac-purple text-drac-bg shadow-md' : 'text-drac-comment hover:text-drac-fg'}`}
            >
              일반 회원
            </button>
            <button 
              type="button"
              onClick={() => setRole('SELLER')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${role === 'SELLER' ? 'bg-drac-purple text-drac-bg shadow-md' : 'text-drac-comment hover:text-drac-fg'}`}
            >
              판매자
            </button>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            {errorMsg && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-drac-fg ml-1">이메일 *</label>
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setIsEmailChecked(false);
                    }}
                    placeholder="example@wonkaotalk.com" 
                    className="flex-1 px-4 py-3.5 bg-drac-current border border-drac-comment rounded-2xl outline-none focus:bg-drac-bg focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg disabled:opacity-50"
                    disabled={isEmailChecked}
                  />
                  <button 
                    type="button" 
                    onClick={handleCheckEmail}
                    disabled={checkingEmail || !email || isEmailChecked}
                    className="px-6 py-3.5 bg-drac-current border border-drac-comment text-drac-fg font-bold rounded-2xl hover:bg-drac-current transition-colors disabled:opacity-50 flex-shrink-0 flex items-center gap-2"
                  >
                    {isEmailChecked ? <CheckCircle2 size={18} className="text-green-500" /> : "중복 확인"}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-drac-fg ml-1">비밀번호 *</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="대소문자, 숫자 포함 8자 이상" 
                    className="w-full px-4 py-3.5 bg-drac-current border border-drac-comment rounded-2xl outline-none focus:bg-drac-bg focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-drac-fg ml-1">비밀번호 확인 *</label>
                  <input 
                    type="password" 
                    value={passwordCheck}
                    onChange={(e) => setPasswordCheck(e.target.value)}
                    placeholder="비밀번호 다시 입력" 
                    className="w-full px-4 py-3.5 bg-drac-current border border-drac-comment rounded-2xl outline-none focus:bg-drac-bg focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg"
                  />
                </div>
              </div>

              {/* Conditional Fields based on Role */}
              {role === 'USER' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-drac-fg ml-1">이름 *</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="홍길동" 
                        className="w-full px-4 py-3.5 bg-drac-current border border-drac-comment rounded-2xl outline-none focus:bg-drac-bg focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-drac-fg ml-1">닉네임 *</label>
                      <input 
                        type="text" 
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="사용할 닉네임" 
                        className="w-full px-4 py-3.5 bg-drac-current border border-drac-comment rounded-2xl outline-none focus:bg-drac-bg focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-drac-fg ml-1">전화번호 *</label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010-0000-0000" 
                      className="w-full px-4 py-3.5 bg-drac-current border border-drac-comment rounded-2xl outline-none focus:bg-drac-bg focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-drac-fg ml-1">생년월일</label>
                      <input 
                        type="date" 
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full px-4 py-3.5 bg-drac-current border border-drac-comment rounded-2xl outline-none focus:bg-drac-bg focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-drac-fg ml-1">성별 *</label>
                      <select 
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-4 py-3.5 bg-drac-current border border-drac-comment rounded-2xl outline-none focus:bg-drac-bg focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg cursor-pointer"
                      >
                        <option value="NONE">선택 안함</option>
                        <option value="MALE">남성</option>
                        <option value="FEMALE">여성</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-drac-fg ml-1">사업자 등록번호 *</label>
                    <input 
                      type="text" 
                      value={buzNo}
                      onChange={(e) => setBuzNo(e.target.value)}
                      placeholder="숫자 10자리 (예: 1234567890)" 
                      className="w-full px-4 py-3.5 bg-drac-current border border-drac-comment rounded-2xl outline-none focus:bg-drac-bg focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg"
                      maxLength={10}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-drac-fg ml-1">사업장명 (스토어 이름) *</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="스토어 이름 입력" 
                        className="w-full px-4 py-3.5 bg-drac-current border border-drac-comment rounded-2xl outline-none focus:bg-drac-bg focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-drac-fg ml-1">사업장 연락처 *</label>
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="02-000-0000" 
                        className="w-full px-4 py-3.5 bg-drac-current border border-drac-comment rounded-2xl outline-none focus:bg-drac-bg focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading || !isEmailChecked}
              className="w-full py-4 mt-8 bg-drac-purple text-drac-bg font-bold rounded-2xl hover:bg-drac-purple/80 transition-colors shadow-lg shadow-drac-purple/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-lg"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-drac-bg border-t-transparent rounded-full animate-spin" />
              ) : null}
              {loading ? "가입 처리 중..." : (role === 'USER' ? "가입하기" : "판매자 가입하기")}
            </button>
          </form>

        </div>
      </main>
    </div>
  );
}
