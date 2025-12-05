import React from "react";
import {
  Card,
  CardBody,
  Input,
  Button,
  Spinner,
  Chip,
  ScrollShadow,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";

export interface StoreContext {
  storeName: string;
  storeDescription?: string;
  storeUrl?: string;
  categories?: string[];
  brandVoice?: {
    tone: string;
    keywords: string[];
    avoidWords: string[];
  };
  policies?: {
    shipping?: string;
    returns?: string;
    support?: string;
  };
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  productUrl: string;
}

export interface ContextResult {
  success: boolean;
  storeContext: StoreContext;
  productsCount: number;
  products: Product[];
  samplePrompt?: {
    prompt: string;
    stats: {
      characterCount: number;
      lineCount: number;
    };
  };
}

type StoreType = "general_ec" | "fashion" | "electronics" | "books_media" | "b2b_catalog";

const storeTypes: { key: StoreType; label: string; description: string; icon: string; color: string }[] = [
  {
    key: "general_ec",
    label: "General EC",
    description: "総合ECサイト",
    icon: "lucide:store",
    color: "text-blue-500",
  },
  {
    key: "fashion",
    label: "Fashion",
    description: "アパレル",
    icon: "lucide:shirt",
    color: "text-pink-500",
  },
  {
    key: "electronics",
    label: "Electronics",
    description: "家電・ガジェット",
    icon: "lucide:cpu",
    color: "text-cyan-500",
  },
  {
    key: "books_media",
    label: "Media",
    description: "書籍・音楽",
    icon: "lucide:book-open",
    color: "text-amber-500",
  },
  {
    key: "b2b_catalog",
    label: "B2B / Catalog",
    description: "卸・カタログ",
    icon: "lucide:building-2",
    color: "text-slate-500",
  },
];

const exampleUrls = [
  "https://example.com/products",
  "https://example.com/collections/new",
  "https://example.com/shop",
];

interface ECContextFormProps {
  onContextGenerated?: (context: ContextResult) => void;
  onContextApplied?: (context: ContextResult) => void;
}

export const ECContextForm = ({ onContextGenerated, onContextApplied }: ECContextFormProps) => {
  const [url, setUrl] = React.useState("");
  const [storeType, setStoreType] = React.useState<StoreType>("general_ec");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [applyStatus, setApplyStatus] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ContextResult | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleSubmit = async () => {
    if (!url.trim()) {
      setError("URLを入力してください");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("有効なURLを入力してください");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/prompts/from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, maxProducts: 50 }),
      });

      if (!response.ok) {
        throw new Error("コンテキスト生成に失敗しました");
      }

      const data = (await response.json()) as ContextResult;
      setResult(data);
      onContextGenerated?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!result?.storeContext) return;
    setIsApplying(true);
    setApplyStatus(null);
    try {
      const response = await fetch("/api/prompts/store-context", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.storeContext),
      });

      if (!response.ok) {
        throw new Error("ストアコンテキストの保存に失敗しました");
      }

      setApplyStatus("ストアコンテキストを保存しました。ボイス/チャットに反映されます。");
      onContextApplied?.(result);
    } catch (err) {
      setApplyStatus(err instanceof Error ? err.message : "保存中にエラーが発生しました");
    } finally {
      setIsApplying(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "価格未取得";
    return `¥${price.toLocaleString()}`;
  };

  const copyPrompt = async () => {
    if (!result?.samplePrompt) return;
    try {
      await navigator.clipboard.writeText(result.samplePrompt.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.error("Failed to copy prompt", err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Knowledge Import
        </h2>
        <p className="text-sm text-slate-500">
          既存のECサイトから商品データとブランドトーンを自動学習します
        </p>
      </div>

      {/* Main Input Card */}
      <Card className="border border-slate-200 bg-white shadow-sm overflow-visible">
        <CardBody className="p-8 space-y-8">
          
          {/* 1. Store Type Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
              1. Select Store Type
            </label>
            <ScrollShadow orientation="horizontal" className="pb-4 -mx-4 px-4">
              <div className="flex gap-4 min-w-max">
                {storeTypes.map((type) => {
                  const isActive = storeType === type.key;
                  return (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => setStoreType(type.key)}
                      className={`
                        group relative flex flex-col items-center gap-3 rounded-2xl border-2 p-4 w-32 transition-all duration-200
                        ${isActive 
                          ? "border-slate-900 bg-slate-50 shadow-md scale-105 z-10" 
                          : "border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm"
                        }
                      `}
                    >
                      <div
                        className={`
                          flex h-12 w-12 items-center justify-center rounded-xl transition-colors
                          ${isActive ? "bg-white shadow-sm" : "bg-slate-50 group-hover:bg-slate-100"}
                        `}
                      >
                        <Icon
                          icon={type.icon}
                          className={`text-2xl ${isActive ? type.color : "text-slate-400"}`}
                        />
                      </div>
                      <div className="text-center space-y-0.5">
                        <p className={`text-sm font-bold ${isActive ? "text-slate-900" : "text-slate-600"}`}>
                          {type.label}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {type.description}
                        </p>
                      </div>
                      {isActive && (
                        <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white">
                          <Icon icon="lucide:check" className="text-[10px]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollShadow>
          </div>

          {/* 2. URL Input */}
          <div className="space-y-3">
             <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
              2. Enter Site URL
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20">
                <Icon icon="lucide:globe" className="text-slate-400" />
              </div>
              <Input
                placeholder="https://your-store.com/products"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                size="lg"
                classNames={{
                  input: "pl-8 text-slate-900 placeholder:text-slate-400",
                  inputWrapper: "bg-slate-50 border-2 border-slate-200 hover:border-slate-300 group-focus-within:border-slate-900 group-focus-within:bg-white shadow-inner h-14 rounded-xl transition-all",
                }}
                isDisabled={isLoading}
                endContent={
                  <Button
                    size="sm"
                    className="bg-slate-900 text-white font-medium shadow-lg shadow-slate-900/20 min-w-[100px]"
                    onPress={handleSubmit}
                    isLoading={isLoading}
                  >
                    {isLoading ? "Analyzing..." : "Start Learning"}
                  </Button>
                }
              />
            </div>
            
            {/* Quick Examples */}
            <div className="flex flex-wrap items-center gap-2 pl-1">
              <span className="text-xs font-medium text-slate-400">Try:</span>
              {exampleUrls.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-900 hover:underline underline-offset-2 transition-colors"
                  onClick={() => {
                    setUrl(example);
                    setError(null);
                  }}
                >
                  {example.replace("https://", "")}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600">
                  <Icon icon="lucide:alert-circle" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardBody>
      </Card>

      {/* Loading State */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex justify-center py-12"
          >
             <div className="relative flex flex-col items-center gap-6">
                <div className="relative h-20 w-20">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-slate-900 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon icon="lucide:brain-circuit" className="text-2xl text-slate-900 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-lg font-semibold text-slate-900">Analyzing Store Structure...</p>
                  <p className="text-sm text-slate-500">Extracting products, categories, and brand voice</p>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-bold text-slate-900">Analysis Results</h3>
              <Button
                size="sm"
                variant="light"
                color="danger"
                startContent={<Icon icon="lucide:trash-2" />}
                onPress={() => {
                  setResult(null);
                  setUrl("");
                }}
              >
                Clear Results
              </Button>
            </div>

            {/* Store Context Summary */}
            <Card className="border border-slate-200 bg-white shadow-sm">
              <CardBody className="p-6">
                <div className="flex items-start gap-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/20">
                    <Icon icon="lucide:store" className="text-3xl" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {result.storeContext.storeName}
                      </h3>
                      {result.storeContext.storeDescription && (
                        <p className="text-sm text-slate-500 mt-1">
                          {result.storeContext.storeDescription}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Chip size="sm" variant="flat" className="bg-slate-100 text-slate-700 font-medium">
                        <Icon icon="lucide:package" className="mr-1 text-sm" />
                        {result.productsCount} Products
                      </Chip>
                      {result.storeContext.categories?.map((cat, i) => (
                        <Chip
                          key={i}
                          size="sm"
                          variant="flat"
                          className="bg-indigo-50 text-indigo-600 border border-indigo-100"
                        >
                          {cat}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Products Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                Captured Products (Preview)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {result.products.slice(0, 10).map((product) => (
                  <motion.div
                    key={product.id}
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Card className="h-full border border-slate-200 bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300">
                      <CardBody className="p-0">
                        <div className="flex h-full">
                          <div className="w-24 h-24 shrink-0 bg-slate-50 border-r border-slate-100 p-2 flex items-center justify-center">
                             {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-full h-full object-contain mix-blend-multiply"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <Icon icon="lucide:image" className="text-slate-300 text-2xl" />
                              )}
                          </div>
                          <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {product.name}
                              </p>
                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                {product.description || "No description available"}
                              </p>
                            </div>
                            <p className="text-sm font-bold text-indigo-600 mt-2">
                              {formatPrice(product.price)}
                            </p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Prompt Stats */}
            {result.samplePrompt && (
              <Card className="border border-slate-200 bg-slate-50 overflow-hidden">
                <div className="border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-indigo-100 text-indigo-600">
                      <Icon icon="lucide:sparkles" className="text-sm" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">Generated System Prompt</span>
                  </div>
                  <Button
                    size="sm"
                    variant="flat"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700"
                    onPress={copyPrompt}
                  >
                    {copied ? <Icon icon="lucide:check" /> : <Icon icon="lucide:copy" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <CardBody className="p-0">
                   <div className="max-h-60 overflow-y-auto p-4 font-mono text-xs leading-relaxed text-slate-600 bg-slate-50/50">
                      {result.samplePrompt.prompt}
                   </div>
                </CardBody>
                <div className="border-t border-slate-200 bg-white px-4 py-2 flex gap-4 text-[10px] text-slate-400 font-mono">
                  <span>{result.samplePrompt.stats.characterCount} chars</span>
                  <span>{result.samplePrompt.stats.lineCount} lines</span>
                  <span className="ml-auto">Model: gpt-4-turbo-preview</span>
                </div>
              </Card>
            )}

            {/* Final Action */}
            <div className="space-y-3">
              {applyStatus && (
                <div
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                    applyStatus.includes("失敗") || applyStatus.includes("エラー")
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <Icon
                    icon={
                      applyStatus.includes("失敗") || applyStatus.includes("エラー")
                        ? "lucide:alert-triangle"
                        : "lucide:check"
                    }
                  />
                  <span>{applyStatus}</span>
                </div>
              )}
              <Button
                size="lg"
                className="w-full bg-slate-900 text-white font-bold text-medium shadow-xl shadow-slate-900/20 hover:opacity-90 hover:scale-[1.01] transition-all disabled:opacity-60"
                startContent={<Icon icon="lucide:check-circle" />}
                isDisabled={!result}
                isLoading={isApplying}
                onPress={handleApply}
              >
                {isApplying ? "Applying..." : "Apply Knowledge to Agent"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ECContextForm;
