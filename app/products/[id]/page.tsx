"use client";

import ThemeToggle from "@/app/components/ThemeToggle";
import { apiFetch } from "@/app/lib/apiFetch";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Heart, Share2, ShoppingCart, Star, Sparkles, AlertCircle, ChevronDown, ChevronUp, CheckCircle2, Circle, Plus } from "lucide-react";
import { useMemo } from "react";

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

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  // Selected Options mapping: groupId -> optionId
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [openGroupIndex, setOpenGroupIndex] = useState<number>(0);

  // Selected Image state for thumbnail gallery
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Auth state
  const [userInfo, setUserInfo] = useState<{ profileName: string, role: string } | null>(null);

  // 현재 선택된 옵션 조합에 해당하는 variant
  const selectedVariant = useMemo(() => {
    if (!product?.variants || !product.optionGroups?.length) return product?.variants?.[0] ?? null;
    const selectedIds = Object.values(selectedOptions);
    if (selectedIds.length !== product.optionGroups.length) return null;
    return product.variants.find(v =>
      v.combinationIds.length === selectedIds.length &&
      v.combinationIds.every(id => selectedIds.includes(id))
    ) ?? null;
  }, [product, selectedOptions]);

  // 특정 옵션 선택 시 해당 옵션을 포함하는 variant들의 재고 합산
  const getOptionStock = (groupIndex: number, optionId: number): number => {
    if (!product?.variants) return 0;
    const prevSelectedIds = product.optionGroups
      .slice(0, groupIndex)
      .map(g => selectedOptions[g.productOptionGroupId])
      .filter((id): id is number => id !== undefined);
    const path = [...prevSelectedIds, optionId];
    return product.variants
      .filter(v => v.status === "ON_SALE" && path.every(id => v.combinationIds.includes(id)))
      .reduce((sum, v) => sum + v.stock, 0);
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

    if (!id) return;
    const fetchProductDetail = async () => {
      try {
        const res = await fetch(`/api/v1/products/${id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setProduct(json.data);
          } else {
            setError(true);
          }
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to fetch product details", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProductDetail();
  }, [id]);

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

  const handleOptionSelect = (groupIndex: number, groupId: number, optionId: number) => {
    setSelectedOptions((prev) => {
      const next = { ...prev, [groupId]: optionId };
      // 이후 그룹들의 선택을 초기화 (상위 옵션이 바뀌면 하위 선택은 무효화됨)
      if (product?.optionGroups) {
        for (let i = groupIndex + 1; i < product.optionGroups.length; i++) {
          delete next[product.optionGroups[i].productOptionGroupId];
        }
      }
      return next;
    });
    
    if (product?.optionGroups && groupIndex + 1 < product.optionGroups.length) {
      setOpenGroupIndex(groupIndex + 1);
    } else {
      setOpenGroupIndex(-1);
    }
  };

  const isOptionAvailable = (groupIndex: number, optionId: number) => {
    if (!product || !product.variants) return true;
    
    // 현재 그룹보다 상위에서 선택된 옵션 ID들
    const prevSelectedOptionIds = product.optionGroups
      .slice(0, groupIndex)
      .map(group => selectedOptions[group.productOptionGroupId])
      .filter(id => id !== undefined);

    // 현재 확인하려는 옵션 ID를 포함한 경로
    const currentPath = [...prevSelectedOptionIds, optionId];

    // 모든 variants 중에서, currentPath의 모든 ID를 포함하고 있는 '판매 중인' variant가 있는지 확인
    return product.variants.some(variant => {
      if (variant.status !== 'ON_SALE' || variant.stock <= 0) return false;
      return currentPath.every(id => variant.combinationIds.includes(id));
    });
  };

  const isGroupEnabled = (index: number) => {
    if (index === 0) return true;
    const prevGroupId = product?.optionGroups[index - 1].productOptionGroupId;
    return prevGroupId !== undefined && selectedOptions[prevGroupId] !== undefined;
  };

  const resolveSelectedVariantId = (): number | null => {
    if (!product) return null;
    if (product.optionGroups && product.optionGroups.length > 0) {
      if (Object.keys(selectedOptions).length !== product.optionGroups.length) {
        alert("모든 옵션을 선택해주세요.");
        return null;
      }
    }
    if (product.variants && product.variants.length > 0) {
      if (product.optionGroups && product.optionGroups.length > 0) {
        const selectedOptionIds = Object.values(selectedOptions);
        const matched = product.variants.find(
          (v) =>
            v.combinationIds.length === selectedOptionIds.length &&
            v.combinationIds.every((id) => selectedOptionIds.includes(id))
        );
        if (!matched) {
          alert("선택하신 옵션의 상품이 존재하지 않거나 품절입니다.");
          return null;
        }
        return matched.variantId;
      }
      return product.variants[0].variantId;
    }
    return null;
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (!userInfo) {
      alert("로그인이 필요한 서비스입니다.");
      router.push("/login");
      return;
    }
    const variantId = resolveSelectedVariantId();
    if (!variantId) return;

    sessionStorage.setItem(
      "directOrder",
      JSON.stringify({
        productId: product.productId,
        variantId,
        quantity: 1,
      })
    );
    router.push("/checkout?mode=direct");
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (product.optionGroups && product.optionGroups.length > 0) {
      if (Object.keys(selectedOptions).length !== product.optionGroups.length) {
        alert("모든 옵션을 선택해주세요.");
        return;
      }
    }

    let variantId: number | undefined;
    if (product.variants && product.variants.length > 0) {
      const selectedOptionIds = Object.values(selectedOptions);
      const matchingVariant = product.variants.find(v => {
        return v.combinationIds.length === selectedOptionIds.length &&
               v.combinationIds.every(id => selectedOptionIds.includes(id));
      });
      if (!matchingVariant) {
        alert("선택하신 옵션의 상품이 존재하지 않거나 품절입니다.");
        return;
      }
      variantId = matchingVariant.variantId;
    } else {
      variantId = product.variants?.[0]?.variantId;
    }

    if (!variantId) {
      alert("상품 옵션 정보를 확인할 수 없습니다.");
      return;
    }

    if (!userInfo) {
      alert("로그인이 필요한 서비스입니다.");
      router.push("/login");
      return;
    }

    setAddingToCart(true);
    try {
      const res = await apiFetch('/api/v1/carts/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.productId, variantId, quantity: 1 })
      });

      if (res.ok) {
        if (confirm("장바구니에 담겼습니다. 장바구니로 이동하시겠습니까?")) {
          router.push('/cart');
        }
      } else {
        alert("장바구니 담기에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("장바구니 담기 중 오류가 발생했습니다.");
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-drac-bg flex flex-col pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-12 animate-pulse">
          <div className="w-full md:w-1/2 aspect-[4/5] bg-drac-comment rounded-3xl" />
          <div className="w-full md:w-1/2 space-y-6 py-10">
            <div className="h-6 bg-drac-comment rounded w-1/4" />
            <div className="h-10 bg-drac-comment rounded w-3/4" />
            <div className="h-10 bg-drac-comment rounded w-1/3" />
            <div className="space-y-3 mt-10">
              <div className="h-12 bg-drac-comment rounded-xl w-full" />
              <div className="h-12 bg-drac-comment rounded-xl w-full" />
            </div>
            <div className="h-16 bg-drac-comment rounded-full w-full mt-10" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-drac-bg flex flex-col items-center justify-center">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-drac-fg mb-2">상품을 찾을 수 없습니다</h2>
        <p className="text-drac-comment mb-6">찾으시는 상품이 삭제되었거나 현재 판매 중이 아닙니다.</p>
        <button onClick={() => router.back()} className="px-6 py-3 bg-drac-purple text-drac-bg rounded-full font-bold hover:bg-drac-purple/80 transition-colors">
          뒤로가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-drac-bg text-drac-fg font-sans pb-32">
      {/* Header NavBar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-drac-bg/80 border-b border-drac-comment/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-drac-fg hover:text-drac-pink transition-colors group">
            <div className="w-10 h-10 rounded-full bg-drac-current flex items-center justify-center group-hover:bg-drac-comment transition-colors">
              <ArrowLeft size={20} />
            </div>
            <span className="font-semibold">목록으로</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-drac-cyan to-drac-purple flex items-center justify-center text-white shadow-md shadow-drac-purple/30">
              <Sparkles size={16} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-drac-cyan to-drac-purple tracking-tight">
              wonkaotalk
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
            <Link href="/cart" className="relative p-2 text-drac-fg hover:text-drac-pink transition-colors">
              <ShoppingCart size={22} />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-16">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          
          {/* Left Side: Product Image */}
          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            <div className="relative aspect-[4/5] w-full rounded-3xl overflow-hidden bg-drac-current shadow-xl group">
              <Image
                src={selectedImage || (product.images?.length > 0 ? product.images.sort((a, b) => a.sortOrder - b.sortOrder)[0].url : "https://placehold.co/800x1000/eeeeee/999999.png?text=No+Image")}
                alt={product.productName}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute top-5 left-5 flex flex-col gap-2">
                {product.discountRate > 0 && (
                  <span className="bg-red-500/90 text-white text-sm font-bold px-3 py-1.5 rounded-lg backdrop-blur-md shadow-md tracking-wide">
                    {product.discountRate}% OFF
                  </span>
                )}
                {product.status === "SOLD_OUT" && (
                  <span className="bg-drac-purple/90 text-white text-sm font-bold px-3 py-1.5 rounded-lg backdrop-blur-md shadow-md tracking-wide">
                    품절
                  </span>
                )}
              </div>
            </div>
            {/* Thumbnails */}
            {product.images?.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {product.images.sort((a, b) => a.sortOrder - b.sortOrder).map((img, i) => (
                  <div 
                    key={i} 
                    onClick={() => setSelectedImage(img.url)}
                    className={`relative w-20 h-24 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border-2 transition-all ${(selectedImage === img.url || (!selectedImage && i === 0)) ? 'border-drac-pink shadow-md' : 'border-transparent hover:border-drac-pink'}`}
                  >
                    <Image src={img.url} alt={`${product.productName} 이미지 ${i + 1}`} fill className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side: Product Details & Options */}
          <div className="w-full lg:w-1/2 flex flex-col py-4 lg:py-8">
            <div className="mb-6 border-b border-drac-current pb-6">
              <div className="flex justify-between items-start mb-3">
                <Link href={`/store/${product.store?.storeId || ''}?name=${encodeURIComponent(product.store?.storeName || '스토어 이름')}`} className="text-sm font-bold tracking-wider text-drac-pink uppercase bg-drac-current px-3 py-1 rounded-full hover:bg-drac-purple/20 transition-colors">
                  {product.store?.storeName || '스토어 이름'}
                </Link>
                <div className="flex gap-3">
                  <button className="w-10 h-10 rounded-full bg-drac-bg flex items-center justify-center hover:bg-drac-current hover:text-red-500 text-drac-comment transition-colors group">
                    <Heart size={20} className={product.isLiked ? "fill-red-500 text-red-500" : "group-hover:fill-red-500"} />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-drac-bg flex items-center justify-center hover:bg-drac-current hover:text-drac-pink text-drac-comment transition-colors">
                    <Share2 size={20} />
                  </button>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-drac-fg leading-tight mb-4 tracking-tight">
                {product.productName}
              </h1>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1.5 bg-drac-current px-2.5 py-1 rounded-full border border-drac-comment text-drac-pink">
                  <Heart size={14} className="fill-drac-pink" />
                  <span className="font-bold text-drac-fg text-sm">{product.likeCount.toLocaleString()} Likes</span>
                </div>
              </div>

              <div className="flex items-end gap-3">
                {product.discountRate > 0 ? (
                  <>
                    <span className="text-4xl font-black text-drac-fg tracking-tighter">
                      {product.discountedPrice.toLocaleString()}원
                    </span>
                    <span className="text-xl text-drac-comment line-through font-medium mb-1">
                      {product.price.toLocaleString()}원
                    </span>
                  </>
                ) : (
                  <span className="text-4xl font-black text-drac-fg tracking-tighter">
                    {product.price.toLocaleString()}원
                  </span>
                )}
              </div>
            </div>

            {/* Options Section */}
            <div className="flex flex-col mb-8 bg-drac-bg border-2 border-drac-current rounded-xl overflow-hidden shadow-sm">
              {product.optionGroups?.length > 0 ? (
                product.optionGroups.map((group, index) => {
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

                      {/* Accordion Body (Options List) */}
                      {isOpen && (
                        <div className="flex flex-col">
                          {group.options.map((opt, i) => {
                            const isSelected = selectedOptionId === opt.productOptionId;
                            const available = isOptionAvailable(index, opt.productOptionId);
                            const optStock = getOptionStock(index, opt.productOptionId);

                            return (
                              <button
                                key={opt.productOptionId}
                                onClick={() => available && handleOptionSelect(index, group.productOptionGroupId, opt.productOptionId)}
                                disabled={!available}
                                className={`flex items-center justify-between w-full px-5 py-3.5 text-left border-b border-drac-current last:border-b-0 transition-colors
                                  ${isSelected ? 'bg-drac-current hover:bg-drac-comment' : available ? 'hover:bg-drac-bg' : 'opacity-30 cursor-not-allowed bg-drac-current/5'}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`text-sm ${isSelected ? 'font-bold text-drac-pink' : available ? 'text-drac-fg' : 'text-drac-comment'}`}>
                                    {i + 1}. {opt.name}
                                  </span>
                                  {available ? (
                                    <StockBadge stock={optStock} />
                                  ) : (
                                    <span className="text-[11px] text-drac-comment">(품절)</span>
                                  )}
                                </div>
                                {isSelected ? (
                                  <CheckCircle2 size={20} className="text-drac-pink shrink-0" />
                                ) : (
                                  <Circle size={20} className="text-drac-comment shrink-0" />
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
                <div className="bg-drac-bg p-4 flex items-center justify-between text-sm text-drac-comment">
                  <span>선택할 옵션이 없는 상품입니다.</span>
                  {product.variants?.[0] && (
                    <StockBadge stock={product.variants[0].stock} />
                  )}
                </div>
              )}
            </div>

            {/* Total Price & Action Buttons */}
            <div className="mt-auto pt-6 border-t border-drac-current flex flex-col gap-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-bold text-drac-fg">총 상품 금액</span>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-2xl font-black text-drac-pink">
                    {product.discountRate > 0 ? product.discountedPrice.toLocaleString() : product.price.toLocaleString()}원
                  </span>
                  {selectedVariant && (
                    <span className={`text-xs font-semibold ${selectedVariant.stock <= 5 ? "text-orange-400" : "text-drac-comment"}`}>
                      {selectedVariant.stock === 0
                        ? "품절"
                        : selectedVariant.stock <= 5
                        ? `재고 ${selectedVariant.stock}개 남음`
                        : `재고 ${selectedVariant.stock}개`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  className="flex-1 py-4.5 bg-drac-bg border-2 border-drac-comment text-drac-fg font-bold rounded-2xl hover:border-drac-pink hover:bg-drac-bg transition-all text-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {addingToCart ? <div className="w-5 h-5 border-2 border-drac-pink border-t-transparent rounded-full animate-spin" /> : null}
                  {addingToCart ? "담는 중..." : "장바구니 담기"}
                </button>
                <button
                  onClick={handleBuyNow}
                  data-testid="buy-now-button"
                  className="flex-1 py-4.5 bg-drac-purple text-drac-fg font-bold rounded-2xl hover:bg-drac-purple/80 hover:shadow-xl hover:shadow-drac-purple/30 transition-all duration-300 text-lg active:scale-[0.98]"
                >
                  바로 구매하기
                </button>
              </div>
            </div>

            {/* Details Description */}
            {product.detail?.content && (
              <div className="mt-12 pt-8 border-t border-drac-current">
                <h3 className="text-xl font-bold text-drac-fg mb-4">상품 설명</h3>
                <div 
                  className="text-drac-fg leading-relaxed whitespace-pre-wrap [&_*]:!text-drac-fg"
                  dangerouslySetInnerHTML={{ __html: product.detail.content }}
                />              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── 재고 뱃지 ─────────────────────────────────────────────────
function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return null;
  if (stock <= 5) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/15 text-orange-400 border border-orange-400/30">
        잔여 {stock}개
      </span>
    );
  }
  if (stock <= 20) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-drac-yellow/10 text-drac-yellow border border-drac-yellow/20">
        재고 {stock}개
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-drac-green/10 text-drac-green border border-drac-green/20">
      재고 충분
    </span>
  );
}
