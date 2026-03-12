// ============================================
// アプリ状態管理
// ============================================
const AppState = {
    playlists: [],
    videos: [],
    currentCategory: null,
    currentBodyPart: null,
    currentVideo: null,
    searchQuery: '',
    lastSync: null,
    isOnline: navigator.onLine
};

// ============================================
// 初期化
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('アプリ初期化開始');
    
    // Service Worker登録
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
    
    // オンライン/オフライン監視
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    handleOnlineStatus(); // 初期状態チェック
    
    // データロード
    await loadData();
    
    // イベントリスナー設定
    setupEventListeners();
    
    // 初期画面表示
    showScreen('category');
    
    console.log('アプリ初期化完了');
});

// ============================================
// データ読み込み
// ============================================
async function loadData() {
    try {
        // プレイリストマスター
        const playlistsRes = await fetch('data/playlists.json');
        AppState.playlists = await playlistsRes.json();
        
        // 動画データ
        const videosRes = await fetch('data/videos.json');
        AppState.videos = await videosRes.json();
        
        // 最終同期日時
        const syncRes = await fetch('data/lastSync.json');
        const syncData = await syncRes.json();
        AppState.lastSync = syncData.lastSync;
        
        updateLastSyncDisplay();
        
        console.log(`データロード完了: ${AppState.videos.length}件の動画`);
    } catch (error) {
        console.error('データロードエラー:', error);
        AppState.playlists = [];
        AppState.videos = [];
    }
}

// ============================================
// 画面切り替え
// ============================================
function showScreen(screenName) {
    // すべての画面を非表示
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById('loading').style.display = 'none';
    
    // 指定された画面を表示
    const targetScreen = document.getElementById(`screen-${screenName}`);
    if (targetScreen) {
        targetScreen.style.display = 'block';
        
        // 画面ごとの初期化
        if (screenName === 'category') {
            // カテゴリー選択画面
        } else if (screenName === 'body-part') {
            renderBodyPartList();
        } else if (screenName === 'video-list') {
            renderVideoList();
        } else if (screenName === 'video-detail') {
            renderVideoDetail();
        }
    }
}

// ============================================
// カテゴリー選択
// ============================================
function setupEventListeners() {
    // カテゴリー選択
    document.querySelectorAll('.btn-category').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.currentTarget.dataset.category;
            AppState.currentCategory = category;
            AppState.currentBodyPart = null;
            showScreen('body-part');
            
            // タイトル更新
            const title = category === 'palpation' ? '触診' : '整形外科的テスト';
            document.getElementById('body-part-title').textContent = `${title} - 部位を選択`;
        });
    });
    
    // 戻るボタン
    document.getElementById('btn-back-to-category').addEventListener('click', () => {
        AppState.currentCategory = null;
        showScreen('category');
    });
    
    document.getElementById('btn-back-to-body-part').addEventListener('click', () => {
        AppState.currentBodyPart = null;
        showScreen('body-part');
    });
    
    document.getElementById('btn-back-to-list').addEventListener('click', () => {
        AppState.currentVideo = null;
        showScreen('video-list');
    });
    
    // 検索
    document.getElementById('search-input').addEventListener('input', (e) => {
        AppState.searchQuery = e.target.value.toLowerCase();
        renderVideoList();
    });
    
    // 更新ボタン
    document.getElementById('btn-refresh').addEventListener('click', async () => {
        const btn = document.getElementById('btn-refresh');
        btn.disabled = true;
        btn.querySelector('.refresh-icon').style.animation = 'spin 0.8s linear infinite';
        
        await loadData();
        renderVideoList();
        
        setTimeout(() => {
            btn.disabled = false;
            btn.querySelector('.refresh-icon').style.animation = '';
        }, 1000);
    });
}

// ============================================
// 部位一覧レンダリング
// ============================================
function renderBodyPartList() {
    const container = document.getElementById('body-part-list');
    container.innerHTML = '';
    
    // 現在のカテゴリーのプレイリストをフィルタ
    const filteredPlaylists = AppState.playlists.filter(p => p.category === AppState.currentCategory);
    
    filteredPlaylists.forEach(playlist => {
        const card = document.createElement('div');
        card.className = `body-part-card ${!playlist.enabled ? 'disabled' : ''}`;
        
        card.innerHTML = `
            <div class="body-part-name">${playlist.bodyPartName}</div>
        `;
        
        if (playlist.enabled) {
            card.addEventListener('click', () => {
                AppState.currentBodyPart = playlist.bodyPart;
                showScreen('video-list');
                
                // タイトル更新
                const categoryTitle = AppState.currentCategory === 'palpation' ? '触診' : '整形外科的テスト';
                document.getElementById('video-list-title').textContent = `${playlist.bodyPartName} - ${categoryTitle}`;
            });
        }
        
        container.appendChild(card);
    });
}

