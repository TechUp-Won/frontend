"use client";

import ThemeToggle from "@/app/components/ThemeToggle";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  Trash2,
  Settings,
  CheckCircle2,
  AlertCircle,
  Layers,
  DollarSign,
  Tag,
  Package,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import RichTextEditor from "@/app/components/RichTextEditor";
import { apiFetch } from "@/app/lib/apiFetch";

interface CategoryNode {
  id: number;
  name: string;
  depth: number;
  children: CategoryNode[];
}

interface ExistingImage {
  type: "existing";
  imageId: number;
  url: string;
  sortOrder: number;
}

interface NewImage {
  type: "new";
  file: File;
  previewUrl: string;
  objectKey: string | null;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
}

type ImageItem = ExistingImage | NewImage;

interface VariantState {
  variantId: number;
  variantName: string;
  currentStock: number;
  newStock: number;
  status: string;
  adjusting: boolean;
  adjustError: string | null;
  adjustDone: boolean;
}

interface EditFormData {
  productId: number;
  name: string;
  categoryId: number;
  thumbnail: string | null;
  price: number;
  discountRate: number;
  status: string;
  detail: string | null;
  images: Array<{ imageId: number; url: string; sortOrder: number }>;
  optionGroups: Array<{
    optionGroupId: number;
    name: string;
    options: Array<{ optionId: number; name: string }>;
  }>;
  variants: Array<{
    variantId: number;
    variantName: string;
    stock: number;
    status: string;
  }>;
}

const STEPS = [
  { label: "기본 정보", icon: Layers },
  { label: "이미지", icon: UploadCloud },
  { label: "재고 관리", icon: Package },
  { label: "최종 확인", icon: CheckCircle2 },
];

