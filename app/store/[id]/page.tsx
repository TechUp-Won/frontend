"use client";

import ThemeToggle from "@/app/components/ThemeToggle";
import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Star, ShoppingCart, Heart, Store, ArrowLeft } from "lucide-react";

interface ProductSummary {
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

export default function StoreDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const storeId = params?.id as string;
  const storeNameParam = searchParams?.get('name');

  const [storeName, setStoreName] = useState<string>(storeNameParam || "스토어");
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [nextCursorId, setNextCursorId] = useState<number | null>(null);
  const [nextCursorSortValue, setNextCursorSortValue] = useState<number | null>(null);

  const fetchProducts = useCallback(async (isLoadMore = false, cursorId?: number | null, cursorSortVal?: number | null) => {
    if (!storeId) return;
    
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const p = new URLSearchParams();
      p.append("storeId", storeId);
      p.append("size", "8");
      
      if (isLoadMore && cursorId) p.append("lastId", String(cursorId));
      if (isLoadMore && cursorSortVal !== undefined && cursorSortVal !== null) {
        p.append("lastSortValue", String(cursorSortVal));
      }

      const res = await fetch(`/api/v1/products?${p.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          if (isLoadMore) {
            setProducts(prev => [...prev, ...(json.data.products || [])]);
          } else {
            setProducts(json.data.products || []);
            // URL 파라미터로 스토어 이름이 넘어오지 않은 경우, 첫 번째 상품에서 가져옴
            if (!storeNameParam && json.data.products && json.data.products.length > 0) {
              setStoreName(json.data.products[0].store?.storeName || "스토어");
            }
          }
          setHasNext(json.data.hasNext || false);
          setNextCursorId(json.data.nextCursorId ?? null);
          setNextCursorSortValue(json.data.nextCursorSortValue ?? null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch store products", err);
    } finally {
      if (isLoadMore) setLoadingMore(false);
      else setLoading(false);
    }
  }, [storeId, storeNameParam]);

  useEffect(() => {
    fetchProducts(false);
  }, [fetchProducts]);

  const handleLoadMore = () => {
    if (hasNext) {
      fetchProducts(true, nextCursorId, nextCursorSortValue);
    }
  };

  return (
    <div className="min-h-screen bg-drac-bg text-drac-fg font-sans pb-20">
      {/* Header NavBar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-drac-bg/80 border-b border-drac-comment/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-drac-fg hover:text-drac-pink transition-colors group">
            <div className="w-10 h-10 rounded-full bg-drac-current flex items-center justify-center group-hover:bg-drac-comment transition-colors">
              <ArrowLeft size={20} />
            </div>
            <span className="font-semibold">뒤로가기</span>
          </button>
          
          <div className="flex items-center justify-end shrink-0 gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Store Profile Section */}
        <div className="mb-12 flex flex-col items-center justify-center text-center p-10 bg-drac-current/30 rounded-3xl border border-drac-current shadow-sm">
          <div className="w-24 h-24 bg-drac-bg rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Store size={40} className="text-drac-pink" />
          </div>
          <h1 className="text-3xl font-bold text-drac-fg mb-2">{storeName}</h1>
          <p className="text-drac-comment font-medium">이 스토어에서 판매 중인 전체 상품을 확인해보세요.</p>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex flex-col gap-4">
                <div className="bg-drac-comment rounded-2xl aspect-[4/5] w-full" />
                <div className="space-y-2">
                  <div className="h-4 bg-drac-comment rounded w-2/3" />
                  <div className="h-4 bg-drac-comment rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">전체 상품 <span className="text-drac-pink">{products.length}</span>개</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
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
                        {product.discountRate}% OFF
                      </span>
                    )}
                    {product.status === "SOLD_OUT" && (
                      <span className="bg-drac-purple/80 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm shadow-sm tracking-wide">
                        SOLD OUT
                      </span>
                    )}
                  </div>
                  {/* Hover Actions */}
                  <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/50 to-transparent flex justify-center gap-3">
                    <button className="w-10 h-10 rounded-full bg-drac-bg text-drac-fg flex items-center justify-center hover:bg-drac-bg hover:scale-110 transition-all shadow-lg" onClick={(e) => e.preventDefault()}>
                      <Heart size={18} />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-drac-purple text-drac-bg flex items-center justify-center hover:bg-drac-purple/80 hover:scale-110 transition-all shadow-lg" onClick={(e) => e.preventDefault()}>
                      <ShoppingCart size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col flex-1 px-1">
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
            
            {/* Load More Button */}
            {hasNext && (
              <div className="flex justify-center mt-12 mb-8 w-full">
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
              <Store className="w-8 h-8 text-drac-comment" />
            </div>
            <h3 className="text-xl font-bold text-drac-fg mb-2">등록된 상품이 없습니다</h3>
            <p className="text-drac-comment">이 스토어에는 아직 판매 중인 상품이 없습니다.</p>
          </div>
        )}
      </main>
    </div>
  );
}
