## Step 0: Preparation

先將前端部署的檔案準備好，在Cloudflare Pages上Create application，選擇Github上的repository，Create和deploy

### 階段一：端到端測試 (End-to-End Testing)

在將後端部署到真實伺服器之前，我們需要在本地開發環境中確認整個流程是通的。

1. 在本機執行後端服務：

打開專案的終端機，進入存放 main.py (FastAPI 服務) 的目錄。

執行命令 uvicorn main:app --host 0.0.0.0 --port 8000。

--host 0.0.0.0 確保它可以從本機的網路中被訪問，而不僅僅是本機。

2. 設定前端 API 位址：

在repo上的 React 專案 (App.tsx) 中，所有 fetch 請求的路徑都是相對路徑 (例如 /api/upload)。當在本機開發時，這些請求會發送到 http://localhost:3000/api/upload，但本機的後端是跑在 8000 port。

解決方法：在repo上的 vite.config.ts 中設定代理 (proxy)，讓 Vite 開發伺服器自動將 /api 的請求轉發到本機的後端。

### On Local
1. 建立一個名為 apk_env 的新環境
```
PowerShell
(base)python -m pip install cryptography
conda create --name apk_env python=3.11 -y
```

2. 進入 (啟用) 新環境
建立完成後，執行以下指令來進入這個新環境：
```
PowerShell

conda activate apk_env
```
執行後，會看到終端機最前面的提示符從 (base) 變成了 (apk_env)。這表示已成功進入這個乾淨的空間。

3. 在新環境中安裝套件
現在，我們在這個全新的環境中，安裝唯一需要的 pycryptodome 套件：
```
PowerShell

python -m pip install pycryptodome
```
4. 驗證安裝
在新環境 (apk_env) 中，執行驗證指令：
```
PowerShell

python -c "from Crypto.Cipher import AES; print('✅ (apk_env) 環境導入成功！')"
```

5. 在本地執行

main.py

pack_apk.py


```
npm run dev
```
<img width="1393" height="496" alt="image" src="https://github.com/user-attachments/assets/408fef4c-b76b-4a15-b722-e6638abc7f35" />

```
conda activate apk_env
(apk_env) PS C:\Users\user> uvicorn main:app --host 0.0.0.0 --port 8000
```
<img width="1675" height="667" alt="image" src="https://github.com/user-attachments/assets/f0aef6d4-5391-4471-a5b9-382b5e38799c" />


<img width="1702" height="805" alt="image" src="https://github.com/user-attachments/assets/99d4d237-d151-4c71-9279-dd770a59dbc3" />


<img width="1077" height="913" alt="image" src="https://github.com/user-attachments/assets/0309c800-be67-488b-a27b-52a6cf7e9872" />


### 階段二：

### On Cloudflare

當user將 Cloudflare Pages 的 BACKEND_URL 設定為 http://127.0.0.1:8000 時，發出請求的是 Cloudflare 的伺服器。因此，它會嘗試連接它自己的 8000 埠，而不是家裡或辦公室電腦的 8000 埠。因為它的 8000 埠上沒有運行 FastAPI 服務，所以這個連接必定會失敗

簡單來說，Cloudflare 的公開伺服器無法存取電腦上的本地服務

**解決方案：使用 Cloudflare Tunnel**
然而，有一種技術叫做**Tunneling**，可以安全地將本地的服務「打通」到公開網路上，讓 Cloudflare 可以存取到它

Cloudflare 自己就提供了一個非常棒的免費工具，叫做 Cloudflare Tunnel。它就像在電腦和 Cloudflare 之間建立一條加密的專屬通道

可以透過它，為本地運行的 `localhost:8000` 服務產生一個公開的網址

如何設定 Cloudflare Tunnel:
步驟一：下載並安裝 cloudflared
`cloudflared` 是 Cloudflare Tunnel 的核心命令列工具

1. 前往下載頁面：打開瀏覽器，訪問 Cloudflare Zero Trust 儀表板的下載頁面：
https://one.dash.cloudflare.com/?to=/:account/downloads
2. 選擇作業系統：在右側列表中找到 Windows，並根據系統選擇 64-bit 版本進行下載。
3. 解壓縮檔案：下載的是一個 `.msi` 安裝檔。請直接執行它，安裝程式會自動將 `cloudflared.exe` 放置到一個系統路徑中，讓user可以直接在任何終端機中使用。

驗證安裝：打開一個新的終端機視窗（PowerShell 或 CMD），輸入以下指令：
```
PowerShell

cloudflared --version
```
如果成功安裝，會看到類似`cloudflared version 2025.10.0 ... `的版本訊息

cloudflared:
```
(apk_env) PS C:\Users\user> cloudflared tunnel --url http://localhost:8000
```
<img width="1705" height="505" alt="image" src="https://github.com/user-attachments/assets/49a6ba34-c28a-42eb-ba37-0a97e77a92e1" />


