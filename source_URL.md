https://www.omakase.ai/
https://www.omakase.ai/#features
https://www.omakase.ai/pricing
https://www.omakase.ai/partnerships
https://www.omakase.ai/login
https://www.omakase.ai/register
https://www.producthunt.com/posts/omakase-ai-voice
https://www.hana-izumi.com/
https://kanoomachineryestore.com/
https://multitasky.com/
https://yobaby-apparel.com/
https://www.combatroom.co.nz/
https://bustersindustrial.com/
https://www.grab-design.com/
https://eyebrows-lime.com/
https://ssin-studio.com/
https://10turtle.com/
https://www.aidapt.ca/
https://letsgetascended.com/
https://www.belarisperfumeoils.com/
https://brogden-store.com/
https://chenli.xin/
https://chiclary.myshopify.com/
https://doubleknock.com/
https://easyfatoora.com/
https://fararti.com/
https://www.herbalpeeling-lime.com/
https://www.hollywood-weekly.com/
https://kijanamsafiinteriors.com/
https://www.kitedoctors.com/
https://www.lifemasters.co.za/
https://www.linked-magic.com/
https://mana-massage-chairs.myshopify.com/
https://nakirobexpresscourier.com/
https://office-tomoki.jp/
https://omwow.com/
https://primuschennai.com/
https://propash.com/
http://qajobfit.com/
https://silhouettes-story-jewelry.myshopify.com/
https://silktherichusa.com/
https://sippinsnax.com/
https://social-fi.net/
https://www.mysouthernrv.com/
https://theglutenfreebar.com/
https://tidyhire.app/
https://alchuru.store/
https://alstonalika.art/
https://circlethepeople.com/
https://brandrise.us/
https://apps.shopify.com/omakase-ai
https://blog.omakase.ai/posts/shopify-integration
mailto:omakase@zeals.ai
https://x.com/masa_zeals
https://www.linkedin.com/company/zeals-co-ltd/
https://status.omakase.ai/
https://www.omakase.ai/privacy
https://www.omakase.ai/terms
https://www.omakase.ai/faq
https://www.omakase.ai/manifesto
https://zeals-inc.getrewardful.com/signup


=====

# YAML Context Engineering Agent

## Agent Specification

