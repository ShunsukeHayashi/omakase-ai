# 200エージェント API Keys展開基盤設計

## Issue: #841

## 1. 概要

200エージェント規模でのAPIキー管理・配布・ローテーション基盤の設計。
セキュリティ、スケーラビリティ、運用効率を実現する。

---

## 2. 要件

### 2.1 機能要件

| 要件 | 説明 |
|------|------|
| キー配布 | 200+ エージェントへの安全な配布 |
| ローテーション | 定期的な自動キー更新 |
| Rate Limit管理 | API使用量の分散・制御 |
| 監査 | 使用履歴の追跡・ログ |
| 緊急無効化 | 漏洩時の即座無効化 |

### 2.2 非機能要件

| 要件 | 基準 |
|------|------|
| 可用性 | 99.99% |
| レイテンシ | キー取得 ≤100ms |
| セキュリティ | 暗号化at-rest/in-transit |
| スケール | 500エージェントまで拡張可能 |

---

## 3. アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     API Keys Management Platform                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      Key Vault (HashiCorp Vault)                    │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │ │
│  │  │ Anthropic    │ │ OpenAI      │ │ Gemini       │               │ │
│  │  │ API Keys     │ │ API Keys    │ │ API Keys     │               │ │
│  │  │ (Pool: 20)   │ │ (Pool: 10)  │ │ (Pool: 10)   │               │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘               │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │ │
│  │  │ GitHub PAT   │ │ AWS Keys    │ │ GCP Service  │               │ │
│  │  │ (Pool: 10)   │ │ (IAM Roles) │ │ Accounts     │               │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘               │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│                                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      Key Distribution Service                       │ │
│  │                                                                      │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │ │
│  │  │ Key Router  │  │Rate Limiter │  │ Audit Log   │                 │ │
│  │  │             │  │             │  │             │                 │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                     │
│              ┌─────────────────────┼─────────────────────┐              │
│              │                     │                     │              │
│              ▼                     ▼                     ▼              │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐     │
│  │   Agent Zone A    │ │   Agent Zone B    │ │   Agent Zone C    │     │
│  │   (50 agents)     │ │   (50 agents)     │ │   (50 agents)     │     │
│  │                   │ │                   │ │                   │     │
│  │ Key Cache (Redis) │ │ Key Cache (Redis) │ │ Key Cache (Redis) │     │
│  └───────────────────┘ └───────────────────┘ └───────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. キープール設計

### 4.1 APIプロバイダー別プール

```yaml
key_pools:
  anthropic:
    provider: Anthropic
    key_count: 20
    rate_limit_per_key: 4000 RPM
    total_capacity: 80000 RPM
    assignment_strategy: round_robin
    rotation_interval: 30d

  openai:
    provider: OpenAI
    key_count: 10
    rate_limit_per_key: 10000 RPM
    total_capacity: 100000 RPM
    assignment_strategy: least_used
    rotation_interval: 30d

  gemini:
    provider: Google
    key_count: 10
    rate_limit_per_key: 1000 RPM
    total_capacity: 10000 RPM
    assignment_strategy: weighted
    rotation_interval: 90d

  github:
    provider: GitHub
    key_count: 10
    rate_limit_per_key: 5000 RPH
    total_capacity: 50000 RPH
    assignment_strategy: affinity
    rotation_interval: 90d
```

### 4.2 キー割り当て戦略

```typescript
enum AssignmentStrategy {
  ROUND_ROBIN = 'round_robin',     // 順番に割り当て
  LEAST_USED = 'least_used',       // 使用量最小に割り当て
  WEIGHTED = 'weighted',           // 重み付き割り当て
  AFFINITY = 'affinity',           // エージェント固定割り当て
  RANDOM = 'random',               // ランダム割り当て
}

class KeyRouter {
  async getKey(agentId: string, provider: string): Promise<ApiKey> {
    const pool = this.pools.get(provider);
    const strategy = pool.assignmentStrategy;

    switch (strategy) {
      case AssignmentStrategy.ROUND_ROBIN:
        return this.roundRobin(pool);

      case AssignmentStrategy.LEAST_USED:
        return this.leastUsed(pool);

      case AssignmentStrategy.AFFINITY:
        return this.affinityBased(pool, agentId);

      default:
        return this.random(pool);
    }
  }

  private async leastUsed(pool: KeyPool): Promise<ApiKey> {
    const usage = await this.getUsageStats(pool);
    return usage.sort((a, b) => a.count - b.count)[0].key;
  }
}
```

---

## 5. セキュリティ設計

### 5.1 暗号化

```yaml
encryption:
  at_rest:
    algorithm: AES-256-GCM
    key_management: HashiCorp Vault Transit
    key_rotation: 90d

  in_transit:
    protocol: TLS 1.3
    certificate: Let's Encrypt (auto-renewal)
    mutual_tls: enabled (agent ↔ service)
```

### 5.2 アクセス制御

```yaml
access_control:
  authentication:
    method: mTLS + JWT
    token_lifetime: 1h
    refresh_enabled: true

  authorization:
    model: RBAC
    roles:
      - name: agent
        permissions: [read_key, report_usage]
      - name: coordinator
        permissions: [read_key, list_keys, rotate_key]
      - name: admin
        permissions: [all]

  network:
    allowed_sources: [vpc_internal, coordinator_ips]
    rate_limit: 100 req/s per agent
```

### 5.3 監査ログ

```typescript
interface AuditEvent {
  timestamp: number;
  eventType: 'key_access' | 'key_rotate' | 'key_revoke';
  agentId: string;
  keyId: string;       // Masked: xxx...xxx
  provider: string;
  sourceIp: string;
  success: boolean;
  errorCode?: string;
}

// 保存先
// - Real-time: CloudWatch Logs
// - Archive: S3 (encrypted, 1年保持)
```

