# 200-Agent Live Experiment 設計

## Issue: #883

## 1. 概要

200エージェント規模のライブ実験設計。負荷テスト、スケーリング戦略、モニタリングを含む。

---

## 2. 実験目標

| 目標 | 指標 | 基準値 |
|------|------|--------|
| スループット | タスク/分 | ≥500 |
| レイテンシ | P99応答時間 | ≤5秒 |
| 可用性 | 稼働率 | ≥99.9% |
| スケーラビリティ | 線形スケール | 50→200 |
| 耐障害性 | 障害復旧時間 | ≤30秒 |

---

## 3. 実験フェーズ

### Phase 1: ベースライン (50 Agents)

```
Week 1-2: 基盤検証
├── 50 Agent起動・安定性確認
├── 基本メトリクス収集
├── ボトルネック特定
└── チューニング
```

**負荷パターン:**
```
タスク投入: 100 tasks/min (定常)
期間: 24時間連続
```

### Phase 2: スケールアップ (100 Agents)

```
Week 3-4: 2倍スケール
├── 100 Agent展開
├── スケーリング動作確認
├── リソース使用量測定
└── 通信オーバーヘッド分析
```

**負荷パターン:**
```
タスク投入: 200 tasks/min (定常)
バースト: 500 tasks/min (5分間隔)
期間: 48時間連続
```

### Phase 3: フルスケール (200 Agents)

```
Week 5-6: 本番規模
├── 200 Agent展開
├── フル負荷テスト
├── カオスエンジニアリング
└── 最終チューニング
```

**負荷パターン:**
```
タスク投入: 500 tasks/min (定常)
バースト: 1000 tasks/min (ランダム)
障害注入: 10% Agent停止
期間: 72時間連続
```

---

## 4. 負荷テスト設計

### 4.1 テストシナリオ

```yaml
scenarios:
  steady_state:
    name: "定常負荷"
    duration: 24h
    rate: 500 tasks/min
    agent_count: 200

  burst:
    name: "バースト負荷"
    duration: 1h
    pattern:
      - rate: 500 tasks/min, duration: 10min
      - rate: 1500 tasks/min, duration: 2min
      - rate: 500 tasks/min, duration: 8min
    repeat: 3

  stress:
    name: "ストレステスト"
    duration: 2h
    rate: 2000 tasks/min
    expect: graceful_degradation

  soak:
    name: "耐久テスト"
    duration: 72h
    rate: 400 tasks/min
    monitor: memory_leak, connection_pool

  chaos:
    name: "カオステスト"
    duration: 4h
    rate: 500 tasks/min
    injections:
      - type: agent_kill
        percent: 10
        interval: 15min
      - type: network_delay
        latency: 500ms
        interval: 30min
      - type: coordinator_failover
        count: 1
        time: 2h
```

### 4.2 タスクタイプ分布

| タスクタイプ | 比率 | 平均処理時間 |
|-------------|------|-------------|
| コード生成 | 30% | 45秒 |
| コードレビュー | 20% | 30秒 |
| テスト実行 | 25% | 60秒 |
| ドキュメント | 15% | 20秒 |
| 軽量タスク | 10% | 5秒 |

### 4.3 負荷生成ツール

```typescript
class LoadGenerator {
  private agents: Agent[] = [];
  private taskQueue: TaskQueue;
  private metrics: MetricsCollector;

  async generateLoad(config: LoadConfig): Promise<void> {
    const interval = 60000 / config.rate; // ms per task

    while (this.running) {
      const task = this.createTask(config.taskDistribution);
      await this.taskQueue.enqueue(task);
      await this.sleep(interval);
    }
  }

  private createTask(distribution: TaskDistribution): Task {
    const type = this.selectType(distribution);
    return {
      id: uuid(),
      type,
      payload: this.generatePayload(type),
      createdAt: Date.now(),
      priority: this.assignPriority(),
    };
  }
}
```

---

## 5. スケーリング戦略

### 5.1 水平スケーリング

