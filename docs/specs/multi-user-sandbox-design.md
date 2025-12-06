# Multi-User Sandbox Design Specification

**Issue:** #1234
**Status:** Draft
**Author:** サクラ (Review Agent)
**Date:** 2024-12-06
**Version:** 1.0.0

---

## 1. Overview

### 1.1 Purpose

Claude App Connector用のマルチユーザーサンドボックス環境を設計する。各ユーザーが独立した実行環境を持ち、セキュリティを確保しながらリソースを効率的に共有できるアーキテクチャを定義する。

### 1.2 Goals

- ユーザー間の完全な分離（データ、プロセス、ネットワーク）
- 公平なリソース配分とクォータ管理
- セキュリティ境界の明確化
- スケーラビリティと運用効率

### 1.3 Non-Goals

- マルチテナントのSaaS課金システム（別Issue）
- 永続的なデータストレージ（セッションベース）

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                            │
│                    (nginx / Cloud LB)                           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                     API Gateway Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Auth Guard  │  │ Rate Limiter│  │ Request Router          │  │
│  │ (JWT/OAuth) │  │ (per-user)  │  │ (session → sandbox)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                   Sandbox Orchestrator                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Sandbox Lifecycle Manager                               │    │
│  │ - Create / Destroy / Monitor                            │    │
│  │ - Health Check / Auto-Recovery                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Resource Quota Controller                               │    │
│  │ - CPU / Memory / Disk / Network limits                  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                   Sandbox Pool (Isolated)                       │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │ Sandbox-1 │  │ Sandbox-2 │  │ Sandbox-3 │  │ Sandbox-N │    │
│  │ User: A   │  │ User: B   │  │ User: C   │  │ User: ...  │    │
│  │ ┌───────┐ │  │ ┌───────┐ │  │ ┌───────┐ │  │ ┌───────┐ │    │
│  │ │Process│ │  │ │Process│ │  │ │Process│ │  │ │Process│ │    │
│  │ │ Space │ │  │ │ Space │ │  │ │ Space │ │  │ │ Space │ │    │
│  │ └───────┘ │  │ └───────┘ │  │ └───────┘ │  │ └───────┘ │    │
│  │ ┌───────┐ │  │ ┌───────┐ │  │ ┌───────┐ │  │ ┌───────┐ │    │
│  │ │ File  │ │  │ │ File  │ │  │ │ File  │ │  │ │ File  │ │    │
│  │ │System │ │  │ │System │ │  │ │System │ │  │ │System │ │    │
│  │ └───────┘ │  │ └───────┘ │  │ └───────┘ │  │ └───────┘ │    │
│  │ ┌───────┐ │  │ ┌───────┐ │  │ ┌───────┐ │  │ ┌───────┐ │    │
│  │ │Network│ │  │ │Network│ │  │ │Network│ │  │ │Network│ │    │
│  │ │ NS    │ │  │ │ NS    │ │  │ │ NS    │ │  │ │ NS    │ │    │
│  │ └───────┘ │  │ └───────┘ │  │ └───────┘ │  │ └───────┘ │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Isolation Technologies

| Layer | Technology | Purpose |
|-------|------------|---------|
| Container | Docker / gVisor | プロセス・ファイルシステム分離 |
| Network | Network Namespace | ネットワーク分離 |
| Resource | cgroups v2 | CPU/Memory/IO制限 |
| Security | seccomp / AppArmor | システムコール制限 |
| Runtime | Firecracker (optional) | microVM分離（高セキュリティ） |

---

## 3. User Isolation Architecture

### 3.1 Sandbox Types

```typescript
enum SandboxType {
  STANDARD = 'standard',     // Docker container
  SECURE = 'secure',         // gVisor + seccomp
  ISOLATED = 'isolated',     // Firecracker microVM
}

interface SandboxConfig {
  type: SandboxType;
  userId: string;
  sessionId: string;
  ttl: number;              // Time-to-live in seconds
  resources: ResourceLimits;
}
```