---

## 6. Rate Limit管理

### 6.1 分散Rate Limiter

```typescript
class DistributedRateLimiter {
  private redis: Redis;

  async checkLimit(keyId: string, provider: string): Promise<boolean> {
    const config = this.getProviderConfig(provider);
    const windowKey = `ratelimit:${keyId}:${this.getCurrentWindow()}`;

    const current = await this.redis.incr(windowKey);

    if (current === 1) {
      await this.redis.expire(windowKey, config.windowSeconds);
    }

    return current <= config.maxRequests;
  }

  async getUsage(keyId: string): Promise<UsageStats> {
    const windows = await this.getRecentWindows(keyId, 60);
    return {
      current: windows[0],
      hourly: windows.reduce((a, b) => a + b, 0),
      remaining: this.calculateRemaining(keyId),
    };
  }
}
```

### 6.2 使用量ダッシュボード

```
┌─────────────────────────────────────────────────────────────┐
│                   API Usage Dashboard                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Anthropic API                      OpenAI API               │
│  ┌─────────────────────────┐       ┌─────────────────────────┐│
│  │ Used: 45,000 / 80,000   │       │ Used: 62,000 / 100,000  ││
│  │ ████████████░░░░░ 56%   │       │ ██████████████░░ 62%    ││
│  │                         │       │                         ││
│  │ Keys: 18/20 active      │       │ Keys: 10/10 active      ││
│  └─────────────────────────┘       └─────────────────────────┘│
│                                                              │
│  Key Usage Distribution (Anthropic)                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Key 1: ██████████ 4,200                                  ││
│  │ Key 2: █████████░ 3,800                                  ││
│  │ Key 3: █████████░ 3,750                                  ││
│  │ ...                                                      ││
│  │ Key 20: ███░░░░░░ 1,200                                  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Alerts                                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ⚠️  Key anthropic-15 approaching limit (92%)             ││
│  │ ✓  All GitHub PATs healthy                               ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 7. キーローテーション

### 7.1 自動ローテーション

```yaml
rotation:
  scheduled:
    anthropic:
      interval: 30d
      strategy: rolling
      overlap_period: 24h

    github:
      interval: 90d
      strategy: blue_green
      overlap_period: 1h

  triggered:
    on_exposure:
      action: immediate_revoke
      notify: [security_team, ops_team]

    on_limit_approach:
      threshold: 90%
      action: add_new_key
```

### 7.2 ローテーションフロー

```
┌─────────────────────────────────────────────────────────────┐
│                   Key Rotation Flow                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Generate New Key                                         │
│     └─→ Create in provider console (API/manual)             │
│                                                              │
│  2. Store in Vault                                           │
│     └─→ Encrypt and store with metadata                     │
│                                                              │
│  3. Gradual Rollout                                          │
│     └─→ 10% → 50% → 100% traffic shift                      │
│                                                              │
│  4. Validation                                               │
│     └─→ Monitor error rates, latency                        │
│                                                              │
│  5. Old Key Deprecation                                      │
│     └─→ Mark deprecated, drain connections                  │
│                                                              │
│  6. Old Key Revocation                                       │
│     └─→ Revoke in provider, remove from Vault               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. 障害対応

### 8.1 キー漏洩時

```yaml
incident_response:
  key_exposure:
    detection:
      - github_secret_scanning
      - custom_log_monitoring
      - external_reports

    immediate_actions:
      - revoke_exposed_key
      - rotate_all_pool_keys  # if uncertain
      - notify_security_team
      - block_suspicious_ips

    post_incident:
      - audit_access_logs
      - update_rotation_policy
      - improve_detection
```

### 8.2 Rate Limit超過時

```typescript
class RateLimitHandler {
  async handleLimitExceeded(agentId: string, provider: string): Promise<void> {
    // 1. 別のキーにフォールバック
    const alternativeKey = await this.keyRouter.getAlternativeKey(provider);

    if (alternativeKey) {
      await this.reassignAgent(agentId, alternativeKey);
      return;
    }

    // 2. 別プロバイダーにフォールバック
    const fallbackProvider = this.getFallbackProvider(provider);

    if (fallbackProvider) {
      await this.redirectToProvider(agentId, fallbackProvider);
      return;
    }

    // 3. キューイング
    await this.queueRequest(agentId);
    this.emit('rate_limit_queued', { agentId, provider });
  }
}
```

---

## 9. 実装計画

| Phase | 内容 | 期間 |
|-------|------|------|
| 1 | Vault セットアップ・基本API | Week 1-2 |
| 2 | Key Router・Rate Limiter | Week 3-4 |
| 3 | 監査ログ・ダッシュボード | Week 5-6 |
| 4 | 自動ローテーション | Week 7-8 |
| 5 | 本番展開・200エージェント対応 | Week 9-10 |

---

## 10. コスト見積

| 項目 | 月額見積 |
|------|---------|
| Anthropic API (20 keys) | $10,000-50,000 |
| OpenAI API (10 keys) | $5,000-20,000 |
| Gemini API (10 keys) | $1,000-5,000 |
| GitHub Enterprise | $2,100 (100 users) |
| HashiCorp Vault | $1,500 |
| Infrastructure | $2,000 |
| **Total** | **$21,600-80,600** |

---

## 11. 参考資料

- HashiCorp Vault Documentation
- AWS Secrets Manager Best Practices
- OWASP API Security
- docs/specs/200-agent-orchestra.md
