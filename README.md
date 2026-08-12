# 梅花易數 · 占卜排盤

梅花易數起卦 ＋ 六爻納甲排盤 ＋ 雙系統解卦的 PWA 網頁應用。
可「加入主畫面」安裝到 iPhone，完全離線使用。

## 功能

- **起卦**：時間起卦（當下或指定時間）、數字起卦（一或兩組數）、隨機起卦、指定卦象
- **排盤**：本卦／互卦／變卦、六爻納甲（八宮世應、六親、六獸、伏神、旬空、
  神煞、旺相休囚死、長生十二宮），格式對照星僑排盤逐欄驗證
- **解卦**：
  - 六爻斷卦——依 20 種問題類別取用神，論卦格（六沖六合）、月建日辰、旬空真假、
    入墓、進退神、原神忌神仇神、六合三合、動變回頭生剋、神煞、世應，並給出應期；
    占病另有一套獨立法則（近病久病斷法相反）
  - 梅花體用——體用生剋、互卦看過程、變卦看結局
- **卦辭爻辭**：《周易》公有領域原文（繁體）
- **術語解說**：61 條辭典，斷語中的術語自動標為可點擊
- **紀錄**：占卜歷史存於裝置本機（上限 50 筆，自動保存）

## 開發

```bash
npm install
npm run dev      # 開發伺服器
npm test         # 全部測試（96 項，含準確度回歸防線）
npm run lint     # oxlint
npm run build    # 產生 dist/（含 PWA service worker）
npm run preview  # 預覽正式版
```

需要 Node 22（CI 使用的版本）。

## 模組地圖

資料流是一條直線，先看這個再讀程式碼會快很多：

```
calendar.ts     取四柱干支、旬空、農曆數（包 lunar-typescript）
      ↓
casting.ts      castByTime / castByNumbers / castManual → 本卦、互卦、變卦、動爻
      ↓
najia.ts        buildNajiaChart：八宮世應、納甲、六親、六獸、伏神、神煞、旺衰、卦格
      ↓
interpret.ts    analyzeLiuyao：依問題類別取用神 → 逐段論斷 → 分數 → 五級判語
meihua.ts       analyzeMeihua：體用生剋 → 分數 → 五級判語（與 interpret 同一套刻度）
      ↓
App.tsx         介面；純邏輯已抽離至 history.ts（紀錄存取）與 glossary.ts（術語）
```

- `data/core.ts`——天干地支、五行生剋、八卦、納甲表等基礎常數，改動影響全域
- `data/zhouyi.ts`——六十四卦經文，**是整理來的資料檔，不要手改**
- `data/classic-cases.json`——53 則古籍實占案例，校準系統的資料來源

## 準確度校準（動 interpret.ts 之前務必先讀）

`calibration.ts` 把《增刪卜易》《卜筮正宗》的 53 則實占案例還原成引擎輸入，
比對引擎斷出的吉凶方向與古人斷語是否一致。`calibration.test.ts` 則把結果
設為**回歸防線**：命中率須勝過基準、判「平」比例須低於一成。

```bash
npm test -- calibration     # 只跑校準
```

**目前水準：方向命中率 67.9%（36/53），高信心案例 68.9%。**

這個數字要誠實看待：

- 對照組「全部猜吉」的命中率是 **60.4%**（本資料集古人斷吉者 32 則），
  所以引擎只領先基準約 4 則案例。
- 樣本僅 53 則，1 則 ≈ 1.9 個百分點，binomial 雜訊約 ±6.5pp。
  **不要把小幅變化當成真實的進步或退步。**
- 只驗證「方向」（吉／凶／平），五級細分從未被量測。
- 案例來源是野鶴老人等人的驗案集，本身帶有「多錄應驗案例」的先驗偏差。

`interpret.ts` 裡的分數權重來源分三類，改動前請先確認屬於哪一類：

1. **古法口訣**——如六親生剋循環、四進四退、四墓庫。動了就不是這套術理了。
2. **經校準調整**——如判語門檻 ±0.3、卦格權重。改動後必須重跑校準。
3. **作者自訂**——其餘多數數值。歡迎調整，但同樣要重跑校準確認沒有變差。

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
   （新 repo 首次必須手動選一次，這是 GitHub 的安全限制，無法自動化）
3. 等 Actions 跑完，網址是 `https://<帳號>.github.io/<repo>/`
4. iPhone 用 Safari 開啟網址 → 分享 → **加入主畫面**，之後即為全螢幕離線 App

（`vite.config.ts` 已設相對路徑，部署到子路徑或其他靜態託管皆可直接用）

## 技術與規則依據

- TypeScript + React + Vite + vite-plugin-pwa
- 曆法（農曆、四柱、旬空）：[lunar-typescript](https://github.com/6tail/lunar-typescript)
- 起卦以邵雍《梅花易數》通行本：年支序＋農曆月＋日 除8取上卦，加時辰序除8取下卦，總數除6取動爻
- 裝卦與斷卦以《增刪卜易》／《卜筮正宗》通行體系；四柱年以立春、月以節氣換月，
  梅花起卦年支以農曆正月初一換年
- 卦爻辭資料整理自 [open-iching](https://github.com/john-walks-slow/open-iching)（ISC License），
  簡轉繁後修正「征／閑／于」等過度轉換

### 已知限制

- **單一動爻模型**。梅花易數的四種起卦法本來就只產生一個動爻，但這也代表
  傳統六爻搖錢法的多爻同動無法輸入，反吟伏吟等需要多爻同動的法則因而無法實作。
- **節氣以北京時間計**。lunar-typescript 的節氣表是北京時間，海外使用者在
  節氣交界當日起卦可能有偏差。未做真太陽時修正。
- **時間起卦於同一時辰（兩小時）內必得同一卦**，這是此法的固有特性而非程式異常。

## 測試

`npm test` 共 96 項：

- `engine.test.ts`——曆法、起卦、裝卦（對照星僑軟體逐欄核對）、各項斷卦規則、
  重複計分與自相矛盾的回歸測試、資料完整性、術語涵蓋率
- `calibration.test.ts`——53 則古籍案例的準確度回歸防線
- `meihua.test.ts`——體用判定、分級刻度與六爻一致性
- `history.test.ts`——紀錄的形狀驗證與遷移（防止使用者紀錄被靜默刪除）

> 占卜結果僅供參考。
