/**
 * Knowledge Base Service
 * FAQ・ナレッジベース管理
 */

import { v4 as uuidv4 } from 'uuid';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface StoreInfo {
  name: string;
  description?: string;
  businessHours?: {
    weekdays: string;
    weekends: string;
    holidays: string;
  };
  shipping?: {
    domestic: string;
    international?: string;
    freeShippingThreshold?: number;
  };
  returns?: {
    policy: string;
    period: string;
    conditions: string[];
  };
  contact?: {
    email?: string;
    phone?: string;
    chat?: string;
  };
  paymentMethods?: string[];
}

class KnowledgeStore {
  private faqs: Map<string, FAQ> = new Map();
  private storeInfo: StoreInfo = {
    name: 'Sample Store',
  };

  constructor() {
    // デフォルトFAQを追加
    this.addDefaultFAQs();
  }

  private addDefaultFAQs(): void {
    const defaultFAQs: Omit<FAQ, 'id' | 'createdAt'>[] = [
      {
        question: '送料はいくらですか？',
        answer: '5,000円以上のご購入で送料無料です。5,000円未満の場合は全国一律500円となります。',
        category: '配送',
        keywords: ['送料', '配送料', '無料', '送料無料'],
        isActive: true,
      },
      {
        question: '返品はできますか？',
        answer: '商品到着後7日以内であれば、未使用・未開封の商品に限り返品を承ります。お客様都合の返品の場合、返送料はお客様負担となります。',
        category: '返品・交換',
        keywords: ['返品', '返金', '交換', 'キャンセル'],
        isActive: true,
      },
      {
        question: '支払い方法は何がありますか？',
        answer: 'クレジットカード（VISA、Mastercard、JCB、AMEX）、PayPay、コンビニ払い、銀行振込をご利用いただけます。',
        category: '支払い',
        keywords: ['支払い', '決済', 'クレジットカード', 'PayPay', 'コンビニ'],
        isActive: true,
      },
      {
        question: '届くまでどのくらいかかりますか？',
        answer: '通常、ご注文から2-3営業日でお届けいたします。お届け日時のご指定も承っております。',
        category: '配送',
        keywords: ['届く', '配達', '日数', 'いつ届く', '配送日'],
        isActive: true,
      },
      {
        question: 'ギフトラッピングはできますか？',
        answer: 'はい、承っております。ご注文時にギフトラッピングオプションをお選びください。料金は300円です。',
        category: 'サービス',
        keywords: ['ギフト', 'ラッピング', 'プレゼント', '包装'],
        isActive: true,
      },
      {
        question: '在庫がない商品は入荷しますか？',
        answer: '人気商品は随時再入荷を行っております。商品ページから「再入荷通知」にご登録いただくと、入荷時にメールでお知らせいたします。',
        category: '在庫',
        keywords: ['在庫', '入荷', '再入荷', '売り切れ'],
        isActive: true,
      },
    ];

    for (const faq of defaultFAQs) {
      this.addFAQ(faq);
    }
  }

  /**
   * FAQを追加
   */
  addFAQ(data: Omit<FAQ, 'id' | 'createdAt'>): FAQ {
    const faq: FAQ = {
      id: uuidv4(),
      ...data,
      createdAt: new Date(),
    };
    this.faqs.set(faq.id, faq);
    return faq;
  }

  /**
   * FAQを検索
   */
  searchFAQ(query: string): FAQ[] {
    const lowerQuery = query.toLowerCase();
    const results: { faq: FAQ; score: number }[] = [];

    for (const faq of this.faqs.values()) {
      if (!faq.isActive) continue;

      let score = 0;

      // 質問文との一致
      if (faq.question.toLowerCase().includes(lowerQuery)) {
        score += 10;
      }

      // キーワードとの一致
      for (const keyword of faq.keywords) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          score += 5;
        }
        if (keyword.toLowerCase().includes(lowerQuery)) {
          score += 3;
        }
      }

      // カテゴリとの一致
      if (faq.category.toLowerCase().includes(lowerQuery)) {
        score += 2;
      }

      if (score > 0) {
        results.push({ faq, score });
      }
    }

    // スコア順にソート
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, 5).map((r) => r.faq);
  }

  /**
   * 全FAQを取得
   */
  getAllFAQs(): FAQ[] {
    return Array.from(this.faqs.values()).filter((f) => f.isActive);
  }

  /**
   * カテゴリ別FAQを取得
   */
  getFAQsByCategory(category: string): FAQ[] {
    return this.getAllFAQs().filter((f) => f.category === category);
  }

  /**
   * ストア情報を設定
   */
  setStoreInfo(info: StoreInfo): void {
    this.storeInfo = info;
  }

  /**
   * ストア情報を取得
   */
  getStoreInfo(): StoreInfo {
    return this.storeInfo;
  }

  /**
   * ストア情報をLLM用に整形
   */
  getStoreInfoContext(): string {
    const info = this.storeInfo;
    let context = `【ストア情報】\n店舗名: ${info.name}\n`;

    if (info.description) {
      context += `説明: ${info.description}\n`;
    }

    if (info.businessHours) {
      context += `\n【営業時間】\n`;
      context += `平日: ${info.businessHours.weekdays}\n`;
      context += `土日: ${info.businessHours.weekends}\n`;
      if (info.businessHours.holidays) {
        context += `祝日: ${info.businessHours.holidays}\n`;
      }
    }

    if (info.shipping) {
      context += `\n【配送情報】\n`;
      context += `国内配送: ${info.shipping.domestic}\n`;
      if (info.shipping.international) {
        context += `海外配送: ${info.shipping.international}\n`;
      }
      if (info.shipping.freeShippingThreshold) {
        context += `送料無料条件: ¥${info.shipping.freeShippingThreshold.toLocaleString()}以上\n`;
      }
    }

    if (info.returns) {
      context += `\n【返品ポリシー】\n`;
      context += `${info.returns.policy}\n`;
      context += `返品期間: ${info.returns.period}\n`;
    }

    if (info.paymentMethods && info.paymentMethods.length > 0) {
      context += `\n【支払い方法】\n${info.paymentMethods.join('、')}\n`;
    }

    if (info.contact) {
      context += `\n【お問い合わせ】\n`;
      if (info.contact.email) context += `メール: ${info.contact.email}\n`;
      if (info.contact.phone) context += `電話: ${info.contact.phone}\n`;
    }

    return context;
  }

  /**
   * FAQ検索結果をLLM用に整形
   */
  formatFAQResults(faqs: FAQ[]): string {
    if (faqs.length === 0) {
      return '該当するFAQが見つかりませんでした。';
    }

    let context = `【FAQ検索結果】${faqs.length}件\n\n`;
    for (const faq of faqs) {
      context += `Q: ${faq.question}\n`;
      context += `A: ${faq.answer}\n\n`;
    }

    return context;
  }
}

export const knowledgeStore = new KnowledgeStore();