```yaml
horizontal_scaling:
  trigger_metrics:
    - name: queue_depth
      scale_up: "> 100"
      scale_down: "< 20"

    - name: avg_wait_time
      scale_up: "> 30s"
      scale_down: "< 5s"

    - name: cpu_utilization
      scale_up: "> 70%"
      scale_down: "< 30%"

  actions:
    scale_up:
      increment: 10 agents
      cooldown: 5min
      max: 250

    scale_down:
      decrement: 5 agents
      cooldown: 10min
      min: 50
```

### 5.2 スケーリングアルゴリズム

```typescript
class AutoScaler {
  async evaluate(): Promise<ScalingDecision> {
    const metrics = await this.collectMetrics();

    // 複合スコア計算
    const score = this.calculateScore(metrics);

    if (score > SCALE_UP_THRESHOLD) {
      const increment = this.calculateIncrement(score);
      return { action: 'scale_up', count: increment };
    }

    if (score < SCALE_DOWN_THRESHOLD) {
      const decrement = this.calculateDecrement(score);
      return { action: 'scale_down', count: decrement };
    }

    return { action: 'none' };
  }

  private calculateScore(metrics: Metrics): number {
    return (
      metrics.queueDepth * 0.4 +
      metrics.avgWaitTime * 0.3 +
      metrics.cpuUtilization * 0.2 +
      metrics.errorRate * 0.1
    );
  }
}
```

### 5.3 予測スケーリング

```yaml
predictive_scaling:
  enabled: true

  patterns:
    daily:
      peak_hours: [9, 10, 14, 15]  # JST
      scale_factor: 1.3

    weekly:
      high_days: [1, 2, 3]  # Mon-Wed
      scale_factor: 1.2

  ml_model:
    type: time_series_forecast
    lookback: 7d
    forecast: 1h
    confidence: 0.8
```

---

## 6. モニタリング設計

### 6.1 メトリクスダッシュボード

```
┌─────────────────────────────────────────────────────────────┐
│              200-Agent Experiment Dashboard                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Active: 198 │  │ Queue: 42   │  │ TPS: 8.3    │         │
│  │ Target: 200 │  │ Max: 500    │  │ Target: 8.0 │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  Throughput (tasks/min)          Latency Distribution       │
│  ┌─────────────────────────┐    ┌─────────────────────────┐ │
│  │     ╭──────────────╮    │    │ P50: ████ 1.2s         │ │
│  │ 500─┤              │    │    │ P90: ██████ 2.8s       │ │
│  │     │              │    │    │ P99: ████████ 4.5s     │ │
│  │ 250─┤              │    │    │                         │ │
│  │     ╰──────────────╯    │    │ Target P99: 5.0s ✓     │ │
│  └─────────────────────────┘    └─────────────────────────┘ │
│                                                              │
│  Agent Health by Zone                                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Zone A: ██████████████████████████████████████████ 50/50││
│  │ Zone B: █████████████████████████████████████████░ 49/50││
│  │ Zone C: ██████████████████████████████████████████ 50/50││
│  │ Zone D: █████████████████████████████████████████░ 49/50││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Error Rate                      Resource Usage              │
│  ┌─────────────────────────┐    ┌─────────────────────────┐ │
│  │ Current: 0.02%          │    │ CPU:  ████████░░ 78%    │ │
│  │ Threshold: 1.0%  ✓      │    │ Mem:  ██████░░░░ 62%    │ │
│  │ ─────────────────────── │    │ Net:  ███░░░░░░░ 34%    │ │
│  └─────────────────────────┘    └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 アラート設定

```yaml
alerts:
  critical:
    - name: experiment_failure
      condition: error_rate > 5% for 5min
      action: pause_experiment

    - name: cascade_failure
      condition: offline_agents > 40
      action: emergency_scale

  warning:
    - name: performance_degradation
      condition: p99_latency > 8s for 10min
      action: notify + investigate

    - name: scaling_limit
      condition: agent_count >= 240
      action: notify + review_capacity
```

---

## 7. データ収集

### 7.1 収集項目

```typescript
interface ExperimentData {
  // タイムスタンプ
  timestamp: number;

  // エージェントメトリクス
  agents: {
    total: number;
    active: number;
    idle: number;
    error: number;
    byZone: Record<string, number>;
  };

  // パフォーマンスメトリクス
  performance: {
    throughput: number;      // tasks/min
    latency: {
      p50: number;
      p90: number;
      p99: number;
    };
    queueDepth: number;
    waitTime: number;
  };

