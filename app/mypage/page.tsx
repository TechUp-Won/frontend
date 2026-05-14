"use client";

import ThemeToggle from "@/app/components/ThemeToggle";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  MapPin,
  LogOut,
  UserMinus,
  Settings,
  ChevronRight,
  ShieldAlert,
  Store,
  X,
  CheckCircle2
} from "lucide-react";

export default function MyPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{ profileName: string; role: string; email?: string } | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  // Seller registration modal states
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [buzNo, setBuzNo] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Store creation modal states
  const [hasStore, setHasStore] = useState<boolean | null>(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreDesc, setNewStoreDesc] = useState("");
  const [newStorePhone, setNewStorePhone] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    const storedUser = localStorage.getItem("userInfo");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUserInfo(parsed);
        // Check if seller has a store
        if (parsed.role === "ROLE_SELLER" || parsed.role === "SELLER" || parsed.role === "ROLE_USER_SELLER") {
          fetch("/api/v1/stores", { headers: { "Authorization": `Bearer ${token}` } })
            .then(res => {
              if (res.ok) setHasStore(true);
              else setHasStore(false);
            })
            .catch(() => setHasStore(false));
        }
      } catch (e) {
        console.error("Failed to parse user info", e);
      }
    }
    setIsAuthed(true);
  }, [router]);

  const handleLogout = async () => {
    if (!confirm("로그아웃 하시겠습니까?")) return;
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userInfo");
      router.push("/");
    }
  };

  const handleWithdraw = async () => {
    if (!confirm("정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    
    try {
      const token = localStorage.getItem("accessToken");
      const isSeller = userInfo?.role === "ROLE_SELLER" || userInfo?.role === "SELLER";
      const url = isSeller ? "/api/v1/sellers/withdraw" : "/api/v1/users/withdraw";
      
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        alert("회원 탈퇴가 완료되었습니다.");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userInfo");
        router.push("/");
      } else {
        alert("탈퇴 처리 중 오류가 발생했습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("탈퇴 처리 중 오류가 발생했습니다.");
    }
  };

  const handleSellerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (buzNo.length !== 10) {
      alert("사업자 번호는 숫자 10자리여야 합니다.");
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/v1/sellers/register", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ buzNo, name: storeName, phone: storePhone })
      });
      if (res.ok) {
        alert("판매자 등록이 완료되었습니다. 권한 적용을 위해 다시 로그인 해주세요.");
        setIsSellerModalOpen(false);
        // 로그아웃 처리 후 리다이렉트
        await fetch("/api/v1/auth/logout", { method: "POST" });
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userInfo");
        router.push("/login");
      } else {
        const json = await res.json();
        alert(json.message || "판매자 등록에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStoreCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStorePhone.match(/^\d{2,3}-\d{3,4}-\d{4}$/)) {
      alert("올바른 전화번호 형식(000-0000-0000)을 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/v1/stores", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          name: newStoreName, 
          description: newStoreDesc, 
          phone: newStorePhone,
          thumbnail: "https://placehold.co/400x400/eeeeee/999999.png?text=Store" // 기본 회색 placeholder (PNG 명시)
        })
      });
      if (res.ok) {
        alert("스토어 개설이 완료되었습니다! 이제 상품을 등록할 수 있습니다.");
        setIsStoreModalOpen(false);
        setHasStore(true);
      } else {
        const json = await res.json();
        alert(json.message || "스토어 개설에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthed) {
    return (
      <div className="h-screen bg-drac-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-drac-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-drac-bg text-drac-fg font-sans pb-32 flex flex-col">
      {/* Header NavBar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-drac-bg/80 border-b border-drac-comment/50 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-drac-fg hover:text-drac-pink transition-colors">
            <div className="w-10 h-10 rounded-full bg-drac-current flex items-center justify-center transition-colors">
              <ArrowLeft size={20} />
            </div>
            <span className="font-semibold hidden sm:inline">뒤로</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-drac-fg">마이페이지</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-8">
        
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-drac-current to-drac-bg border border-drac-comment/30 rounded-3xl p-6 sm:p-8 shadow-lg shadow-drac-current/50 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-drac-purple/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="flex items-center gap-5 sm:gap-6 relative z-10">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-drac-cyan to-drac-purple flex items-center justify-center text-white shadow-xl shrink-0">
              <User size={40} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-drac-current/80 border border-drac-comment/40 text-drac-pink text-[11px] font-black tracking-widest uppercase">
                  {userInfo?.role?.replace('ROLE_', '') || 'USER'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-drac-fg mb-1 tracking-tight">
                {userInfo?.profileName || '사용자'}님
              </h2>
              {userInfo?.email && (
                <p className="text-sm text-drac-comment">{userInfo.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Menu List */}
        <div className="bg-drac-bg border border-drac-current rounded-3xl overflow-hidden shadow-sm">
          
          <div className="px-6 py-4 bg-drac-current/30 border-b border-drac-current flex items-center gap-2">
            <Settings size={18} className="text-drac-comment" />
            <span className="text-sm font-bold text-drac-comment">설정 및 관리</span>
          </div>

          <ul className="divide-y divide-drac-current">
            {userInfo?.role !== 'ROLE_SELLER' && userInfo?.role !== 'SELLER' && (
              <li>
                <Link href="/shipping" className="flex items-center justify-between px-6 py-5 hover:bg-drac-current/40 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-drac-current flex items-center justify-center text-drac-cyan group-hover:text-drac-pink transition-colors">
                      <MapPin size={20} />
                    </div>
                    <span className="font-semibold text-drac-fg text-[15px]">배송지 관리</span>
                  </div>
                  <ChevronRight size={20} className="text-drac-comment group-hover:text-drac-pink transition-colors" />
                </Link>
              </li>
            )}

            {userInfo?.role !== 'ROLE_SELLER' && userInfo?.role !== 'SELLER' && (
              <li>
                <button onClick={() => setIsSellerModalOpen(true)} className="w-full flex items-center justify-between px-6 py-5 hover:bg-drac-current/40 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-drac-current flex items-center justify-center text-drac-yellow group-hover:text-drac-pink transition-colors">
                      <Store size={20} />
                    </div>
                    <span className="font-semibold text-drac-fg text-[15px]">판매자(사업자)로 전환하기</span>
                  </div>
                  <ChevronRight size={20} className="text-drac-comment group-hover:text-drac-pink transition-colors" />
                </button>
              </li>
            )}
            
            {hasStore === false && (
              <li>
                <button onClick={() => setIsStoreModalOpen(true)} className="w-full flex items-center justify-between px-6 py-5 hover:bg-drac-current/40 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-drac-cyan/20 flex items-center justify-center text-drac-cyan group-hover:text-drac-pink transition-colors">
                      <Store size={20} />
                    </div>
                    <span className="font-semibold text-drac-fg text-[15px]">내 스토어 개설하기</span>
                  </div>
                  <ChevronRight size={20} className="text-drac-comment group-hover:text-drac-pink transition-colors" />
                </button>
              </li>
            )}

            <li>
              <button onClick={handleLogout} className="w-full flex items-center justify-between px-6 py-5 hover:bg-drac-current/40 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-drac-current flex items-center justify-center text-drac-comment group-hover:text-drac-fg transition-colors">
                    <LogOut size={20} />
                  </div>
                  <span className="font-semibold text-drac-fg text-[15px]">로그아웃</span>
                </div>
              </button>
            </li>

            <li>
              <button onClick={handleWithdraw} className="w-full flex items-center justify-between px-6 py-5 hover:bg-red-500/10 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-drac-current flex items-center justify-center text-red-400 group-hover:text-red-500 transition-colors">
                    <UserMinus size={20} />
                  </div>
                  <span className="font-semibold text-red-400 group-hover:text-red-500 transition-colors text-[15px]">회원 탈퇴</span>
                </div>
              </button>
            </li>
          </ul>

        </div>
        
        {/* Info Banner */}
        <div className="mt-8 bg-drac-current/30 border border-drac-comment/20 rounded-2xl p-5 flex items-start gap-4">
          <ShieldAlert size={20} className="text-drac-yellow shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-drac-fg text-sm mb-1">개인정보 보호</h4>
            <p className="text-xs text-drac-comment leading-relaxed">
              고객님의 소중한 개인정보는 철저하게 암호화되어 보호됩니다. 회원 탈퇴 시 모든 데이터는 복구 불가능하게 파기됩니다.
            </p>
          </div>
        </div>

      </main>

      {/* Seller Register Modal */}
      {isSellerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsSellerModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-drac-bg rounded-3xl sm:rounded-3xl rounded-b-none sm:rounded-b-3xl shadow-2xl overflow-hidden flex flex-col animate-[slideUp_0.3s_ease-out]">
            
            <div className="flex items-center justify-between p-6 border-b border-drac-current bg-drac-bg z-10 shrink-0">
              <div className="flex items-center gap-3">
                <Store size={24} className="text-drac-yellow" />
                <h2 className="text-xl font-bold text-drac-fg">판매자(사업자)로 전환하기</h2>
              </div>
              <button onClick={() => setIsSellerModalOpen(false)} className="text-drac-comment hover:text-drac-fg transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              <form id="sellerForm" onSubmit={handleSellerRegister} className="space-y-5">
                <div className="p-4 bg-drac-yellow/10 border border-drac-yellow/30 rounded-xl mb-6">
                  <p className="text-sm text-drac-yellow font-medium leading-relaxed">
                    판매자로 전환하면 나만의 스토어를 개설하고 상품을 등록할 수 있습니다. 
                    아래 사업자 정보를 입력해 주세요.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">사업자 등록번호 <span className="text-drac-pink">*</span></label>
                  <input required type="text" value={buzNo} onChange={e => setBuzNo(e.target.value)} placeholder="숫자 10자리 (예: 1234567890)" maxLength={10} className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">사업장명 (법인/상호명) <span className="text-drac-pink">*</span></label>
                  <input required type="text" value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="사업자등록증 상의 상호명을 입력하세요" className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">사업장 연락처 <span className="text-drac-pink">*</span></label>
                  <input required type="tel" value={storePhone} onChange={e => setStorePhone(e.target.value)} placeholder="사업장 대표 전화번호" className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-drac-current bg-drac-bg shrink-0">
              <button 
                type="submit" 
                form="sellerForm"
                disabled={isSubmitting || buzNo.length !== 10 || !storeName || !storePhone}
                className="w-full py-4 bg-gradient-to-r from-drac-yellow to-drac-orange text-drac-bg font-bold rounded-2xl hover:opacity-90 transition-all shadow-md shadow-drac-yellow/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-drac-bg border-t-transparent rounded-full animate-spin" />
                ) : <CheckCircle2 size={20} />}
                {isSubmitting ? "처리 중..." : "판매자로 등록하기"}
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Store Create Modal */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsStoreModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-drac-bg rounded-3xl sm:rounded-3xl rounded-b-none sm:rounded-b-3xl shadow-2xl overflow-hidden flex flex-col animate-[slideUp_0.3s_ease-out]">
            
            <div className="flex items-center justify-between p-6 border-b border-drac-current bg-drac-bg z-10 shrink-0">
              <div className="flex items-center gap-3">
                <Store size={24} className="text-drac-cyan" />
                <h2 className="text-xl font-bold text-drac-fg">내 스토어 개설하기</h2>
              </div>
              <button onClick={() => setIsStoreModalOpen(false)} className="text-drac-comment hover:text-drac-fg transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              <form id="storeForm" onSubmit={handleStoreCreate} className="space-y-5">
                <div className="p-4 bg-drac-cyan/10 border border-drac-cyan/30 rounded-xl mb-6">
                  <p className="text-sm text-drac-cyan font-medium leading-relaxed">
                    스토어를 개설해야 고객에게 상품을 보여주고 판매할 수 있습니다. 멋진 스토어를 만들어보세요!
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">스토어 이름 <span className="text-drac-pink">*</span></label>
                  <input required type="text" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} placeholder="스토어 이름을 입력하세요" className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">스토어 설명</label>
                  <input type="text" value={newStoreDesc} onChange={e => setNewStoreDesc(e.target.value)} placeholder="우리 스토어의 한 줄 소개를 적어주세요 (선택)" className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">고객센터 연락처 <span className="text-drac-pink">*</span></label>
                  <input required type="tel" value={newStorePhone} onChange={e => setNewStorePhone(e.target.value)} placeholder="02-123-4567" className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-drac-current bg-drac-bg shrink-0">
              <button 
                type="submit" 
                form="storeForm"
                disabled={isSubmitting || !newStoreName || !newStorePhone}
                className="w-full py-4 bg-gradient-to-r from-drac-cyan to-drac-purple text-white font-bold rounded-2xl hover:opacity-90 transition-all shadow-md shadow-drac-purple/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : <CheckCircle2 size={20} />}
                {isSubmitting ? "개설 중..." : "스토어 개설하기"}
              </button>
            </div>
            
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