```yaml
agent_specification:
  name: "YAML Context Engineering Agent"
  version: "1.0.0"
  description: |
    様々な形式の入力から、階層的かつ構造化されたコンテキスト情報を抽出し、
    生成AIが参照可能なYAML形式の.mdファイルとして自動的に整理・永続化する自律型エージェント。
    URLクロール、テキスト解析、構造化データ抽出、ファイルシステム管理を統合的に実行する。

  core_capabilities:
    input_processing:
      - "多種多様な入力ソース（URL、生テキスト、既存の構造化データ）の処理"
      - "入力形式の自動判別とソース種別の分類"
      - "URL有効性の検証とドメイン制限の適用"
    
    content_extraction:
      - "ウェブページコンテンツの完全取得とテキスト抽出"
      - "階層的見出し（L1, L2, L3等）の自動識別と分類"
      - "見出しごとの関連コンテンツの要約・抽出"
      - "メタデータ（更新日、作成者、タグ等）の抽出"
    
    structure_analysis:
      - "コンテンツの論理構造の解析と階層化"
      - "関連性に基づくコンテンツのグルーピング"
      - "重複コンテンツの検出と統合"
    
    autonomous_crawling:
      - "新規の関連ソース（URL）の発見と追跡"
      - "再帰的な情報収集と処理（深度制限付き）"
      - "同一ドメイン内でのインテリジェントクロール"
    
    data_persistence:
      - "指定されたディレクトリ構造でのコンテキスト永続化"
      - "YAML形式での構造化データの保存"
      - "ファイル名の自動サニタイズと重複回避"

  input_schema:
    type: object
    properties:
      source_specification:
        type: object
        properties:
          source_type:
            type: string
            enum: ["url_list", "raw_text", "structured_yaml", "mixed"]
            description: "入力データの種類を指定"
          sources:
            type: array
            items:
              oneOf:
                - type: string  # URL or text
                - type: object
                  properties:
                    type: 
                      enum: ["url", "text", "file_path"]
                    content: 
                      type: string
                    metadata:
                      type: object
            description: "処理するソースのリスト"
          
      processing_options:
        type: object
        properties:
          output_base_directory:
            type: string
            default: "generated_contexts"
            description: "生成されたコンテキストファイルの保存先"
          
          crawling_config:
            type: object
            properties:
              max_crawl_depth:
                type: integer
                default: 3
                minimum: 1
                maximum: 10
                description: "URLクロール時の最大再帰深度"
              
              target_domain_patterns:
                type: array
                items:
                  type: string
                description: "クロールを許可するドメインの正規表現パターン"
              
              crawl_delay_seconds:
                type: number
                default: 1.0
                minimum: 0.5
                description: "リクエスト間の待機時間（秒）"
              
              max_pages_per_domain:
                type: integer
                default: 100
                description: "ドメインあたりの最大処理ページ数"
          
          content_extraction_config:
            type: object
            properties:
              context_granularity:
                type: string
                enum: ["L1_only", "L1_L2", "L1_L2_L3", "full_hierarchy"]
                default: "L1_L2"
                description: "コンテキスト抽出の階層深度"
              
              content_summarization:
                type: string
                enum: ["none", "brief", "detailed", "full"]
                default: "detailed"
                description: "コンテンツ要約のレベル"
              
              language_detection:
                type: boolean
                default: true
                description: "言語自動検出の有効化"
              
              extract_metadata:
                type: boolean
                default: true
                description: "メタデータ抽出の有効化"
          
          output_format_config:
            type: object
            properties:
              file_format:
                type: string
                enum: ["yaml_frontmatter", "pure_yaml", "json", "markdown"]
                default: "yaml_frontmatter"
                description: "出力ファイルの形式"
              
              include_source_refs:
                type: boolean
                default: true
                description: "ソース参照の含有"
              
              generate_index:
                type: boolean
                default: true
                description: "インデックスファイルの生成"
    
    required: ["source_specification"]

  output_schema:
    type: object
    properties:
      execution_status:
        type: object
        properties:
          status:
            type: string
            enum: ["SUCCESS", "PARTIAL_SUCCESS", "FAILED"]
          
          message:
            type: string
            description: "実行結果の詳細メッセージ"
          
          execution_time_seconds:
            type: number
            description: "総実行時間（秒）"
          
          error_log:
            type: array
            items:
              type: object
              properties:
                timestamp: 
                  type: string
                error_type: 
                  type: string
                source_url: 
                  type: string
                message: 
                  type: string
      
      output_summary:
        type: object
        properties:
          output_directory:
            type: string
            description: "生成されたコンテキストファイルの保存ディレクトリ"
          
          generated_files_count:
            type: integer
            description: "生成されたファイルの総数"
          
          processed_sources_count:
            type: integer
            description: "処理されたソースの総数"
          
          extracted_headings_count:
            type: object
            properties:
              L1: 
                type: integer
              L2: 
                type: integer
              L3: 
                type: integer
          
          directory_structure:
            type: object
            description: "生成されたディレクトリ構造のマップ"
          
          content_statistics:
            type: object
            properties:
              total_content_length:
                type: integer
              average_content_length_per_file:
                type: number
              languages_detected:
                type: array
                items:
                  type: string

  tool_definitions:
    web_content_fetcher:
      description: "指定されたURLからウェブページのコンテンツを取得し、テキストを抽出"
      function_signature: "fetch_web_content(urls: List[str], timeout: int = 30) -> List[WebContentResult]"
      parameters:
        urls:
          type: array
          items:
            type: string
            format: uri
        timeout:
          type: integer
          default: 30
      returns:
        type: array
        items:
          type: object
          properties:
            url: 
              type: string
            status_code: 
              type: integer
            content: 
              type: string
            title: 
              type: string
            meta_description: 
              type: string
            language: 
              type: string
            extracted_urls:
              type: array
              items:
                type: string

    llm_structure_extractor:
      description: "テキストコンテンツから階層的な見出し構造と関連コンテンツを抽出"
      function_signature: "extract_hierarchical_structure(content: str, target_schema: Dict) -> StructuredContent"
      parameters:
        content:
          type: string
          description: "解析対象のテキストコンテンツ"
        target_schema:
          type: object
          description: "抽出対象の構造スキーマ"
        extraction_config:
          type: object
          properties:
            max_heading_levels:
              type: integer
              default: 3
            content_summary_length:
              type: integer
              default: 500
            extract_code_blocks:
              type: boolean
              default: true
      returns:
        type: object
        properties:
          structured_headings:
            type: object
            description: "階層化された見出し構造"
          content_summary:
            type: string
          extracted_entities:
            type: array
          confidence_score:
            type: number
            minimum: 0
            maximum: 1

    url_discovery_engine:
      description: "コンテンツから関連URLを発見し、優先度付きで返す"
      function_signature: "discover_related_urls(content: str, base_domain: str, filters: List[str]) -> List[DiscoveredURL]"
      parameters:
        content:
          type: string
        base_domain:
          type: string
        filters:
          type: array
          items:
            type: string
      returns:
        type: array
        items:
          type: object
          properties:
            url:
              type: string
            priority_score:
              type: number
            relation_type:
              type: string
              enum: ["parent", "child", "sibling", "related"]
            estimated_content_value:
              type: number

    file_system_manager:
      description: "ディレクトリ作成、ファイル書き込み、パス管理を実行"
      functions:
        create_directory_structure:
          signature: "create_directory_structure(base_path: str, structure: Dict) -> bool"
          description: "指定された構造でディレクトリツリーを作成"
        
        write_context_file:
          signature: "write_context_file(file_path: str, content: Dict, format: str) -> bool"
          description: "構造化されたコンテンツをファイルに書き込み"
        
        sanitize_path_component:
          signature: "sanitize_path_component(component: str) -> str"
          description: "ファイル/ディレクトリ名を安全な形式に変換"
        
        generate_index_file:
          signature: "generate_index_file(directory: str, structure: Dict) -> str"
          description: "インデックスファイルを生成"

    content_quality_analyzer:
      description: "抽出されたコンテンツの品質を評価し、改善提案を行う"
      function_signature: "analyze_content_quality(content: Dict) -> QualityReport"
      parameters:
        content:
          type: object
      returns:
        type: object
        properties:
          overall_score:
            type: number
            minimum: 0
            maximum: 10
          quality_metrics:
            type: object
            properties:
              completeness:
                type: number
              coherence:
                type: number
              relevance:
                type: number
          improvement_suggestions:
            type: array
            items:
              type: string

  autonomous_workflow:
    initialization_phase:
      - step: "input_validation"
        description: "入力ソースの妥当性検証とソース分類"
        actions:
          - "validate_input_schema(input_data)"
          - "classify_source_types(input_data.sources)"
          - "initialize_processing_queue(classified_sources)"
      
      - step: "environment_setup"
        description: "出力環境とディレクトリ構造の準備"
        actions:
          - "create_base_directory(input_data.output_base_directory)"
          - "initialize_logging_system()"
          - "setup_error_handling_context()"

    main_processing_loop:
      description: "ソースキューが空になるまで、または制限に達するまで処理を継続"
      loop_condition: "processing_queue.not_empty AND current_depth <= max_crawl_depth AND processed_count < max_total_pages"
      
      phases:
        content_acquisition:
          - step: "source_processing"
            description: "現在のソースからコンテンツを取得"
            actions:
              - "current_source = processing_queue.pop()"
              - "IF current_source.type == 'url': content = web_content_fetcher.fetch_web_content([current_source.url])"
              - "ELIF current_source.type == 'text': content = current_source.content"
              - "ELSE: content = load_file_content(current_source.path)"
              - "validate_content_acquisition(content)"
        
        structure_extraction:
          - step: "hierarchical_analysis"
            description: "コンテンツの階層構造を解析・抽出"
            actions:
              - "structured_data = llm_structure_extractor.extract_hierarchical_structure(content, target_schema)"
              - "quality_report = content_quality_analyzer.analyze_content_quality(structured_data)"
              - "IF quality_report.overall_score < minimum_quality_threshold: apply_content_enhancement(structured_data)"
              - "merge_structured_data_to_global_context(structured_data)"
        
        url_discovery:
          - step: "related_url_extraction"
            description: "新しい関連URLの発見と評価"
            actions:
              - "IF current_source.type == 'url':"
              - "  discovered_urls = url_discovery_engine.discover_related_urls(content, current_source.domain, domain_filters)"
              - "  filtered_urls = apply_crawling_constraints(discovered_urls, current_depth, processed_domains)"
              - "  processing_queue.add_unique_urls(filtered_urls, current_depth + 1)"
        
        incremental_persistence:
          - step: "progressive_file_writing"
            description: "処理済みデータの段階的永続化"
            actions:
              - "IF processed_count % checkpoint_interval == 0:"
              - "  write_intermediate_results_to_filesystem(global_structured_context)"
              - "  generate_progress_report(processing_status)"

    finalization_phase:
      - step: "comprehensive_data_organization"
        description: "全収集データの最終的な整理と構造化"
        actions:
          - "organize_global_context_by_hierarchy(global_structured_context)"
          - "resolve_content_duplications_and_conflicts(global_structured_context)"
          - "apply_final_content_normalization(global_structured_context)"
      
      - step: "file_system_materialization"
        description: "最終的なファイルシステム構造の構築"
        actions:
          - "FOR each L1_heading, L2_data IN global_structured_context:"
          - "  sanitized_l1_dir = file_system_manager.sanitize_path_component(L1_heading)"
          - "  file_system_manager.create_directory_structure(sanitized_l1_dir)"
          - "  FOR each L2_heading, content IN L2_data:"
          - "    sanitized_l2_filename = file_system_manager.sanitize_path_component(L2_heading)"
          - "    file_system_manager.write_context_file(sanitized_l1_dir/sanitized_l2_filename, content, output_format)"
      
      - step: "index_and_metadata_generation"
        description: "インデックスファイルとメタデータの生成"
        actions:
          - "IF generate_index == true:"
          - "  master_index = file_system_manager.generate_index_file(output_directory, global_structured_context)"
          - "generate_processing_metadata(execution_statistics, error_log)"
          - "write_execution_summary_report(output_directory)"

  error_handling_strategy:
    retry_mechanisms:
      web_content_fetching:
        max_retries: 3
        backoff_strategy: "exponential"
        retry_conditions: ["timeout", "connection_error", "5xx_status_codes"]
      
      llm_processing:
        max_retries: 2
        fallback_extraction_method: "rule_based_parsing"
        retry_conditions: ["rate_limit", "service_unavailable"]
      
      file_operations:
        max_retries: 3
        fallback_directory: "backup_output"
        retry_conditions: ["permission_denied", "disk_full"]

    graceful_degradation:
      - "部分的な処理失敗時も、成功した部分のデータを保持"
      - "必須でない機能（メタデータ抽出等）の失敗は警告として記録し、処理継続"
      - "致命的エラー時は中間結果を保存してから終了"

    logging_and_monitoring:
      log_levels: ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
      log_destinations: ["console", "file", "structured_json"]
      monitoring_metrics:
        - "processing_rate_per_minute"
        - "success_rate_percentage"
        - "average_content_extraction_time"
        - "memory_usage_mb"
        - "disk_space_utilization"

  success_criteria:
    functional_requirements:
      - "入力ソースの100%が適切に分類・処理されること"
      - "抽出された階層構造が論理的に整合していること"
      - "生成されたファイル構造が仕様通りであること"
      - "YAML形式のデータが有効であること"
    
    performance_requirements:
      - "URLあたりの平均処理時間が5秒以内であること"
      - "メモリ使用量が指定制限内に収まること"
      - "大量データ処理時もシステムが安定していること"
    
    quality_requirements:
      - "コンテンツの意味的整合性が保持されること"
      - "重複コンテンツが適切に統合されること"
      - "エラー率が全処理の5%以下であること"

  extensibility_features:
    plugin_system:
      - "カスタムコンテンツ抽出器の追加サポート"
      - "新しい出力形式の追加"
      - "特定ドメイン用の専用パーサー追加"
    
    api_integration:
      - "外部API経由でのコンテンツ取得"
      - "サードパーティ分析サービスとの連携"
      - "リアルタイム処理状況の外部モニタリング"
    
    customization_options:
      - "ユーザー定義の抽出ルール"
      - "カスタマイズ可能なファイル命名規則"
      - "組織固有のメタデータスキーマ"

  deployment_considerations:
    resource_requirements:
      minimum_system_specs:
        ram_gb: 4
        disk_space_gb: 10
        cpu_cores: 2
        network_bandwidth_mbps: 10
      
      recommended_system_specs:
        ram_gb: 16
        disk_space_gb: 100
        cpu_cores: 8
        network_bandwidth_mbps: 100
    
    scalability_options:
      - "分散処理による並列URL処理"
      - "クラウド環境での動的リソーススケーリング"
      - "キューシステムによる非同期処理"
    
    security_considerations:
      - "URLアクセス時のセキュリティチェック"
      - "ファイルシステムアクセス権限の制限"
      - "機密情報の自動検出・除去機能"
```