### 3.2 Isolation Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    Host System                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Sandbox Container                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │            User Process Space                   │  │  │
│  │  │  ┌───────────────┐  ┌───────────────────────┐   │  │  │
│  │  │  │ Claude Agent  │  │ User Code Execution   │   │  │  │
│  │  │  │ (restricted)  │  │ (fully sandboxed)     │   │  │  │
│  │  │  └───────────────┘  └───────────────────────┘   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │            Isolated Filesystem                  │  │  │
│  │  │  /home/user (tmpfs, size-limited)               │  │  │
│  │  │  /tmp (tmpfs, 100MB max)                        │  │  │
│  │  │  Read-only: /usr, /lib, /bin                    │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │            Network Namespace                    │  │  │
│  │  │  - Egress: allowlist only                       │  │  │
│  │  │  - No inter-sandbox communication               │  │  │
│  │  │  - Rate limited                                 │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Session Lifecycle

```
┌─────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐
│ Request │────▶│ Allocate │────▶│ Active  │────▶│ Cleanup  │
└─────────┘     └──────────┘     └─────────┘     └──────────┘
     │               │                │               │
     │               │                │               │
     ▼               ▼                ▼               ▼
  Auth/Rate      Pool から         ユーザー        リソース
  Limit確認      Sandbox取得       作業実行        解放・削除
```

---

## 4. Resource Limits & Quota Management

### 4.1 Resource Tiers

| Tier | CPU | Memory | Disk | Network | Session TTL |
|------|-----|--------|------|---------|-------------|
| Free | 0.5 vCPU | 512MB | 100MB | 1 Mbps | 15 min |
| Standard | 1 vCPU | 1GB | 500MB | 10 Mbps | 60 min |
| Pro | 2 vCPU | 4GB | 2GB | 100 Mbps | 4 hours |
| Enterprise | 4 vCPU | 16GB | 10GB | 1 Gbps | 24 hours |

### 4.2 Quota Configuration

```typescript
interface ResourceLimits {
  cpu: {
    cores: number;          // vCPU count
    period: number;         // cgroup cpu.cfs_period_us
    quota: number;          // cgroup cpu.cfs_quota_us
  };
  memory: {
    limit: string;          // e.g., "1G"
    swap: string;           // e.g., "0" (disabled)
    oomKillDisable: boolean;
  };
  disk: {
    size: string;           // tmpfs size
    iops: number;           // I/O operations per second
  };
  network: {
    bandwidth: string;      // e.g., "10mbit"
    connections: number;    // max concurrent connections
    egressAllowlist: string[];
  };
  processes: {
    max: number;            // max process count (pids.max)
    maxOpenFiles: number;   // RLIMIT_NOFILE
  };
}
```

### 4.3 Enforcement Implementation

```typescript
// cgroups v2 configuration example
const cgroupConfig = {
  "cpu.max": "100000 100000",      // 100% of 1 CPU
  "memory.max": "1073741824",       // 1GB
  "memory.swap.max": "0",           // No swap
  "pids.max": "100",                // Max 100 processes
  "io.max": "8:0 riops=1000 wiops=1000",
};

// Docker run equivalent
const dockerArgs = [
  "--cpus=1",
  "--memory=1g",
  "--memory-swap=1g",
  "--pids-limit=100",
  "--read-only",
  "--tmpfs=/tmp:size=100m",
  "--network=sandbox-net",
  "--cap-drop=ALL",
  "--security-opt=no-new-privileges",
];
```

### 4.4 Quota Monitoring

```typescript
interface QuotaUsage {
  userId: string;
  sandboxId: string;
  timestamp: Date;
  cpu: {
    usagePercent: number;
    throttledTime: number;
  };
  memory: {
    usedBytes: number;
    limitBytes: number;
    oomEvents: number;
  };
  disk: {
    usedBytes: number;
    limitBytes: number;
  };
  network: {
    rxBytes: number;
    txBytes: number;
    connections: number;
  };
}
```