  // リソースメトリクス
  resources: {
    cpuTotal: number;
    memoryTotal: number;
    networkIO: number;
  };

  // エラーメトリクス
  errors: {
    rate: number;
    byType: Record<string, number>;
  };
}
```

### 7.2 データ保存

```yaml
storage:
  time_series:
    backend: InfluxDB
    retention: 30d
    resolution: 1s

  events:
    backend: Elasticsearch
    retention: 90d

  raw_logs:
    backend: S3
    retention: 1y
    compression: gzip
```

---

## 8. 成功基準

| 基準 | 目標 | 必須 |
|------|------|------|
| 200 Agent安定稼働 | 72時間連続 | ✓ |
| スループット | ≥500 tasks/min | ✓ |
| P99レイテンシ | ≤5秒 | ✓ |
| エラー率 | ≤0.1% | ✓ |
| 障害復旧 | ≤30秒 | ✓ |
| スケーリング | 線形 | - |
| リソース効率 | CPU ≤80% | - |

---

## 9. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| API Rate Limit | 処理停止 | バックオフ + キュー |
| メモリリーク | 性能劣化 | 定期再起動 |
| 通信障害 | 分断 | リトライ + フェイルオーバー |
| コスト超過 | 予算逸脱 | リアルタイム監視 + 上限設定 |

---

## 10. 実験スケジュール

| Week | フェーズ | Agent数 | 主要活動 |
|------|---------|---------|----------|
| 1-2 | Phase 1 | 50 | ベースライン確立 |
| 3-4 | Phase 2 | 100 | スケールテスト |
| 5-6 | Phase 3 | 200 | フル負荷実験 |
| 7 | 分析 | - | 結果分析・レポート |

---

## 11. 実験環境セットアップ

### 11.1 インフラ構成

```yaml
infrastructure:
  kubernetes:
    cluster: miyabi-experiment-cluster
    node_pools:
      - name: coordinator-pool
        machine_type: n2-standard-8
        count: 3
        labels:
          role: coordinator

      - name: agent-pool
        machine_type: n2-standard-4
        count: 50
        autoscaling:
          min: 20
          max: 70
        labels:
          role: agent

      - name: monitoring-pool
        machine_type: n2-standard-4
        count: 3
        labels:
          role: monitoring

  databases:
    redis:
      mode: cluster
      nodes: 6
      memory: 8GB

    postgres:
      version: 15
      replicas: 3
      storage: 500GB

    influxdb:
      version: 2.7
      retention: 30d
```

### 11.2 デプロイスクリプト

```bash
#!/bin/bash
# deploy-experiment.sh

set -e

PHASE=${1:-1}
AGENT_COUNT=${2:-50}

echo "=== 200-Agent Experiment Deployment ==="
echo "Phase: $PHASE, Agents: $AGENT_COUNT"

# 1. インフラ確認
kubectl get nodes -l role=agent

# 2. Coordinator展開
kubectl apply -f k8s/coordinator-ha.yaml

# 3. Agent展開
kubectl scale deployment miyabi-agent --replicas=$AGENT_COUNT

# 4. 監視システム起動
kubectl apply -f k8s/monitoring-stack.yaml

# 5. ヘルスチェック
./scripts/health-check.sh

echo "=== Deployment Complete ==="
```

### 11.3 実験開始コマンド

```bash
# Phase 1: ベースライン (50 Agents)
./experiment.sh start --phase=1 --agents=50 --duration=24h

# Phase 2: スケールアップ (100 Agents)
./experiment.sh start --phase=2 --agents=100 --duration=48h

# Phase 3: フルスケール (200 Agents)
./experiment.sh start --phase=3 --agents=200 --duration=72h --chaos=true
```

---

## 12. 結果レポートテンプレート

### 12.1 サマリーレポート

```markdown
# 200-Agent Experiment Report - Phase X

## 実験概要
- 実施日時: YYYY-MM-DD HH:MM - YYYY-MM-DD HH:MM
- 実験時間: XXh
- Agent数: XXX
- 投入タスク総数: X,XXX,XXX

## 結果サマリー

