# 触診・検査アプリ forPT

forPT ONLINE会員向けの触診・整形外科的テスト動画カタログアプリ（PWA）です。

## 📱 特徴

- **モバイル/タブレット最適化**：スマホでの操作を最優先に設計
- **シンプルで視認性の高いUI**：部位→動画を最短タップで探せる
- **埋め込み再生＋YouTubeで開く**：アプリ内再生とネイティブアプリへの遷移を両立
- **オフライン対応**：一覧・検索は通信なしでも利用可能（再生はオンライン）
- **自動更新**：月1回、GitHub Actionsで自動的にYouTubeから最新データを取得

---

## 🚀 デプロイ手順（Cloudflare Pages）

### 1. GitHubリポジトリを作成

このプロジェクトをGitHubにプッシュします。

```bash
git init
git add .
git commit -m "Initial commit: 触診・検査アプリ forPT"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. YouTube Data API キーを取得

#### 手順（所要時間: 5分）

1. **Google Cloud Console** にアクセス  
   https://console.cloud.google.com/

2. **新しいプロジェクトを作成**
   - 画面上部の「プロジェクトを選択」→「新しいプロジェクト」
   - プロジェクト名: `forpt-palpation-app`（任意）
   - 「作成」をクリック

3. **YouTube Data API v3 を有効化**
   - 左メニュー「APIとサービス」→「ライブラリ」
   - 検索窓に `YouTube Data API v3` と入力
   - 「YouTube Data API v3」を選択
   - 「有効にする」をクリック

4. **APIキーを作成**
   - 左メニュー「APIとサービス」→「認証情報」
   - 「認証情報を作成」→「APIキー」
   - APIキーが表示されるのでコピー（例: `AIzaSyD...`）

5. **APIキーを制限（推奨）**
   - 作成したAPIキーの「編集」（鉛筆アイコン）をクリック
   - 「API restrictions」セクションで「API を制限」を選択
   - 「YouTube Data API v3」のみにチェック
   - 「保存」

> **💡 コストについて**  
> YouTube Data API v3 は**デフォルトで1日10,000 unitsまで無料**です。  
> 月1回の同期では約20〜50 units程度しか消費しないため、**実質無料**で運用できます。

### 3. GitHub Secrets に APIキーを登録

1. GitHubリポジトリページを開く
2. 「Settings」→「Secrets and variables」→「Actions」
3. 「New repository secret」をクリック
4. Name: `YOUTUBE_API_KEY`
5. Value: 先ほどコピーしたAPIキーを貼り付け
6. 「Add secret」をクリック

### 4. Cloudflare Pages にデプロイ

1. **Cloudflare ダッシュボード**にログイン  
   https://dash.cloudflare.com/

2. **「Pages」** を選択

3. **「プロジェクトを作成」** をクリック

4. **「Gitに接続」** を選択  
   - GitHubアカウントを連携
   - リポジトリを選択

5. **ビルド設定**
   - フレームワークプリセット: `なし`
   - ビルドコマンド: （空欄）
   - ビルド出力ディレクトリ: `/`（ルート）

6. **「保存してデプロイ」** をクリック

7. デプロイ完了後、URLが発行されます（例: `https://forpt-app.pages.dev`）

---

## 🔄 自動更新の仕組み

### GitHub Actions（月1回自動実行）

- `.github/workflows/sync-youtube.yml` で設定済み
- **毎月1日 00:00 UTC（日本時間09:00）** に自動実行
- YouTube Data APIでプレイリスト内の動画情報を取得
- `data/videos.json` と `data/lastSync.json` を自動更新
- Cloudflare Pages が自動的に再デプロイ

### 手動で同期を実行したい場合

GitHubリポジトリの「Actions」タブ→「YouTube Data Sync」→「Run workflow」

---

## 📂 プロジェクト構成

```
/
├── index.html              # メインHTML
├── manifest.json           # PWA設定
├── sw.js                   # Service Worker（オフライン対応）
├── css/
│   └── style.css           # スタイル
├── js/
│   └── app.js              # アプリロジック
├── data/
│   ├── playlists.json      # プレイリストマスター（手動編集）
│   ├── videos.json         # 動画一覧（自動生成）
│   └── lastSync.json       # 最終同期日時（自動生成）
├── assets/
│   └── logo.png            # ロゴ画像
├── scripts/
│   ├── package.json        # 同期スクリプトの依存関係
│   └── sync.js             # YouTube同期スクリプト
└── .github/workflows/
    └── sync-youtube.yml    # GitHub Actions設定
```

---

## 🛠 ローカル開発

### 1. プロジェクトをクローン

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### 2. ローカルサーバーを起動

```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server
```

### 3. ブラウザで確認

http://localhost:8000

---

## 🎨 カスタマイズ

### ロゴを変更

`assets/logo.png` を差し替えてください。

### プレイリストを追加/変更

`data/playlists.json` を編集して、GitHubにプッシュするだけです。  
次回の自動同期（または手動実行）で反映されます。

---

## 📖 使い方

### ユーザー向け（会員）

1. 配布されたURLにアクセス
2. **ホーム画面に追加**（推奨）
   - iOS Safari: 共有ボタン →「ホーム画面に追加」
   - Android Chrome: メニュー →「ホーム画面に追加」
3. 触診 / 整形外科的テスト を選択
4. 部位を選択
5. 動画を検索または一覧から選択
6. 動画を視聴（アプリ内 or YouTubeで開く）

---

## 🔒 セキュリティ・運用上の注意

### YouTubeの限定公開について

- 現在のYouTube動画は「限定公開（Unlisted）」設定です
- **限定公開 = URLを知っている人は誰でも視聴・共有できる**
- 「ログイン必須」ではないため、URLが広がる可能性があります
- より厳密に管理したい場合は、会員サイト内に認証を追加するか、動画配信基盤を変更する必要があります

### APIキーの管理

- **GitHub Secrets** に保存されているため、外部に漏れることはありません
- APIキーは「YouTube Data API v3のみ」に制限することを推奨します

---

## 📊 クォータと料金

### YouTube Data API v3

- デフォルト: **1日10,000 units**
- `playlistItems.list`: **1 unit/回**
- `videos.list`: **1 unit/回**

月1回の同期で、16プレイリスト × 平均30本 = 約480本の動画を取得する場合：

- プレイリスト取得: 16 units
- 動画詳細取得: 10 units（50本ずつまとめて取得）
- **合計: 約26 units / 月**

→ 実質無料で運用可能です。

---

## 🆘 トラブルシューティング

### 同期が失敗する

1. GitHub Actions の「Actions」タブでログを確認
2. `YOUTUBE_API_KEY` が正しく設定されているか確認
3. YouTube Data API v3 が有効化されているか確認

### 動画が表示されない

1. `data/videos.json` が空でないか確認
2. GitHub Actions を手動実行して同期
3. ブラウザのキャッシュをクリア

### PWAがインストールできない

1. HTTPSで配信されているか確認（Cloudflare Pagesは自動でHTTPS）
2. `manifest.json` と `sw.js` が正しく読み込まれているか確認

---

## 📝 ライセンス・クレジット

© forPT ONLINE

---

## 🎉 完成！

これで「触診・検査アプリ forPT」が完成しました。  
月1回の自動更新で、常に最新の動画情報が反映されます。

**配布URL例**: `https://forpt-app.pages.dev`

会員にこのURLを共有するだけで、すぐに利用できます！