## Implementation Example

```yaml
# Usage Example Configuration
example_usage:
  basic_lark_documentation_extraction:
    source_specification:
      source_type: "url_list"
      sources:
        - "https://www.larksuite.com/hc/ja-JP/"
        - "https://www.larksuite.com/hc/ja-JP/categories/7054521406414913541"
        - "https://www.larksuite.com/hc/ja-JP/categories/7054521406419107846"
    
    processing_options:
      output_base_directory: "lark_context"
      crawling_config:
        max_crawl_depth: 2
        target_domain_patterns:
          - "larksuite\\.com/hc/ja-JP/.*"
        crawl_delay_seconds: 1.0
        max_pages_per_domain: 50
      
      content_extraction_config:
        context_granularity: "L1_L2"
        content_summarization: "detailed"
        language_detection: true
        extract_metadata: true
      
      output_format_config:
        file_format: "yaml_frontmatter"
        include_source_refs: true
        generate_index: true

  expected_output_structure:
    directory_tree: |
      lark_context/
      ├── index.md
      ├── Larkの概要と始め方/
      │   ├── Larkとは.md
      │   ├── はじめてのLark.md
      │   └── アカウントの準備とアプリの入手.md
      ├── アカウントと設定/
      │   ├── 環境設定.md
      │   ├── メンバー招待・法人参加.md
      │   ├── 外部連絡先の追加・管理.md
      │   └── ナビゲーションと検索.md
      └── ...
    
    file_content_sample: |
      ---
      title: "Larkとは"
      source_url: "https://www.larksuite.com/hc/ja-JP/articles/xxx"
      last_updated: "2025-01-15T10:30:00Z"
      content_type: "documentation"
      language: "ja"
      extraction_confidence: 0.95
      ---
      
      # Content
      
      Larkは、チームのつながりを強化し、業務のDX（デジタルトランスフォーメーション）を推進するための
      統合型コラボレーションツールです。以下の主要機能が一つのプラットフォームに統合されています：
      
      ## 主要機能
      - チャット・メッセージング
      - ビデオ会議
      - ドキュメント作成・共有
      - カレンダー・スケジュール管理
      - メール機能
      - 勤怠管理
      - 承認ワークフロー
      
      これらの機能が相互に連携し、情報の断片化を防ぎ、チーム全体の生産性向上に貢献します。
```# Lark Documentation Structure Analysis