---

## 5. Security Boundaries

### 5.1 Security Layers

```
Layer 0: Hardware/Hypervisor (if using microVMs)
    │
Layer 1: Host OS Kernel
    │  - seccomp syscall filtering
    │  - AppArmor/SELinux MAC
    │  - Namespaces (pid, net, mnt, user, ipc, uts)
    │
Layer 2: Container Runtime
    │  - gVisor (optional)
    │  - Read-only root filesystem
    │  - Dropped capabilities
    │
Layer 3: Application
    │  - Non-root user execution
    │  - Limited environment variables
    │  - Restricted file access
    │
Layer 4: Network
       - Egress allowlist
       - Rate limiting
       - No inter-container communication
```

### 5.2 Seccomp Profile

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "syscalls": [
    {
      "names": [
        "read", "write", "open", "close", "stat", "fstat",
        "mmap", "mprotect", "munmap", "brk", "access",
        "pipe", "select", "dup", "dup2", "socket", "connect",
        "sendto", "recvfrom", "clone", "execve", "wait4",
        "kill", "getpid", "getuid", "getgid", "geteuid",
        "getegid", "getcwd", "chdir", "mkdir", "rmdir"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ],
  "deniedSyscalls": [
    "mount", "umount", "ptrace", "kexec_load",
    "reboot", "sethostname", "setdomainname",
    "init_module", "delete_module", "acct"
  ]
}
```

### 5.3 Network Security

```typescript
interface NetworkPolicy {
  // Egress allowlist
  egressRules: {
    domain: string;
    ports: number[];
    protocol: 'tcp' | 'udp';
  }[];

  // Default egress allowlist
  defaultAllowlist: [
    { domain: "api.anthropic.com", ports: [443] },
    { domain: "api.openai.com", ports: [443] },
    { domain: "*.githubusercontent.com", ports: [443] },
    { domain: "registry.npmjs.org", ports: [443] },
    { domain: "pypi.org", ports: [443] },
  ];

  // Blocked
  blockedPatterns: [
    "*.internal",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "169.254.169.254",  // Cloud metadata
  ];
}
```

### 5.4 File System Security

```typescript
interface FileSystemPolicy {
  // Read-only mounts
  readOnly: [
    "/usr",
    "/lib",
    "/lib64",
    "/bin",
    "/sbin",
    "/etc/passwd",
    "/etc/group",
  ];

  // Writable (tmpfs)
  writable: [
    { path: "/home/user", size: "500M" },
    { path: "/tmp", size: "100M" },
    { path: "/var/tmp", size: "50M" },
  ];

  // Hidden/Inaccessible
  hidden: [
    "/proc/kcore",
    "/proc/kallsyms",
    "/sys/firmware",
    "/sys/kernel/security",
  ];
}
```

---

## 6. Implementation Plan

### 6.1 Phase 1: Foundation (Week 1-2)

- [ ] Docker-based sandbox prototype
- [ ] Basic resource limits (cgroups)
- [ ] Session lifecycle management
- [ ] Health check system

### 6.2 Phase 2: Security Hardening (Week 3-4)

- [ ] Seccomp profile implementation
- [ ] Network namespace isolation
- [ ] Egress allowlist enforcement
- [ ] Security audit

### 6.3 Phase 3: Quota Management (Week 5-6)

- [ ] Per-user quota tracking
- [ ] Real-time monitoring
- [ ] Alert system
- [ ] Admin dashboard

### 6.4 Phase 4: Production Ready (Week 7-8)

- [ ] gVisor integration (optional)
- [ ] Auto-scaling
- [ ] Disaster recovery
- [ ] Documentation

---

## 7. API Design

### 7.1 Sandbox Management API

```typescript
// Create sandbox
POST /api/v1/sandboxes
{
  "userId": "user_123",
  "tier": "standard",
  "ttl": 3600
}

// Response
{
  "sandboxId": "sb_abc123",
  "status": "creating",
  "endpoint": "wss://sandbox.example.com/sb_abc123",
  "expiresAt": "2024-12-06T16:00:00Z"
}

// Get sandbox status
GET /api/v1/sandboxes/:sandboxId

// Execute command
POST /api/v1/sandboxes/:sandboxId/exec
{
  "command": "python script.py",
  "timeout": 30
}

// Terminate sandbox
DELETE /api/v1/sandboxes/:sandboxId
```

### 7.2 Quota API

```typescript
// Get user quota
GET /api/v1/users/:userId/quota

// Response
{
  "userId": "user_123",
  "tier": "standard",
  "usage": {
    "activeSandboxes": 1,
    "maxSandboxes": 3,
    "cpuSecondsUsed": 3600,
    "cpuSecondsLimit": 36000,
    "storageUsedBytes": 104857600,
    "storageLimitBytes": 536870912
  },
  "resetAt": "2024-12-07T00:00:00Z"
}
```

---

## 8. Monitoring & Observability

### 8.1 Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `sandbox_active_count` | Gauge | Active sandbox count |
| `sandbox_create_duration_seconds` | Histogram | Sandbox creation time |
| `sandbox_cpu_usage_percent` | Gauge | CPU usage per sandbox |
| `sandbox_memory_usage_bytes` | Gauge | Memory usage per sandbox |
| `sandbox_oom_kills_total` | Counter | OOM kill events |
| `quota_exceeded_total` | Counter | Quota exceeded events |

### 8.2 Alerts

```yaml
alerts:
  - name: SandboxOOMKill
    condition: increase(sandbox_oom_kills_total[5m]) > 5
    severity: warning

  - name: HighSandboxCount
    condition: sandbox_active_count > 1000
    severity: warning

  - name: SandboxCreationSlow
    condition: histogram_quantile(0.95, sandbox_create_duration_seconds) > 10
    severity: warning
```

---

## 9. Security Checklist

- [ ] Container escape prevention (gVisor/seccomp)
- [ ] Network isolation verification
- [ ] Resource exhaustion protection
- [ ] Secrets management (no env leak)
- [ ] Audit logging
- [ ] Penetration testing
- [ ] Dependency vulnerability scanning
- [ ] Incident response plan

---

## 10. References

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [gVisor Documentation](https://gvisor.dev/docs/)
- [cgroups v2 Manual](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html)
- [Seccomp BPF](https://www.kernel.org/doc/html/latest/userspace-api/seccomp_filter.html)
- [Firecracker](https://firecracker-microvm.github.io/)

---

## Appendix A: Docker Compose Example

```yaml
version: "3.8"

services:
  sandbox-orchestrator:
    image: sandbox-orchestrator:latest
    environment:
      - SANDBOX_POOL_SIZE=100
      - DEFAULT_TTL=3600
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - orchestrator-net

  sandbox-template:
    image: sandbox-runtime:latest
    deploy:
      resources:
        limits:
          cpus: "1"
          memory: 1G
    read_only: true
    tmpfs:
      - /tmp:size=100M
      - /home/user:size=500M
    security_opt:
      - no-new-privileges:true
      - seccomp:seccomp-profile.json
    cap_drop:
      - ALL
    networks:
      - sandbox-net

networks:
  orchestrator-net:
    internal: true
  sandbox-net:
    internal: true
    driver_opts:
      com.docker.network.bridge.enable_icc: "false"
```

---

## Appendix B: Estimated Costs

| Component | Monthly Cost (100 users) | Monthly Cost (1000 users) |
|-----------|-------------------------|---------------------------|
| Compute (GCP/AWS) | $500 | $3,000 |
| Network Egress | $50 | $300 |
| Monitoring | $100 | $500 |
| **Total** | **$650** | **$3,800** |

---

*Document generated by サクラ (Review Agent) for Issue #1234*
