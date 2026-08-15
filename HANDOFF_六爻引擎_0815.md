# HANDOFF — 六爻引擎（元忌有力無力 / 問吉凶問時機 / 時間框架重構）2026-08-15

## 1. 現況一句話

上一棒留在工作區的「元忌有力無力」整包已入庫，backlog #1（問吉凶／問時機）與 #2
（TimeFrame 純函式重構）做完並推上 `origin/main`，工作區乾淨、未推 0；
**但保留測試集因元忌那一版退了 1 則（60.4% → 58.3%），這筆帳沒清，等 william 拍板。**

---

## 2. 已完成

四顆 commit **全已推**（`origin/main` = `ed5d455`）：

| commit | 內容 | 證據 |
|---|---|---|
| `c836acc` | 元忌依《增刪卜易・衰旺章》判有力無力，改以相對強弱計分 | 接手時工作區既有的未提交改動；tsc/oxlint/build/106 測試全過 |
| `73eeff8` | README 準確度表補到現況，標清兩次「60.4→58.3」是不同兩件事 | — |
| `7bbcefc` | backlog #1：`AskIntent`（吉凶／時機），問時機不出五級判語 | 窮舉測試釘住兩種 intent 的 score／sections 逐字相同；playwright 實跑截圖 |
| `ed5d455` | backlog #2：`TimeFrame`／`timingOf`／`lineAt`／`withMonthBranch` | 重構前後 66,149 筆完整輸出逐字比對，實質差異 0 筆 |

**校準現況（實測，非引用）**：第一批 75.5%／保留集 58.3%／全部 67.3%／全猜吉基準 54.5%。

驗證指令與輸出：

```bash
npx tsc -b && npx oxlint src && npm test && npm run build
#  Test Files  4 passed (4)
#       Tests  113 passed (113)
git status --porcelain | wc -l                        # 0
git log --branches --not --remotes --oneline | wc -l  # 0
```

UI 驗證（依 CLAUDE.md §6）：`npx vite preview --port 4173` + playwright 實跑兩種 intent，
確認 chip 選取狀態、摘要卡、紀錄列表（問時機那筆顯示「問時機」非空白）、**無 console 錯誤**。
截圖在本次 session 的 scratchpad，未留存進 repo。

過程中另外查出並修掉的事：
- 上一棒的註解只寫「第一批 75.5% 兩版相同」，**對保留集退步隻字未提**；已補進
  `interpret.ts` 註解、CLAUDE.md、README。
- README 表下一段推論「引擎在未調參的第二批上領先幅度反而更大」以現況數字**方向已相反**
  （15.1pp vs 10.4pp），已改成據實陳述。
- README「20 種問題類別」實為 21 種；測試數 99／106 → 113；`interpret.ts` 894 → 1019 行。
- 寫測試時發現「用神不上卦且首卦無伏神」那條早退路徑**在全卦象掃描下走不到**
  （首卦必備五類六親），改以人工構造的盤直接測那三行，並把不可達的原因寫進測試註解。

---

## 3. 未完成與地雷

🔴 **保留集退 1 則的帳未清。** 元忌那一版（`c836acc`）讓保留集 60.4% → 58.3%、
全部 68.3% → 67.3%，逐案比對唯一翻轉的是 **#69「午建己巳日占臨產，得姤之鼎」**
（古人斷吉、引擎斷凶）。第一批 53 則逐案 HIT/MISS **完全未動**。
這正是「忌神持世」被移除時的同一個訊號（數字巧合完全相同，兩件事，文件已標清）。

🔴 **backlog #1 做完了，但它沒有、也不該讓 #69 消失。** 校準仍以 `吉凶` 跑全部 101 則。
要讓 #69 消失只有一條路：把 5 則問時機型案例（#5、#36、#41、#52、#69）移出校準分母——
**那等於把已知會失分的案例移出分母，命中率必然上升**，與調參無異。沒有做，等 william。

🔴 **CI 從未跑過測試，本 session 四次 push 全紅。**
失敗點是 workflow 第 2 步 `actions/configure-pages@v5`：
`Create Pages site failed. Resource not accessible by integration`——
**GitHub Pages 從未在 repo Settings 啟用過**（backlog #6，0812 起就是這樣，非本 session 造成）。
`npm ci`／`npm test`／`npm run build` 排在它後面，**一次都沒執行過**。
所有綠燈證據都是本地跑的。網站仍 404。

⚠️ **保留集已被消耗三四次**（CLAUDE.md 自己記載）。再靠看保留集決定去留會繼續削弱它。
CLAUDE.md 的建議是重新採集第三批。

⚠️ 本次未動 `data/classic-cases.json`、未動任何權重常數、未動 `QUESTION_MAP`。

---

## 4. 下一步

依序，前兩項是可直接執行的動作，第三項起要 william 先拍板（見 §5）。

**(1) 修 CI（最便宜、擋住所有後續驗證）**

william 自己在瀏覽器開：
`https://github.com/williamlabdev/plum-blossom-divination/settings/pages`
→ Source 選 **GitHub Actions**（GitHub 對新 repo 的限制，無法自動化）。
然後重跑最後一次 run 確認：

```bash
cd /Users/william/dev/source/side-projects/destiny/plum-lossom-divination
gh run rerun 31886986445 && gh run watch
```

**(2) 回頭決定 #69 的去留（等 (1) 之後做，才有 CI 佐證）**

不要再開保留集。兩個選項見 §5 第 1 條。若決定 revert：

```bash
git revert c836acc          # 只 revert 元忌那一版，#1/#2 不受影響
npx tsc -b && npx oxlint src && npm test
```

**(3) backlog #4：未來時點推演本體**（前置已備齊，可直接動工）

`najia.ts` 的 `withMonthBranch`／`lineAt` 已能對任意月建重算，且有測試釘住
「換 frame 重算 ≡ 換月份重新起盤」。實作位置：`interpret.ts` 的 `yingQi`
（目前在 `finalScore` 之後產生、完全不參與計分）。

**(4) backlog #5：多爻作用結算層** — 必須先有 §5 第 3 條的產品決策，否則不要開工。

---

## 5. 勿碰／等待

**等 william 裁決（三條，逐條含選項）：**

1. **#69 那 1 則保留集失分怎麼處置**
   - (a) 留著元忌那一版，承認保留集 58.3%（現況；理由是它實作了古法判準，非因為較準）
   - (b) `git revert c836acc`，回到 60.4%
   - (c) 把 5 則問時機型案例移出校準分母 ← **我不建議順手做**：等於把已知失分案例
     移出分母，該當成獨立決策並在**新採集的第三批**上驗證

2. **要不要把問時機型案例排除在校準之外**（與上一條 (c) 是同一題的一般化）

3. **要不要加六爻搖錢法輸入**（backlog #3）
   這是**產品範圍**問題不是工程問題：梅花易數四種起卦法結構上只產生一個動爻，
   不加就等於永遠不做多爻同動（backlog #5）。決定前不要動作用結算層。

**勿碰：**
- `data/classic-cases.json` 與 `QUESTION_MAP`——動它們就是動校準刻度。
- 保留集（索引 53–100）——不要為了調參再去看它。
- 別條線：本 session 只動 `destiny/plum-lossom-divination` 一個 repo，
  `destiny/` 底下其他子專案（tarot、zwds、star-sign…）一律沒碰。

**已知但非本線：** 此 repo 未納入 portfolio manifest／SOURCE_MAP（`portfolio-status.md:152`
記為「未納管」），要不要納管仍是舊懸項。
