import React from "react";
import {
  Card,
  CardBody,
  Input,
  Button,
  Select,
  SelectItem,
  Spinner,
  Chip,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";

interface StoreContext {
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

interface ContextResult {
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

const storeTypes: { key: StoreType; label: string; description: string; icon: string }[] = [
  {
    key: "general_ec",
    label: "General EC",
    description: "総合ECサイト",
    icon: "lucide:store",
  },
  {
    key: "fashion",
    label: "Fashion",
    description: "アパレル・ファッション",
    icon: "lucide:shirt",
  },
  {
    key: "electronics",
    label: "Electronics",
    description: "家電・電子機器",
    icon: "lucide:cpu",
  },
  {
    key: "books_media",
    label: "Books & Media",
    description: "書籍・メディア",
    icon: "lucide:book-open",
  },
  {
    key: "b2b_catalog",
    label: "B2B Catalog",
    description: "法人向けカタログ",
    icon: "lucide:building-2",
  },
];

interface ECContextFormProps {
  onContextGenerated?: (context: ContextResult) => void;
}

export const ECContextForm = ({ onContextGenerated }: ECContextFormProps) => {
  const [url, setUrl] = React.useState("");
  const [storeType, setStoreType] = React.useState<StoreType>("general_ec");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ContextResult | null>(null);

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

  const formatPrice = (price: number) => {
    if (price === 0) return "価格未取得";
    return `¥${price.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-white tracking-tight">
          EC Site Context Engineering
        </h2>
        <p className="text-sm text-gray-400">
          ECサイトURLから商品情報を取得し、AIエージェントのコンテキストを自動生成
        </p>
      </div>

      {/* Input Form */}
      <Card className="border border-gray-800 bg-gray-900/80">
        <CardBody className="p-6 space-y-6">
          {/* URL Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              EC Site URL
            </label>
            <Input
              placeholder="https://example.com/products"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              startContent={
                <Icon icon="lucide:link" className="text-gray-500" />
              }
              classNames={{
                input: "bg-transparent text-white",
                inputWrapper: "bg-gray-800/50 border-gray-700 hover:border-blue-500",
              }}
              isDisabled={isLoading}
            />
          </div>

          {/* Store Type Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Store Type
            </label>
            <Select
              selectedKeys={[storeType]}
              onChange={(e) => setStoreType(e.target.value as StoreType)}
              classNames={{
                trigger: "bg-gray-800/50 border-gray-700 hover:border-blue-500",
                value: "text-white",
              }}
              isDisabled={isLoading}
            >
              {storeTypes.map((type) => (
                <SelectItem key={type.key} textValue={type.label}>
                  <div className="flex items-center gap-3">
                    <Icon icon={type.icon} className="text-lg text-gray-400" />
                    <div>
                      <p className="text-white">{type.label}</p>
                      <p className="text-xs text-gray-500">{type.description}</p>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
              >
                <Icon icon="lucide:alert-circle" className="text-red-400" />
                <span className="text-sm text-red-400">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <Button
            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
            onPress={handleSubmit}
            isLoading={isLoading}
            startContent={
              !isLoading && <Icon icon="lucide:sparkles" className="text-lg" />
            }
          >
            {isLoading ? "コンテキスト生成中..." : "Generate Context"}
          </Button>
        </CardBody>
      </Card>

      {/* Loading State */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border border-gray-800 bg-gray-900/80">
              <CardBody className="p-8 flex flex-col items-center gap-4">
                <Spinner size="lg" color="primary" />
                <div className="text-center space-y-1">
                  <p className="text-white font-medium">サイトを解析中...</p>
                  <p className="text-sm text-gray-500">
                    商品情報の取得とコンテキスト生成を行っています
                  </p>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Store Context Summary */}
            <Card className="border border-blue-500/30 bg-blue-950/20">
              <CardBody className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                    <Icon icon="lucide:store" className="text-2xl text-blue-400" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-lg font-semibold text-white">
                      {result.storeContext.storeName}
                    </h3>
                    {result.storeContext.storeDescription && (
                      <p className="text-sm text-gray-400">
                        {result.storeContext.storeDescription}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Chip size="sm" variant="flat" className="bg-blue-500/20 text-blue-300">
                        <Icon icon="lucide:package" className="mr-1" />
                        {result.productsCount} 商品
                      </Chip>
                      {result.storeContext.categories?.map((cat, i) => (
                        <Chip
                          key={i}
                          size="sm"
                          variant="flat"
                          className="bg-gray-800 text-gray-300"
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
              <h4 className="text-sm font-medium text-gray-400 px-1">
                取得商品 (先頭10件)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {result.products.slice(0, 10).map((product) => (
                  <Card
                    key={product.id}
                    className="border border-gray-800 bg-gray-900/50 hover:border-gray-700 transition-colors"
                  >
                    <CardBody className="p-4">
                      <div className="flex gap-3">
                        {product.imageUrl ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <Icon
                              icon="lucide:image-off"
                              className="text-2xl text-gray-600"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                            {product.description || "説明なし"}
                          </p>
                          <p className="text-sm font-semibold text-blue-400 mt-2">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>

            {/* Prompt Stats */}
            {result.samplePrompt && (
              <Card className="border border-gray-800 bg-gray-900/50">
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon icon="lucide:file-text" className="text-gray-400" />
                      <span className="text-sm font-medium text-white">
                        生成プロンプト
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>{result.samplePrompt.stats.characterCount} 文字</span>
                      <span>{result.samplePrompt.stats.lineCount} 行</span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="flat"
                className="flex-1 border border-gray-700 bg-gray-800/50 text-white"
                startContent={<Icon icon="lucide:refresh-cw" />}
                onPress={() => {
                  setResult(null);
                  setUrl("");
                }}
              >
                新しいサイト
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                startContent={<Icon icon="lucide:check" />}
              >
                コンテキストを適用
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ECContextForm;
