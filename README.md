# Team Tasks - タスク管理アプリケーション

Google Apps Scriptベースのチームタスク管理アプリケーションです。React/TypeScriptで構築されたフロントエンドと、Google Apps Scriptバックエンドを使用しています。

## 主な機能

- ✅ タスクの作成・更新・削除
- 🤖 Gemini AIによる自然言語からのタスク作成
- 👥 ロールベースのアクセス制御（管理者/社員）
- 📊 サブタスク管理
- 📅 期日管理と期限切れアラート
- 🔐 ドメインベースの認証

## セットアップ

### 前提条件

- Node.js (v16以上)
- Google Apps Scriptアカウント
- Gemini API キー

### ローカル開発

1. 依存関係のインストール:
   ```bash
   npm install
   ```

2. ローカルサーバーの起動:
   ```bash
   npm run dev
   ```

3. ビルド:
   ```bash
   npm run build
   ```

### Google Apps Scriptへのデプロイ

1. Gemini APIキーの設定:
   - Apps Scriptエディタで `setApiKey()` 関数を編集
   - 実際のAPIキーを設定して一度実行
   - 実行後、コード内のAPIキーは削除

2. セキュリティ設定:
   - `setupSecuritySettings()` 関数を編集
   - 内部ドメインと許可されたテスターメールアドレスを設定
   - 一度実行

3. 初期データのセットアップ（オプション）:
   - `setupInitialData()` 関数を一度実行
   - テスト用のユーザーとタスクが作成されます

4. claspでデプロイ:
   ```bash
   npm run build
   clasp push
   clasp deploy
   ```

## アーキテクチャ

詳細なアーキテクチャ情報は [ARCHITECTURE.md](./ARCHITECTURE.md) を参照してください。

## セキュリティ

- APIキーはスクリプトプロパティに安全に保存
- ドメインベースの認証
- ロールベースのアクセス制御
- セキュアなUUIDベースのID生成

## ライセンス

Private