## Overview
The Lark Help Center (Lark ヘルプセンター) is organized as a comprehensive documentation portal for the Lark collaboration platform, available at https://www.larksuite.com/hc/ja-JP/

## Main Navigation Structure

### Top-Level Categories (12 Main Sections)

1. **アカウント・設定 (Account & Settings)**
   - URL: `/hc/ja-JP/category/7054521406414913541`
   - Covers account management and system settings

2. **メッセージ (Messaging)**
   - URL: `/hc/ja-JP/category/7054521406419107846`
   - Chat and messaging functionality documentation

3. **ビデオ会議 (Video Meetings)**
   - URL: `/hc/ja-JP/category/7054521406414962693`
   - Video conferencing features and guides

4. **会議室 (Meeting Rooms)**
   - URL: `/hc/ja-JP/category/7134958336037879813`
   - Physical meeting room management features

5. **Docs (Cloud Documents)**
   - URL: `/hc/ja-JP/category/7101974726288900101`
   - Document creation and collaboration tools

6. **Base (多次元表格)**
   - URL: `/hc/ja-JP/category/7145816891410366470`
   - Multidimensional tables and database features

7. **メール (Email)**
   - URL: `/hc/ja-JP/category/7054521406431707142`
   - Email functionality within Lark

8. **カレンダー (Calendar)**
   - URL: `/hc/ja-JP/category/7054521406423302150`
   - Calendar and scheduling features

