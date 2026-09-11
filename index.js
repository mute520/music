const audioPlayer = document.getElementById('audioPlayer');
const fileInput = document.getElementById('fileInput');
const playlistEl = document.getElementById('playlist');
const lyricsContent = document.getElementById('lyricsContent');
const lyricsBox = document.getElementById('lyricsBox');

let tracks = [];
let currentTrackIndex = -1;
let currentLyrics = [];
let isPlaying = false;

// 初始化音量
audioPlayer.volume = 0.8;

// 文件夹导入功能
function importFolder() {
  fileInput.click();
}

fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  // tracks = [];

  files.forEach(file => {
    if (file.type === 'audio/mpeg' || file.type === 'audio/wav' || file.type === 'audio/ogg' || file.type === 'audio/flac') {
      const url = URL.createObjectURL(file);
      const name = file.name.replace(/\.[^/.]+$/, ""); // 去除扩展名作为歌曲名

      // 寻找同名 .lrc 文件
      const lrcFile = files.find(f => f.name === `${file.name}.lrc` || f.name === `${name}.lrc`);
      let lrcUrl = null;
      if (lrcFile) {
        lrcUrl = URL.createObjectURL(lrcFile);
      }

      tracks.push({ name, url, lrcUrl });
    }
  });

  renderPlaylist();
  if (tracks.length > 0) {
    loadTrack(0);
  }
});

// 渲染播放列表
function renderPlaylist() {
  playlistEl.innerHTML = '';
  tracks.forEach((track, index) => {
    const div = document.createElement('div');
    div.className = 'track-item';
    div.innerHTML = `<span class="track-name">${index + 1}. ${track.name}</span>`;
    div.onclick = () => loadTrack(index);
    playlistEl.appendChild(div);
  });
}

// 加载曲目
function loadTrack(index) {
  // if (index < 0 || index >= tracks.length) return;
  if (index < 0) index = tracks.length - 1;
  if (index >= tracks.length) index = 0;
  currentTrackIndex = index;
  const track = tracks[index];

  audioPlayer.src = track.url;
  document.getElementById('currentTitle').innerText = track.name;
  document.getElementById('currentArtist').innerText = `曲目 ${index + 1} / ${tracks.length}`;

  // 更新列表高亮
  document.querySelectorAll('.track-item').forEach((el, i) => {
    el.classList.toggle('active', i === index);
    if (el.classList.contains('active')) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // 加载歌词
  loadLyrics(track.lrcUrl);

  audioPlayer.play();
  isPlaying = true;
  document.getElementById('playBtn').innerText = '⏸';
}

// 播放/暂停
function togglePlay() {
  if (currentTrackIndex === -1) return;
  if (isPlaying) {
    audioPlayer.pause();
    document.getElementById('playBtn').innerText = '▶';
  } else {
    audioPlayer.play();
    document.getElementById('playBtn').innerText = '⏸';
  }
  isPlaying = !isPlaying;
}

// 上一首/下一首
function prevTrack() { loadTrack(currentTrackIndex - 1); }
function nextTrack() { loadTrack(currentTrackIndex + 1); }

// 进度条更新与跳转
audioPlayer.addEventListener('timeupdate', () => {
  if (audioPlayer.duration) {
    const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('currentTime').innerText = formatTime(audioPlayer.currentTime);
    document.getElementById('duration').innerText = formatTime(audioPlayer.duration);

    updateLyricsHighlight(audioPlayer.currentTime);
  }
});

audioPlayer.addEventListener('ended', nextTrack);

function seekAudio(e) {
  const bar = document.getElementById('progressBar');
  const percent = e.offsetX / bar.clientWidth;
  audioPlayer.currentTime = percent * audioPlayer.duration;
}

// 音量控制
function setVolume(e) {
  const bar = document.getElementById('volumeBar');
  const percent = e.offsetX / bar.clientWidth;
  audioPlayer.volume = percent;
  document.getElementById('volumeFill').style.width = `${percent * 100}%`;
}

// 时间格式化
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// ========== 歌词解析与预览 ==========
async function loadLyrics(lrcUrl) {
  currentLyrics = [];
  if (!lrcUrl) {
    lyricsContent.innerHTML = '<div class="no-lyrics">未找到歌词文件<br>(请将.lrc文件与音频放在同一文件夹导入)</div>';
    return;
  }

  try {
    const response = await fetch(lrcUrl);
    const lrcText = await response.text();
    console.log('歌词 tracks: ', tracks);
    console.log('歌词 lrcText: ', lrcText);
    currentLyrics = parseLrc(lrcText);
    renderLyrics();
  } catch (err) {
    lyricsContent.innerHTML = '<div class="no-lyrics">歌词加载失败</div>';
  }
}

// 解析 LRC 格式
function parseLrc(lrcText) {
  const lines = lrcText.split('\n');
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d+)\]/g;

  lines.forEach(line => {
    const times = [];
    let match;
    while ((match = timeRegex.exec(line)) !== null) {
      const mins = parseInt(match[1]);
      const secs = parseInt(match[2]);
      const ms = parseInt(match[3]?.padEnd(2, '0').slice(0, 2));
      times.push(mins * 60 + secs + ms / 1000);
    }

    const text = line.replace(/\[\d{2}:\d{2}\.\d+\]/g, '').trim();
    if (times.length > 0 && text) {
      times.forEach(time => result.push({ time, text }));
    }
  });

  return result.sort((a, b) => a.time - b.time);
}

// 渲染歌词
function renderLyrics() {
  lyricsContent.innerHTML = '';
  lyricsContent.className = '';
  currentLyrics.forEach((lyric, index) => {
    const div = document.createElement('div');
    div.className = 'lyric-line';
    // div.innerText = lyric.text;
    div.innerHTML = `<span class="lyric-text">${lyric.text}</span>`;
    div.dataset.index = index;
    lyricsContent.appendChild(div);
  });
}

// 歌词高亮与滚动
function updateLyricsHighlight(currentTime) {
  if (currentLyrics.length === 0) return;

  let activeIndex = 0;
  for (let i = 0; i < currentLyrics.length; i++) {
    if (currentTime >= currentLyrics[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  const lines = lyricsContent.getElementsByClassName('lyric-line');
  for (let i = 0; i < lines.length; i++) {
    lines[i].classList.toggle('active', i === activeIndex);
    if (lines[i].classList.contains('active')) {
      lines[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // // 自动滚动到当前歌词
  // const activeLine = lines[activeIndex];
  // if (activeLine) {
  //   const boxHeight = lyricsBox.clientHeight;
  //   const scrollTarget = activeLine.offsetTop - (boxHeight / 2) + (activeLine.clientHeight / 2);
  //   lyricsBox.scrollTop = scrollTarget;
  // }
}

async function init() {
  const res = await fetch('./list/娃儿！莫怕-黄霄雲.mp3');
  const file = await res.blob();
  const url = URL.createObjectURL(file);
  const name = '娃儿！莫怕-黄霄雲';

  const res_lrc = await fetch('./list/娃儿！莫怕-黄霄雲.lrc');
  const file_lrc = await res_lrc.blob();
  const lrcUrl = URL.createObjectURL(file_lrc);
  tracks.push({ name, url, lrcUrl });

  console.log('file: ', file);
  console.log('file_lrc: ', file_lrc);

  renderPlaylist();
  audioPlayer.src = url;
  currentTrackIndex = 1;
  loadLyrics(lrcUrl);
}

// window.addEventListener('DOMContentLoaded', e => {
//   init();
// })