// ============================================
// 動画一覧レンダリング
// ============================================
function renderVideoList() {
    const container = document.getElementById('video-grid');
    const emptyState = document.getElementById('empty-state');
    container.innerHTML = '';
    
    // フィルタリング
    let filteredVideos = AppState.videos.filter(v => 
        v.category === AppState.currentCategory &&
        v.bodyPart === AppState.currentBodyPart
    );
    
    // 検索クエリでフィルタ
    if (AppState.searchQuery) {
        filteredVideos = filteredVideos.filter(v =>
            v.title.toLowerCase().includes(AppState.searchQuery) ||
            (v.description && v.description.toLowerCase().includes(AppState.searchQuery))
        );
    }
    
    // 件数表示
    document.getElementById('video-count').textContent = `${filteredVideos.length}件の動画`;
    
    // 空状態チェック
    if (filteredVideos.length === 0) {
        emptyState.style.display = 'block';
        return;
    } else {
        emptyState.style.display = 'none';
    }
    
    // カード生成
    filteredVideos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'video-card';
        
        const categoryClass = video.category === 'palpation' ? 'palpation' : 'ortho';
        const categoryName = video.category === 'palpation' ? '触診' : '整形外科テスト';
        
        card.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail" loading="lazy">
            <div class="video-card-body">
                <h3 class="video-card-title">${video.title}</h3>
                <div class="video-card-meta">
                    <span class="badge ${categoryClass}">${categoryName}</span>
                    <span class="badge">${video.bodyPartName}</span>
                    ${video.duration ? `<span class="video-duration">${video.duration}</span>` : ''}
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            AppState.currentVideo = video;
            showScreen('video-detail');
        });
        
        container.appendChild(card);
    });
}

// ============================================
// 動画詳細レンダリング
// ============================================
function renderVideoDetail() {
    const video = AppState.currentVideo;
    if (!video) return;
    
    // タイトル
    document.getElementById('detail-title').textContent = video.title;
    
    // カテゴリー・部位バッジ
    const categoryClass = video.category === 'palpation' ? 'palpation' : 'ortho';
    const categoryName = video.category === 'palpation' ? '触診' : '整形外科テスト';
    document.getElementById('detail-category').className = `badge ${categoryClass}`;
    document.getElementById('detail-category').textContent = categoryName;
    document.getElementById('detail-body-part').textContent = video.bodyPartName;
    
    // 長さ
    document.getElementById('detail-duration').textContent = video.duration || '-';
    
    // 説明（あれば）
    const descEl = document.getElementById('detail-description');
    if (video.description) {
        descEl.textContent = video.description;
        descEl.style.display = 'block';
    } else {
        descEl.style.display = 'none';
    }
    
    // YouTube埋め込み
    const playerContainer = document.getElementById('video-player');
    playerContainer.innerHTML = `
        <iframe
            src="https://www.youtube.com/embed/${video.videoId}?rel=0&modestbranding=1"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
        ></iframe>
    `;
    
    // YouTubeで開くボタン
    const youtubeBtn = document.getElementById('btn-open-youtube');
    youtubeBtn.href = `https://www.youtube.com/watch?v=${video.videoId}`;
}

// ============================================
// オンライン/オフライン状態
// ============================================
function handleOnlineStatus() {
    AppState.isOnline = navigator.onLine;
    const notice = document.getElementById('offline-notice');
    
    if (!AppState.isOnline) {
        notice.style.display = 'block';
    } else {
        notice.style.display = 'none';
    }
}

// ============================================
// 最終同期表示
// ============================================
function updateLastSyncDisplay() {
    const el = document.getElementById('last-sync');
    if (AppState.lastSync) {
        const date = new Date(AppState.lastSync);
        el.textContent = `最終更新: ${date.toLocaleString('ja-JP')}`;
    } else {
        el.textContent = '最終更新: まだ同期されていません';
    }
}
