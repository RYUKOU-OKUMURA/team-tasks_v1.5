# GAS Web アプリ開発・デプロイ完全ガイド（チーム用）

このドキュメントは、Google Apps Script（GAS）の HtmlService を使った Web アプリを、React + Vite ベースのフロントエンドで安定的に開発・デプロイするための知見と手順をまとめたものです。プロジェクト開始前・開発中・リリース前のチェックリストとして常に参照してください。

最終更新: 2025-11-03 23:23（ローカル）

---

## 1. GAS で動くフロントエンドの基本制約

GAS の HtmlService で配信されるページは、以下のブラウザ制約/相違に注意が必要です。

- ES Modules（`<script type="module">`）、Import Maps（`<script type="importmap">`）は使用不可。
- 動的インポート（`import()`）やコードスプリットは原則非対応。
- 近年のブラウザ API は一部制限されることがある（`window`/`document` は使えるが、サンドボックスでの実行）。
- IFRAME サンドボックス関連の一般的な警告が出ることがあるが、多くは無視してよい（機能ポリシーの警告など）。
- `HtmlService` の `XFrameOptionsMode` を `ALLOWALL` にしないと、埋め込み先によっては表示されない場合がある。
- CSS/CDN は基本的に利用可能だが、Tailwind CDN のように「本番では推奨されない」という警告は出る（致命的ではない）。

結論: 「単一のクラシック（IIFE）スクリプト」を DOM 構築後に実行する形にまとめると安定して動きます。

---

## 2. 本プロジェクトの採用方針（React + Vite）

- Vite でビルドして、単一の IIFE バンドル（ES2017 互換）を出力します。
- ビルド後の `dist/index.html` をポストプロセスし、バンドル JS をインライン化した `index-inline.html` を生成します。
- GAS 側は `Code.gs` の `doGet()` で `index-inline.html` を返すだけに簡素化します。
- これにより、ESM/ImportMap 不要・外部資産解決不要・読み込み順問題の最小化を実現します。

---

## 3. リポジトリ構成（要点）

- `vite.config.ts`: GAS 互換な単一ファイル IIFE 出力設定。
- `scripts/inline-html.mjs`: ビルド成果物をインライン化し、DOM 構築後に実行されるようラップ。
- `index-inline.html`: GAS が実際に返す完成 HTML（リポジトリ直下に出力）。
- `Code.gs`: `HtmlService.createHtmlOutputFromFile('index-inline')` で配信。
- `appsscript.json`: スコープ・権限・エントリポイント等の設定（必要に応じて編集）。

---

## 4. ローカル開発（React 側）

1) 依存関係のインストール
```
npm install
```

2) 開発サーバの起動（ローカル確認）
```
npm run dev
```
- 通常の Vite 開発体験（HMR）で UI を作り込みます。
- ローカルでは ESM が使えますが、本番（GAS）では IIFE に束ねられる点を意識してください。

3) 環境変数（例: Gemini API キー）
- `.env.local` に `GEMINI_API_KEY` を設定。
- `vite.config.ts` の `define` 経由で `process.env.GEMINI_API_KEY` が埋め込まれます。
- セキュリティ: フロントに埋め込む値は秘匿できません。機密性が必要な処理は GAS 側（サーバ）へ移す設計を検討してください。

---

## 5. GAS 用ビルド手順

```
# 1) 依存をインストール
npm install

# 2) ビルド（Vite -> ポストビルドでインライン化）
npm run build
```

- `dist/index.html` が生成され、その後 `scripts/inline-html.mjs` により
  - Import Map と未出力の CSS リンクを削除
  - バンドル JS をクラシック `<script>` として `index-inline.html` にインライン埋め込み
  - 実行タイミングは `DOMContentLoaded` 後に調整（`document.body.appendChild`）
- 生成先: リポジトリ直下に `index-inline.html`

生成される HTML の要点:
- `<div id="root"></div>` が `<body>` に存在
- 余計な `<script type="module">` や `<script type="importmap">` は存在しない
- インライン化された `<script>` は DOM 構築後に実行される

---

## 6. GAS 側の構成とデプロイ

### 6.1 `Code.gs`（サンプル）
```js
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index-inline')
    .setTitle('Team Tasks')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

- `index-inline.html` は拡張子不要で参照。GAS プロジェクト内にファイルを含めること。

### 6.2 clasp を使った運用（推奨）

1) 初期化（初回のみ）
```
# Google アカウントにログイン
npm i -g @google/clasp
clasp login

# 既存の Apps Script プロジェクトに紐づける or 新規作成
clasp create --type webapp --title "Team Tasks" --rootDir ./
```

2) `appsscript.json` の確認
- `timeZone`, `exceptionLogging`, `webapp` の設定を適宜。
- Web アプリとして動かす場合、Web アプリの公開設定（自分 or 組織内 or 全世界）を管理画面から調整。

3) ファイルの反映
```
# 「index-inline.html」を含めて push
clasp push
```

4) デプロイ/更新
```
# 新規デプロイ
clasp deploy -d "v1: initial deploy"

