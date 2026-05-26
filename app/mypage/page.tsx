"use client";

import ThemeToggle from "@/app/components/ThemeToggle";
import { apiFetch } from "@/app/lib/apiFetch";
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
  CheckCircle2,
  Pencil,
  Phone,
  Calendar,
  Bell,
  Trash2,
  Hash,
  ImageIcon,
  AlignLeft,
  Package,
  Plus,
} from "lucide-react";

type Gender = "MALE" | "FEMALE" | "NONE";

interface UserResponse {
  userId: number;
  nickname: string;
  name: string;
  phone: string;
  image: string | null;
  gender: Gender;
  birthDate: string | null;
  marketingAgree: boolean;
}

interface SellerResponse {
  sellerId: number;
  name: string;
  phone: string;
  buzNo: string;
}

interface StoreResponse {
  id: number;
  sellerId: number;
  name: string;
  description: string;
  phone: string;
  thumbnail: string;
}

interface ProductSummary {
  id: number;
  name: string;
  thumbnail: string | null;
  price: number;
  discountedPrice: number;
  discountRate: number;
  status: string;
}

function isSeller(role?: string) {
  return (
    role === "ROLE_SELLER" ||
    role === "SELLER" ||
    role === "ROLE_USER_SELLER" ||
    role === "USER_SELLER"
  );
}

