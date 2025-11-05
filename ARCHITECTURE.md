# Team Tasks v1.5 - アーキテクチャドキュメント

このドキュメントは、Team Tasks v1.5アプリケーションの仕様と連携をMermaid図で可視化したものです。

## 目次
1. [システム全体構成](#システム全体構成)
2. [コンポーネント階層](#コンポーネント階層)
3. [データモデル](#データモデル)
4. [認証・認可フロー](#認証認可フロー)
5. [タスク操作フロー](#タスク操作フロー)
6. [タスクステータス遷移](#タスクステータス遷移)
7. [外部サービス連携](#外部サービス連携)
8. [デプロイメントフロー](#デプロイメントフロー)

---

## システム全体構成

```mermaid
graph TB
    subgraph "ブラウザ環境"
        User[👤 ユーザー]
        Browser[🌐 ブラウザ]
    end

    subgraph "Google Apps Script Web App"
        subgraph "フロントエンド層"
            React[⚛️ React 19 + TypeScript]
            Tailwind[🎨 Tailwind CSS]
            Vite[⚡ Vite Build Tool]
        end

        subgraph "バックエンド層"
            GAS[📜 Google Apps Script<br/>Code.gs]
            Auth[🔐 認証・認可]
            API[🔌 API Functions]
        end

        subgraph "データストレージ"
            Props[💾 PropertiesService<br/>USERS / TASKS / API_KEY]
        end
    end

    subgraph "外部サービス"
        Gemini[🤖 Gemini 2.5 Flash API<br/>タスク解析]
        Calendar[📅 Google Calendar<br/>イベント作成]
        Chat[💬 Google Chat<br/>タスク共有]
    end

    User --> Browser
    Browser --> React
    React <-->|google.script.run| GAS
    React --> Tailwind
    Vite -.->|ビルド| React

    GAS --> Auth
    GAS --> API
    API <--> Props
    API -->|parseTaskWithAI| Gemini
    React -->|リンク生成| Calendar
    React -->|共有機能| Chat

    style React fill:#61dafb,stroke:#333,stroke-width:2px
    style GAS fill:#ffcc00,stroke:#333,stroke-width:2px
    style Gemini fill:#4285f4,stroke:#333,stroke-width:2px
    style Props fill:#34a853,stroke:#333,stroke-width:2px
```

---

## コンポーネント階層

```mermaid
graph TD
    App[App.tsx<br/>📦 メインコンテナ<br/>State管理]

    Header[Header.tsx<br/>📋 ヘッダー<br/>ユーザー情報表示]

    AdminView{👑 管理者ビュー}
    UserView{👤 ユーザービュー}

    TaskInput[TaskInput.tsx<br/>✏️ タスク作成<br/>AI解析対応]
    FilterBar[FilterBar.tsx<br/>🔍 フィルター<br/>担当者/優先度/期限切れ]
    TaskList[TaskList.tsx<br/>📝 タスク一覧<br/>フィルタリング済み]
    TaskModal[TaskModal.tsx<br/>✨ 編集モーダル<br/>詳細編集]

    UserDash[UserDashboard.tsx<br/>📊 個人ダッシュボード<br/>ステータス別表示]

    TaskItem[TaskItem.tsx<br/>📄 タスクカード<br/>サブタスク対応]

    Utils[🛠️ Utilities]
    DateUtils[dateUtils.ts<br/>日付フォーマット]
    CmdParser[commandParser.ts<br/>コマンド解析]

    App --> Header
    App --> AdminView
    App --> UserView

    AdminView --> TaskInput
    AdminView --> FilterBar
    AdminView --> TaskList
    AdminView --> TaskModal

    UserView --> UserDash

    TaskList --> TaskItem
    UserDash --> TaskItem

    App --> Utils
    Utils --> DateUtils
    Utils --> CmdParser

    style App fill:#ff6b6b,stroke:#333,stroke-width:3px
    style AdminView fill:#ffd93d,stroke:#333,stroke-width:2px
    style UserView fill:#6bcf7f,stroke:#333,stroke-width:2px
    style TaskItem fill:#4d96ff,stroke:#333,stroke-width:2px
```

---

## データモデル

```mermaid
erDiagram
    USER ||--o{ TASK : "assigned_to"
    TASK ||--o{ TASK : "has_subtasks"

    USER {
        string email PK
        string displayName
        enum role "ADMIN | USER"
    }

    TASK {
        string id PK "timestamp + random"
        string title
        string assigneeEmail FK
        string assigneeName
        string dueDate "ISO8601"
        enum priority "High | Med | Low"
        enum status "TODO | REPORTED | DONE"
        string createdBy FK
        string createdAt "ISO8601"
        string updatedAt "ISO8601"
        string parentTaskId FK "optional"
    }

    PROPERTIES_SERVICE {
        json USERS "全ユーザーデータ"
        json TASKS "全タスクデータ"
        string GEMINI_API_KEY "AIサービスキー"
    }

    TASK }o--|| PROPERTIES_SERVICE : "stored_in"
    USER }o--|| PROPERTIES_SERVICE : "stored_in"
```

---

## 認証・認可フロー

```mermaid
sequenceDiagram
    actor User as 👤 ユーザー
    participant Browser as 🌐 ブラウザ
    participant GAS as 📜 Google Apps Script
    participant Session as 🔐 Session API
    participant App as ⚛️ React App

    User->>Browser: アクセス
    Browser->>GAS: doGet() リクエスト
    GAS->>Session: getActiveUser().getEmail()
    Session-->>GAS: userEmail

    alt 内部ドメイン (@example.com)
        GAS->>GAS: ✅ 許可
    else 外部テスター
        GAS->>GAS: ALLOWED_TESTER_EMAILS チェック
        alt リストに存在
            GAS->>GAS: ✅ 許可
        else 存在しない
            GAS-->>Browser: ❌ アクセス拒否メッセージ
        end
    end

    GAS->>Browser: HTMLテンプレート + userEmail
    Browser->>App: React起動
    App->>GAS: getCurrentUser() 呼び出し
    GAS->>GAS: ロール判定 (ADMIN/USER)
    GAS-->>App: User { email, displayName, role }

    alt ADMIN ロール
        App->>App: 管理者ビュー表示
        App->>GAS: getTasks() - 全タスク取得
    else USER ロール
        App->>App: ユーザービュー表示
        App->>GAS: getTasks() - 自分のタスクのみ
    end

    GAS-->>App: タスクデータ
    App->>Browser: UI レンダリング
    Browser->>User: 表示
```

---

## タスク操作フロー

### 管理者：タスク作成フロー

```mermaid
sequenceDiagram
    actor Admin as 👑 管理者
    participant UI as ✏️ TaskInput
    participant App as ⚛️ App State
    participant GAS as 📜 Code.gs
    participant Gemini as 🤖 Gemini API
    participant Storage as 💾 PropertiesService

    Admin->>UI: 自然言語でタスク入力<br/>例: "11/20までにレポート作成"
    UI->>App: handleCreateTask(description)
    App->>App: isCreatingTask = true
    App->>GAS: createTask(taskData)

    alt サブタスクでない
        GAS->>Gemini: parseTaskWithAI(description)
        Gemini-->>GAS: { title, dueDate }
        GAS->>GAS: 日付バリデーション<br/>(過去日チェック)
    else サブタスク
        GAS->>GAS: AI解析スキップ<br/>親タスクの情報継承
    end

    GAS->>GAS: タスクIDを生成<br/>(timestamp + random)
    GAS->>Storage: タスクデータ保存 (TASKS)
    Storage-->>GAS: 保存完了
    GAS-->>App: 新しいタスク
    App->>App: タスクリストを更新
    App->>App: isCreatingTask = false
    App->>UI: UI更新
    UI->>Admin: ✅ タスク作成完了
```

### ユーザー：タスク完了報告フロー

```mermaid
sequenceDiagram
    actor User as 👤 ユーザー
    participant Dash as 📊 UserDashboard
    participant App as ⚛️ App State
    participant GAS as 📜 Code.gs
    participant Storage as 💾 PropertiesService

    User->>Dash: "完了報告"ボタンクリック
    Dash->>App: handleUpdateTask(taskId, status: REPORTED)
    App->>GAS: updateTask(taskId, { status: 'REPORTED' })

    GAS->>GAS: 権限チェック<br/>ユーザーは自分のタスクのみ
    alt 権限あり
        GAS->>Storage: ステータス更新<br/>TODO → REPORTED
        Storage-->>GAS: 更新完了
        GAS-->>App: 更新済みタスク
        App->>App: タスクリスト更新
        App->>Dash: UI更新
        Dash->>User: ✅ 報告完了<br/>(管理者承認待ち)
    else 権限なし
        GAS-->>App: ❌ エラー
        App->>Dash: エラー表示
    end
```

### 管理者：完了承認フロー

```mermaid
sequenceDiagram
    actor Admin as 👑 管理者
    participant List as 📝 TaskList
    participant App as ⚛️ App State
    participant GAS as 📜 Code.gs
    participant Storage as 💾 PropertiesService

    Admin->>List: 報告済みタスクを確認<br/>(黄色枠で表示)
    Admin->>List: "完了"ボタンクリック
    List->>App: handleUpdateTask(taskId, status: DONE)
    App->>GAS: updateTask(taskId, { status: 'DONE' })

    GAS->>GAS: ADMIN権限チェック
    GAS->>Storage: ステータス更新<br/>REPORTED → DONE
    Storage-->>GAS: 更新完了
    GAS-->>App: 更新済みタスク
    App->>App: タスクリスト更新
    App->>List: UI更新
    List->>Admin: ✅ タスク承認完了
```

---

## タスクステータス遷移

```mermaid
stateDiagram-v2
    [*] --> TODO: タスク作成<br/>(管理者)

    TODO --> REPORTED: 完了報告<br/>(ユーザー)
    TODO --> DONE: 直接完了<br/>(管理者)

    REPORTED --> DONE: 承認<br/>(管理者)
    REPORTED --> TODO: 差し戻し<br/>(管理者)

    DONE --> TODO: 再開<br/>(管理者)
    DONE --> [*]

    note right of TODO
        🔵 青枠
        未着手タスク
    end note

    note right of REPORTED
        🟡 黄色枠
        承認待ち
    end note

    note right of DONE
        🟢 緑枠
        完了済み
    end note
```

---

## 外部サービス連携

```mermaid
graph LR
    subgraph "アプリケーション"
        TaskItem[📄 TaskItem<br/>タスクカード]
        AI[🤖 AI解析<br/>parseTaskWithAI]
    end

    subgraph "外部サービス"
        Gemini[🤖 Gemini 2.5 Flash API]
        Calendar[📅 Google Calendar]
        Chat[💬 Google Chat]
    end

    subgraph "連携機能"
        Parse[自然言語解析]
        CalLink[カレンダーリンク生成]
        Share[タスク共有]
    end

    AI -->|HTTP POST<br/>JSON Request| Parse
    Parse -->|Extract title + date| Gemini
    Gemini -->|JSON Response| AI

    TaskItem -->|generateGoogleCalendarUrl| CalLink
    CalLink -->|Quick Add URL| Calendar

    TaskItem -->|copyToClipboard<br/>+ window.open| Share
    Share -->|Formatted Message| Chat

    style Gemini fill:#4285f4,stroke:#333,stroke-width:2px
    style Calendar fill:#34a853,stroke:#333,stroke-width:2px
    style Chat fill:#fbbc04,stroke:#333,stroke-width:2px
```

### Gemini API 連携詳細

```mermaid
sequenceDiagram
    participant GAS as 📜 Code.gs
    participant API as 🔌 Gemini API

    GAS->>GAS: PropertiesServiceから<br/>GEMINI_API_KEY取得
    GAS->>API: POST /v1beta/models/gemini-2.0-flash:generateContent
    Note over GAS,API: Headers:<br/>Content-Type: application/json

    Note over GAS,API: Body:<br/>{ contents: [{<br/>  parts: [{ text: "タスク: ..." }]<br/>}] }

    API-->>GAS: JSON Response
    Note over GAS,API: { candidates: [{<br/>  content: {<br/>    parts: [{ text: JSON_STRING }]<br/>  }<br/>}] }

    GAS->>GAS: JSON.parse(responseText)
    GAS->>GAS: Extract { title, dueDate }

    alt 解析成功
        GAS->>GAS: ✅ タスクデータ作成
    else 解析失敗
        GAS->>GAS: ⚠️ デフォルト値使用<br/>title: 入力テキスト<br/>dueDate: null
    end
```

---

## デプロイメントフロー

```mermaid
flowchart TD
    Start([開発開始]) --> Dev[💻 ローカル開発<br/>React + TypeScript]

    Dev --> Install[📦 npm install<br/>依存関係インストール]
    Install --> Build[⚡ npm run build<br/>Vite ビルド]

    Build --> PostBuild[🔧 npm run postbuild<br/>HTML + JS インライン化]
    PostBuild --> Inline[📄 index-inline.html 生成]

    Inline --> Clasp[🚀 clasp push<br/>GAS へデプロイ]

    Clasp --> GASFiles{アップロードファイル}
    GASFiles --> HTML[📄 index-inline.html]
    GASFiles --> CodeGS[📜 Code.gs]
    GASFiles --> Config[⚙️ appsscript.json]

    HTML --> Deploy[🌐 GAS Web App<br/>デプロイ]
    CodeGS --> Deploy
    Config --> Deploy

    Deploy --> Published([✅ 公開完了])

    style Start fill:#95e1d3,stroke:#333,stroke-width:2px
    style Build fill:#ffd93d,stroke:#333,stroke-width:2px
    style Clasp fill:#ff6b6b,stroke:#333,stroke-width:2px
    style Published fill:#6bcf7f,stroke:#333,stroke-width:3px
```

### ビルド設定詳細

```mermaid
graph LR
    subgraph "vite.config.ts"
        ViteConfig[⚙️ Vite 設定]
        Target[🎯 Target: ES2017]
        Single[📦 Single IIFE Bundle]
        NoSplit[🚫 CSS Split 無効]
        Inline[📎 Asset Inline 有効]
    end

    subgraph "Build Output"
        Bundle[📄 index.html + JS]
    end

    subgraph "Post-Build Script"
        Script[🔧 inline-html.js]
        HTMLInline[HTML内にJSを埋め込み]
    end

    subgraph "Final Output"
        Final[📄 index-inline.html<br/>完全に自己完結]
    end

    ViteConfig --> Target
    ViteConfig --> Single
    ViteConfig --> NoSplit
    ViteConfig --> Inline

    Target --> Bundle
    Single --> Bundle
    NoSplit --> Bundle
    Inline --> Bundle

    Bundle --> Script
    Script --> HTMLInline
    HTMLInline --> Final

    style Final fill:#6bcf7f,stroke:#333,stroke-width:3px
```

---

## 技術スタック概要

```mermaid
mindmap
  root((Team Tasks v1.5))
    Frontend
      React 19
        TypeScript
        Hooks
      Tailwind CSS
        Responsive Design
      Vite
        Fast Build
        ES2017
    Backend
      Google Apps Script
        V8 Runtime
        Server-side Logic
      PropertiesService
        JSON Storage
        Users
        Tasks
        API Keys
    External Services
      Gemini 2.5 Flash
        Natural Language Processing
        Task Parsing
      Google Calendar
        Event Creation
        Quick Add Links
      Google Chat
        Task Sharing
        Clipboard Integration
    Build & Deploy
      npm
        Package Management
      Vite Build
        Asset Bundling
        Inlining
      clasp
        GAS Deployment
    Auth & Security
      Google Session API
        User Authentication
      Domain Validation
        @example.com
      Role-Based Access
        ADMIN
        USER
```

---

## まとめ

このアーキテクチャドキュメントは、Team Tasks v1.5の以下の側面を可視化しています：

1. **システム全体構成**: フロントエンド（React）、バックエンド（GAS）、外部サービスの連携
2. **コンポーネント階層**: React コンポーネントの構造と責務
3. **データモデル**: User、Task、PropertiesService の関係
4. **認証・認可フロー**: ユーザー認証とロールベースアクセス制御
5. **タスク操作フロー**: 作成、更新、削除の具体的な処理フロー
6. **タスクステータス遷移**: TODO → REPORTED → DONE のワークフロー
7. **外部サービス連携**: Gemini AI、Google Calendar、Google Chat との統合
8. **デプロイメントフロー**: ローカル開発から本番デプロイまでのプロセス

これらの図により、システムの全体像と各部分の役割が明確になります。