# 既存デプロイの更新（deploymentId を指定）
clasp deploy --deploymentId <ID> -d "v2: UI updates"
```

5) 公開 URL の確認
- GAS の管理画面 or `clasp open` から Web アプリ URL を取得。

---

## 7. よくある落とし穴と回避策

- エラー: `Uncaught SyntaxError: Invalid or unexpected token`
  - 原因: ESM（`type="module"`）や Import Map をそのまま出している。
  - 解決: 本ガイドのビルド設定（IIFE 化 + インライン化）を使う。

- エラー: `Could not find root element to mount to`
  - 原因: スクリプトが `<head>` 内で DOM 構築前に実行された。
  - 解決: インラインスクリプトを `DOMContentLoaded` 後に追加（本プロジェクトの `inline-html.mjs` で対応済み）。

- Tailwind CDN の警告
  - 影響: 動作はする。最適化観点からはビルド導入が望ましい。
  - 対応: 後日 PostCSS/CLI でビルド導入を検討。

- 外部キー/シークレットの扱い
  - 影響: クライアント側に埋め込むと秘匿できない。
  - 対応: 重要処理や秘匿値は GAS サーバ側で行い、`google.script.run` 等で橋渡しする。

- 画像やフォント等のアセット
  - 対応: できるだけバンドルへインライン化（`assetsInlineLimit` を大きめに設定済み）。

---

## 8. 事前チェックリスト（開発〜デプロイ）

- [ ] `vite.config.ts` の `build.target = 'es2017'`、`format: 'iife'`、`inlineDynamicImports: true` が設定されている
- [ ] `scripts/inline-html.mjs` が Import Map 削除 + DOMContentLoaded 待ちに対応している
- [ ] `npm run build` 後、リポジトリ直下に `index-inline.html` が生成されている
- [ ] `index-inline.html` 内に `type="module"` や `importmap` が残っていない
- [ ] `<div id="root"></div>` が `<body>` 内に存在する
- [ ] `Code.gs` が `HtmlService.createHtmlOutputFromFile('index-inline')` を返している
- [ ] clasp で `index-inline.html` を含めて `push` 済み
- [ ] デプロイ（`clasp deploy`）済み、公開 URL が有効

---

## 9. トラブルシューティング（迅速版）

- 真っ白になる / 描画されない
  - ブラウザコンソールを確認：エラーの種類で切り分け
  - ESM/ImportMap 関連 → ビルド設定/インライン化スクリプトを再確認
  - `root element` 関連 → 実行タイミング（DOMContentLoaded 待ち）を再確認

- GAS 側ログで確認したい
  - `Logger.log()` を `Code.gs` で使用
  - クライアント→サーバ呼び出しは `google.script.run`（HTML から GAS 関数呼出）

- CSP/X-Frame-Options 問題
  - `setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)` を考慮
  - 組織ポリシーで制限される場合は管理者に確認

---

## 10. ベストプラクティス

- フロントエンドは「依存少・単一バンドル」でまとめ、GAS 互換を第一に
- 実行タイミングは必ず DOM 構築後（`DOMContentLoaded` or ボディ末尾で挿入）
- 秘匿情報はフロントに埋め込まない（必要なら GAS 側経由へ）
- 依存 CDN はできる限りビルドに取り込む（CDN 障害リスク軽減）
- 小さくリリースして素早く検証（`clasp` のバージョンコメントを活用）

---

## 11. 参考スニペット

### 11.1 doGet（GAS）
```js
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index-inline')
    .setTitle('My App')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

### 11.2 DOM 構築後に実行するラッパ（インライン化スクリプトの核心）
```html
<script>
;(function(){
  function run(){
    const script = document.createElement('script');
    script.type = 'text/javascript'; // 重要: 非モジュール
    script.text = "/* ここに IIFE バンドル内容 */";
    (document.body || document.documentElement).appendChild(script);
  }
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
</script>
```

---

## 12. 今後の改善案（任意）

- Tailwind を PostCSS/CLI でビルド導入（CDN 警告の排除・パフォーマンス向上）
- クライアント/サーバ通信の整備（`google.script.run` ラッパの型安全化）
- 簡易 E2E チェック（Puppeteer 等）で `#root` 存在と初期レンダリングをヘッドレス検証
- デプロイ自動化（GitHub Actions から `clasp push` / `clasp deploy`）

---

このガイドに従えば、GAS 上で React アプリを白画面や実行時エラーなく安定して動かし、スムーズにデプロイできます。疑問点や追加したいテンプレがあれば、チームで本ファイルを更新して運用してください。