# 🎡 Lucky Spin — 命運大轉盤

使用 HTML、CSS 與 JavaScript 製作的互動抽籤轉盤，讓轉盤替你做決定。適合聚會遊戲、課堂活動與日常選擇。

## 功能

- 新增、編輯與刪除抽籤選項，支援 2～12 個選項。
- 每個選項最多 20 個字元，並檢查空白與重複名稱。
- 使用 Canvas 繪製彩色轉盤，搭配旋轉動畫與結果彈窗。
- 保留最近 10 筆抽籤紀錄，可手動清除。
- 透過瀏覽器 localStorage 儲存選項與紀錄。
- 可恢復預設選項，並支援減少動態效果的系統偏好。

## 使用方式

1. 下載本專案，將 `index.html`、`style.css`、`script.js` 放在同一個資料夾。
2. 使用現代瀏覽器開啟 `index.html`，無須安裝套件或建置。
3. 設定抽籤選項後，按下「開始旋轉」查看結果。

資料儲存在目前瀏覽器中；清除瀏覽器網站資料後，已儲存的選項與紀錄也會移除。若瀏覽器無法使用 localStorage，資料僅保留於目前頁面。

## 檔案說明

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 網頁結構、選項管理區與結果視窗 |
| `style.css` | 深色主題、排版與動畫樣式 |
| `script.js` | 選項管理、轉盤繪製、抽籤與資料儲存 |

## 使用技術

- HTML5 與 Canvas 2D
- CSS3
- 原生 JavaScript
- Web Storage API（localStorage）

## 儲存庫

[AlvinAlpha/claude-test](https://github.com/AlvinAlpha/claude-test)
