# ログイン機能実装プラン

## 概要

このドキュメントは、Team Tasksアプリケーションにログイン機能を実装するための詳細なプランです。
社内メンバー専用のため、専用のログイン画面は不要とし、Google Apps Scriptの認証機能を活用します。

## 現状の課題

- 認証機能が全くない（誰でもアクセス可能）
- ヘッダーのドロップダウンで任意のユーザーに切り替え可能
- データは全てクライアント側のメモリに保存（リロードで消失）
- Gemini APIキーがクライアント側に露出している
- `Session.getActiveUser()`などのGAS認証機能を未使用

## 実装プラン

### 1. Google Apps Script認証の実装

#### 対象ファイル: `Code.gs`

**実装内容:**
- `Session.getActiveUser()`を使用してログイン中のGoogleアカウントを自動識別
- ドメイン制限を追加（社内メールアドレスのみアクセス可）
- 認証されたユーザー情報を返すサーバー関数を追加

**追加する関数:**
```javascript
function doGet() {
  const userEmail = Session.getActiveUser().getEmail();

  // ドメイン制限（社内メールのみ）
  if (!userEmail.endsWith('@yourcompany.com')) {
    return HtmlService.createHtmlOutput('アクセスが拒否されました。社内メールアドレスが必要です。');
  }

  const template = HtmlService.createTemplateFromFile('index-inline');
  template.userEmail = userEmail;

  return template.evaluate()
    .setTitle('Team Tasks')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getCurrentUser() {
  const email = Session.getActiveUser().getEmail();
  const userInfo = getUserInfo(email);

  if (!userInfo) {
    throw new Error('ユーザーが見つかりません');
  }

  return {
    email: email,
    displayName: userInfo.displayName,
    role: userInfo.role
  };
}
```

---

### 2. サーバー側データ管理機能の実装

#### 対象ファイル: `Code.gs`

**実装内容:**
- タスクのCRUD操作を行うサーバー関数を追加
- ロールベースのアクセス制御（ADMIN: 全タスク閲覧、USER: 自分のタスクのみ）
- Gemini API呼び出しをサーバー側に移動

**追加する関数:**
```javascript
// タスク取得（ロール別フィルタリング）
function getTasks() {
  const user = getCurrentUser();
  const allTasks = loadTasksFromStorage();

  if (user.role === 'ADMIN') {
    return allTasks;
  }

  // 一般ユーザーは自分に割り当てられたタスクのみ
  return allTasks.filter(task => task.assignee === user.email);
}

// タスク作成
function createTask(taskData) {
  const user = getCurrentUser();
  const tasks = loadTasksFromStorage();

  const newTask = {
    ...taskData,
    id: generateTaskId(),
    createdBy: user.email,
    createdAt: new Date().toISOString()
  };

  tasks.push(newTask);
  saveTasksToStorage(tasks);

  return newTask;
}

// タスク更新
function updateTask(taskId, updates) {
  const user = getCurrentUser();
  const tasks = loadTasksFromStorage();

  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    throw new Error('タスクが見つかりません');
  }

  // 権限チェック
  if (user.role !== 'ADMIN' && tasks[taskIndex].assignee !== user.email) {
    throw new Error('このタスクを更新する権限がありません');
  }

  tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
  saveTasksToStorage(tasks);

  return tasks[taskIndex];
}

// タスク削除
function deleteTask(taskId) {
  const user = getCurrentUser();

  if (user.role !== 'ADMIN') {
    throw new Error('タスクを削除する権限がありません');
  }

  const tasks = loadTasksFromStorage();
  const filteredTasks = tasks.filter(t => t.id !== taskId);
  saveTasksToStorage(filteredTasks);

  return { success: true };
}

// Gemini API呼び出し（サーバー側）
function parseTaskWithAI(description) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{
      parts: [{
        text: `以下のタスク説明から、タイトル、詳細、期限、優先度を抽出してJSON形式で返してください:\n${description}`
      }]
    }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());

  return result;
}
```

---

### 3. データストレージの実装

**実装方法: Properties Service + Google Sheets（オプション）**

#### Option A: Properties Service（シンプル、小規模データ向け）

