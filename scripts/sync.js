const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

// ============================================
// 設定
// ============================================
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const PLAYLISTS_PATH = path.join(__dirname, '../data/playlists.json');
const VIDEOS_OUTPUT_PATH = path.join(__dirname, '../data/videos.json');
const LAST_SYNC_PATH = path.join(__dirname, '../data/lastSync.json');

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// ============================================
// メイン処理
// ============================================
async function main() {
    console.log('===========================================');
    console.log('YouTube Data API 同期スクリプト開始');
    console.log('===========================================\n');

    // APIキー確認
    if (!YOUTUBE_API_KEY) {
        console.error('❌ エラー: YOUTUBE_API_KEY 環境変数が設定されていません');
        process.exit(1);
    }

    try {
        // プレイリストマスター読み込み
        console.log('📂 プレイリストマスターを読み込み中...');
        const playlistsData = await fs.readFile(PLAYLISTS_PATH, 'utf-8');
        const playlists = JSON.parse(playlistsData);
        console.log(`✓ ${playlists.length}件のプレイリスト定義を読み込みました\n`);

        // 有効なプレイリストのみ
        const enabledPlaylists = playlists.filter(p => p.enabled && p.playlistId);
        console.log(`🎯 同期対象: ${enabledPlaylists.length}件のプレイリスト\n`);

        // 全動画データ収集
        const allVideos = [];
        let totalApiCalls = 0;

        for (const playlist of enabledPlaylists) {
            console.log(`📋 [${playlist.title}] 処理開始...`);
            console.log(`   Playlist ID: ${playlist.playlistId}`);

            try {
                // プレイリスト内の動画ID一覧を取得
                const videoIds = await fetchPlaylistItems(playlist.playlistId);
                console.log(`   ✓ ${videoIds.length}件の動画IDを取得`);
                totalApiCalls++; // playlistItems.list

                // 動画詳細を取得（50件ずつ）
                const videos = await fetchVideoDetails(videoIds);
                console.log(`   ✓ ${videos.length}件の動画詳細を取得`);
                totalApiCalls += Math.ceil(videoIds.length / 50); // videos.list

                // メタデータ付加
                videos.forEach(video => {
                    video.category = playlist.category;
                    video.categoryName = playlist.categoryName;
                    video.bodyPart = playlist.bodyPart;
                    video.bodyPartName = playlist.bodyPartName;
                    video.playlistId = playlist.playlistId;
                    video.playlistTitle = playlist.title;
                });

                allVideos.push(...videos);
                console.log(`   ✓ 完了\n`);

            } catch (error) {
                console.error(`   ❌ エラー: ${error.message}\n`);
            }
        }

        console.log('===========================================');
        console.log(`✅ 同期完了: 合計 ${allVideos.length}件の動画`);
        console.log(`📊 API呼び出し: 約${totalApiCalls}回（クォータ消費: 約${totalApiCalls} units）`);
        console.log('===========================================\n');

        // 出力
        await fs.writeFile(VIDEOS_OUTPUT_PATH, JSON.stringify(allVideos, null, 2), 'utf-8');
        console.log(`💾 ${VIDEOS_OUTPUT_PATH} に保存しました`);

        // 最終同期日時
        const syncInfo = {
            lastSync: new Date().toISOString(),
            videoCount: allVideos.length,
            message: `最終同期: ${new Date().toLocaleString('ja-JP')}`
        };
        await fs.writeFile(LAST_SYNC_PATH, JSON.stringify(syncInfo, null, 2), 'utf-8');
        console.log(`💾 ${LAST_SYNC_PATH} を更新しました\n`);

        console.log('🎉 すべての処理が正常に完了しました！');

    } catch (error) {
        console.error('❌ 致命的エラー:', error);
        process.exit(1);
    }
}

// ============================================
// プレイリスト内の動画ID一覧を取得
// ============================================
async function fetchPlaylistItems(playlistId) {
    const videoIds = [];
    let pageToken = null;

    do {
        const url = `${YOUTUBE_API_BASE}/playlistItems?` + new URLSearchParams({
            part: 'contentDetails',
            playlistId: playlistId,
            maxResults: 50,
            key: YOUTUBE_API_KEY,
            ...(pageToken && { pageToken })
        });

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        data.items.forEach(item => {
            videoIds.push(item.contentDetails.videoId);
        });

        pageToken = data.nextPageToken;

    } while (pageToken);

    return videoIds;
}

// ============================================
// 動画詳細を取得（50件ずつ）
// ============================================
async function fetchVideoDetails(videoIds) {
    const videos = [];

    // 50件ずつ分割
    for (let i = 0; i < videoIds.length; i += 50) {
        const chunk = videoIds.slice(i, i + 50);
        
        const url = `${YOUTUBE_API_BASE}/videos?` + new URLSearchParams({
            part: 'snippet,contentDetails',
            id: chunk.join(','),
            key: YOUTUBE_API_KEY
        });

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        data.items.forEach(item => {
            videos.push({
                videoId: item.id,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.medium.url,
                duration: formatDuration(item.contentDetails.duration),
                publishedAt: item.snippet.publishedAt
            });
        });
    }

    return videos;
}

// ============================================
// ISO 8601 duration → 人間可読形式
// ============================================
function formatDuration(isoDuration) {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
}

// ============================================
// 実行
// ============================================
main();