export default function MyPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<{ profileName: string; role: string; email?: string } | null>(null);
  const [userData, setUserData] = useState<UserResponse | null>(null);
  const [sellerData, setSellerData] = useState<SellerResponse | null>(null);
  const [storeData, setStoreData] = useState<StoreResponse | null>(null);
  const [myProducts, setMyProducts] = useState<ProductSummary[]>([]);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Seller registration modal
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [buzNo, setBuzNo] = useState("");
  const [regStoreName, setRegStoreName] = useState("");
  const [regStorePhone, setRegStorePhone] = useState("");

  // Store creation modal
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreDesc, setNewStoreDesc] = useState("");
  const [newStorePhone, setNewStorePhone] = useState("");

  // User info edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [editGender, setEditGender] = useState<Gender>("NONE");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editMarketingAgree, setEditMarketingAgree] = useState(false);

  // Seller info edit modal
  const [isSellerEditModalOpen, setIsSellerEditModalOpen] = useState(false);
  const [editSellerName, setEditSellerName] = useState("");
  const [editSellerPhone, setEditSellerPhone] = useState("");

  // Store edit modal
  const [isStoreEditModalOpen, setIsStoreEditModalOpen] = useState(false);
  const [editStoreName, setEditStoreName] = useState("");
  const [editStoreDesc, setEditStoreDesc] = useState("");
  const [editStorePhone, setEditStorePhone] = useState("");
  const [editStoreThumbnail, setEditStoreThumbnail] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    const storedUser = localStorage.getItem("userInfo");
    let role = "";
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUserInfo(parsed);
        role = parsed.role ?? "";
      } catch (e) {
        console.error("Failed to parse user info", e);
      }
    }

    if (!isSeller(role)) {
      apiFetch("/api/v1/users")
        .then(async res => { if (res.ok) setUserData((await res.json()).data); })
        .catch(e => console.error(e));
    }

    if (isSeller(role)) {
      apiFetch("/api/v1/sellers")
        .then(async res => { if (res.ok) setSellerData((await res.json()).data); })
        .catch(e => console.error(e));

      apiFetch("/api/v1/stores")
        .then(async res => {
          if (res.ok) {
            const store: StoreResponse = (await res.json()).data;
            setStoreData(store);
            apiFetch(`/api/v1/products?storeId=${store.id}&size=50`)
              .then(async r => {
                if (r.ok) setMyProducts((await r.json()).data?.products ?? []);
              })
              .catch(() => {});
          } else {
            setStoreData(null);
          }
        })
        .catch(() => setStoreData(null));
    }

    setIsAuthed(true);
  }, [router]);

  // User info update
  const openEditModal = () => {
    setEditNickname(userData?.nickname ?? "");
    setEditGender(userData?.gender ?? "NONE");
    setEditBirthDate(userData?.birthDate ?? "");
    setEditMarketingAgree(userData?.marketingAgree ?? false);
    setIsEditModalOpen(true);
  };

  const handleUserUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/v1/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: editNickname || undefined,
          gender: editGender,
          birthDate: editBirthDate || undefined,
          marketingAgree: editMarketingAgree,
        }),
      });
      if (res.ok) {
        setUserData((await res.json()).data);
        setIsEditModalOpen(false);
      } else {
        const json = await res.json().catch(() => ({}));
        alert((json as { message?: string }).message || "정보 수정에 실패했습니다.");
      }
    } catch { alert("네트워크 오류가 발생했습니다."); }
    finally { setIsSubmitting(false); }
  };

  // Seller info update
  const openSellerEditModal = () => {
    setEditSellerName(sellerData?.name ?? "");
    setEditSellerPhone(sellerData?.phone ?? "");
    setIsSellerEditModalOpen(true);
  };

  const handleSellerUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editSellerPhone && !editSellerPhone.match(/^\d{2,3}-\d{3,4}-\d{4}$/)) {
      alert("올바른 전화번호 형식(02-1234-5678)을 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/v1/sellers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editSellerName || undefined,
          phone: editSellerPhone || undefined,
        }),
      });
      if (res.ok) {
        const updated: SellerResponse = (await res.json()).data;
        setSellerData(updated);
        // 순수 SELLER는 profileName = 사업장명이므로 localStorage도 갱신
        if (userInfo?.role === "SELLER" || userInfo?.role === "ROLE_SELLER") {
          const newUserInfo = { ...userInfo, profileName: updated.name };
          setUserInfo(newUserInfo);
          localStorage.setItem("userInfo", JSON.stringify(newUserInfo));
        }
        setIsSellerEditModalOpen(false);
      } else {
        const json = await res.json().catch(() => ({}));
        alert((json as { message?: string }).message || "판매자 정보 수정에 실패했습니다.");
      }
    } catch { alert("네트워크 오류가 발생했습니다."); }
    finally { setIsSubmitting(false); }
  };

  // Store update
  const openStoreEditModal = () => {
    setEditStoreName(storeData?.name ?? "");
    setEditStoreDesc(storeData?.description ?? "");
    setEditStorePhone(storeData?.phone ?? "");
    setEditStoreThumbnail(storeData?.thumbnail ?? "");
    setIsStoreEditModalOpen(true);
  };

  const handleStoreUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editStorePhone && !editStorePhone.match(/^\d{2,3}-\d{3,4}-\d{4}$/)) {
      alert("올바른 전화번호 형식(02-1234-5678)을 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/v1/stores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editStoreName !== storeData?.name ? (editStoreName || undefined) : undefined,
          description: editStoreDesc || undefined,
          phone: editStorePhone || undefined,
          thumbnail: editStoreThumbnail || undefined,
        }),
      });
      if (res.ok) {
        setStoreData((await res.json()).data);
        setIsStoreEditModalOpen(false);
      } else {
        const json = await res.json().catch(() => ({}));
        alert((json as { message?: string }).message || "스토어 수정에 실패했습니다.");
      }
    } catch { alert("네트워크 오류가 발생했습니다."); }
    finally { setIsSubmitting(false); }
  };

  // Store delete
  const handleStoreDelete = async () => {
    if (!confirm(`'${storeData?.name}' 스토어를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/v1/stores", { method: "DELETE" });
      if (res.ok) {
        setStoreData(null);
        alert("스토어가 삭제되었습니다.");
      } else {
        const json = await res.json().catch(() => ({}));
        alert((json as { message?: string }).message || "스토어 삭제에 실패했습니다.");
      }
    } catch { alert("네트워크 오류가 발생했습니다."); }
    finally { setIsSubmitting(false); }
  };

  const handleLogout = async () => {
    if (!confirm("로그아웃 하시겠습니까?")) return;
    try { await apiFetch("/api/v1/auth/logout", { method: "POST" }); }
    catch (e) { console.error(e); }
    finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userInfo");
      localStorage.removeItem("tokenExpiresAt");
      router.push("/");
    }
  };

  const handleWithdraw = async () => {
    if (!confirm("정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    try {
      const url = isSeller(userInfo?.role) ? "/api/v1/sellers/withdraw" : "/api/v1/users/withdraw";
      const res = await apiFetch(url, { method: "DELETE" });
      if (res.ok) {
        alert("회원 탈퇴가 완료되었습니다.");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userInfo");
        localStorage.removeItem("tokenExpiresAt");
        router.push("/");
      } else {
        alert("탈퇴 처리 중 오류가 발생했습니다.");
      }
    } catch { alert("탈퇴 처리 중 오류가 발생했습니다."); }
  };

  const handleSellerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (buzNo.length !== 10) { alert("사업자 번호는 숫자 10자리여야 합니다."); return; }
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/v1/sellers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buzNo, name: regStoreName, phone: regStorePhone })
      });
      if (res.ok) {
        alert("판매자 등록이 완료되었습니다. 권한 적용을 위해 다시 로그인 해주세요.");
        setIsSellerModalOpen(false);
        await apiFetch("/api/v1/auth/logout", { method: "POST" });
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userInfo");
        localStorage.removeItem("tokenExpiresAt");
        router.push("/login");
      } else {
        const json = await res.json();
        alert((json as { message?: string }).message || "판매자 등록에 실패했습니다.");
      }
    } catch { alert("네트워크 오류가 발생했습니다."); }
    finally { setIsSubmitting(false); }
  };

  const handleStoreCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStorePhone.match(/^\d{2,3}-\d{3,4}-\d{4}$/)) {
      alert("올바른 전화번호 형식(000-0000-0000)을 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/v1/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStoreName,
          description: newStoreDesc,
          phone: newStorePhone,
          thumbnail: "https://placehold.co/400x400/eeeeee/999999.png?text=Store"
        })
      });
      if (res.ok) {
        setStoreData((await res.json()).data);
        setIsStoreModalOpen(false);
        alert("스토어 개설이 완료되었습니다! 이제 상품을 등록할 수 있습니다.");
      } else {
        const json = await res.json();
        alert((json as { message?: string }).message || "스토어 개설에 실패했습니다.");
      }
    } catch { alert("네트워크 오류가 발생했습니다."); }
    finally { setIsSubmitting(false); }
  };

  if (!isAuthed) {
    return (
      <div className="h-screen bg-drac-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-drac-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sellerRole = isSeller(userInfo?.role);

  return (
    <div className="min-h-screen bg-drac-bg text-drac-fg font-sans pb-32 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-drac-bg/80 border-b border-drac-comment/50 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-drac-fg hover:text-drac-pink transition-colors">
            <div className="w-10 h-10 rounded-full bg-drac-current flex items-center justify-center transition-colors">
              <ArrowLeft size={20} />
            </div>
            <span className="font-semibold hidden sm:inline">뒤로</span>
          </button>
          <h1 className="text-xl font-bold text-drac-fg">마이페이지</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-8 space-y-6">

        {/* Profile Card */}
        <div className="bg-gradient-to-br from-drac-current to-drac-bg border border-drac-comment/30 rounded-3xl p-6 sm:p-8 shadow-lg shadow-drac-current/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-drac-purple/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="flex items-center gap-5 sm:gap-6 relative z-10">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-drac-cyan to-drac-purple flex items-center justify-center text-white shadow-xl shrink-0 overflow-hidden relative">
              <User size={40} />
              {userData?.image && (
                <img src={userData.image} alt="프로필" className="absolute inset-0 w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-drac-current/80 border border-drac-comment/40 text-drac-pink text-[11px] font-black tracking-widest uppercase">
                  {userInfo?.role?.replace('ROLE_', '') || 'USER'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-drac-fg mb-1 tracking-tight truncate">
                {userData?.nickname || userInfo?.profileName || '사용자'}님
              </h2>
              <div className="space-y-0.5">
                {userData?.name && <p className="text-sm text-drac-comment">{userData.name}</p>}
                {userData?.phone && (
                  <p className="text-sm text-drac-comment flex items-center gap-1">
                    <Phone size={12} />{userData.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {userData && (
            <div className="mt-5 pt-5 border-t border-drac-comment/20 grid grid-cols-2 sm:grid-cols-3 gap-3 relative z-10">
              <div className="flex items-center gap-2 text-xs text-drac-comment">
                <User size={13} className="text-drac-cyan shrink-0" />
                <span>{userData.gender === "MALE" ? "남성" : userData.gender === "FEMALE" ? "여성" : "미설정"}</span>
              </div>
              {userData.birthDate && (
                <div className="flex items-center gap-2 text-xs text-drac-comment">
                  <Calendar size={13} className="text-drac-purple shrink-0" />
                  <span>{userData.birthDate}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-drac-comment">
                <Bell size={13} className={userData.marketingAgree ? "text-drac-green shrink-0" : "text-drac-comment shrink-0"} />
                <span>{userData.marketingAgree ? "마케팅 수신 동의" : "마케팅 수신 거부"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Seller Info Card (판매자 전용) */}
        {sellerRole && sellerData && (
          <div className="bg-drac-bg border border-drac-yellow/30 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-drac-yellow/10 border-b border-drac-yellow/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store size={18} className="text-drac-yellow" />
                <span className="text-sm font-bold text-drac-yellow">판매자 정보</span>
              </div>
              <button
                onClick={openSellerEditModal}
                className="flex items-center gap-1.5 text-xs font-semibold text-drac-yellow hover:text-drac-fg transition-colors px-3 py-1.5 rounded-xl bg-drac-yellow/10 hover:bg-drac-yellow/20"
              >
                <Pencil size={13} /> 수정
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-drac-comment mb-1">사업장명</p>
                <p className="text-sm font-semibold text-drac-fg">{sellerData.name}</p>
              </div>
              <div>
                <p className="text-xs text-drac-comment mb-1">연락처</p>
                <p className="text-sm font-semibold text-drac-fg">{sellerData.phone}</p>
              </div>
              <div>
                <p className="text-xs text-drac-comment mb-1">사업자 번호</p>
                <p className="text-sm font-semibold text-drac-fg">{sellerData.buzNo}</p>
              </div>
            </div>
          </div>
        )}

        {/* Store Info Card (스토어 있을 때) */}
        {sellerRole && storeData && (
          <div className="bg-drac-bg border border-drac-cyan/30 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-drac-cyan/10 border-b border-drac-cyan/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store size={18} className="text-drac-cyan" />
                <span className="text-sm font-bold text-drac-cyan">내 스토어</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openStoreEditModal}
                  className="flex items-center gap-1.5 text-xs font-semibold text-drac-cyan hover:text-drac-fg transition-colors px-3 py-1.5 rounded-xl bg-drac-cyan/10 hover:bg-drac-cyan/20"
                >
                  <Pencil size={13} /> 수정
                </button>
                <button
                  onClick={handleStoreDelete}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50"
                >
                  <Trash2 size={13} /> 삭제
                </button>
              </div>
            </div>
            <div className="p-6 flex items-center gap-5">
              {storeData.thumbnail && (
                <img src={storeData.thumbnail} alt="스토어 썸네일" className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-drac-current" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-base font-bold text-drac-fg truncate">{storeData.name}</p>
                {storeData.description && <p className="text-xs text-drac-comment truncate">{storeData.description}</p>}
                <p className="text-xs text-drac-comment flex items-center gap-1"><Phone size={11} />{storeData.phone}</p>
              </div>
            </div>
          </div>
        )}

        {/* 내 상품 관리 (판매자 + 스토어 있을 때) */}
        {sellerRole && storeData && (
          <div className="bg-drac-bg border border-drac-purple/30 rounded-3xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-drac-purple/10 border-b border-drac-purple/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-drac-purple" />
                <span className="text-sm font-bold text-drac-purple">내 상품 관리</span>
                {myProducts.length > 0 && (
                  <span className="text-xs font-bold text-drac-comment">({myProducts.length})</span>
                )}
              </div>
              <Link
                href="/products/new"
                className="flex items-center gap-1.5 text-xs font-semibold text-drac-purple hover:text-drac-fg transition-colors px-3 py-1.5 rounded-xl bg-drac-purple/10 hover:bg-drac-purple/20"
              >
                <Plus size={13} /> 상품 등록
              </Link>
            </div>

            {myProducts.length === 0 ? (
              <div className="p-8 text-center text-drac-comment text-sm">
                등록된 상품이 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-drac-current">
                {myProducts.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/products/${product.id}/edit`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-drac-current/30 transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-drac-current shrink-0 border border-drac-comment/20">
                        {product.thumbnail ? (
                          <img
                            src={product.thumbnail}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={16} className="text-drac-comment" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-drac-fg truncate group-hover:text-drac-pink transition-colors">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-drac-comment">
                            {product.discountRate > 0
                              ? `${product.discountedPrice.toLocaleString()}원`
                              : `${product.price.toLocaleString()}원`}
                          </span>
                          {product.status === "SUSPENDED" && (
                            <span className="text-[10px] font-bold text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-full">
                              판매중지
                            </span>
                          )}
                          {product.status === "SOLD_OUT" && (
                            <span className="text-[10px] font-bold text-drac-comment bg-drac-current px-1.5 py-0.5 rounded-full">
                              품절
                            </span>
                          )}
                        </div>
                      </div>
                      <Pencil size={15} className="text-drac-comment group-hover:text-drac-purple transition-colors shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Menu List */}
        <div className="bg-drac-bg border border-drac-current rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-drac-current/30 border-b border-drac-current flex items-center gap-2">
            <Settings size={18} className="text-drac-comment" />
            <span className="text-sm font-bold text-drac-comment">설정 및 관리</span>
          </div>

          <ul className="divide-y divide-drac-current">
            {!sellerRole && (
              <li>
                <button onClick={openEditModal} className="w-full flex items-center justify-between px-6 py-5 hover:bg-drac-current/40 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-drac-current flex items-center justify-center text-drac-purple group-hover:text-drac-pink transition-colors">
                      <Pencil size={20} />
                    </div>
                    <span className="font-semibold text-drac-fg text-[15px]">내 정보 수정</span>
                  </div>
                  <ChevronRight size={20} className="text-drac-comment group-hover:text-drac-pink transition-colors" />
                </button>
              </li>
            )}

            {!sellerRole && (
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

            {!sellerRole && (
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

            {sellerRole && !storeData && (
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
        <div className="bg-drac-current/30 border border-drac-comment/20 rounded-2xl p-5 flex items-start gap-4">
          <ShieldAlert size={20} className="text-drac-yellow shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-drac-fg text-sm mb-1">개인정보 보호</h4>
            <p className="text-xs text-drac-comment leading-relaxed">
              고객님의 소중한 개인정보는 철저하게 암호화되어 보호됩니다. 회원 탈퇴 시 모든 데이터는 복구 불가능하게 파기됩니다.
            </p>
          </div>
        </div>

      </main>

      {/* ── Modal: 내 정보 수정 ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsEditModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-drac-bg rounded-3xl rounded-b-none sm:rounded-b-3xl shadow-2xl overflow-hidden flex flex-col animate-[slideUp_0.3s_ease-out]">
            <div className="flex items-center justify-between p-6 border-b border-drac-current shrink-0">
              <div className="flex items-center gap-3">
                <Pencil size={22} className="text-drac-purple" />
                <h2 className="text-xl font-bold text-drac-fg">내 정보 수정</h2>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-drac-comment hover:text-drac-fg transition-colors"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="userEditForm" onSubmit={handleUserUpdate} className="space-y-5">
                <div className="p-4 bg-drac-current/40 rounded-xl space-y-3">
                  <p className="text-xs font-semibold text-drac-comment uppercase tracking-widest">변경 불가 정보</p>
                  <div className="flex items-center gap-3">
                    <User size={15} className="text-drac-comment shrink-0" />
                    <div><p className="text-xs text-drac-comment">이름</p><p className="text-sm font-semibold text-drac-fg">{userData?.name || "-"}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={15} className="text-drac-comment shrink-0" />
                    <div><p className="text-xs text-drac-comment">전화번호</p><p className="text-sm font-semibold text-drac-fg">{userData?.phone || "-"}</p></div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">닉네임 <span className="text-drac-pink">*</span></label>
                  <input required type="text" value={editNickname} onChange={e => setEditNickname(e.target.value)} maxLength={20}
                    placeholder="닉네임을 입력하세요 (최대 20자)"
                    className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                  <p className="text-xs text-drac-comment mt-1 text-right">{editNickname.length}/20</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">성별</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["MALE", "FEMALE", "NONE"] as Gender[]).map(g => (
                      <button key={g} type="button" onClick={() => setEditGender(g)}
                        className={`py-3 rounded-xl text-sm font-semibold border transition-all ${editGender === g ? "bg-drac-purple/20 border-drac-purple text-drac-purple" : "bg-drac-current border-transparent text-drac-comment hover:border-drac-comment"}`}>
                        {g === "MALE" ? "남성" : g === "FEMALE" ? "여성" : "미설정"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">생년월일</label>
                  <input type="date" value={editBirthDate} onChange={e => setEditBirthDate(e.target.value)}
                    className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>

                <label className="flex items-center gap-3 p-4 bg-drac-current/40 rounded-xl cursor-pointer hover:bg-drac-current/60 transition-colors">
                  <input type="checkbox" checked={editMarketingAgree} onChange={e => setEditMarketingAgree(e.target.checked)} className="w-5 h-5 accent-drac-purple rounded" />
                  <div>
                    <p className="text-sm font-semibold text-drac-fg">마케팅 정보 수신 동의</p>
                    <p className="text-xs text-drac-comment mt-0.5">이벤트, 혜택 등의 마케팅 정보를 받습니다</p>
                  </div>
                </label>
              </form>
            </div>

            <div className="p-6 border-t border-drac-current shrink-0">
              <button type="submit" form="userEditForm" disabled={isSubmitting || !editNickname.trim()}
                className="w-full py-4 bg-gradient-to-r from-drac-purple to-drac-pink text-white font-bold rounded-2xl hover:opacity-90 transition-all shadow-md shadow-drac-purple/20 disabled:opacity-50 flex items-center justify-center gap-2">
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 size={20} />}
                {isSubmitting ? "저장 중..." : "저장하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: 판매자 정보 수정 ── */}
      {isSellerEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsSellerEditModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-drac-bg rounded-3xl rounded-b-none sm:rounded-b-3xl shadow-2xl overflow-hidden flex flex-col animate-[slideUp_0.3s_ease-out]">
            <div className="flex items-center justify-between p-6 border-b border-drac-current shrink-0">
              <div className="flex items-center gap-3">
                <Store size={22} className="text-drac-yellow" />
                <h2 className="text-xl font-bold text-drac-fg">판매자 정보 수정</h2>
              </div>
              <button onClick={() => setIsSellerEditModalOpen(false)} className="text-drac-comment hover:text-drac-fg transition-colors"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="sellerEditForm" onSubmit={handleSellerUpdate} className="space-y-5">
                <div className="p-4 bg-drac-current/40 rounded-xl">
                  <p className="text-xs text-drac-comment mb-1">사업자 번호 (변경 불가)</p>
                  <div className="flex items-center gap-2">
                    <Hash size={14} className="text-drac-comment" />
                    <p className="text-sm font-semibold text-drac-fg">{sellerData?.buzNo}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">사업장명</label>
                  <input type="text" value={editSellerName} onChange={e => setEditSellerName(e.target.value)} maxLength={50}
                    placeholder="사업장명을 입력하세요"
                    className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-yellow outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">연락처</label>
                  <input type="tel" value={editSellerPhone} onChange={e => setEditSellerPhone(e.target.value)}
                    placeholder="02-1234-5678"
                    className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-yellow outline-none transition-all" />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-drac-current shrink-0">
              <button type="submit" form="sellerEditForm" disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-drac-yellow to-drac-orange text-drac-bg font-bold rounded-2xl hover:opacity-90 transition-all shadow-md shadow-drac-yellow/20 disabled:opacity-50 flex items-center justify-center gap-2">
                {isSubmitting ? <div className="w-5 h-5 border-2 border-drac-bg border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 size={20} />}
                {isSubmitting ? "저장 중..." : "저장하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: 스토어 수정 ── */}
      {isStoreEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsStoreEditModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-drac-bg rounded-3xl rounded-b-none sm:rounded-b-3xl shadow-2xl overflow-hidden flex flex-col animate-[slideUp_0.3s_ease-out]">
            <div className="flex items-center justify-between p-6 border-b border-drac-current shrink-0">
              <div className="flex items-center gap-3">
                <Store size={22} className="text-drac-cyan" />
                <h2 className="text-xl font-bold text-drac-fg">스토어 수정</h2>
              </div>
              <button onClick={() => setIsStoreEditModalOpen(false)} className="text-drac-comment hover:text-drac-fg transition-colors"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="storeEditForm" onSubmit={handleStoreUpdate} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">스토어 이름</label>
                  <input type="text" value={editStoreName} onChange={e => setEditStoreName(e.target.value)}
                    placeholder="스토어 이름"
                    className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-cyan outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">
                    <AlignLeft size={13} className="inline mr-1" />스토어 설명
                  </label>
                  <input type="text" value={editStoreDesc} onChange={e => setEditStoreDesc(e.target.value)}
                    placeholder="스토어 한 줄 소개"
                    className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-cyan outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">고객센터 연락처</label>
                  <input type="tel" value={editStorePhone} onChange={e => setEditStorePhone(e.target.value)}
                    placeholder="02-1234-5678"
                    className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-cyan outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">
                    <ImageIcon size={13} className="inline mr-1" />썸네일 URL
                  </label>
                  <input type="url" value={editStoreThumbnail} onChange={e => setEditStoreThumbnail(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-cyan outline-none transition-all" />
                  {editStoreThumbnail && (
                    <img src={editStoreThumbnail} alt="미리보기" className="mt-2 w-20 h-20 rounded-xl object-cover border border-drac-current" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-drac-current shrink-0">
              <button type="submit" form="storeEditForm" disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-drac-cyan to-drac-purple text-white font-bold rounded-2xl hover:opacity-90 transition-all shadow-md shadow-drac-purple/20 disabled:opacity-50 flex items-center justify-center gap-2">
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 size={20} />}
                {isSubmitting ? "저장 중..." : "저장하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: 판매자 등록 ── */}
      {isSellerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsSellerModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-drac-bg rounded-3xl rounded-b-none sm:rounded-b-3xl shadow-2xl overflow-hidden flex flex-col animate-[slideUp_0.3s_ease-out]">
            <div className="flex items-center justify-between p-6 border-b border-drac-current shrink-0">
              <div className="flex items-center gap-3">
                <Store size={24} className="text-drac-yellow" />
                <h2 className="text-xl font-bold text-drac-fg">판매자(사업자)로 전환하기</h2>
              </div>
              <button onClick={() => setIsSellerModalOpen(false)} className="text-drac-comment hover:text-drac-fg transition-colors"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="sellerForm" onSubmit={handleSellerRegister} className="space-y-5">
                <div className="p-4 bg-drac-yellow/10 border border-drac-yellow/30 rounded-xl">
                  <p className="text-sm text-drac-yellow font-medium leading-relaxed">
                    판매자로 전환하면 나만의 스토어를 개설하고 상품을 등록할 수 있습니다. 아래 사업자 정보를 입력해 주세요.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">사업자 등록번호 <span className="text-drac-pink">*</span></label>
                  <input required type="text" value={buzNo} onChange={e => setBuzNo(e.target.value)} placeholder="숫자 10자리 (예: 1234567890)" maxLength={10}
                    className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">사업장명 <span className="text-drac-pink">*</span></label>
                  <input required type="text" value={regStoreName} onChange={e => setRegStoreName(e.target.value)} placeholder="사업자등록증 상의 상호명"
                    className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">사업장 연락처 <span className="text-drac-pink">*</span></label>
                  <input required type="tel" value={regStorePhone} onChange={e => setRegStorePhone(e.target.value)} placeholder="사업장 대표 전화번호"
                    className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-drac-current shrink-0">
              <button type="submit" form="sellerForm" disabled={isSubmitting || buzNo.length !== 10 || !regStoreName || !regStorePhone}
                className="w-full py-4 bg-gradient-to-r from-drac-yellow to-drac-orange text-drac-bg font-bold rounded-2xl hover:opacity-90 transition-all shadow-md shadow-drac-yellow/20 disabled:opacity-50 flex items-center justify-center gap-2">
                {isSubmitting ? <div className="w-5 h-5 border-2 border-drac-bg border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 size={20} />}
                {isSubmitting ? "처리 중..." : "판매자로 등록하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: 스토어 개설 ── */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsStoreModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-drac-bg rounded-3xl rounded-b-none sm:rounded-b-3xl shadow-2xl overflow-hidden flex flex-col animate-[slideUp_0.3s_ease-out]">
            <div className="flex items-center justify-between p-6 border-b border-drac-current shrink-0">
              <div className="flex items-center gap-3">
                <Store size={24} className="text-drac-cyan" />
                <h2 className="text-xl font-bold text-drac-fg">내 스토어 개설하기</h2>
              </div>
              <button onClick={() => setIsStoreModalOpen(false)} className="text-drac-comment hover:text-drac-fg transition-colors"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="storeForm" onSubmit={handleStoreCreate} className="space-y-5">
                <div className="p-4 bg-drac-cyan/10 border border-drac-cyan/30 rounded-xl">
                  <p className="text-sm text-drac-cyan font-medium leading-relaxed">
                    스토어를 개설해야 고객에게 상품을 보여주고 판매할 수 있습니다. 멋진 스토어를 만들어보세요!
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">스토어 이름 <span className="text-drac-pink">*</span></label>
                  <input required type="text" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} placeholder="스토어 이름을 입력하세요"
                    className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">스토어 설명</label>
                  <input type="text" value={newStoreDesc} onChange={e => setNewStoreDesc(e.target.value)} placeholder="한 줄 소개 (선택)"
                    className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">고객센터 연락처 <span className="text-drac-pink">*</span></label>
                  <input required type="tel" value={newStorePhone} onChange={e => setNewStorePhone(e.target.value)} placeholder="02-123-4567"
                    className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-drac-current shrink-0">
              <button type="submit" form="storeForm" disabled={isSubmitting || !newStoreName || !newStorePhone}
                className="w-full py-4 bg-gradient-to-r from-drac-cyan to-drac-purple text-white font-bold rounded-2xl hover:opacity-90 transition-all shadow-md shadow-drac-purple/20 disabled:opacity-50 flex items-center justify-center gap-2">
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 size={20} />}
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