9. **承認 (Approval)**
   - URL: `/hc/ja-JP/category/7054521406448467974`
   - Workflow and approval processes

10. **勤怠管理 (Attendance Management)**
    - URL: `/hc/ja-JP/category/7054521406452662277`
    - Time tracking and attendance features

11. **ワークプレイス (Workplace)**
    - URL: `/hc/ja-JP/category/7054521406444273670`
    - Workplace management features

12. **管理コンソール (Admin Console)**
    - URL: `/hc/ja-JP/category/7054521403504099333`
    - Administrative tools and settings

## Content Organization Features

### Key Sections
- **はじめてガイド (First-Time Guide)** - Onboarding content for new users
- **製品実践 (Product Practices)** - Practical use cases and best practices
- **更新履歴 (Update History)** - Product updates and release notes
- **学習広場 (Learning Square)** - Educational resources and tutorials
- **おすすめ記事 (Recommended Articles)** - Featured and popular content

## Information Architecture Characteristics

### Structure Type
- **Hierarchical**: Main categories → Subcategories → Individual articles
- **Topic-based**: Organized by product features rather than user tasks
- **Language-specific**: Dedicated Japanese language version with localized content

### Navigation Patterns
1. **Category-based browsing**: Users can navigate through main product categories
2. **Search functionality**: Allows direct search for specific topics
3. **Cross-references**: Related articles and see-also links within content