```javascript
// ユーザー情報の保存・取得
function getUserInfo(email) {
  const usersJson = PropertiesService.getScriptProperties().getProperty('USERS');
  const users = usersJson ? JSON.parse(usersJson) : [];
  return users.find(u => u.email === email);
}

function saveUsers(users) {
  PropertiesService.getScriptProperties().setProperty('USERS', JSON.stringify(users));
}

// タスクデータの保存・取得
function loadTasksFromStorage() {
  const tasksJson = PropertiesService.getScriptProperties().getProperty('TASKS');
  return tasksJson ? JSON.parse(tasksJson) : [];
}

function saveTasksToStorage(tasks) {
  PropertiesService.getScriptProperties().setProperty('TASKS', JSON.stringify(tasks));
}

// 初期データのセットアップ
function setupInitialData() {
  const initialUsers = [
    { email: 'boss@example.com', displayName: '社長', role: 'ADMIN' },
    { email: 'tanaka@example.com', displayName: '田中', role: 'USER' },
    { email: 'suzuki@example.com', displayName: '鈴木', role: 'USER' },
    { email: 'sato@example.com', displayName: '佐藤', role: 'USER' }
  ];
  saveUsers(initialUsers);

  // constants.tsからタスクデータを移行
  const initialTasks = []; // 既存のTASKS配列をコピー
  saveTasksToStorage(initialTasks);
}
```

#### Option B: Google Sheets（大規模データ、データ管理UI必要な場合）

```javascript
function getSpreadsheet() {
  const ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return SpreadsheetApp.openById(ssId);
}

function loadTasksFromStorage() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Tasks');
  const data = sheet.getDataRange().getValues();

  // ヘッダー行を除外してオブジェクトに変換
  return data.slice(1).map(row => ({
    id: row[0],
    title: row[1],
    description: row[2],
    assignee: row[3],
    dueDate: row[4],
    priority: row[5],
    status: row[6],
    createdBy: row[7],
    createdAt: row[8]
  }));
}

function saveTasksToStorage(tasks) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Tasks');

  // シートをクリア
  sheet.clear();

  // ヘッダー行
  sheet.appendRow(['ID', 'Title', 'Description', 'Assignee', 'DueDate', 'Priority', 'Status', 'CreatedBy', 'CreatedAt']);

  // データ行
  tasks.forEach(task => {
    sheet.appendRow([
      task.id,
      task.title,
      task.description,
      task.assignee,
      task.dueDate,
      task.priority,
      task.status,
      task.createdBy,
      task.createdAt
    ]);
  });
}
```

---

### 4. OAuth設定の追加

#### 対象ファイル: `appsscript.json`

**更新内容:**
```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/script.scriptapp"
  ],
  "webapp": {
    "executeAs": "USER_ACCESSING",
    "access": "DOMAIN"
  }
}
```

**説明:**
- `executeAs: "USER_ACCESSING"`: アクセスしたユーザーの権限で実行
- `access: "DOMAIN"`: ドメイン内のユーザーのみアクセス可能

---

### 5. フロントエンド（React）の更新

#### 5.1 対象ファイル: `components/Header.tsx`

**変更内容:**
- ユーザー切り替えドロップダウンを削除
- 現在のユーザー情報を表示のみに変更

**更新後のコード:**
```typescript
export function Header({ currentUser }: HeaderProps) {
  return (
    <header className="bg-blue-600 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">Team Tasks</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm">
            {currentUser.displayName} ({currentUser.role === 'ADMIN' ? '管理者' : '社員'})
          </span>
        </div>
      </div>
    </header>
  );
}
```

#### 5.2 対象ファイル: `App.tsx`

**変更内容:**
- `google.script.run`を使ってサーバー関数を呼び出す
- 定数ファイルからの読み込みをサーバーAPIに変更

**主な変更:**
```typescript
useEffect(() => {
  // ユーザー情報の取得
  google.script.run
    .withSuccessHandler((user: User) => {
      setCurrentUser(user);
    })
    .withFailureHandler((error: Error) => {
      console.error('ユーザー情報の取得に失敗しました', error);
    })
    .getCurrentUser();

  // タスク一覧の取得
  google.script.run
    .withSuccessHandler((tasks: Task[]) => {
      setTasks(tasks);
    })
    .withFailureHandler((error: Error) => {
      console.error('タスクの取得に失敗しました', error);
    })
    .getTasks();
}, []);

const handleAddTask = (taskDetails: Partial<Task>) => {
  google.script.run
    .withSuccessHandler((newTask: Task) => {
      setTasks(prev => [...prev, newTask]);
    })
    .withFailureHandler((error: Error) => {
      console.error('タスクの追加に失敗しました', error);
    })
    .createTask(taskDetails);
};

const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
  google.script.run
    .withSuccessHandler((updatedTask: Task) => {
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    })
    .withFailureHandler((error: Error) => {
      console.error('タスクの更新に失敗しました', error);
    })
    .updateTask(taskId, updates);
};
```

