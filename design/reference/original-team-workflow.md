# 《選戰騎士團》Multi-Agent 虛擬開發團隊工作流
**目標：** 利用 AI Agent 框架 (如 CrewAI, AutoGen) 或輔助工具 (Codex, Cursor)，將開發時程壓縮至 2-4 週內，並實現自動化內容生成。

## 1. 虛擬團隊配置 (Agent Roles & Personas)

### Agent 1: 製作人 (The PM)
*   **Role:** 專案經理與架構師。
*   **Goal:** 將使用者需求拆解為具體的代碼任務。審查其他 Agent 的輸出是否符合「競選總部龐克」的美學與邏輯。

### Agent 2: 系統企劃 (The Game Designer)
*   **Role:** 數據與劇本生成者。
*   **Goal:** 不寫 Code，只負責產出結構化的 JSON 檔案（定義關卡、數值、對話文本）。能夠根據真實新聞生成虛構的「十月驚奇」隨機事件。

### Agent 3: PixiJS 引擎工程師 (The Engine Dev)
*   **Role:** 底層戰棋邏輯開發者。
*   **Goal:** 處理 Canvas 渲染、六角/正方網格建立、A* 尋路演算法、戰鬥公式計算。不處理任何 HTML DOM UI。

### Agent 4: React 前端工程師 (The UI Dev)
*   **Role:** 視覺與介面開發者。
*   **Goal:** 使用 React + Tailwind CSS 實作新聞跑馬燈、民調血條。負責監聽 PixiJS 傳來的狀態並更新 DOM 元素。

## 2. 數據交換標準 (JSON Schema)
為了讓企劃 Agent 與工程 Agent 無縫溝通，所有關卡與角色數據必須遵循以下 JSON 結構：

```json
// Example: level_config.json
{
  "level_id": "stage_01",
  "name": "市府廣場衝突",
  "map": {
    "grid_type": "square",
    "width": 10,
    "height": 10,
    "obstacles": [{"x": 4, "y": 5, "type": "barricade"}]
  },
  "factions": {
    "blue": {
      "units": [
        {"id": "b_heavy_01", "class": "iron_broker", "x": 2, "y": 2, "hp": 100, "ap": 5}
      ]
    },
    "green": {
      "units": [
        {"id": "g_ranged_01", "class": "keyboard_wing", "x": 8, "y": 8, "hp": 60, "ap": 6}
      ]
    }
  },
  "win_condition": "rout_enemy"
}
```

## 3. 開發工作流 (Execution Pipeline)

1.  **需求輸入：** 人類下達指令 (例：「實裝第一關的移動邏輯」)。
2.  **數據生成：** `Agent 2 (企劃)` 產出關卡的 JSON 設定檔。
3.  **底層開發：** `Agent 3 (PixiJS)` 讀取 JSON，生成網格系統與狀態機 (State Machine) 程式碼。對外暴露 `onUnitMoved`, `onHpChanged` 等 Event Hooks。
4.  **UI 綁定：** `Agent 4 (React)` 訂閱 PixiJS 的 Event Hooks，生成對應的 React 元件 (如動態扣血的民調柱狀圖)。
5.  **整合測試：** 將生成的 React 元件與 PixiJS 畫布組合。人類進行視覺微調與 Bug 回報。

## 4. Live-Ops 自動化營運擴充
透過 Python 腳本串接 `Agent 2 (企劃)`，每日定時爬取現實新聞標題，利用 LLM 將其抽象化並轉譯為遊戲內的 `random_event.json`，實現網頁遊戲的「真實時事日更」功能，確保遊戲長期的社群討論熱度。