執行這個指令後，它會直接連接到 Cloudflare 並立即在本機的終端機上顯示一個公開的 ...trycloudflare.com 網址。看到這個網址出現，就代表通道已經成功建立並運行了！

不要關閉這個正在運行 `cloudflared tunnel` 的終端機視窗

依照以下步驟完成部署：

1. 複製公開網址
從終端機中，完整複製以下網址：
https://treatments-subsequent-badly-pop.trycloudflare.com
2. 更新 Cloudflare Pages 環境變數
- 前往 Cloudflare Pages 專案設定頁面
- 點擊 Settings > Variables and Secrets
- 找到 `BACKEND_URL` 這個環境變數，點擊編輯
- 將其值更新為剛剛複製的公開網址。
- 最後重新部署專案(Retry deployment)

FastAPI (Uvicorn):
```
(apk_env) PS C:\Users\user> uvicorn main:app --host 127.0.0.1 --port 8000
```

<img width="1714" height="559" alt="image" src="https://github.com/user-attachments/assets/2398b6cb-ff75-44de-a3da-8d4af3315c9a" />


**最終解決方案：簡化架構**
將執行兩個步驟：

1. 移除不再需要的 Service Binding

2. 更新 `[[path]].js` 檔案，讓它承擔起之前 Worker 的代理工作

步驟一：移除 Service Binding
1. 前往 Cloudflare Pages 專案儀表板
2. 點擊 Settings > Bindings
3. 找到名為 `api_gateway` 的那條 Service binding 紀錄
4. 點擊它旁邊的刪除 (Delete) 按鈕，並確認刪除

步驟二：更新 Functions 路由檔案
1. 在github上，打開專案中的 `functions/api/[[path]].js` 檔案
2. 用以下這段全新的程式碼，完全取代該檔案中的所有內容

```javascript
// 檔案路徑: /functions/api/[[path]].js (新版本)

export async function onRequest(context) {
  // 1. 直接從 Pages 專案的環境變數中讀取後端 URL
  const backendUrl = context.env.BACKEND_URL;

  if (!backendUrl) {
    return new Response("BACKEND_URL environment variable not set in Pages project.", { status: 500 });
  }

  // 2. 建立一個指向後端服務的請求 URL
  //    - context.request.url 是原始請求的 URL (例如 https://...pages.dev/api/upload)
  //    - 我們需要取得它的路徑部分 (/api/upload)
  const originalUrl = new URL(context.request.url);
  const backendRequestUrl = new URL(originalUrl.pathname, backendUrl);
  
  // 保留原始請求的查詢參數 (例如 ?id=123)
  backendRequestUrl.search = originalUrl.search;

  // 3. 建立一個新的 Request 物件，準備轉發到後端
  //    這個物件會複製原始請求的方法 (POST)、標頭 (headers) 和內容主體 (body)
  const backendRequest = new Request(backendRequestUrl, context.request);

  // 4. 執行 fetch 請求到後端 (本機的 Tunnel)，並將後端的回應直接回傳給瀏覽器
  try {
    console.log(`Forwarding request to: ${backendRequestUrl}`); // 增加日誌以便偵錯
    return await fetch(backendRequest);
  } catch (e) {
    console.error(`Failed to connect to backend: ${e}`);
    return new Response("Failed to connect to the backend service via Pages Function.", { status: 502 }); // 502 Bad Gateway
  }
}
```

步驟三：推送程式碼並重新部署
1. 儲存修改後的 `[[path]].js` 檔案
2. 將這個修改提交 (commit) 並推送 (push) 到 GitHub 儲存庫
3. Cloudflare Pages 會自動偵測到變更，並進行一次新的部署

步驟四：最後的測試
1. 等待 Cloudflare Pages 的新部署狀態變為 Success (成功)
2. 確保本地的兩個終端機（FastAPI 和 cloudflared）都在正常運行
3. 再次訪問網站，並上傳 APK 檔案

Q: 為什麼這次應該會成功？
A: 這個新架構移除了「Service Binding」這個中間層。現在的流程是：
`瀏覽器 → Pages 網站上的 Function → BACKEND_URL (Tunnel) → 本地的後端`

`Pages Function` 現在直接讀取環境變數 `BACKEND_URL` 並發起請求，路徑更短、更直接，排除了 Pages Function 與 Worker 服務之間可能存在的綁定或權限問題。這是在 Cloudflare Pages 上實現 API 代理最標準、最可靠的方式


存取 https://apk-packing-automation-platform.pages.dev/

<img width="1150" height="895" alt="image" src="https://github.com/user-attachments/assets/7045dbd1-142f-4741-83a1-68b06c0be765" />


------
### 平台說明
此平台是一個典型的現代「分離式架構」網頁應用 (Decoupled Architecture)。這意味著前端 (使用者介面) 和後端 (核心邏輯) 是兩個獨立的實體，它們透過網路 API 進行溝通。


