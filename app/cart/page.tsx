"use client";

import ThemeToggle from "@/app/components/ThemeToggle";
import { apiFetch } from "@/app/lib/apiFetch";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, CreditCard, Sparkles, MoreHorizontal, ChevronDown, ChevronUp, CheckCircle2, Circle, X } from "lucide-react";

interface CartItemInfo {
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
  sellable: boolean;
}

interface CartSummary {
  originalTotalAmount: number;
  discountTotalAmount: number;
}

interface CartResponse {
  cartId: number;
  cartItems: CartItemInfo[];
  summary: CartSummary;
}

interface OptionInfo {
  productOptionId: number;
  name: string;
}

interface OptionGroupInfo {
  productOptionGroupId: number;
  name: string;
  options: OptionInfo[];
}

interface VariantInfo {
  variantId: number;
  variantName: string;
  combinationIds: number[];
  stock: number;
  status: string;
}

interface ProductDetail {
  productId: number;
  productName: string;
  price: number;
  discountedPrice: number;
  discountRate: number;
  status: string;
  likeCount: number;
  isLiked: boolean;
  store: { storeId: number; storeName: string } | null;
  images: { url: string; sortOrder: number }[];
  detail: { content: string } | null;
  optionGroups: OptionGroupInfo[];
  variants: VariantInfo[];
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editingQuantityId, setEditingQuantityId] = useState<number | null>(null);
  const [localQuantity, setLocalQuantity] = useState<number>(1);

  // Option Edit Modal State
  const [optionModalOpen, setOptionModalOpen] = useState(false);
  const [editingOptionItem, setEditingOptionItem] = useState<CartItemInfo | null>(null);
  const [optionProduct, setOptionProduct] = useState<ProductDetail | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [openGroupIndex, setOpenGroupIndex] = useState<number>(0);
  const [savingOption, setSavingOption] = useState(false);
  const [storeMap, setStoreMap] = useState<Record<number, string>>({});

  // Auth state
  const [userInfo, setUserInfo] = useState<{ profileName: string, role: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const fetchCart = async () => {
    try {
      const res = await apiFetch('/api/v1/carts');
      if (res.ok) {
        const json = await res.json();
        setCart(json.data);
      } else {
        setCart(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("userInfo");
    if (storedUser) {
      try {
        setUserInfo(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user info", e);
      }
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (authChecked) {
      if (userInfo) {
        fetchCart();
      } else {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, userInfo]);

  useEffect(() => {
    if (!cart || !cart.cartItems) return;
    
    const fetchStoreNames = async () => {
      const uniqueProductIds = Array.from(new Set(cart.cartItems.map(item => item.id)));
      const newIds = uniqueProductIds.filter(id => !storeMap[id]);
      
      if (newIds.length === 0) return;

      const results = await Promise.all(
        newIds.map(async (id) => {
          try {
            const res = await apiFetch(`/api/v1/products/${id}`);
            if (res.ok) {
              const json = await res.json();
              return { id, name: json.data.store?.storeName || "Unknown Store" };
            }
          } catch (e) {
            console.error(e);
          }
          return { id, name: "Unknown Store" };
        })
      );

      setStoreMap(prev => {
        const next = { ...prev };
        results.forEach(r => {
          if (r) next[r.id] = r.name;
        });
        return next;
      });
    };

    fetchStoreNames();
  }, [cart, storeMap]);

  const handleLogout = async () => {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userInfo");
      localStorage.removeItem("tokenExpiresAt");
      setUserInfo(null);
    }
  };

  const handleSaveQuantity = async (cartItemId: number, originalQuantity: number) => {
    if (localQuantity === originalQuantity) {
      setEditingQuantityId(null);
      return;
    }
    try {
      const res = await apiFetch(`/api/v1/carts/items/${cartItemId}/quantity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: localQuantity })
      });
      if (res.ok) {
        fetchCart();
      } else {
        alert("수량 변경에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("수량 변경 중 오류가 발생했습니다.");
    } finally {
      setEditingQuantityId(null);
    }
  };

  const handleDeleteItem = async (cartItemId: number) => {
    if (!confirm("상품을 장바구니에서 삭제하시겠습니까?")) return;
    try {
      const res = await apiFetch(`/api/v1/carts/items?cartItemIds=${cartItemId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchCart();
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("장바구니를 모두 비우시겠습니까?")) return;
    try {
      const res = await apiFetch(`/api/v1/carts/items?isAllDelete=true`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchCart();
      } else {
        alert("장바구니 비우기에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("장바구니 비우기 중 오류가 발생했습니다.");
    }
  };

  const handleOpenOptionEdit = async (item: CartItemInfo) => {
    setOptionModalOpen(true);
    setEditingOptionItem(item);
    setOptionProduct(null);
    setSelectedOptions({});
    setOpenGroupIndex(0);
    
    try {
      const res = await apiFetch(`/api/v1/products/${item.id}`);
      if (res.ok) {
        const json = await res.json();
        setOptionProduct(json.data);
      }
    } catch (e) {
      console.error(e);
      alert("상품 정보를 불러오는 데 실패했습니다.");
      setOptionModalOpen(false);
    }
  };

  const handleOptionSelect = (groupIndex: number, groupId: number, optionId: number) => {
    setSelectedOptions((prev) => {
      const next = { ...prev, [groupId]: optionId };
      // 이후 그룹들의 선택을 초기화 (상위 옵션이 바뀌면 하위 선택은 무효화됨)
      if (optionProduct?.optionGroups) {
        for (let i = groupIndex + 1; i < optionProduct.optionGroups.length; i++) {
          delete next[optionProduct.optionGroups[i].productOptionGroupId];
        }
      }
      return next;
    });

    if (optionProduct?.optionGroups && groupIndex + 1 < optionProduct.optionGroups.length) {
      setOpenGroupIndex(groupIndex + 1);
    } else {
      setOpenGroupIndex(-1);
    }
  };

  const isOptionAvailable = (groupIndex: number, optionId: number) => {
    if (!optionProduct || !optionProduct.variants) return true;

    // 현재 그룹보다 상위에서 선택된 옵션 ID들
    const prevSelectedOptionIds = optionProduct.optionGroups
      .slice(0, groupIndex)
      .map(group => selectedOptions[group.productOptionGroupId])
      .filter(id => id !== undefined);

    // 현재 확인하려는 옵션 ID를 포함한 경로
    const currentPath = [...prevSelectedOptionIds, optionId];

    // 모든 variants 중에서, currentPath의 모든 ID를 포함하고 있는 '판매 중인' variant가 있는지 확인
    return optionProduct.variants.some(variant => {
      if (variant.status !== 'ON_SALE' || variant.stock <= 0) return false;
      return currentPath.every(id => variant.combinationIds.includes(id));
    });
  };

  const isGroupEnabled = (index: number) => {

    if (index === 0) return true;
    const prevGroupId = optionProduct?.optionGroups[index - 1].productOptionGroupId;
    return prevGroupId !== undefined && selectedOptions[prevGroupId] !== undefined;
  };

  const handleSubmitOptionEdit = async () => {
    if (!optionProduct || !editingOptionItem) return;

    if (optionProduct.optionGroups && optionProduct.optionGroups.length > 0) {
      if (Object.keys(selectedOptions).length !== optionProduct.optionGroups.length) {
        alert("모든 옵션을 선택해주세요.");
        return;
      }
    }

    let variantId: number | undefined;
    if (optionProduct.variants && optionProduct.variants.length > 0) {
      const selectedOptionIds = Object.values(selectedOptions);
      const matchingVariant = optionProduct.variants.find(v => {
        return v.combinationIds.length === selectedOptionIds.length &&
               v.combinationIds.every(id => selectedOptionIds.includes(id));
      });
      if (!matchingVariant) {
        alert("선택하신 옵션의 상품이 존재하지 않거나 품절입니다.");
        return;
      }
      variantId = matchingVariant.variantId;
    } else {
      variantId = optionProduct.variants?.[0]?.variantId;
    }

    if (!variantId) {
      alert("상품 옵션 정보를 확인할 수 없습니다.");
      return;
    }

    setSavingOption(true);
    try {
      const res = await apiFetch(`/api/v1/carts/items/${editingOptionItem.cartItemId}/option`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId })
      });

      if (res.ok) {
        fetchCart();
        setOptionModalOpen(false);
      } else {
        alert("옵션 변경에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("옵션 변경 중 오류가 발생했습니다.");
    } finally {
      setSavingOption(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-drac-bg flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-drac-pink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isEmpty = !cart || !cart.cartItems || cart.cartItems.length === 0;

  if (authChecked && !userInfo) {
    return (
      <div className="min-h-screen bg-drac-bg text-drac-fg font-sans pb-32">
        {/* Header NavBar */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-drac-bg/80 border-b border-drac-comment/50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-drac-fg hover:text-drac-pink transition-colors group">
              <div className="w-10 h-10 rounded-full bg-drac-current flex items-center justify-center group-hover:bg-drac-comment transition-colors">
                <ArrowLeft size={20} />
              </div>
              <span className="font-semibold">Back</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-drac-cyan to-drac-purple flex items-center justify-center text-white shadow-md shadow-drac-purple/30">
                <Sparkles size={16} />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-drac-cyan to-drac-purple tracking-tight">
                Shopping Cart
              </h1>
            </div>
            <div className="flex items-center justify-end shrink-0 gap-4">
            <ThemeToggle />
              <Link href="/login" className="text-sm font-bold text-drac-fg hover:text-drac-pink transition-colors">
                로그인
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-12">
          <div className="bg-drac-bg rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-sm border border-drac-current mt-10">
            <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6">
              <Sparkles size={40} className="text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-drac-fg mb-2">로그인이 필요합니다</h3>
            <p className="text-drac-comment mb-8">장바구니를 확인하려면 먼저 로그인을 해주세요.</p>
            <Link href="/login" className="px-8 py-3.5 bg-drac-purple text-drac-bg rounded-full font-bold hover:bg-drac-purple/80 transition-colors shadow-lg shadow-drac-purple/20">
              로그인 하러가기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-drac-bg text-drac-fg font-sans pb-32">
      {/* Header NavBar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-drac-bg/80 border-b border-drac-comment/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-drac-fg hover:text-drac-pink transition-colors group">
            <div className="w-10 h-10 rounded-full bg-drac-current flex items-center justify-center group-hover:bg-drac-comment transition-colors">
              <ArrowLeft size={20} />
            </div>
            <span className="font-semibold">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-drac-cyan to-drac-purple flex items-center justify-center text-white shadow-md shadow-drac-purple/30">
              <Sparkles size={16} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-drac-cyan to-drac-purple tracking-tight">
              Shopping Cart
            </h1>
          </div>
          <div className="flex items-center justify-end shrink-0 gap-4">
            <ThemeToggle />
            {userInfo ? (
              <div className="flex items-center gap-4">
                {(userInfo.role === 'ROLE_SELLER' || userInfo.role === 'SELLER') && (
                  <Link href="/products/new" className="text-xs sm:text-sm font-bold px-3.5 py-2 bg-gradient-to-tr from-drac-pink to-drac-purple hover:from-drac-pink/85 hover:to-drac-purple/85 text-drac-bg rounded-xl transition-all shadow-md flex items-center gap-1.5 shrink-0 hover:scale-[1.03] active:scale-95">
                    <Plus size={16} />
                    <span>상품 등록</span>
                  </Link>
                )}
                <span className="text-sm font-bold text-drac-fg hidden sm:flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-tr from-drac-cyan/20 via-drac-purple/20 to-drac-pink/20 border border-drac-purple/40 text-drac-fg text-[11px] font-black tracking-widest uppercase shadow-[0_0_12px_rgba(189,147,249,0.3)] backdrop-blur-sm relative overflow-hidden">
                    {userInfo.role ? userInfo.role.replace('ROLE_', '') : 'USER'}
                  </span>
                  <span><span className="text-drac-pink">{userInfo.profileName}</span>님 환영합니다</span>
                </span>
                <button onClick={handleLogout} className="text-sm font-bold text-drac-comment hover:text-red-500 transition-colors">
                  로그아웃
                </button>
              </div>
            ) : (
              <Link href="/login" className="text-sm font-bold text-drac-fg hover:text-drac-pink transition-colors">
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-12">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* Cart Items List */}
          <div className="w-full lg:w-2/3 flex flex-col gap-6">
            <div className="flex justify-between items-end mb-2">
              <h2 className="text-2xl font-bold text-drac-fg flex items-center gap-2">
                <ShoppingBag size={24} className="text-drac-pink" />
                장바구니
                <span className="text-drac-comment text-lg ml-1">({cart?.cartItems?.length || 0})</span>
              </h2>
              {!isEmpty && (
                <button 
                  onClick={handleDeleteAll}
                  className="text-sm font-semibold text-drac-comment hover:text-red-500 transition-colors"
                >
                  전체 삭제
                </button>
              )}
            </div>

            {isEmpty ? (
              <div className="bg-drac-bg rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-sm border border-drac-current">
                <div className="w-24 h-24 bg-drac-bg rounded-full flex items-center justify-center mb-6">
                  <ShoppingBag size={40} className="text-drac-comment" />
                </div>
                <h3 className="text-xl font-bold text-drac-fg mb-2">장바구니가 비어있습니다.</h3>
                <p className="text-drac-comment mb-8">매력적인 상품들을 장바구니에 담아보세요!</p>
                <Link href="/" className="px-8 py-3.5 bg-drac-purple text-drac-bg rounded-full font-bold hover:bg-drac-purple/80 transition-colors shadow-lg shadow-drac-purple/20">
                  쇼핑 계속하기
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {cart.cartItems.map((item) => {
                  const itemPrice = item.discountRate > 0 ? item.discountedPrice ?? item.price : item.price;
                  const isAvailable = item.sellable;
                  
                  return (
                    <div key={item.cartItemId} className={`bg-drac-bg rounded-3xl p-5 shadow-sm border border-drac-current flex flex-col sm:flex-row gap-5 relative group ${isAvailable ? '' : 'opacity-60 grayscale-[0.3]'}`}>
                      {/* Delete Button */}
                      <button 
                        onClick={() => handleDeleteItem(item.cartItemId)}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-drac-comment hover:text-red-500 hover:bg-drac-current rounded-full transition-all"
                      >
                        <Trash2 size={18} />
                      </button>

                      {/* Item Image */}
                      <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-drac-current flex-shrink-0 cursor-pointer" onClick={() => router.push(`/products/${item.id}`)}>
                        <Image src={item.thumbnail || "https://placehold.co/400x400/eeeeee/999999.png?text=No+Image"} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                      </div>

                      {/* Item Details */}
                      <div className="flex flex-col flex-1 justify-between py-1">
                        <div>
                          <span className="text-xs font-bold text-drac-pink mb-0.5 block">
                            {storeMap[item.id] || "..."}
                          </span>
                          <Link href={`/products/${item.id}`} className="text-lg font-bold text-drac-fg mb-1 hover:text-drac-pink transition-colors pr-8 block line-clamp-2">
                            {item.name}
                          </Link>
                          {!isAvailable && (
                            <div className="mb-2">
                              <span className="inline-block px-2.5 py-1 bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg tracking-wide">
                                판매 불가 상품입니다
                              </span>
                            </div>
                          )}
                          {item.variantName && (
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-[10px] font-black text-drac-comment uppercase bg-drac-current px-1.5 py-0.5 rounded border border-drac-comment/20">
                                선택 옵션
                              </span>
                              <span className="text-sm font-medium text-drac-fg/80">
                                {item.variantName}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-end justify-between gap-4 mt-2">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const displayQty = editingQuantityId === item.cartItemId ? localQuantity : item.quantity;
                              const currentDiscounted = item.discountedPrice ?? item.price;
                              return item.discountRate > 0 ? (
                                <>
                                  <span className="text-xl font-black text-drac-fg">{(currentDiscounted * displayQty).toLocaleString()}원</span>
                                  <span className="text-sm text-drac-comment line-through">{(item.price * displayQty).toLocaleString()}원</span>
                                </>
                              ) : (
                                <span className="text-xl font-black text-drac-fg">{(item.price * displayQty).toLocaleString()}원</span>
                              );
                            })()}
                          </div>
                          
                            {/* Quantity Controls & Menu */}
                          <div className="flex items-center gap-2 relative">
                            {editingQuantityId === item.cartItemId ? (
                              <div className="flex items-center bg-drac-bg rounded-xl border border-drac-comment/60 p-1">
                                <button 
                                  onClick={() => setLocalQuantity(prev => Math.max(1, prev - 1))}
                                  disabled={localQuantity <= 1}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-drac-bg hover:shadow-sm text-drac-fg disabled:opacity-50 transition-all"
                                >
                                  <Minus size={16} />
                                </button>
                                <span className="w-10 text-center font-bold text-drac-fg text-sm">
                                  {localQuantity}
                                </span>
                                <button 
                                  onClick={() => setLocalQuantity(prev => Math.min(item.stock, prev + 1))}
                                  disabled={localQuantity >= item.stock}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-drac-bg hover:shadow-sm text-drac-fg transition-all"
                                >
                                  <Plus size={16} />
                                </button>
                                <button
                                  onClick={() => handleSaveQuantity(item.cartItemId, item.quantity)}
                                  className="ml-1 px-3 py-1.5 text-xs font-bold text-drac-pink hover:bg-drac-comment rounded-lg transition-colors"
                                >
                                  완료
                                </button>
                              </div>
                            ) : (
                              <span className="text-sm font-semibold text-drac-fg bg-drac-bg px-3 py-1.5 rounded-lg border border-drac-comment/60">
                                수량: {item.quantity}개
                              </span>
                            )}

                            {/* Dropdown Button */}
                            {isAvailable && (
                              <button
                                onClick={() => setOpenMenuId(openMenuId === item.cartItemId ? null : item.cartItemId)}
                                className="p-1.5 text-drac-comment hover:text-drac-fg hover:bg-drac-current rounded-lg transition-colors ml-1"
                              >
                                <MoreHorizontal size={20} />
                              </button>
                            )}

                            {/* Dropdown Menu */}
                            {openMenuId === item.cartItemId && (
                              <div className="absolute bottom-full right-0 mb-2 w-32 bg-drac-bg rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-drac-current py-1 z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  onClick={() => { setEditingQuantityId(item.cartItemId); setLocalQuantity(item.quantity); setOpenMenuId(null); }}
                                  className="px-4 py-2.5 text-sm text-center font-bold text-drac-fg hover:bg-drac-current hover:text-drac-pink transition-colors"
                                >
                                  수량 변경
                                </button>
                                <button
                                  onClick={() => { handleOpenOptionEdit(item); setOpenMenuId(null); }}
                                  className="px-4 py-2.5 text-sm text-center font-bold text-drac-fg hover:bg-drac-current hover:text-drac-pink transition-colors border-t border-drac-current"
                                >
                                  옵션 변경
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Summary */}
          <div className="w-full lg:w-1/3">
            <div className="bg-drac-bg rounded-3xl p-6 shadow-sm border border-drac-current sticky top-28">
              <h2 className="text-lg font-bold text-drac-fg mb-6">주문 결제 금액</h2>
              
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-center text-drac-fg">
                  <span>총 상품 금액</span>
                  <span className="font-semibold text-drac-fg">
                    {cart?.summary?.originalTotalAmount?.toLocaleString() || 0}원
                  </span>
                </div>
                <div className="flex justify-between items-center text-drac-fg">
                  <span>할인 금액</span>
                  <span className="font-semibold text-drac-pink">
                    -{((cart?.summary?.originalTotalAmount || 0) - (cart?.summary?.discountTotalAmount || 0)).toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between items-center text-drac-fg">
                  <span>배송비</span>
                  <span className="font-semibold text-drac-fg">무료</span>
                </div>
              </div>
              
              <div className="border-t border-drac-current pt-6 mb-8">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-drac-fg">최종 결제 금액</span>
                  <span className="text-3xl font-black text-drac-pink tracking-tighter">
                    {(cart?.summary?.discountTotalAmount || 0).toLocaleString()}원
                  </span>
                </div>
              </div>
              
              <button
                disabled={isEmpty}
                onClick={() => router.push("/checkout")}
                data-testid="cart-checkout-button"
                className="w-full py-4.5 bg-drac-purple text-drac-fg font-bold rounded-2xl hover:bg-drac-purple/80 hover:shadow-xl hover:shadow-drac-purple/30 transition-all duration-300 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                <CreditCard size={20} />
                결제하기
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Option Edit Modal */}
      {optionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-drac-bg rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-drac-current">
              <h3 className="text-xl font-bold text-drac-fg">옵션 변경</h3>
              <button onClick={() => setOptionModalOpen(false)} className="text-drac-comment hover:text-drac-fg transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {!optionProduct ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-8 h-8 border-4 border-drac-pink border-t-transparent rounded-full animate-spin" />
                  <p className="text-drac-comment font-medium">옵션 정보를 불러오는 중...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Current Product Info */}
                  <div className="flex gap-4 items-center bg-drac-bg p-4 rounded-2xl">
                    <div className="w-16 h-16 relative rounded-xl overflow-hidden bg-drac-comment">
                      <Image src="https://placehold.co/160x160/eeeeee/999999.png?text=Item" alt="thumbnail" fill className="object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-drac-fg line-clamp-1">{optionProduct.productName}</h4>
                      <p className="text-sm text-drac-comment mt-1">현재 옵션: <span className="font-semibold text-drac-fg">{editingOptionItem?.variantName}</span></p>
                    </div>
                  </div>

                  {/* Accordion Options */}
                  <div className="flex flex-col bg-drac-bg border-2 border-drac-current rounded-xl overflow-hidden shadow-sm">
                    {optionProduct.optionGroups?.length > 0 ? (
                      optionProduct.optionGroups.map((group, index) => {
                        const isOpen = openGroupIndex === index;
                        const isEnabled = isGroupEnabled(index);
                        const selectedOptionId = selectedOptions[group.productOptionGroupId];
                        const selectedOptionName = group.options.find(o => o.productOptionId === selectedOptionId)?.name;

                        return (
                          <div key={group.productOptionGroupId} className={`border-b border-drac-current last:border-b-0 ${isOpen ? 'bg-drac-bg' : 'bg-drac-bg/50'}`}>
                            {/* Accordion Header */}
                            <button
                              onClick={() => isEnabled && setOpenGroupIndex(isOpen ? -1 : index)}
                              disabled={!isEnabled}
                              className={`w-full flex items-center justify-between p-4 ${isEnabled ? 'cursor-pointer hover:bg-drac-bg' : 'cursor-not-allowed opacity-50'} transition-colors ${isOpen ? 'border-b-2 border-drac-pink bg-drac-current/20 hover:bg-drac-current/20' : ''}`}
                            >
                              <div className="flex flex-col items-start gap-1">
                                <span className={`text-sm font-bold tracking-wide ${isOpen || selectedOptionId ? 'text-drac-fg' : 'text-drac-comment'}`}>
                                  {group.name}
                                </span>
                                {!isOpen && selectedOptionName && (
                                  <span className="text-sm text-drac-pink font-semibold">{selectedOptionName}</span>
                                )}
                              </div>
                              {isOpen ? <ChevronUp size={20} className="text-drac-comment" /> : <ChevronDown size={20} className="text-drac-comment" />}
                            </button>

                            {/* Accordion Body */}
                            {isOpen && (
                              <div className="flex flex-col">
                                {group.options.map((opt, i) => {
                                  const isSelected = selectedOptionId === opt.productOptionId;
                                  const available = isOptionAvailable(index, opt.productOptionId);

                                  return (
                                    <button
                                      key={opt.productOptionId}
                                      onClick={() => available && handleOptionSelect(index, group.productOptionGroupId, opt.productOptionId)}
                                      disabled={!available}
                                      className={`flex items-center justify-between w-full px-5 py-3.5 text-left border-b border-drac-current last:border-b-0 transition-colors 
                                        ${isSelected ? 'bg-drac-current hover:bg-drac-comment' : available ? 'hover:bg-drac-bg' : 'opacity-30 cursor-not-allowed bg-drac-current/5'}`}
                                    >
                                      <span className={`text-sm ${isSelected ? 'font-bold text-drac-pink' : available ? 'text-drac-fg' : 'text-drac-comment'}`}>
                                        {i + 1}. {opt.name} {!available && "(선택 불가)"}
                                      </span>
                                      {isSelected ? (
                                        <CheckCircle2 size={20} className="text-drac-pink" />
                                      ) : (
                                        <Circle size={20} className="text-drac-comment" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-drac-bg p-4 text-center text-sm text-drac-comment">
                        선택할 옵션이 없는 상품입니다.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-drac-current bg-drac-bg flex gap-3">
              <button 
                onClick={() => setOptionModalOpen(false)}
                className="flex-1 py-3.5 bg-drac-bg border border-drac-comment text-drac-fg font-bold rounded-xl hover:bg-drac-bg transition-all"
              >
                취소
              </button>
              <button 
                onClick={handleSubmitOptionEdit}
                disabled={savingOption || !optionProduct}
                className="flex-1 py-3.5 bg-drac-purple text-drac-bg font-bold rounded-xl hover:bg-drac-purple/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingOption ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "옵션 변경하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