| 指標 | 目標 | 実績 | 判定 |
|------|------|------|------|
| スループット | ≥500/min | XXX/min | ✓/✗ |
| P99レイテンシ | ≤5s | X.Xs | ✓/✗ |
| 可用性 | ≥99.9% | XX.XX% | ✓/✗ |
| エラー率 | ≤0.1% | X.XX% | ✓/✗ |
| 障害復旧 | ≤30s | XXs | ✓/✗ |

## パフォーマンス推移

[グラフ: スループット推移]
[グラフ: レイテンシ分布]
[グラフ: エラー率推移]

## インシデント

| 時刻 | 内容 | 影響 | 対応 |
|------|------|------|------|
| HH:MM | ... | ... | ... |

## 考察

### 成功点
- ...

### 課題
- ...

### 改善案
- ...

## 次フェーズへの推奨事項
- ...
```

### 12.2 詳細メトリクス出力

```typescript
interface ExperimentReport {
  metadata: {
    experimentId: string;
    phase: number;
    startTime: number;
    endTime: number;
    duration: number;
  };

  summary: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    successRate: number;
  };

  performance: {
    throughput: {
      avg: number;
      min: number;
      max: number;
      p50: number;
      p99: number;
    };
    latency: {
      avg: number;
      p50: number;
      p90: number;
      p99: number;
      max: number;
    };
  };

  agents: {
    deployed: number;
    maxActive: number;
    minActive: number;
    avgUtilization: number;
    restarts: number;
  };

  incidents: Array<{
    timestamp: number;
    type: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
    resolution: string;
    duration: number;
  }>;

  recommendations: string[];
}
```

---

## 13. 実験自動化

### 13.1 CI/CD統合

```yaml
# .github/workflows/experiment.yml
name: 200-Agent Experiment

on:
  workflow_dispatch:
    inputs:
      phase:
        description: 'Experiment Phase (1-3)'
        required: true
        default: '1'
      duration:
        description: 'Duration in hours'
        required: true
        default: '24'

jobs:
  experiment:
    runs-on: self-hosted
    timeout-minutes: 4320  # 72h max

    steps:
      - uses: actions/checkout@v4

      - name: Setup Kubernetes
        run: |
          gcloud container clusters get-credentials miyabi-experiment

      - name: Deploy Infrastructure
        run: |
          ./scripts/deploy-experiment.sh ${{ inputs.phase }}

      - name: Run Experiment
        run: |
          ./scripts/run-experiment.sh \
            --phase=${{ inputs.phase }} \
            --duration=${{ inputs.duration }}h

      - name: Collect Results
        run: |
          ./scripts/collect-results.sh

      - name: Generate Report
        run: |
          ./scripts/generate-report.sh

      - name: Upload Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: experiment-results-phase-${{ inputs.phase }}
          path: |
            results/
            reports/
```

### 13.2 自動スケジュール実行

```yaml
# experiment-scheduler.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: experiment-phase1
spec:
  schedule: "0 0 * * 1"  # 毎週月曜 00:00
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: experiment-runner
              image: miyabi/experiment-runner:latest
              args:
                - --phase=1
                - --duration=24h
                - --report=true
          restartPolicy: OnFailure
```

---

## 14. 緊急停止手順

### 14.1 即時停止

```bash
# 全Agent停止
kubectl scale deployment miyabi-agent --replicas=0

# 負荷生成停止
kubectl delete job load-generator

# 実験フラグ無効化
kubectl set env deployment/miyabi-coordinator EXPERIMENT_MODE=false
```

### 14.2 段階的停止

```bash
# 1. 新規タスク受付停止
./experiment.sh pause

# 2. 処理中タスク完了待機 (最大5分)
./experiment.sh drain --timeout=5m

# 3. Agent数削減
kubectl scale deployment miyabi-agent --replicas=50

# 4. 最終状態保存
./experiment.sh snapshot

# 5. 完全停止
./experiment.sh stop
```

---

## 15. 参考資料

- docs/specs/200-agent-orchestra.md
- docs/specs/200-agent-api-keys.md
- Kubernetes HPA Documentation
- Chaos Engineering Principles
- SRE Book - Load Testing
- Google SRE Workbook - Load Testing