1. 前端 (Frontend) - repo的 React 應用程式
這是使用者唯一會直接互動的部分。它負責提供上傳介面、顯示處理進度，並提供最終的下載按鈕。

- 部署位置: Cloudflare Pages。

為什麼選擇這裡?:
- 高效能: Cloudflare Pages 專為託管靜態網站（如 React 專案建置後的 HTML/CSS/JS 檔案）而設計，速度極快。
- 自動化 (CI/CD): 當我們將新的程式碼推送到 GitHub 時，Cloudflare Pages 會自動重新建置並部署網站，無需手動操作。
- 免費與安全: 提供免費的託管、HTTPS 加密和 DDoS 防護。

2. 後端 (Backend) - 本機的 FastAPI 伺服器
這是專案的大腦和動力核心。它負責接收上傳的 APK 檔案，並執行精心打造的 pack_apk.py 腳本來進行反編譯、加密、重建和簽章等所有繁重工作。

- 部署位置: 一台獨立的伺服器 (例如雲端主機 VPS 或 PaaS 平台)。

為什麼必須是獨立伺服器?:
- 執行環境: 本機的 pack_apk.py 腳本需要一個完整的作業系統環境，裡面必須安裝 Java、Android SDK Build-Tools (zipalign, apksigner) 等重量級工具。
- 限制: Cloudflare Pages 或 Workers 的環境非常輕量且受限，它們無法執行這類需要大量外部依賴和本地檔案系統操作的複雜腳本。因此，後端必須部署在一個我們可以完全控制的獨立伺服器上。

3. 「橋樑」- 連接前端與後端的關鍵
這是整個架構中最精妙、也是我們花費最多時間偵錯的部分。因為前端在公開網路上，而後端在另一台伺服器上，我們需要一個安全可靠的「橋樑」來連接它們。

這個橋樑由兩個組件構成：
**Pages Function (/functions/api/[[path]].js)**
角色: 它是部署在 Cloudflare Pages 上的「交通警察」。

工作原理:

這個檔案的特殊命名 ([[path]].js) 告訴 Cloudflare：「請攔截所有發送到 https://...pages.dev/api/* 的網路請求」。

當它攔截到請求後（例如 /api/upload），它不會在網站目錄中尋找檔案，而是會執行 [[path]].js 裡的程式碼。

程式碼的唯一任務，就是將這個請求原封不動地轉發到我們在環境變數中設定的 BACKEND_URL。

**後端入口 (BACKEND_URL)**
角色: 這是「交通警察」手上的目標地址。Pages Function 會將所有攔截到的請求全部發送到這個地址。

它有兩種模式:
- 測試模式 (我們目前的設定): 使用 Cloudflare Tunnel (...trycloudflare.com)。這個 Tunnel 就像一條從 Cloudflare 網路直通本地電腦的加密專線，讓我們可以在本地進行完整的線上測試。

- 正式生產模式: 使用購買的雲端主機的公開 IP 地址或網域名稱 (例如 http://203.0.113.55:8000)。 這將指向一台 24/7 全天候運行的穩定伺服器。

### 完整的使用者請求流程
完整的使用者操作:
1. 上傳: 使用者在我們的 ...pages.dev 網站上選擇 demoapp.apk 並上傳。瀏覽器向 https://...pages.dev/api/upload 發送一個 POST 請求。

2. 攔截與轉發:
- Cloudflare Pages 收到請求。functions/api/[[path]].js 檔案被觸發。
- Function 讀取環境變數 BACKEND_URL (值為 https://...trycloudflare.com)。
- Function 將原始的 POST 請求（包含 APK 檔案內容）轉發到 https://...trycloudflare.com/api/upload。

3. 通過通道:
- 請求到達 Cloudflare Tunnel 的公開網址。
- cloudflared.exe 在本機上接收到這個請求，並將其轉發到 http://localhost:8000/api/upload。

4. 後端處理:
- 本地運行的 FastAPI 伺服器收到請求。
- FastAPI 儲存檔案，建立一個背景任務，並立即回傳一個包含 task_id 的 JSON 給前端。
- 背景任務開始執行 pack_apk.py，並在過程中更新狀態檔案（...status）。

5. 狀態輪詢:

- 前端收到 task_id 後，開始每 2 秒向 /api/status/... 發送 GET 請求。
- 這些 GET 請求同樣會經過 攔截 → 轉發 → 通道 的完整路徑到達 FastAPI。
- FastAPI 讀取狀態檔案，並將最新的進度（protecting, aligning, signing）回傳。

6. 完成:
- pack_apk.py 成功執行完畢。FastAPI 將最終狀態更新為 complete。
- 前端在下一次輪詢時獲取到 complete 狀態，並顯示成功畫面。整個流程結束

