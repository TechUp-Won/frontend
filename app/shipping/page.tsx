"use client";

import ThemeToggle from "@/app/components/ThemeToggle";
import { apiFetch } from "@/app/lib/apiFetch";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  X
} from "lucide-react";

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

export default function ShippingAddressPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form states
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAddresses = async () => {
    try {
      const res = await apiFetch("/api/v1/shipping/addresses");
      if (res.ok) {
        const json = await res.json();
        setAddresses(json.data?.addresses || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    setIsAuthed(true);
    fetchAddresses();
  }, [router]);

  const openAddModal = () => {
    setEditingId(null);
    setRecipientName("");
    setRecipientPhone("");
    setZipCode("");
    setAddress1("");
    setAddress2("");
    setMemo("");
    setIsModalOpen(true);
  };

  const openEditModal = (addr: ShippingAddress) => {
    setEditingId(addr.shippingAddressId);
    setRecipientName(addr.recipientName);
    setRecipientPhone(addr.recipientPhone);
    setZipCode(addr.zipCode);
    setAddress1(addr.address1);
    setAddress2(addr.address2);
    setMemo(addr.memo || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validation matches backend rules roughly
    if (!/^\d{2,3}-\d{3,4}-\d{4}$/.test(recipientPhone)) {
      alert("전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)");
      return;
    }
    if (!/^\d{5}$/.test(zipCode)) {
      alert("우편번호는 5자리 숫자여야 합니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId
        ? `/api/v1/shipping/addresses/${editingId}`
        : `/api/v1/shipping/addresses`;

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientName, recipientPhone, zipCode, address1, address2, memo })
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchAddresses();
      } else {
        const errJson = await res.json();
        alert(errJson.message || "저장 중 오류가 발생했습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("정말 이 배송지를 삭제하시겠습니까?")) return;
    try {
      const res = await apiFetch(`/api/v1/shipping/addresses/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAddresses();
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const res = await apiFetch(`/api/v1/shipping/addresses/${id}/default`, { method: "PATCH" });
      if (res.ok) {
        fetchAddresses();
      } else {
        alert("기본 배송지 설정에 실패했습니다.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isAuthed || loading) {
    return (
      <div className="h-screen bg-drac-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-drac-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-drac-bg text-drac-fg font-sans pb-32 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-drac-bg/80 border-b border-drac-comment/50 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-drac-fg hover:text-drac-pink transition-colors">
            <div className="w-10 h-10 rounded-full bg-drac-current flex items-center justify-center transition-colors">
              <ArrowLeft size={20} />
            </div>
            <span className="font-semibold hidden sm:inline">뒤로</span>
          </button>
          <div className="flex items-center gap-3">
            <MapPin size={20} className="text-drac-purple" />
            <h1 className="text-xl font-bold text-drac-fg">배송지 관리</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-8">
        
        {/* Address List */}
        <div className="space-y-4">
          {addresses.length === 0 ? (
            <div className="bg-drac-bg border border-drac-current border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-drac-current rounded-full flex items-center justify-center mb-4">
                <MapPin size={32} className="text-drac-comment" />
              </div>
              <h3 className="text-lg font-bold text-drac-fg mb-1">등록된 배송지가 없습니다</h3>
              <p className="text-sm text-drac-comment">새로운 배송지를 추가해보세요.</p>
            </div>
          ) : (
            addresses.map((addr) => (
              <div key={addr.shippingAddressId} className={`relative bg-drac-bg border rounded-2xl p-5 sm:p-6 shadow-sm transition-all ${addr.isDefault ? 'border-drac-purple shadow-drac-purple/10 bg-drac-purple/5' : 'border-drac-current hover:border-drac-comment/50'}`}>
                {addr.isDefault && (
                  <div className="absolute -top-3 -left-3 sm:-top-3 sm:-left-4 px-3 py-1 bg-drac-purple text-white text-xs font-bold rounded-full shadow-md flex items-center gap-1 border-2 border-drac-bg">
                    <CheckCircle2 size={12} />
                    기본 배송지
                  </div>
                )}
                
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-drac-fg truncate">{addr.recipientName}</h3>
                      <span className="text-sm font-medium text-drac-comment">{addr.recipientPhone}</span>
                    </div>
                    <div className="text-sm text-drac-fg leading-relaxed">
                      <p className="text-drac-comment mb-0.5">[{addr.zipCode}]</p>
                      <p>{addr.address1}</p>
                      {addr.address2 && <p>{addr.address2}</p>}
                      {addr.memo && <p className="text-xs text-drac-pink mt-2 italic">배송메모: {addr.memo}</p>}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEditModal(addr)} className="w-8 h-8 rounded-full bg-drac-current flex items-center justify-center text-drac-comment hover:text-drac-fg hover:bg-drac-comment/30 transition-colors" title="수정">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(addr.shippingAddressId)} className="w-8 h-8 rounded-full bg-drac-current flex items-center justify-center text-drac-comment hover:text-red-500 hover:bg-red-500/10 transition-colors" title="삭제">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {!addr.isDefault && (
                      <button onClick={() => handleSetDefault(addr.shippingAddressId)} className="text-[11px] font-bold text-drac-purple bg-drac-purple/10 hover:bg-drac-purple/20 px-3 py-1.5 rounded-lg transition-colors mt-2">
                        기본으로 설정
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Add Button */}
          <button onClick={openAddModal} className="w-full mt-6 py-4 border-2 border-dashed border-drac-comment/40 hover:border-drac-purple rounded-2xl text-drac-comment hover:text-drac-purple font-bold flex items-center justify-center gap-2 transition-colors group">
            <div className="w-6 h-6 rounded-full bg-drac-current group-hover:bg-drac-purple/20 flex items-center justify-center transition-colors">
              <Plus size={16} />
            </div>
            새 배송지 추가하기
          </button>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-drac-bg rounded-3xl sm:rounded-3xl rounded-b-none sm:rounded-b-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-[slideUp_0.3s_ease-out]">
            
            <div className="flex items-center justify-between p-6 border-b border-drac-current bg-drac-bg z-10 shrink-0">
              <h2 className="text-xl font-bold text-drac-fg">
                {editingId ? "배송지 수정" : "새 배송지 추가"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-drac-comment hover:text-drac-fg transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              <form id="addressForm" onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">수령인 <span className="text-drac-pink">*</span></label>
                  <input required type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="이름을 입력하세요" className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">연락처 <span className="text-drac-pink">*</span></label>
                  <input required type="tel" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="010-1234-5678" className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">우편번호 <span className="text-drac-pink">*</span></label>
                  <input required type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="12345" maxLength={5} className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">기본 주소 <span className="text-drac-pink">*</span></label>
                  <input required type="text" value={address1} onChange={e => setAddress1(e.target.value)} placeholder="기본 주소를 입력하세요" className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">상세 주소</label>
                  <input type="text" value={address2} onChange={e => setAddress2(e.target.value)} placeholder="상세 주소를 입력하세요 (선택)" className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-drac-comment mb-1.5">배송 메모</label>
                  <input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="배송 기사님께 남길 메모 (선택)" className="w-full px-4 py-3 bg-drac-current border border-transparent rounded-xl text-drac-fg placeholder:text-drac-comment/50 focus:bg-drac-bg focus:border-drac-purple outline-none transition-all" />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-drac-current bg-drac-bg shrink-0">
              <button 
                type="submit" 
                form="addressForm"
                disabled={isSubmitting}
                className="w-full py-4 bg-drac-purple text-white font-bold rounded-2xl hover:bg-drac-purple/80 transition-all shadow-md shadow-drac-purple/20 disabled:opacity-50 flex items-center justify-center"
              >
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "저장하기"}
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
