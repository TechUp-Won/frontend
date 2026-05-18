"use client";

import ThemeToggle from "@/app/components/ThemeToggle";
import { apiFetch } from "@/app/lib/apiFetch";
import { useEffect, useState, useCallback, FormEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, ShoppingCart, ArrowLeft, Sparkles, Store, RefreshCcw, Heart, Star, Plus } from "lucide-react";

interface CategoryNode {
  id: number;
  name: string;
  depth: number;
  children: CategoryNode[];
}

interface StoreResult {
  storeId: number;
  storeName: string;
  thumbnail: string | null;
  description: string | null;
}

interface ProductResult {
  id: number;
  name: string;
  thumbnail: string;
  price: number;
  discountedPrice: number;
  discountRate: number;
  likeCount: number;
  status: string;
  store: {
    storeId: number;
    storeName: string;
  };
}

interface SearchResponse {
  stores: StoreResult[];
  products: ProductResult[];
  hasNext: boolean;
  nextCursorId: number | null;
  nextCursorSortValue: number | null;
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || "";

  const [searchInput, setSearchInput] = useState(keyword);

  // Auth state
  const [userInfo, setUserInfo] = useState<{ profileName: string, role: string } | null>(null);

  // Filter States
  const [mainCategory, setMainCategory] = useState<string>("");
  const [subCategory, setSubCategory] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sort, setSort] = useState<string>("popular");

  // Categories from API
  const [categories, setCategories] = useState<CategoryNode[]>([]);

  const [stores, setStores] = useState<StoreResult[]>([]);
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursorId, setNextCursorId] = useState<number | null>(null);
  const [nextCursorSortValue, setNextCursorSortValue] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // keyword가 URL에서 바뀔 때 입력창 동기화
  useEffect(() => {
    setSearchInput(keyword);
  }, [keyword]);

  const fetchSearchResults = useCallback(async (isLoadMore = false, cursorId?: number | null, cursorSortVal?: number | null) => {
    if (!keyword) {
      setStores([]);
      setProducts([]);
      setHasNext(false);
      setLoading(false);
      return;
    }

    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append("keyword", keyword);
      params.append("size", "8");

      const activeCategoryId = subCategory || mainCategory;
      if (activeCategoryId) params.append("categoryId", activeCategoryId);
      if (minPrice) params.append("minPrice", minPrice);
      if (maxPrice) params.append("maxPrice", maxPrice);
      if (sort) params.append("sort", sort);

      if (isLoadMore && cursorId) params.append("lastId", String(cursorId));
      if (isLoadMore && cursorSortVal !== undefined && cursorSortVal !== null) {
        params.append("lastSortValue", String(cursorSortVal));
      }

      const res = await fetch(`/api/v1/search?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const data: SearchResponse = json.data;

        if (data) {
          if (isLoadMore) {
            setProducts(prev => [...prev, ...(data.products || [])]);
          } else {
            setStores(data.stores || []);
            setProducts(data.products || []);
          }
          setHasNext(data.hasNext || false);
          setNextCursorId(data.nextCursorId ?? null);
          setNextCursorSortValue(data.nextCursorSortValue ?? null);
        } else {
          if (!isLoadMore) {
            setStores([]);
            setProducts([]);
          }
          setHasNext(false);
          setNextCursorId(null);
          setNextCursorSortValue(null);
        }
      } else {
        if (!isLoadMore) {
          setStores([]);
          setProducts([]);
        }
        setHasNext(false);
      }
    } catch (err) {
      console.error("Failed to fetch search results", err);
    } finally {
      if (isLoadMore) setLoadingMore(false);
      else setLoading(false);
    }
  }, [keyword, mainCategory, subCategory, minPrice, maxPrice, sort]);

  // 마운트 시 한 번만 실행
  useEffect(() => {
    const storedUser = localStorage.getItem("userInfo");
    if (storedUser) {
      try {
        setUserInfo(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user info", e);
      }
    }
    fetch("/api/v1/products/categories")
      .then(res => res.ok ? res.json() : null)
      .then(json => { if (json?.data) setCategories(json.data); })
      .catch(err => console.error("Failed to fetch categories", err));
  }, []);

  // keyword가 바뀔 때만 검색 실행
  useEffect(() => {
    fetchSearchResults(false);
  }, [keyword]); // filters는 "필터 적용" 버튼으로만 트리거

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

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?keyword=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleApplyFilters = (e: FormEvent) => {
    e.preventDefault();
    fetchSearchResults(false);
  };

  const handleResetFilters = () => {
    setMainCategory("");
    setSubCategory("");
    setMinPrice("");
    setMaxPrice("");
    setSort("popular");
    setTimeout(() => {
      fetchSearchResults(false);
    }, 0);
  };

  const handleLoadMore = () => {
    if (hasNext) {
      fetchSearchResults(true, nextCursorId, nextCursorSortValue);
    }
  };

  return (
    <div className="min-h-screen bg-drac-bg text-drac-fg font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-drac-bg/80 border-b border-drac-comment/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-drac-cyan to-drac-purple flex items-center justify-center text-white shadow-lg shadow-drac-purple/30 group-hover:scale-105 transition-transform">
              <Sparkles size={20} />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-drac-cyan to-drac-purple tracking-tight">
              wonkaotalk
            </h1>
          </Link>
          
          <form onSubmit={handleSearchSubmit} className="hidden md:flex relative group flex-1 max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-drac-comment w-5 h-5 group-focus-within:text-drac-pink transition-colors" />
            <input 
              type="text" 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="상품을 검색해보세요..." 
              className="pl-12 pr-4 py-3 w-full rounded-full bg-drac-current border border-drac-current focus:bg-drac-bg focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all outline-none text-sm shadow-inner"
            />
          </form>

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
              <ShoppingCart size={24} />
              
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Search Header */}
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-drac-current flex items-center justify-center hover:bg-drac-comment text-drac-fg hover:text-drac-pink transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-drac-fg">
            <span className="text-drac-pink">"{keyword}"</span> 검색 결과
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col gap-10 animate-pulse">
            <div className="h-40 bg-drac-current rounded-3xl" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-drac-current rounded-3xl" />)}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            
            {/* Filters Section */}
            <form onSubmit={handleApplyFilters} className="bg-drac-bg rounded-2xl p-5 shadow-sm border border-drac-current flex flex-col gap-5">
              {/* Category Pill Tabs */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-drac-comment tracking-wider">카테고리</label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => { setMainCategory(""); setSubCategory(""); }}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                      !mainCategory
                        ? "bg-drac-purple text-drac-bg border-drac-purple shadow-md shadow-drac-purple/30"
                        : "bg-drac-current text-drac-comment border-drac-current hover:border-drac-pink hover:text-drac-fg"
                    }`}
                  >
                    전체
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        if (mainCategory === String(cat.id)) {
                          setMainCategory("");
                          setSubCategory("");
                        } else {
                          setMainCategory(String(cat.id));
                          setSubCategory("");
                        }
                      }}
                      className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                        mainCategory === String(cat.id)
                          ? "bg-drac-purple text-drac-bg border-drac-purple shadow-md shadow-drac-purple/30"
                          : "bg-drac-current text-drac-comment border-drac-current hover:border-drac-pink hover:text-drac-fg"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {mainCategory && (categories.find(c => String(c.id) === mainCategory)?.children?.length ?? 0) > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                      type="button"
                      onClick={() => setSubCategory("")}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        !subCategory
                          ? "bg-drac-cyan/20 text-drac-cyan border-drac-cyan/50"
                          : "bg-drac-current text-drac-comment border-drac-current hover:border-drac-cyan/50 hover:text-drac-cyan"
                      }`}
                    >
                      전체
                    </button>
                    {categories.find(c => String(c.id) === mainCategory)?.children.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSubCategory(String(sub.id))}
                        className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          subCategory === String(sub.id)
                            ? "bg-drac-cyan/20 text-drac-cyan border-drac-cyan/50"
                            : "bg-drac-current text-drac-comment border-drac-current hover:border-drac-cyan/50 hover:text-drac-cyan"
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-5 items-end">
              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-drac-comment tracking-wider">정렬 기준</label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full bg-drac-current border border-drac-comment text-drac-fg text-sm rounded-xl focus:ring-2 focus:ring-drac-purple/10 focus:border-drac-pink block p-3 outline-none transition-all cursor-pointer hover:border-drac-pink"
                  >
                    <option value="popular">인기순</option>
                    <option value="latest">최신순</option>
                    <option value="price_asc">가격 낮은 순</option>
                    <option value="price_desc">가격 높은 순</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-drac-comment tracking-wider">가격대</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="최소 금액"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full bg-drac-current border border-drac-comment text-drac-fg text-sm rounded-xl focus:ring-2 focus:ring-drac-purple/10 focus:border-drac-pink block p-3 outline-none transition-all hover:border-drac-pink"
                    />
                    <span className="text-drac-comment font-medium">-</span>
                    <input
                      type="number"
                      placeholder="최대 금액"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full bg-drac-current border border-drac-comment text-drac-fg text-sm rounded-xl focus:ring-2 focus:ring-drac-purple/10 focus:border-drac-pink block p-3 outline-none transition-all hover:border-drac-pink"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-drac-comment bg-drac-bg text-drac-fg rounded-xl hover:bg-drac-current transition-colors font-semibold text-sm w-full md:w-auto"
                >
                  <RefreshCcw size={16} />
                  초기화
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-drac-purple text-drac-bg rounded-xl font-bold hover:bg-drac-purple/80 transition-colors shadow-lg shadow-drac-purple/20 text-sm w-full md:w-auto"
                >
                  필터 적용
                </button>
              </div>
              </div>
            </form>

            {/* Stores Section */}
            <section>
              <h3 className="text-lg font-bold text-drac-fg mb-4 flex items-center gap-2">
                <Store size={20} className="text-drac-pink" /> 스토어 ({stores.length})
              </h3>
              {stores.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stores.map((store) => (
                    <div 
                      key={store.storeId} 
                      onClick={() => router.push(`/store/${store.storeId}?name=${encodeURIComponent(store.storeName)}`)}
                      className="bg-drac-bg border border-drac-current rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer group"
                    >
                      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-drac-current shrink-0">
                        <Image 
                          src={store.thumbnail || "https://placehold.co/100x100/eeeeee/999999.png?text=Store"} 
                          alt={store.storeName} 
                          fill 
                          className="object-cover"
                        />
                      </div>
                      <div className="flex flex-col flex-1 overflow-hidden">
                        <span className="font-bold text-drac-fg group-hover:text-drac-pink transition-colors truncate">
                          {store.storeName}
                        </span>
                        {store.description && (
                          <span className="text-sm text-drac-comment truncate mt-0.5">
                            {store.description}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-10 bg-drac-bg rounded-2xl border border-drac-current">
                  <p className="text-drac-comment">검색 결과가 없습니다</p>
                </div>
              )}
            </section>

            {/* Products Section */}
            <section>
              <h3 className="text-lg font-bold text-drac-fg mb-4 flex items-center gap-2">
                <ShoppingCart size={20} className="text-drac-pink" /> 상품 ({products.length}{hasNext ? '+' : ''})
              </h3>
              
              {products.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                    {products.map((product) => (
                      <Link href={`/products/${product.id}`} key={product.id} className="group flex flex-col cursor-pointer">
                        <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-drac-current mb-4">
                          <Image
                            src={product.thumbnail || "https://placehold.co/400x500/eeeeee/999999.png?text=No+Image"}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                          {/* Overlay tags */}
                          <div className="absolute top-3 left-3 flex flex-col gap-2">
                            {product.discountRate > 0 && (
                              <span className="bg-red-500/90 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm shadow-sm tracking-wide">
                                {product.discountRate}% 할인
                              </span>
                            )}
                            {product.status === "SOLD_OUT" && (
                              <span className="bg-drac-purple/80 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm shadow-sm tracking-wide">
                                품절
                              </span>
                            )}
                          </div>
                          {/* Hover Actions */}
                          <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/50 to-transparent flex justify-center gap-3">
                            <button className="w-10 h-10 rounded-full bg-drac-bg text-drac-fg flex items-center justify-center hover:bg-drac-current hover:scale-110 transition-all shadow-lg">
                              <Heart size={18} />
                            </button>
                            <button className="w-10 h-10 rounded-full bg-drac-purple text-drac-bg flex items-center justify-center hover:bg-drac-purple/80 hover:scale-110 transition-all shadow-lg">
                              <ShoppingCart size={18} />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col flex-1 px-1">
                          <span 
                            onClick={(e) => {
                              e.preventDefault();
                              if (product.store?.storeId) {
                                router.push(`/store/${product.store.storeId}?name=${encodeURIComponent(product.store.storeName)}`);
                              }
                            }}
                            className="text-xs font-semibold text-drac-pink mb-1 hover:underline w-fit z-10 relative"
                          >
                            {product.store?.storeName || '스토어 이름'}
                          </span>
                          <h3 className="text-sm sm:text-base font-semibold text-drac-fg line-clamp-2 mb-2 group-hover:text-drac-pink transition-colors">
                            {product.name}
                          </h3>
                          
                          <div className="mt-auto">
                            <div className="flex items-baseline gap-2 mb-1.5">
                              {product.discountRate > 0 ? (
                                <>
                                  <span className="text-lg font-extrabold text-drac-fg tracking-tight">
                                    {product.discountedPrice.toLocaleString()}원
                                  </span>
                                  <span className="text-xs text-drac-comment line-through font-medium">
                                    {product.price.toLocaleString()}원
                                  </span>
                                </>
                              ) : (
                                <span className="text-lg font-extrabold text-drac-fg tracking-tight">
                                  {product.price.toLocaleString()}원
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-drac-comment">
                              <Heart size={13} className="fill-drac-pink text-drac-pink" />
                              <span className="font-bold text-drac-fg">{product.likeCount.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {hasNext && (
                    <div className="mt-12 flex justify-center">
                      <button 
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="px-10 py-4 bg-drac-bg border-2 border-drac-current text-drac-fg font-bold rounded-full hover:border-drac-pink hover:text-drac-pink transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {loadingMore ? (
                          <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                        ) : null}
                        상품 더보기
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-drac-bg rounded-3xl border border-drac-current shadow-sm">
                  <div className="w-20 h-20 bg-drac-current rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-drac-comment" />
                  </div>
                  <h3 className="text-xl font-bold text-drac-fg mb-2">해당하는 상품이 없습니다</h3>
                  <p className="text-drac-comment">다른 검색어로 다시 시도해보세요.</p>
                </div>
              )}
            </section>

            {products.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-drac-bg rounded-3xl border border-drac-current shadow-sm mt-8">
                <div className="w-20 h-20 bg-drac-current rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-drac-comment" />
                </div>
                <h3 className="text-xl font-bold text-drac-fg mb-2">검색 결과가 없습니다</h3>
                <p className="text-drac-comment">다른 검색어 또는 필터로 다시 시도해보세요.</p>
              </div>
            )}
            
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-drac-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-drac-pink border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
