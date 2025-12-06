import React from "react";
import {
  Card,
  CardBody,
  Input,
  Button,
  Chip,
  ScrollShadow,
  Progress,
  Tabs,
  Tab,
  Textarea,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";
import { knowledgeApi, type ImportProgress, type KnowledgeSummary } from "../lib/api";

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

type ImportSource = "url" | "csv" | "json" | "shopify";

const importSources: { key: ImportSource; label: string; description: string; icon: string; color: string }[] = [
  {
    key: "url",
    label: "URL Scrape",
    description: "サイトから自動取得",
    icon: "lucide:globe",
    color: "text-blue-500",
  },
  {
    key: "csv",
    label: "CSV Upload",
    description: "CSVファイル",
    icon: "lucide:file-spreadsheet",
    color: "text-green-500",
  },
  {
    key: "json",
    label: "JSON Import",
    description: "JSONデータ",
    icon: "lucide:file-json",
    color: "text-amber-500",
  },
  {
    key: "shopify",
    label: "Shopify API",
    description: "Shopify連携",
    icon: "lucide:shopping-bag",
    color: "text-emerald-500",
  },
];

interface ECContextFormProps {
  onContextGenerated?: (context: ContextResult) => void;
  onContextApplied?: (context: ContextResult) => void;
}

export const ECContextForm = ({ onContextGenerated, onContextApplied }: ECContextFormProps) => {
  // Import source selection
  const [importSource, setImportSource] = React.useState<ImportSource>("url");

  // URL import state
  const [url, setUrl] = React.useState("");

  // CSV/JSON file upload state
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [jsonText, setJsonText] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Shopify config state
  const [shopifyDomain, setShopifyDomain] = React.useState("");
  const [shopifyToken, setShopifyToken] = React.useState("");
  const [shopifyLimit, setShopifyLimit] = React.useState(50);

  // Common state
  const [clearExisting, setClearExisting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [applyStatus, setApplyStatus] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ContextResult | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Import progress state
  const [currentProgress, setCurrentProgress] = React.useState<ImportProgress | null>(null);
  const [summary, setSummary] = React.useState<KnowledgeSummary | null>(null);

  // Load summary on mount
  React.useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const data = await knowledgeApi.getSummary();
      if (data.success) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to load summary:", err);
    }
  };

  // Poll for progress updates
  React.useEffect(() => {
    if (!currentProgress || currentProgress.status === "completed" || currentProgress.status === "failed") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const data = await knowledgeApi.getProgress(currentProgress.id);
        if (data.success) {
          setCurrentProgress(data.progress);
          if (data.progress.status === "completed" || data.progress.status === "failed") {
            setIsLoading(false);
            loadSummary();
          }
        }
      } catch (err) {
        console.error("Failed to get progress:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentProgress]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);
    setCurrentProgress(null);

    try {
      let progressId: string | null = null;

      switch (importSource) {
        case "url": {
          if (!url.trim()) {
            throw new Error("URLを入力してください");
          }
          try {
            new URL(url);
          } catch {
            throw new Error("有効なURLを入力してください");
          }
          const urlResult = await knowledgeApi.importURL(url, 50, clearExisting);
          if (urlResult.success) {
            progressId = urlResult.progressId;
            // URL import is synchronous, so we have the result immediately
            setResult({
              success: true,
              storeContext: urlResult.storeContext as StoreContext,
              productsCount: urlResult.productsCount,
              products: urlResult.products,
            });
            onContextGenerated?.({
              success: true,
              storeContext: urlResult.storeContext as StoreContext,
              productsCount: urlResult.productsCount,
              products: urlResult.products,
            });
            setIsLoading(false);
            loadSummary();
          }
          break;
        }

        case "csv": {
          if (!selectedFile) {
            throw new Error("CSVファイルを選択してください");
          }
          const csvResult = await knowledgeApi.importCSV(selectedFile, clearExisting);
          if (csvResult.success) {
            progressId = csvResult.progressId;
          }
          break;
        }

        case "json": {
          if (!jsonText.trim()) {
            throw new Error("JSONデータを入力してください");
          }
          let jsonData;
          try {
            jsonData = JSON.parse(jsonText);
          } catch {
            throw new Error("有効なJSONを入力してください");
          }
          const jsonResult = await knowledgeApi.importJSON(jsonData, clearExisting);
          if (jsonResult.success) {
            progressId = jsonResult.progressId;
          }
          break;
        }

        case "shopify": {
          if (!shopifyDomain.trim() || !shopifyToken.trim()) {
            throw new Error("ShopifyドメインとAccess Tokenを入力してください");
          }
          const shopifyResult = await knowledgeApi.importShopify({
            shopDomain: shopifyDomain,
            accessToken: shopifyToken,
            limit: shopifyLimit,
            clearExisting,
          });
          if (shopifyResult.success) {
            progressId = shopifyResult.progressId;
          }
          break;
        }
      }

      // Start polling for progress if we have a progressId
      if (progressId && importSource !== "url") {
        const progressData = await knowledgeApi.getProgress(progressId);
        if (progressData.success) {
          setCurrentProgress(progressData.progress);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
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

  const getProgressPercent = () => {
    if (!currentProgress || currentProgress.totalItems === 0) return 0;
    return Math.round((currentProgress.processedItems / currentProgress.totalItems) * 100);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Knowledge Import
        </h2>
        <p className="text-sm text-slate-500">
          商品データ、FAQ、ブランドトーンをインポートしてAIに学習させます
        </p>
      </div>

      {/* Summary Card */}
      {summary && (
        <Card className="border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-sm">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl bg-slate-900 text-white">
                  <Icon icon="lucide:database" className="text-xl" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{summary.store.name || "未設定"}</p>
                  <p className="text-xs text-slate-500">Current Knowledge Base</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-900">{summary.products.total}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Products</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-900">{summary.faqs.total}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">FAQs</p>
                </div>
                {summary.products.priceStats && (
                  <div className="text-center">
                    <p className="text-xl font-bold text-indigo-600">¥{summary.products.priceStats.avg.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Price</p>
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Main Input Card */}
      <Card className="border border-slate-200 bg-white shadow-sm overflow-visible">
        <CardBody className="p-8 space-y-8">

          {/* 1. Import Source Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
              1. Select Import Source
            </label>
            <ScrollShadow orientation="horizontal" className="pb-4 -mx-4 px-4">
              <div className="flex gap-4 min-w-max">
                {importSources.map((source) => {
                  const isActive = importSource === source.key;
                  return (
                    <button
                      key={source.key}
                      type="button"
                      onClick={() => {
                        setImportSource(source.key);
                        setError(null);
                        setResult(null);
                      }}
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
                          icon={source.icon}
                          className={`text-2xl ${isActive ? source.color : "text-slate-400"}`}
                        />
                      </div>
                      <div className="text-center space-y-0.5">
                        <p className={`text-sm font-bold ${isActive ? "text-slate-900" : "text-slate-600"}`}>
                          {source.label}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {source.description}
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

          {/* 2. Source-specific Input */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
              2. Configure Import
            </label>

            <Tabs
              selectedKey={importSource}
              onSelectionChange={(key) => setImportSource(key as ImportSource)}
              classNames={{
                tabList: "hidden",
                panel: "p-0",
              }}
            >
              {/* URL Input */}
              <Tab key="url" title="URL">
                <div className="space-y-3">
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
                    />
                  </div>
                  <p className="text-xs text-slate-400 ml-1">
                    ECサイトのURLを入力すると、商品情報を自動でスクレイピングします
                  </p>
                </div>
              </Tab>

              {/* CSV Upload */}
              <Tab key="csv" title="CSV">
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                      ${selectedFile
                        ? "border-green-300 bg-green-50"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                      }
                    `}
                  >
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <Icon icon="lucide:file-check" className="text-2xl text-green-500" />
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-900">{selectedFile.name}</p>
                          <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          className="ml-2"
                          onPress={() => setSelectedFile(null)}
                        >
                          <Icon icon="lucide:x" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Icon icon="lucide:upload-cloud" className="text-4xl text-slate-300 mx-auto" />
                        <p className="text-sm font-medium text-slate-600">CSVファイルをドラッグ&ドロップ</p>
                        <p className="text-xs text-slate-400">または クリックして選択</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 ml-1">
                    対応カラム: name, price, description, image_url, product_url, category
                  </p>
                </div>
              </Tab>

              {/* JSON Input */}
              <Tab key="json" title="JSON">
                <div className="space-y-3">
                  <Textarea
                    placeholder={`{
  "products": [
    { "name": "商品名", "price": 1000, "description": "説明" }
  ],
  "faqs": [
    { "question": "質問", "answer": "回答" }
  ],
  "storeInfo": {
    "name": "ストア名",
    "description": "説明"
  }
}`}
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    minRows={8}
                    classNames={{
                      input: "font-mono text-sm",
                      inputWrapper: "bg-slate-50 border-2 border-slate-200",
                    }}
                    isDisabled={isLoading}
                  />
                  <p className="text-xs text-slate-400 ml-1">
                    商品、FAQ、ストア情報をJSON形式で一括インポート
                  </p>
                </div>
              </Tab>

              {/* Shopify Config */}
              <Tab key="shopify" title="Shopify">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Shop Domain"
                      placeholder="your-store.myshopify.com"
                      value={shopifyDomain}
                      onChange={(e) => setShopifyDomain(e.target.value)}
                      startContent={<Icon icon="lucide:store" className="text-slate-400" />}
                      isDisabled={isLoading}
                    />
                    <Input
                      label="Access Token"
                      placeholder="shpat_xxxxx"
                      type="password"
                      value={shopifyToken}
                      onChange={(e) => setShopifyToken(e.target.value)}
                      startContent={<Icon icon="lucide:key" className="text-slate-400" />}
                      isDisabled={isLoading}
                    />
                  </div>
                  <Input
                    label="Max Products"
                    type="number"
                    value={shopifyLimit.toString()}
                    onChange={(e) => setShopifyLimit(parseInt(e.target.value) || 50)}
                    className="max-w-[200px]"
                    isDisabled={isLoading}
                  />
                  <p className="text-xs text-slate-400">
                    Shopify Admin APIを使用して商品を直接取得します
                  </p>
                </div>
              </Tab>
            </Tabs>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={clearExisting}
                onChange={(e) => setClearExisting(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-600">既存データをクリア</span>
            </label>
          </div>

          {/* Submit Button */}
          <Button
            size="lg"
            className="w-full bg-slate-900 text-white font-bold shadow-lg shadow-slate-900/20"
            onPress={handleSubmit}
            isLoading={isLoading}
            isDisabled={isLoading}
          >
            {isLoading ? "Importing..." : "Start Import"}
          </Button>

          {/* Progress Indicator */}
          <AnimatePresence>
            {currentProgress && currentProgress.status === "processing" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    {currentProgress.source.type.toUpperCase()} Import: {currentProgress.source.name}
                  </span>
                  <span className="font-mono text-slate-500">
                    {currentProgress.processedItems} / {currentProgress.totalItems}
                  </span>
                </div>
                <Progress
                  value={getProgressPercent()}
                  color="primary"
                  className="h-2"
                />
                {currentProgress.errors.length > 0 && (
                  <div className="text-xs text-amber-600">
                    {currentProgress.failedItems} errors
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

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

          {/* Completed Progress */}
          <AnimatePresence>
            {currentProgress && currentProgress.status === "completed" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
                  <Icon icon="lucide:check-circle" />
                  <span className="text-sm font-medium">
                    インポート完了: {currentProgress.successItems}件の商品を取り込みました
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardBody>
      </Card>

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
                  setSelectedFile(null);
                  setJsonText("");
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
            {result.products.length > 0 && (
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
            )}

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
