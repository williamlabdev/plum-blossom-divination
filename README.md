# 梅花易數 · 占卜排盤

梅花易數起卦 ＋ 六爻納甲排盤 ＋ 雙系統解卦的 PWA 網頁應用。
可「加入主畫面」安裝到 iPhone，完全離線使用。

## 功能

- **起卦**：時間起卦（當下或指定時間）、數字起卦（一或兩組數）、指定卦象（搖卦結果輸入）
- **排盤**：本卦／互卦／變卦、六爻納甲（八宮世應、六親、六獸、伏神、旬空、
  神煞、旺相休囚死、長生十二宮），格式對照星僑排盤逐欄驗證
- **解卦**：
  - 六爻斷卦——依問題類別取用神（求財→妻財、事業→官鬼……），以月建日辰、
    旬空月破、動變回頭生剋、世應關係論斷，並給出應期
  - 梅花體用——體用生剋、互卦看過程、變卦看結局
- **卦辭爻辭**：《周易》公有領域原文（繁體）
- **紀錄**：占卜歷史存於裝置本機

## 開發

```bash
npm install
npm run dev      # 開發伺服器
npm test         # 單元測試（曆法、起卦、裝卦逐欄驗證）
npm run build    # 產生 dist/（含 PWA service worker）
npm run preview  # 預覽正式版
```

## 部署與 iOS 安裝

已內建 GitHub Pages 自動部署（`.github/workflows/deploy.yml`，push 到 main
會自動測試、建置、上線）：

1. 在 GitHub 建立 repo，把本專案推上去：

   ```bash
   git init && git add -A && git commit -m "init"
   git branch -M main
   git remote add origin https://github.com/<帳號>/<repo>.git
   git push -u origin main
   ```

2. GitHub repo → Settings → Pages → Source 選 **GitHub Actions**
3. 等 Actions 跑完，網址是 `https://<帳號>.github.io/<repo>/`
4. iPhone 用 Safari 開啟網址 → 分享 → **加入主畫面**，之後即為全螢幕離線 App

（`vite.config.ts` 已設相對路徑，部署到子路徑或其他靜態託管皆可直接用）

## 技術與規則依據

- TypeScript + React + Vite + vite-plugin-pwa
- 曆法（農曆、四柱、旬空）：[lunar-typescript](https://github.com/6tail/lunar-typescript)
- 起卦以邵雍《梅花易數》通行本：年支序＋農曆月＋日 除8取上卦，加時辰序除8取下卦，總數除6取動爻
- 裝卦以《增刪卜易》／《卜筮正宗》通行體系；四柱年以立春、月以節氣換月，
  梅花起卦年支以農曆正月初一換年
- 卦爻辭資料整理自 [open-iching](https://github.com/john-walks-slow/open-iching)（ISC License），
  簡轉繁後修正「征／閑／于」等過度轉換

## 測試向量

`src/lib/engine.test.ts` 以兩類案例驗證：

- 2026-08-11 20:50 水風井之地風升盤（對照星僑軟體逐欄核對：納甲、六親、
  六獸、伏神、神煞、旺衰）
- 《梅花易數》經典案例：觀梅占（澤火革）、牡丹占（天風姤）

> 占卜結果僅供參考。