const STATUS_OPTIONS = [
  { value: "ON_SALE", label: "판매 중" },
  { value: "SUSPENDED", label: "판매 중지" },
];

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;

  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [originalData, setOriginalData] = useState<EditFormData | null>(null);

  // 기본 정보
  const [name, setName] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [price, setPrice] = useState("");
  const [discountRate, setDiscountRate] = useState("0");
  const [detail, setDetail] = useState("");
  const [status, setStatus] = useState("ON_SALE");

  // 이미지
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [newThumbnailFile, setNewThumbnailFile] = useState<{
    file: File;
    objectKey: string | null;
    uploading: boolean;
    uploaded: boolean;
    error: string | null;
  } | null>(null);
  const [detailImages, setDetailImages] = useState<ImageItem[]>([]);

  // 재고
  const [variants, setVariants] = useState<VariantState[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("userInfo");
    if (!storedUser) {
      alert("로그인이 필요한 서비스입니다.");
      router.push("/login");
      return;
    }
    try {
      const parsed = JSON.parse(storedUser);
      const isSeller = parsed.role === "SELLER" || parsed.role === "ROLE_SELLER";
      if (!isSeller) {
        alert("판매자만 접근할 수 있습니다.");
        router.push("/");
        return;
      }
    } catch {
      router.push("/");
      return;
    }
    setAuthChecked(true);

    Promise.all([
      apiFetch(`/api/v1/products/${productId}/edit`).then((r) => r.json()),
      apiFetch("/api/v1/products/categories").then((r) => r.json()),
    ])
      .then(([editJson, catJson]) => {
        if (!editJson.data) {
          alert("상품 정보를 불러올 수 없습니다.");
          router.back();
          return;
        }
        const d: EditFormData = editJson.data;
        setOriginalData(d);

        setName(d.name);
        setPrice(String(d.price));
        setDiscountRate(String(d.discountRate ?? 0));
        setDetail(d.detail ?? "");
        setStatus(d.status ?? "ON_SALE");

        if (d.thumbnail) setThumbnailPreview(d.thumbnail);

        const existingImages: ExistingImage[] = (d.images ?? []).map((img) => ({
          type: "existing",
          imageId: img.imageId,
          url: img.url,
          sortOrder: img.sortOrder,
        }));
        setDetailImages(existingImages);

        setVariants(
          (d.variants ?? []).map((v) => ({
            variantId: v.variantId,
            variantName: v.variantName,
            currentStock: v.stock,
            newStock: v.stock,
            status: v.status,
            adjusting: false,
            adjustError: null,
            adjustDone: false,
          }))
        );

        if (catJson.data) {
          setCategories(catJson.data);

          const cats: CategoryNode[] = catJson.data;
          const main = cats.find(
            (c) =>
              String(c.id) === String(d.categoryId) ||
              c.children.some((sc) => String(sc.id) === String(d.categoryId))
          );
          if (main) {
            setMainCategory(String(main.id));
            const sub = main.children.find(
              (sc) => String(sc.id) === String(d.categoryId)
            );
            if (sub) setSubCategory(String(sub.id));
          }
        }
      })
      .catch(() => {
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
        router.back();
      })
      .finally(() => setLoading(false));
  }, [productId, router]);

  const uploadToS3 = async (
    file: File,
    onChange: (uploading: boolean, key: string | null, err: string | null) => void
  ) => {
    onChange(true, null, null);
    try {
      const res = await apiFetch("/api/v1/images/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      const json = await res.json();
      if (!res.ok || !json.data) throw new Error(json.message || "Presigned URL 발급 실패");

      const { uploadUrl, objectKey, contentType } = json.data;
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!uploadRes.ok) throw new Error(`스토리지 업로드 실패 (${uploadRes.status})`);

      onChange(false, objectKey, null);
      return objectKey as string;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "업로드 오류";
      onChange(false, null, msg);
      throw err;
    }
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const initial = { file, objectKey: null, uploading: true, uploaded: false, error: null };
    setNewThumbnailFile(initial);
    setThumbnailPreview(URL.createObjectURL(file));
    try {
      await uploadToS3(file, (uploading, key, err) =>
        setNewThumbnailFile((p) =>
          p ? { ...p, uploading, objectKey: key, uploaded: !!key, error: err } : p
        )
      );
    } catch {}
  };

  const handleDetailImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const newItems: NewImage[] = Array.from(files).map((f) => ({
      type: "new",
      file: f,
      previewUrl: URL.createObjectURL(f),
      objectKey: null,
      uploading: true,
      uploaded: false,
      error: null,
    }));
    setDetailImages((p) => [...p, ...newItems]);

    newItems.forEach((item) => {
      uploadToS3(item.file, (uploading, key, err) =>
        setDetailImages((p) =>
          p.map((x) =>
            x.type === "new" && x.file === item.file
              ? { ...x, uploading, objectKey: key, uploaded: !!key, error: err }
              : x
          )
        )
      ).catch(() => {});
    });
  };

  const removeDetailImage = (index: number) => {
    setDetailImages((p) => p.filter((_, i) => i !== index));
  };

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!name.trim()) return "상품명을 입력해주세요.";
      if (!mainCategory) return "카테고리를 선택해주세요.";
      const cat = categories.find((c) => String(c.id) === mainCategory);
      if (cat?.children.length && !subCategory) return "소분류 카테고리를 선택해주세요.";
      if (!price || Number(price) < 0) return "올바른 판매가를 입력해주세요.";
      const dr = Number(discountRate);
      if (isNaN(dr) || dr < 0 || dr > 100) return "할인율은 0~100 사이여야 합니다.";
    }
    if (s === 1) {
      if (newThumbnailFile?.uploading) return "썸네일 업로드가 진행 중입니다.";
      if (newThumbnailFile?.error) return "썸네일 업로드에 실패했습니다.";
      const newImgs = detailImages.filter((x) => x.type === "new") as NewImage[];
      if (newImgs.some((i) => i.uploading)) return "이미지 업로드가 진행 중입니다.";
      if (newImgs.some((i) => i.error)) return "일부 이미지 업로드가 실패했습니다.";
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) { setStepError(err); return; }
    setStepError("");
    setStep((s) => s + 1);
  };

  const goPrev = () => { setStepError(""); setStep((s) => s - 1); };

  const handleAdjustStock = async (variantId: number, index: number) => {
    const v = variants[index];
    const changeAmount = v.newStock - v.currentStock;
    if (changeAmount === 0) {
      setVariants((p) =>
        p.map((x, i) => (i === index ? { ...x, adjustDone: true } : x))
      );
      return;
    }

    setVariants((p) =>
      p.map((x, i) => (i === index ? { ...x, adjusting: true, adjustError: null } : x))
    );

    try {
      const res = await apiFetch(
        `/api/v1/products/${productId}/variants/${variantId}/stock`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ changeAmount, reason: "ADJUSTMENT" }),
        }
      );
      const json = await res.json();
      if (res.ok) {
        setVariants((p) =>
          p.map((x, i) =>
            i === index
              ? {
                  ...x,
                  adjusting: false,
                  adjustDone: true,
                  currentStock: v.newStock,
                }
              : x
          )
        );
      } else {
        setVariants((p) =>
          p.map((x, i) =>
            i === index
              ? { ...x, adjusting: false, adjustError: json.message || "재고 조정 실패" }
              : x
          )
        );
      }
    } catch {
      setVariants((p) =>
        p.map((x, i) =>
          i === index
            ? { ...x, adjusting: false, adjustError: "서버 통신 오류" }
            : x
        )
      );
    }
  };

  const handleSubmit = async () => {
    const categoryId = subCategory || mainCategory;
    const imageRequests: Array<{ imageId?: number; objectKey?: string; sortOrder: number }> = [];
    detailImages.forEach((img, idx) => {
      if (img.type === "existing") {
        imageRequests.push({ imageId: img.imageId, sortOrder: idx + 1 });
      } else if (img.uploaded && img.objectKey) {
        imageRequests.push({ objectKey: img.objectKey, sortOrder: idx + 1 });
      }
    });

    const payload: Record<string, unknown> = {
      name: name.trim(),
      categoryId: Number(categoryId),
      price: Number(price),
      discountRate: Number(discountRate) || 0,
      detail: detail.trim() || null,
      status,
      images: imageRequests,
    };

    if (newThumbnailFile?.objectKey) {
      payload.thumbnailKey = newThumbnailFile.objectKey;
    }

    setSubmitting(true);
    setStepError("");
    try {
      const res = await apiFetch(`/api/v1/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        alert("상품이 수정되었습니다.");
        router.push(`/products/${productId}`);
      } else {
        setStepError(json.message || "상품 수정 중 오류가 발생했습니다.");
      }
    } catch {
      setStepError("서버와의 통신에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말로 이 상품을 삭제하시겠습니까?\n진행 중인 주문이 있으면 삭제할 수 없습니다.")) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/v1/products/${productId}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        alert("상품이 삭제되었습니다.");
        router.push("/");
      } else {
        alert(json.message || "상품 삭제에 실패했습니다.");
      }
    } catch {
      alert("서버와의 통신에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-drac-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-drac-pink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedMainCat = categories.find((c) => String(c.id) === mainCategory);
  const discountedPreview =
    price && Number(price) >= 0
      ? Math.round(Number(price) * (1 - (Number(discountRate) || 0) / 100))
      : null;

  return (
    <div className="min-h-screen bg-drac-bg text-drac-fg font-sans pb-24">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-drac-bg/80 border-b border-drac-comment/50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => (step === 0 ? router.back() : goPrev())}
            className="w-9 h-9 rounded-full bg-drac-current flex items-center justify-center hover:bg-drac-comment transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-drac-cyan to-drac-purple flex items-center justify-center text-white">
              <Pencil size={14} />
            </div>
            <span className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-drac-cyan to-drac-purple">
              상품 수정
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-8">
        {/* Step Indicator */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all font-bold text-sm
                      ${done ? "bg-drac-green text-drac-bg" : active ? "bg-drac-purple text-drac-bg ring-4 ring-drac-purple/20" : "bg-drac-current text-drac-comment"}`}
                  >
                    {done ? <CheckCircle2 size={18} /> : <Icon size={16} />}
                  </div>
                  <span
                    className={`text-[10px] font-bold whitespace-nowrap ${active ? "text-drac-purple" : done ? "text-drac-green" : "text-drac-comment"}`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all ${i < step ? "bg-drac-green" : "bg-drac-current"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-drac-bg border border-drac-current/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-drac-purple/5">
          {stepError && (
            <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 text-drac-red rounded-2xl text-sm font-medium flex items-center gap-2.5">
              <AlertCircle size={17} className="shrink-0" />
              {stepError}
            </div>
          )}

          {/* Step 0: 기본 정보 */}
          {step === 0 && (
            <div className="space-y-6">
              <StepHeader icon={<Layers size={16} />} title="기본 정보" desc="상품의 이름, 카테고리, 가격, 상태를 수정하세요." />

              <Field label="상품명" required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={255}
                  className={inputCls}
                />
                <p className="text-xs text-drac-comment mt-1.5">{name.length}/255자</p>
              </Field>

              <Field label="카테고리" required>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={mainCategory}
                    onChange={(e) => { setMainCategory(e.target.value); setSubCategory(""); }}
                    className={selectCls}
                  >
                    <option value="">대분류 선택</option>
                    {categories.map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.name}</option>
                    ))}
                  </select>
                  <select
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    disabled={!mainCategory || !selectedMainCat?.children.length}
                    className={selectCls + " disabled:opacity-40 disabled:cursor-not-allowed"}
                  >
                    <option value="">
                      {selectedMainCat?.children.length ? "소분류 선택 *" : "소분류 없음"}
                    </option>
                    {selectedMainCat?.children.map((s) => (
                      <option key={s.id} value={String(s.id)}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="판매가 (원)" required>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-drac-comment w-4 h-4" />
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      min={0}
                      className={inputCls + " pl-10"}
                    />
                  </div>
                </Field>
                <Field label="할인율 (%)">
                  <div className="relative">
                    <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-drac-comment w-4 h-4" />
                    <input
                      type="number"
                      value={discountRate}
                      onChange={(e) => setDiscountRate(e.target.value)}
                      min={0}
                      max={100}
                      className={inputCls + " pl-10"}
                    />
                  </div>
                </Field>
              </div>

              {discountedPreview !== null && Number(discountRate) > 0 && (
                <div className="p-3.5 bg-drac-purple/10 border border-drac-purple/30 rounded-2xl flex items-center justify-between">
                  <span className="text-xs text-drac-comment font-medium">실제 판매가</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm line-through text-drac-comment">{Number(price).toLocaleString()}원</span>
                    <span className="text-base font-black text-drac-purple">{discountedPreview.toLocaleString()}원</span>
                  </div>
                </div>
              )}

              <Field label="판매 상태">
                <div className="flex items-center bg-drac-current rounded-2xl p-1.5 gap-1">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${status === opt.value ? "bg-drac-purple text-drac-bg shadow" : "text-drac-comment hover:text-drac-fg"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="상세 설명">
                <div className="bg-drac-current border border-drac-comment/60 rounded-xl overflow-hidden focus-within:border-drac-pink transition-all text-drac-fg text-sm">
                  <RichTextEditor value={detail} onChange={setDetail} placeholder="상품 설명을 입력해주세요." />
                </div>
              </Field>
            </div>
          )}

          {/* Step 1: 이미지 */}
          {step === 1 && (
            <div className="space-y-7">
              <StepHeader icon={<UploadCloud size={16} />} title="이미지" desc="썸네일을 교체하거나 추가 이미지를 관리하세요." />

              <Field label="대표 이미지 (썸네일)">
                <div className="relative border border-drac-comment/30 rounded-2xl overflow-hidden h-52 bg-drac-current/30 group">
                  {thumbnailPreview ? (
                    <>
                      <Image src={thumbnailPreview} alt="thumbnail" fill className="object-cover" />
                      {newThumbnailFile?.uploading && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                          <div className="w-8 h-8 border-4 border-drac-pink border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-white font-medium">업로드 중...</span>
                        </div>
                      )}
                      {newThumbnailFile?.uploaded && (
                        <div className="absolute top-3 right-3 bg-drac-green/90 text-white rounded-full p-1">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-drac-comment text-sm">
                      썸네일 없음
                    </div>
                  )}
                  <label className="absolute bottom-3 right-3 bg-drac-purple/90 hover:bg-drac-purple text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5">
                    <UploadCloud size={13} /> 교체
                    <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                  </label>
                </div>
                {newThumbnailFile?.error && (
                  <p className="text-xs text-drac-red mt-1.5 flex items-center gap-1">
                    <AlertCircle size={13} /> {newThumbnailFile.error}
                  </p>
                )}
              </Field>

              <Field label="추가 이미지">
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-drac-comment/40 rounded-2xl h-14 cursor-pointer hover:border-drac-cyan hover:bg-drac-current/20 transition-all">
                  <UploadCloud size={16} className="text-drac-cyan" />
                  <span className="text-sm font-medium text-drac-fg">이미지 추가</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleDetailImagesChange} />
                </label>

                {detailImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {detailImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-xl overflow-hidden bg-drac-current/40 border border-drac-comment/20 group"
                      >
                        <Image
                          src={img.type === "existing" ? img.url : img.previewUrl}
                          alt={`detail-${idx}`}
                          fill
                          className="object-cover"
                        />
                        {img.type === "new" && img.uploading && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-drac-pink border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {img.type === "new" && img.uploaded && (
                          <div className="absolute top-1 right-1 bg-drac-green/90 text-white rounded-full p-0.5">
                            <CheckCircle2 size={10} />
                          </div>
                        )}
                        {img.type === "existing" && (
                          <div className="absolute top-1 left-1 bg-drac-cyan/80 text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                            기존
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeDetailImage(idx)}
                          className="absolute bottom-1 right-1 bg-black/70 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Field>
            </div>
          )}

          {/* Step 2: 재고 관리 */}
          {step === 2 && (
            <div className="space-y-6">
              <StepHeader
                icon={<Package size={16} />}
                title="재고 관리"
                desc="품목별 재고를 조정하세요. 변경 후 [적용] 버튼을 눌러야 저장됩니다."
              />

              {variants.length === 0 ? (
                <div className="p-10 border-2 border-dashed border-drac-comment/20 rounded-3xl text-center text-drac-comment text-sm">
                  등록된 품목이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {variants.map((v, idx) => (
                    <div
                      key={v.variantId}
                      className={`p-4 rounded-2xl border transition-all ${
                        v.adjustDone
                          ? "border-drac-green/40 bg-drac-green/5"
                          : "border-drac-comment/20 bg-drac-current/10"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-drac-fg">{v.variantName}</span>
                        {v.adjustDone && (
                          <span className="text-xs text-drac-green font-bold flex items-center gap-1">
                            <CheckCircle2 size={13} /> 적용됨
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs text-drac-comment shrink-0">현재:</span>
                          <span className="text-sm font-bold text-drac-fg">{v.currentStock}개</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-drac-comment shrink-0">변경:</span>
                          <input
                            type="number"
                            value={v.newStock}
                            min={0}
                            onChange={(e) =>
                              setVariants((p) =>
                                p.map((x, i) =>
                                  i === idx
                                    ? { ...x, newStock: Math.max(0, Number(e.target.value) || 0), adjustDone: false }
                                    : x
                                )
                              )
                            }
                            className="w-20 px-2 py-1.5 bg-drac-bg border border-drac-comment/30 rounded-lg outline-none focus:border-drac-purple text-sm text-drac-fg font-bold text-center"
                          />
                          <span className="text-xs text-drac-comment">개</span>
                        </div>
                        {v.newStock !== v.currentStock && (
                          <span
                            className={`text-xs font-bold ${v.newStock > v.currentStock ? "text-drac-green" : "text-drac-red"}`}
                          >
                            {v.newStock > v.currentStock ? "+" : ""}
                            {v.newStock - v.currentStock}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(v.variantId, idx)}
                          disabled={v.adjusting || (v.newStock === v.currentStock && !v.adjustDone)}
                          className="px-3 py-1.5 bg-drac-purple text-drac-bg text-xs font-black rounded-xl hover:bg-drac-purple/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {v.adjusting ? (
                            <div className="w-3 h-3 border-2 border-drac-bg border-t-transparent rounded-full animate-spin" />
                          ) : (
                            "적용"
                          )}
                        </button>
                      </div>
                      {v.adjustError && (
                        <p className="text-xs text-drac-red mt-2 flex items-center gap-1">
                          <AlertCircle size={12} /> {v.adjustError}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: 최종 확인 */}
          {step === 3 && (
            <div className="space-y-6">
              <StepHeader
                icon={<CheckCircle2 size={16} />}
                title="최종 확인"
                desc="변경 사항을 검토하고 저장하세요."
              />

              <div className="space-y-3">
                <SummaryRow label="상품명" value={name} />
                <SummaryRow
                  label="카테고리"
                  value={[
                    categories.find((c) => String(c.id) === mainCategory)?.name,
                    selectedMainCat?.children.find((c) => String(c.id) === subCategory)?.name,
                  ]
                    .filter(Boolean)
                    .join(" > ")}
                />
                <SummaryRow
                  label="판매가"
                  value={
                    Number(discountRate) > 0
                      ? `${Number(price).toLocaleString()}원 → ${discountedPreview?.toLocaleString()}원 (${discountRate}% 할인)`
                      : `${Number(price).toLocaleString()}원`
                  }
                />
                <SummaryRow label="판매 상태" value={STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status} />
                <SummaryRow
                  label="썸네일"
                  value={newThumbnailFile?.uploaded ? "새 이미지로 교체" : thumbnailPreview ? "기존 유지" : "없음"}
                />
                <SummaryRow
                  label="추가 이미지"
                  value={`${detailImages.length}장 (기존 ${detailImages.filter((x) => x.type === "existing").length} + 신규 ${detailImages.filter((x) => x.type === "new" && (x as NewImage).uploaded).length})`}
                />
                <SummaryRow
                  label="재고 조정"
                  value={
                    variants.filter((v) => v.adjustDone).length > 0
                      ? `${variants.filter((v) => v.adjustDone).length}개 품목 조정 완료`
                      : "변경 없음"
                  }
                />
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-drac-pink to-drac-purple text-drac-bg rounded-2xl font-black text-base hover:opacity-90 transition-all shadow-lg shadow-drac-purple/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-drac-bg border-t-transparent rounded-full animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={17} /> 수정 완료
                  </>
                )}
              </button>

              {/* 상품 삭제 */}
              <div className="mt-8 p-4 border border-drac-red/30 rounded-2xl bg-red-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-drac-red" />
                  <span className="text-sm font-bold text-drac-red">위험 구역</span>
                </div>
                <p className="text-xs text-drac-comment mb-3">
                  상품을 삭제하면 복구할 수 없습니다. 진행 중인 주문이 있는 경우 삭제가 불가합니다.
                </p>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full py-2.5 border border-drac-red/60 text-drac-red text-sm font-bold rounded-xl hover:bg-drac-red/10 transition-all disabled:opacity-50"
                >
                  {deleting ? "삭제 중..." : "이 상품 삭제"}
                </button>
              </div>
            </div>
          )}

          {/* 네비게이션 */}
          {step < 3 && (
            <div className={`mt-8 flex ${step === 0 ? "justify-end" : "justify-between"}`}>
              {step > 0 && (
                <button
                  type="button"
                  onClick={goPrev}
                  className="px-5 py-2.5 border border-drac-comment text-drac-fg rounded-2xl font-bold text-sm hover:bg-drac-current transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft size={15} /> 이전
                </button>
              )}
              <button
                type="button"
                onClick={goNext}
                className="px-6 py-2.5 bg-drac-purple text-drac-bg rounded-2xl font-bold text-sm hover:bg-drac-purple/80 transition-all shadow-md shadow-drac-purple/20 flex items-center gap-1.5"
              >
                다음 <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-drac-comment mt-4">
          {step + 1} / {STEPS.length} 단계
        </p>
      </main>
    </div>
  );
}

function StepHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-drac-pink">{icon}</span>
        <h2 className="text-lg font-black text-drac-fg">{title}</h2>
      </div>
      <p className="text-sm text-drac-comment">{desc}</p>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-bold text-drac-fg flex items-center gap-1">
        {label} {required && <span className="text-drac-pink">*</span>}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-drac-current/50 last:border-b-0">
      <span className="text-xs font-bold text-drac-comment shrink-0">{label}</span>
      <span className="text-sm text-drac-fg text-right">{value || "—"}</span>
    </div>
  );
}

const inputCls =
  "w-full px-4 py-3 bg-drac-current border border-drac-comment/60 rounded-xl outline-none focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg text-sm";

const selectCls =
  "w-full px-3 py-3 bg-drac-current border border-drac-comment/60 rounded-xl outline-none focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg text-sm cursor-pointer";
