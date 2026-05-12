"use client";

import ThemeToggle from "@/app/components/ThemeToggle";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  Plus,
  Trash2,
  Settings,
  CheckCircle2,
  AlertCircle,
  Layers,
  DollarSign,
  Tag,
  Package,
  Info,
  ChevronRight,
} from "lucide-react";

interface CategoryNode {
  id: number;
  name: string;
  depth: number;
  children: CategoryNode[];
}

interface ImageUploadState {
  file: File;
  previewUrl: string;
  objectKey: string | null;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
}

interface OptionGroupState {
  id: string;
  name: string;
  values: string[];
}

interface VariantState {
  optionNames: string[];
  stock: number;
}

const STEPS = [
  { label: "기본 정보", icon: Layers },
  { label: "이미지", icon: UploadCloud },
  { label: "옵션/재고", icon: Settings },
  { label: "최종 확인", icon: CheckCircle2 },
];

export default function NewProductPage() {
  const router = useRouter();

  const [userInfo, setUserInfo] = useState<{
    profileName: string;
    role: string;
  } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [step, setStep] = useState(0);

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [discountRate, setDiscountRate] = useState("0");
  const [detail, setDetail] = useState("");

  const [thumbnail, setThumbnail] = useState<ImageUploadState | null>(null);
  const [detailImages, setDetailImages] = useState<ImageUploadState[]>([]);
  const [useOptions, setUseOptions] = useState(false);
  const [stock, setStock] = useState("10");
  const [optionGroups, setOptionGroups] = useState<OptionGroupState[]>([
    { id: "1", name: "", values: [] },
  ]);
  const [variants, setVariants] = useState<VariantState[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [stepError, setStepError] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("userInfo");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUserInfo(parsed);
        const isSeller =
          parsed.role === "SELLER" || parsed.role === "ROLE_SELLER";
        if (!isSeller) {
          alert("판매자만 상품 등록이 가능합니다.");
          router.push("/");
          return;
        }
      } catch {
        router.push("/");
        return;
      }
    } else {
      alert("로그인이 필요한 서비스입니다.");
      router.push("/login");
      return;
    }
    setAuthChecked(true);
    fetch("/api/v1/products/categories")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setCategories(j.data);
      })
      .catch(() => {});
  }, [router]);

  // 옵션/값이 변경될 때마다 품목(variants)을 자동 동기화하는 로직은 제거되었습니다.
  // 사용자가 명세에 따라 원하는 조합만 선택할 수 있도록 수동 관리 기능을 제공합니다.

  const addVariantRow = () => {
    const activeGroups = optionGroups.filter((g) => g.name.trim());
    if (activeGroups.length === 0) {
      alert("먼저 옵션 분류명을 입력해주세요.");
      return;
    }
    setVariants((p) => [
      ...p,
      { optionNames: Array(activeGroups.length).fill(""), stock: 10 },
    ]);
  };

  const generateAllVariants = () => {
    const activeGroups = optionGroups.filter(
      (g) => g.name.trim() && g.values.length > 0,
    );
    if (activeGroups.length === 0) {
      alert("모든 옵션 분류에 최소 한 개의 값을 입력해주세요.");
      return;
    }

    if (
      !confirm(
        "모든 조합을 새로 생성하시겠습니까? (기존 품목 데이터는 사라집니다.)",
      )
    )
      return;

    const sets = activeGroups.map((g) => g.values);
    const cartesian = (arr: string[][]): string[][] =>
      arr.reduce<string[][]>(
        (acc, s) => acc.flatMap((x) => s.map((y) => [...x, y])),
        [[]],
      );

    const combos = cartesian(sets);
    setVariants(combos.map((combo) => ({ optionNames: combo, stock: 10 })));
  };

  // ── S3 업로드 헬퍼 ──────────────────────────────────────────────
  const uploadToS3 = async (
    file: File,
    onChange: (
      uploading: boolean,
      key: string | null,
      err: string | null,
    ) => void,
  ) => {
    onChange(true, null, null);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("로그인이 필요합니다.");

      const res = await fetch("/api/v1/images/presigned-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filename: file.name }),
      });
      const json = await res.json();
      if (!res.ok || !json.data)
        throw new Error(json.message || "Presigned URL 발급 실패");

      const { uploadUrl, objectKey, contentType } = json.data;

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!uploadRes.ok)
        throw new Error(`스토리지 업로드 실패 (${uploadRes.status})`);

      onChange(false, objectKey, null);
      return objectKey as string;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "업로드 오류";
      onChange(false, null, msg);
      throw err;
    }
  };

  const handleThumbnailChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const initial: ImageUploadState = {
      file,
      previewUrl: URL.createObjectURL(file),
      objectKey: null,
      uploading: true,
      uploaded: false,
      error: null,
    };
    setThumbnail(initial);
    try {
      await uploadToS3(file, (uploading, key, err) =>
        setThumbnail(
          (p) =>
            p && {
              ...p,
              uploading,
              objectKey: key,
              uploaded: !!key,
              error: err,
            },
        ),
      );
    } catch {}
  };

  const handleDetailImagesChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files?.length) return;
    const newItems: ImageUploadState[] = Array.from(files).map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      objectKey: null,
      uploading: true,
      uploaded: false,
      error: null,
    }));
    setDetailImages((p) => [...p, ...newItems]);
    newItems.forEach((state) => {
      uploadToS3(state.file, (uploading, key, err) =>
        setDetailImages((p) =>
          p.map((item) =>
            item.file === state.file
              ? {
                  ...item,
                  uploading,
                  objectKey: key,
                  uploaded: !!key,
                  error: err,
                }
              : item,
          ),
        ),
      ).catch(() => {});
    });
  };

  // ── 옵션 헬퍼 ────────────────────────────────────────────────────
  const addOptionGroup = () => {
    if (optionGroups.length >= 3) {
      alert("옵션 분류는 최대 3개까지 등록 가능합니다.");
      return;
    }
    setOptionGroups((p) => [
      ...p,
      { id: String(Date.now()), name: "", values: [] },
    ]);
  };

  const removeOptionGroup = (id: string) => {
    setOptionGroups((p) => p.filter((g) => g.id !== id));
  };

  const handleAddValue = (groupId: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setOptionGroups((p) =>
      p.map((g) => {
        if (g.id !== groupId) return g;
        if (g.values.includes(trimmed)) return g;
        return { ...g, values: [...g.values, trimmed] };
      }),
    );
  };

  const handleRemoveValue = (groupId: string, value: string) => {
    setOptionGroups((p) =>
      p.map((g) =>
        g.id === groupId
          ? { ...g, values: g.values.filter((v) => v !== value) }
          : g,
      ),
    );
  };

  // ── 단계별 검증 ──────────────────────────────────────────────────
  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!name.trim()) return "상품명을 입력해주세요.";
      if (!mainCategory) return "카테고리를 선택해주세요.";
      const cat = categories.find((c) => String(c.id) === mainCategory);
      if (cat?.children.length && !subCategory)
        return "소분류 카테고리를 선택해주세요.";
      if (!price || Number(price) < 0) return "올바른 판매가를 입력해주세요.";
      const dr = Number(discountRate);
      if (isNaN(dr) || dr < 0 || dr > 100)
        return "할인율은 0~100 사이여야 합니다.";
    }
    if (s === 1) {
      if (thumbnail?.uploading) return "대표 이미지 업로드가 진행 중입니다.";
      if (thumbnail && (thumbnail.error || !thumbnail.uploaded))
        return "대표 이미지 업로드에 실패했습니다. 다시 선택해주세요.";
      if (detailImages.some((i) => i.uploading))
        return "상세 이미지 업로드가 진행 중입니다.";
      if (detailImages.some((i) => i.error))
        return "일부 상세 이미지 업로드가 실패했습니다. 실패한 이미지를 제거해주세요.";
    }
    if (s === 2) {
      if (!useOptions) {
        if (!stock || Number(stock) < 1)
          return "재고 수량은 1개 이상이어야 합니다.";
      } else {
        const active = optionGroups.filter((g) => g.name.trim());
        if (!active.length) return "옵션 분류명을 하나 이상 입력해주세요.";
        if (active.some((g) => g.values.length === 0))
          return "모든 옵션 분류에 최소 한 개의 값을 입력해주세요.";
        if (!variants.length)
          return "등록된 품목(조합)이 없습니다. 직접 추가하거나 자동 생성해주세요.";

        // 개별 품목 선택 여부 및 중복 검사
        const seen = new Set<string>();
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          if (v.optionNames.length !== active.length)
            return `${i + 1}번 품목의 데이터가 올바르지 않습니다.`;

          for (let j = 0; j < v.optionNames.length; j++) {
            if (!v.optionNames[j])
              return `${i + 1}번 품목의 [${active[j].name}] 옵션을 선택해주세요.`;
          }

          const key = v.optionNames.join("|");
          if (seen.has(key))
            return `중복된 품목 조합이 있습니다: ${v.optionNames.join(" / ")}`;
          seen.add(key);
        }
      }
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError("");
    setStep((s) => s + 1);
  };

  const goPrev = () => {
    setStepError("");
    setStep((s) => s - 1);
  };

  // ── 최종 제출 ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setStepError("로그인 정보가 만료되었습니다. 다시 로그인해주세요.");
      return;
    }

    const categoryId = subCategory || mainCategory;
    const uploadedImages = detailImages
      .filter((i) => i.uploaded && i.objectKey)
      .map((i, idx) => ({ objectKey: i.objectKey!, sortOrder: idx + 1 }));

    const payload: Record<string, unknown> = {
      name: name.trim(),
      categoryId: Number(categoryId),
      price: Number(price),
      discountRate: Number(discountRate) || 0,
      ...(detail.trim() ? { detail: detail.trim() } : {}),
      ...(thumbnail?.objectKey ? { thumbnailKey: thumbnail.objectKey } : {}),
      ...(uploadedImages.length ? { images: uploadedImages } : {}),
    };

    if (useOptions) {
      const active = optionGroups.filter(
        (g) => g.name.trim() && g.values.length > 0,
      );
      payload.optionGroups = active.map((g, gi) => ({
        name: g.name.trim(),
        sortOrder: gi + 1,
        options: g.values.map((v) => ({ name: v })),
      }));
      payload.variants = variants.map((v) => ({
        optionNames: v.optionNames,
        stock: v.stock,
      }));
    } else {
      payload.stock = Number(stock);
    }

    setSubmitting(true);
    setStepError("");
    try {
      const res = await fetch("/api/v1/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        router.push("/");
      } else {
        setStepError(json.message || "상품 등록 중 오류가 발생했습니다.");
      }
    } catch {
      setStepError("서버와의 통신에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── 로딩 가드 ───────────────────────────────────────────────────
  if (!authChecked) {
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

  // ── 렌더 ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-drac-bg text-drac-fg font-sans pb-24">
      {/* Header */}
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
              <Sparkles size={14} />
            </div>
            <span className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-drac-cyan to-drac-purple">
              상품 등록
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {userInfo && (
              <span className="hidden sm:block px-2.5 py-0.5 rounded-full bg-drac-purple/10 border border-drac-purple/30 text-drac-purple text-xs font-black tracking-widest uppercase">
                SELLER
              </span>
            )}
          </div>
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

        {/* Card */}
        <div className="bg-drac-bg border border-drac-current/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-drac-purple/5">
          {/* Step Error */}
          {stepError && (
            <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 text-drac-red rounded-2xl text-sm font-medium flex items-center gap-2.5">
              <AlertCircle size={17} className="shrink-0" />
              {stepError}
            </div>
          )}

          {/* ── Step 0: 기본 정보 ─────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-6">
              <StepHeader
                icon={<Layers size={16} />}
                title="기본 정보"
                desc="상품의 이름, 카테고리, 가격을 설정해주세요."
              />

              {/* 상품명 */}
              <Field label="상품명" required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="상품 이름을 입력하세요"
                  maxLength={255}
                  className={inputCls}
                />
                <p className="text-xs text-drac-comment mt-1.5">
                  {name.length}/255자
                </p>
              </Field>

              {/* 카테고리 */}
              <Field label="카테고리" required>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={mainCategory}
                    onChange={(e) => {
                      setMainCategory(e.target.value);
                      setSubCategory("");
                    }}
                    className={selectCls}
                  >
                    <option value="">대분류 선택</option>
                    {categories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    disabled={
                      !mainCategory || !selectedMainCat?.children.length
                    }
                    className={
                      selectCls +
                      " disabled:opacity-40 disabled:cursor-not-allowed"
                    }
                  >
                    <option value="">
                      {selectedMainCat?.children.length
                        ? "소분류 선택 *"
                        : "소분류 없음"}
                    </option>
                    {selectedMainCat?.children.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              {/* 가격 */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="판매가 (원)" required>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-drac-comment w-4 h-4" />
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0"
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
                      placeholder="0"
                      min={0}
                      max={100}
                      className={inputCls + " pl-10"}
                    />
                  </div>
                </Field>
              </div>

              {/* 할인가 미리보기 */}
              {discountedPreview !== null && Number(discountRate) > 0 && (
                <div className="p-3.5 bg-drac-purple/10 border border-drac-purple/30 rounded-2xl flex items-center justify-between">
                  <span className="text-xs text-drac-comment font-medium">
                    실제 판매가
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm line-through text-drac-comment">
                      {Number(price).toLocaleString()}원
                    </span>
                    <span className="text-base font-black text-drac-purple">
                      {discountedPreview.toLocaleString()}원
                    </span>
                  </div>
                </div>
              )}

              {/* 상세 설명 */}
              <Field label="상세 설명">
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="상품의 소재, 특징, 사용법 등을 자유롭게 작성해주세요."
                  className={inputCls + " h-28 resize-none"}
                />
              </Field>
            </div>
          )}

          {/* ── Step 1: 이미지 ───────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-7">
              <StepHeader
                icon={<UploadCloud size={16} />}
                title="이미지"
                desc="대표 이미지를 등록하면 목록에서 보입니다. 추가 이미지는 선택사항입니다."
              />

              {/* 썸네일 */}
              <Field label="대표 이미지 (썸네일)">
                {!thumbnail ? (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-drac-comment/50 rounded-2xl h-52 cursor-pointer hover:border-drac-pink hover:bg-drac-current/20 transition-all group">
                    <div className="w-12 h-12 rounded-full bg-drac-current flex items-center justify-center mb-3 group-hover:bg-drac-pink/10 transition-all">
                      <UploadCloud
                        size={24}
                        className="text-drac-comment group-hover:text-drac-pink transition-colors"
                      />
                    </div>
                    <p className="text-sm font-semibold text-drac-fg">
                      클릭하여 이미지 선택
                    </p>
                    <p className="text-xs text-drac-comment mt-1">
                      JPG, PNG, WEBP · 최대 10MB
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleThumbnailChange}
                    />
                  </label>
                ) : (
                  <div className="relative border border-drac-comment/30 rounded-2xl overflow-hidden h-52 bg-drac-current/30 group">
                    <Image
                      src={thumbnail.previewUrl}
                      alt="thumbnail"
                      fill
                      className="object-cover"
                    />
                    {thumbnail.uploading && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                        <div className="w-8 h-8 border-4 border-drac-pink border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-white font-medium">
                          업로드 중...
                        </span>
                      </div>
                    )}
                    {!thumbnail.uploading && thumbnail.uploaded && (
                      <div className="absolute top-3 right-3 bg-drac-green/90 text-white rounded-full p-1 shadow">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                    {thumbnail.error && (
                      <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center gap-2 text-drac-red p-4 text-center">
                        <AlertCircle size={24} />
                        <p className="text-xs font-semibold">
                          {thumbnail.error}
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setThumbnail(null)}
                      className="absolute bottom-3 right-3 bg-black/70 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </Field>

              {/* 추가 이미지 */}
              <Field label="추가 이미지 (선택)">
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-drac-comment/40 rounded-2xl h-14 cursor-pointer hover:border-drac-cyan hover:bg-drac-current/20 transition-all">
                  <Plus size={16} className="text-drac-cyan" />
                  <span className="text-sm font-medium text-drac-fg">
                    이미지 추가
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleDetailImagesChange}
                  />
                </label>
                {detailImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {detailImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-xl overflow-hidden bg-drac-current/40 border border-drac-comment/20 group"
                      >
                        <Image
                          src={img.previewUrl}
                          alt={`detail-${idx}`}
                          fill
                          className="object-cover"
                        />
                        {img.uploading && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-drac-pink border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {!img.uploading && img.uploaded && (
                          <div className="absolute top-1 right-1 bg-drac-green/90 text-white rounded-full p-0.5">
                            <CheckCircle2 size={10} />
                          </div>
                        )}
                        {img.error && (
                          <div className="absolute inset-0 bg-red-950/80 flex items-center justify-center">
                            <AlertCircle size={14} className="text-drac-red" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setDetailImages((p) =>
                              p.filter((_, i) => i !== idx),
                            )
                          }
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

          {/* ── Step 2: 옵션/재고 ────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <StepHeader
                icon={<Settings size={16} />}
                title="옵션 / 재고"
                desc="색상, 사이즈처럼 선택지가 있으면 '옵션 사용'을 켜주세요."
              />

              {/* 토글 */}
              <div className="flex items-center bg-drac-current rounded-2xl p-1.5 gap-1">
                {[false, true].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => {
                      setUseOptions(v);
                      if (!v) setVariants([]);
                    }}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${useOptions === v ? "bg-drac-purple text-drac-bg shadow" : "text-drac-comment hover:text-drac-fg"}`}
                  >
                    {v ? "옵션 사용" : "옵션 없음"}
                  </button>
                ))}
              </div>

              {!useOptions ? (
                <Field label="재고 수량" required>
                  <div className="relative max-w-xs">
                    <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 text-drac-comment w-4 h-4" />
                    <input
                      type="number"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      min={1}
                      className={inputCls + " pl-10"}
                    />
                  </div>
                </Field>
              ) : (
                <div className="space-y-8">
                  {/* 1. 옵션 분류 및 값 설정 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-drac-comment uppercase tracking-widest">
                        1. 옵션 설정
                      </p>
                      <button
                        type="button"
                        onClick={addOptionGroup}
                        className="text-xs font-bold text-drac-purple hover:underline flex items-center gap-1"
                      >
                        <Plus size={14} /> 분류 추가
                      </button>
                    </div>

                    <div className="space-y-4">
                      {optionGroups.map((g, gi) => (
                        <div
                          key={g.id}
                          className="p-5 border border-drac-comment/20 bg-drac-current/10 rounded-3xl space-y-4"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="text"
                              value={g.name}
                              onChange={(e) =>
                                setOptionGroups((p) =>
                                  p.map((x) =>
                                    x.id === g.id
                                      ? { ...x, name: e.target.value }
                                      : x,
                                  ),
                                )
                              }
                              placeholder="예: 색상, 사이즈"
                              className="bg-transparent border-none outline-none font-bold text-drac-pink placeholder:text-drac-comment/50 w-full"
                            />
                            {optionGroups.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeOptionGroup(g.id)}
                                className="text-drac-comment hover:text-drac-red p-1"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>

                          {/* Chips Input */}
                          <div className="flex flex-wrap gap-2 items-center min-h-[44px] p-2 bg-drac-bg rounded-xl border border-drac-comment/30">
                            {g.values.map((v) => (
                              <span
                                key={v}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-drac-purple/20 text-drac-purple rounded-lg text-xs font-bold border border-drac-purple/30"
                              >
                                {v}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveValue(g.id, v)}
                                  className="hover:text-drac-red transition-colors"
                                >
                                  <Plus size={12} className="rotate-45" />
                                </button>
                              </span>
                            ))}
                            <input
                              type="text"
                              placeholder="값 입력 후 엔터 (예: 블랙)"
                              className="flex-1 min-w-[120px] bg-transparent outline-none text-xs px-2"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddValue(g.id, e.currentTarget.value);
                                  e.currentTarget.value = "";
                                }
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. 품목 및 재고 관리 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-drac-comment uppercase tracking-widest">
                        2. 품목별 재고
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={generateAllVariants}
                          className="px-3 py-1.5 bg-drac-current border border-drac-cyan/30 text-drac-cyan text-[10px] font-black rounded-xl hover:bg-drac-cyan/10 transition-all flex items-center gap-1"
                        >
                          <Sparkles size={12} /> 모든 조합 생성
                        </button>
                        <button
                          type="button"
                          onClick={addVariantRow}
                          className="px-3 py-1.5 bg-drac-purple text-drac-bg text-[10px] font-black rounded-xl hover:bg-drac-purple/80 transition-all flex items-center gap-1"
                        >
                          <Plus size={12} /> 직접 추가
                        </button>
                      </div>
                    </div>

                    {variants.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            placeholder="재고 일괄 적용"
                            className="w-24 px-2 py-1 bg-drac-current border border-drac-comment/40 rounded-lg text-[10px] outline-none"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const val = parseInt(e.currentTarget.value);
                                if (!isNaN(val)) {
                                  setVariants((p) =>
                                    p.map((v) => ({ ...v, stock: val })),
                                  );
                                  e.currentTarget.value = "";
                                }
                              }
                            }}
                          />
                          <span className="text-[10px] text-drac-comment">
                            Enter로 적용
                          </span>
                        </div>

                        <div className="rounded-2xl border border-drac-comment/20 overflow-hidden bg-drac-current/5">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="bg-drac-current/30 border-b border-drac-comment/20 text-drac-comment font-black">
                                <th className="p-3 w-8">#</th>
                                {optionGroups
                                  .filter((g) => g.name.trim())
                                  .map((g, gi) => (
                                    <th key={gi} className="p-3">
                                      {g.name}
                                    </th>
                                  ))}
                                <th className="p-3 w-24">재고</th>
                                <th className="p-3 w-8" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-drac-comment/10">
                              {variants.map((v, vi) => (
                                <tr
                                  key={vi}
                                  className="hover:bg-drac-purple/5 transition-colors"
                                >
                                  <td className="p-3 text-drac-comment font-medium">
                                    {vi + 1}
                                  </td>
                                  {optionGroups
                                    .filter((g) => g.name.trim())
                                    .map((g, gi) => (
                                      <td key={gi} className="p-2">
                                        <select
                                          value={v.optionNames[gi] || ""}
                                          onChange={(e) =>
                                            setVariants((p) =>
                                              p.map((x, i) => {
                                                if (i !== vi) return x;
                                                const names = [
                                                  ...x.optionNames,
                                                ];
                                                names[gi] = e.target.value;
                                                return {
                                                  ...x,
                                                  optionNames: names,
                                                };
                                              }),
                                            )
                                          }
                                          className="w-full px-2 py-1.5 bg-drac-bg border border-drac-comment/30 rounded-lg outline-none focus:border-drac-purple text-xs text-drac-fg font-bold cursor-pointer"
                                        >
                                          <option value="">선택</option>
                                          {g.values.map((val) => (
                                            <option key={val} value={val}>
                                              {val}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                    ))}
                                  <td className="p-2">
                                    <input
                                      type="number"
                                      value={v.stock}
                                      min={1}
                                      onChange={(e) =>
                                        setVariants((p) =>
                                          p.map((x, i) =>
                                            i === vi
                                              ? {
                                                  ...x,
                                                  stock: Math.max(
                                                    1,
                                                    Number(e.target.value) || 0,
                                                  ),
                                                }
                                              : x,
                                          ),
                                        )
                                      }
                                      className="w-full px-2 py-1.5 bg-drac-bg border border-drac-comment/30 rounded-lg outline-none focus:border-drac-purple text-xs text-drac-fg font-bold"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setVariants((p) =>
                                          p.filter((_, i) => i !== vi),
                                        )
                                      }
                                      className="p-1.5 text-drac-comment hover:text-drac-red transition-all"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="p-10 border-2 border-dashed border-drac-comment/20 rounded-3xl text-center">
                        <div className="w-12 h-12 bg-drac-current rounded-full flex items-center justify-center mx-auto mb-3">
                          <Settings size={20} className="text-drac-comment" />
                        </div>
                        <p className="text-sm font-bold text-drac-fg">
                          등록된 품목이 없습니다
                        </p>
                        <p className="text-xs text-drac-comment mt-1">
                          <strong>[직접 추가]</strong>로 원하는 조합을 만들거나,
                          <br />
                          <strong>[모든 조합 생성]</strong>을 클릭하세요.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: 최종 확인 ────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <StepHeader
                icon={<CheckCircle2 size={16} />}
                title="최종 확인"
                desc="입력한 정보를 확인하고 등록해주세요."
              />

              <div className="space-y-3">
                <SummaryRow label="상품명" value={name} />
                <SummaryRow
                  label="카테고리"
                  value={[
                    categories.find((c) => String(c.id) === mainCategory)?.name,
                    selectedMainCat?.children.find(
                      (c) => String(c.id) === subCategory,
                    )?.name,
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
                <SummaryRow
                  label="대표 이미지"
                  value={thumbnail?.uploaded ? "업로드 완료" : "없음"}
                />
                <SummaryRow
                  label="추가 이미지"
                  value={`${detailImages.filter((i) => i.uploaded).length}장`}
                />
                <SummaryRow
                  label="재고/옵션"
                  value={
                    useOptions
                      ? `옵션 ${optionGroups.filter((g) => g.name.trim()).length}개 분류 · 품목 ${variants.length}개`
                      : `단일 재고 ${Number(stock).toLocaleString()}개`
                  }
                />
                {detail && (
                  <SummaryRow
                    label="상세 설명"
                    value={
                      detail.length > 50 ? detail.slice(0, 50) + "…" : detail
                    }
                  />
                )}
              </div>

              {/* 등록 버튼 */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-drac-pink to-drac-purple text-drac-bg rounded-2xl font-black text-base hover:opacity-90 transition-all shadow-lg shadow-drac-purple/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-drac-bg border-t-transparent rounded-full animate-spin" />
                    등록 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={17} /> 상품 등록 완료
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── 네비게이션 버튼 ───────────────────────────────── */}
          {step < 3 && (
            <div
              className={`mt-8 flex ${step === 0 ? "justify-end" : "justify-between"}`}
            >
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

        {/* 단계 힌트 */}
        <p className="text-center text-xs text-drac-comment mt-4">
          {step + 1} / {STEPS.length} 단계
        </p>
      </main>
    </div>
  );
}

// ── 공통 컴포넌트 ────────────────────────────────────────────────────
function StepHeader({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
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

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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
      <span className="text-xs font-bold text-drac-comment shrink-0">
        {label}
      </span>
      <span className="text-sm text-drac-fg text-right">{value || "—"}</span>
    </div>
  );
}

const inputCls =
  "w-full px-4 py-3 bg-drac-current border border-drac-comment/60 rounded-xl outline-none focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg text-sm";

const selectCls =
  "w-full px-3 py-3 bg-drac-current border border-drac-comment/60 rounded-xl outline-none focus:border-drac-pink focus:ring-2 focus:ring-drac-purple/10 transition-all text-drac-fg text-sm cursor-pointer";