#### 5.3 対象ファイル: `constants.ts`

**変更内容:**
- ユーザーリストとタスクリストを削除（サーバー側に移行）
- 定数のみ残す

#### 5.4 型定義の追加: `types/google-apps-script.d.ts`

**新規作成:**
```typescript
declare namespace google {
  namespace script {
    interface Run {
      withSuccessHandler(handler: (result: any) => void): Run;
      withFailureHandler(handler: (error: Error) => void): Run;
      getCurrentUser(): void;
      getTasks(): void;
      createTask(taskData: any): void;
      updateTask(taskId: string, updates: any): void;
      deleteTask(taskId: string): void;
      parseTaskWithAI(description: string): void;
    }
    const run: Run;
  }
}
```

---

### 6. 環境変数の移動

#### Gemini APIキーをサーバー側に保存

**手順:**
1. Google Apps Scriptのスクリプトプロパティに設定
2. フロントエンドからAPIキーを削除

**設定方法:**
```javascript
// スクリプトエディタで一度だけ実行
function setApiKey() {
  PropertiesService.getScriptProperties()
    .setProperty('GEMINI_API_KEY', 'YOUR_ACTUAL_API_KEY');
}
```

**フロントエンドの更新:**
- 環境変数 `process.env.API_KEY` の使用箇所を削除
- `google.script.run.parseTaskWithAI()` の呼び出しに変更

---

## 実装の順序

### フェーズ1: 基本認証（2時間）
1. `appsscript.json`の更新
2. `Code.gs`に認証機能を追加
3. ドメイン制限の実装
4. デプロイとテスト

### フェーズ2: データ永続化（2時間）
1. Properties Serviceのセットアップ
2. データ保存・取得関数の実装
3. 初期データのマイグレーション
4. テスト

### フェーズ3: サーバーAPI（1.5時間）
1. CRUD関数の実装
2. ロールベースアクセス制御の実装
3. エラーハンドリングの追加
4. テスト

### フェーズ4: フロントエンド更新（1.5時間）
1. `Header.tsx`の更新
2. `App.tsx`に`google.script.run`を統合
3. `constants.ts`のクリーンアップ
4. 型定義の追加
5. テスト

### フェーズ5: セキュリティ強化（1時間）
1. Gemini APIキーの移行
2. サーバー側API呼び出しの実装
3. フロントエンドからAPIキー削除
4. 最終テスト

**合計見積もり時間: 8時間**

---

## テスト計画

### 認証テスト
- [ ] 社内ドメインのメールアドレスでアクセス可能
- [ ] 社外ドメインのメールアドレスでアクセス拒否
- [ ] ユーザー情報が正しく取得される

### 権限テスト
- [ ] ADMIN: 全タスクが閲覧可能
- [ ] USER: 自分のタスクのみ閲覧可能
- [ ] USER: 他人のタスクを更新できない
- [ ] USER: タスクを削除できない
- [ ] ADMIN: 全てのタスクを操作可能

### データ永続化テスト
- [ ] タスクの作成が保存される
- [ ] タスクの更新が保存される
- [ ] ページリロード後もデータが保持される

### セキュリティテスト
- [ ] APIキーがクライアント側に露出していない
- [ ] サーバー側でAPIキーが正しく使用される
- [ ] 認証されていないリクエストが拒否される

---

## デプロイ手順

1. コードの変更をコミット
2. `clasp push`でGASにプッシュ
3. Webアプリとして新バージョンをデプロイ
4. アクセス設定を「ドメイン内のユーザー」に変更
5. 初期データセットアップ関数を実行
6. テストユーザーでアクセステスト

---

## ロールバック計画

問題が発生した場合の対処:
1. 以前のデプロイバージョンに切り替え
2. Gitで該当コミットをrevert
3. `clasp push`で再デプロイ

---

## 今後の拡張案

- ログイン履歴の記録
- ユーザー管理UI（管理者向け）
- タスクの一括インポート/エクスポート
- 通知機能（期限が近いタスクのメール通知）
- タスクのコメント機能
- タスクの履歴管理

---

## 参考資料

- [Google Apps Script - Session Service](https://developers.google.com/apps-script/reference/base/session)
- [Google Apps Script - Properties Service](https://developers.google.com/apps-script/reference/properties/properties-service)
- [Google Apps Script - Web Apps](https://developers.google.com/apps-script/guides/web)
- [Google Apps Script - OAuth Scopes](https://developers.google.com/apps-script/concepts/scopes)