### Content Types
- How-to guides
- Feature explanations
- Troubleshooting articles
- Best practices
- Video tutorials
- FAQ sections

## URL Structure
- Base URL: `https://www.larksuite.com/hc/ja-JP/`
- Category pattern: `/hc/ja-JP/category/{numeric_id}`
- Article pattern: `/hc/ja-JP/articles/{numeric_id}`
- Language code: `ja-JP` for Japanese content

## Metadata Organization
- Each category has:
  - Unique numeric identifier
  - Japanese title
  - Brief description
  - Associated icon
  - Link to category page

## Key Observations

1. **Comprehensive Coverage**: The documentation covers all major Lark features from basic messaging to advanced admin controls

2. **User-Centric Design**: Multiple entry points including getting started guides, learning resources, and recommended articles

3. **Modular Structure**: Each product feature has its own category, making it easy to find specific information

4. **Consistent Navigation**: Uniform structure across all categories with predictable URL patterns

5. **Localization**: Fully localized Japanese interface and content, suggesting strong support for Japanese market

## Recommendations for Content Extraction

When extracting content from this documentation:
1. Start with the main category pages to understand the full scope
2. Follow the hierarchical structure to ensure complete coverage
3. Pay attention to cross-references between articles
4. Consider extracting metadata (update dates, tags) for context
5. Preserve the category structure in any reorganized format
