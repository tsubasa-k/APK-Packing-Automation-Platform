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

```python
import uuid
import shutil
import subprocess
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

# --- 應用程式設定 ---
app = FastAPI()
UPLOAD_DIR = Path("uploads")
PROTECTED_DIR = Path("protected")
UPLOAD_DIR.mkdir(exist_ok=True)
PROTECTED_DIR.mkdir(exist_ok=True)

# --- 狀態管理 ---
# tasks 字典現在主要用來儲存最終狀態和檔案名
tasks = {}

class TaskStatus(BaseModel):
    status: str
    message: str
    file_name: str | None = None

# 在 main.py 中，找到並替換這個函數

def run_apk_hardening_script(input_path: Path, output_path: Path, task_id: str):
    """執行 pack_apk.py 腳本，並傳入 task_id。"""
    PYTHON_EXECUTABLE = r"C:\Users\user\miniconda3\envs\apk_env\python.exe"
    script_dir = Path(__file__).resolve().parent
    pack_apk_script_path = script_dir / "pack_apk.py"

    command = [
        PYTHON_EXECUTABLE,
        str(pack_apk_script_path),
        str(input_path.resolve()),
        str(output_path.resolve()),
        task_id
    ]
    
    try:
        # !!! 關鍵修改：暫時移除 capture_output=True 以進行偵錯 !!!
        # 這會讓所有輸出直接顯示在 Uvicorn 終端機上
        print(f"DEBUG MODE: Executing command -> {' '.join(command)}")
        
        subprocess.run(
            command, 
            check=True, 
            text=True,
            encoding='utf-8', 
            cwd=script_dir
        )

    except subprocess.CalledProcessError as e:
        # 真正的錯誤訊息會直接顯示在本機執行 uvicorn 的終端機視窗中
        print("\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print("!!! Subprocess 執行失敗，請檢查上方終端機的輸出尋找真實的錯誤訊息 !!!")
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n")
        
        # 我們回傳一個通用的錯誤，因為詳細資訊在日誌中
        raise Exception(
            "pack_apk.py 執行失敗，請檢查 FastAPI 伺服器的終端機日誌以獲取詳細資訊。"
        ) from e

def process_apk(task_id: str, original_filename: str):
    """背景任務，負責呼叫腳本並處理最終狀態。"""
    input_path = UPLOAD_DIR / f"{task_id}.apk"
    output_path = PROTECTED_DIR / f"{task_id}-protected.apk"
    
    try:
        # 呼叫腳本，現在傳入了 task_id
        run_apk_hardening_script(input_path, output_path, task_id)
        
        # 腳本成功執行後，更新 tasks 字典為 'complete'
        tasks[task_id].update({
            "status": "complete",
            "message": "APK 已成功處理。",
            "file_name": original_filename.replace(".apk", "-protected.apk")
        })
    except Exception as e:
        # 如果腳本執行失敗，更新 tasks 字典為 'error'
        tasks[task_id].update({
            "status": "error",
            "message": str(e)
        })
    finally:
        # 清理上傳的臨時檔案
        if input_path.exists():
            input_path.unlink()

# --- API Endpoints ---
@app.post("/api/upload")
async def upload_apk(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.endswith('.apk'):
        raise HTTPException(status_code=400, detail="無效的檔案類型。")

    task_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{task_id}.apk"
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 初始化任務狀態，設為 'uploading'
    tasks[task_id] = { "status": "uploading", "message": "檔案上傳成功，準備處理。" }
    background_tasks.add_task(process_apk, task_id, file.filename)
    return {"task_id": task_id, "message": "檔案已開始處理。"}

@app.get("/api/status/{task_id}", response_model=TaskStatus)
async def get_status(task_id: str):
    """查詢任務狀態的 API (修改後)。"""
    task = tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="找不到該任務。")

    # 如果任務已完成或出錯，直接從記憶體回傳
    if task['status'] in ['complete', 'error']:
        return TaskStatus(**task)

    # 否則，嘗試讀取狀態檔案來取得即時進度
    status_file = Path(f"{task_id}.status")
    current_progress = task['status'] # 預設為記憶體中的狀態
    if status_file.exists():
        try:
            current_progress = status_file.read_text(encoding="utf-8").strip()
        except Exception:
            # 讀取失敗也沒關係，使用記憶體中的狀態
            pass
            
    return TaskStatus(status=current_progress, message=f"正在處理: {current_progress}...", file_name=None)

@app.get("/api/download/{task_id}")
async def download_protected_apk(task_id: str):
    task = tasks.get(task_id)
    if not task or task['status'] != 'complete':
        raise HTTPException(status_code=404, detail="檔案尚未準備好或任務不存在。")
    file_path = PROTECTED_DIR / f"{task_id}-protected.apk"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="找不到處理完成的檔案。")
    return FileResponse(path=file_path, filename=task['file_name'], media_type='application/vnd.android.package-archive')
```

pack_apk.py

```python
import os
import subprocess
import shutil
import zipfile
import sys
import re
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from pathlib import Path

# ... (設定區保持不變) ...
# === 設定區 ===
APKTOOL_PATH = "apktool.jar"
APKSIGNER_PATH = r"C:\Users\user\AppData\Local\Android\Sdk\build-tools\35.0.0\apksigner.bat"
ZIPALIGN_PATH = r"C:\Users\user\AppData\Local\Android\Sdk\build-tools\35.0.0\zipalign.exe"
KEYTOOL_PATH = "keytool"
KEYSTORE = "my-release-key.jks"
ALIAS = "my-alias"
KEYPASS = "123456"
ENCRYPTION_KEY = bytes.fromhex("d44f165a478f7fdfee5f7beb791c492e19edead1088c3d60df7d2f3a19be48ab")
LOADER_APPLICATION_NAME = "com.cymetrics.real.RealApp"
LOADER_DEX_PATH = "loader_shell.dex"
ENCRYPTED_BIN_NAME = "payload.bin"


# === 新增的工具函數 ===
def update_status(status_file_path, status):
    """將目前的狀態寫入狀態檔案中。"""
    print(f"STATUS UPDATE: {status}")
    try:
        with open(status_file_path, "w", encoding="utf-8") as f:
            f.write(status)
    except Exception as e:
        # 即使狀態更新失敗，也不要中斷主流程
        print(f"Warning: Could not update status file {status_file_path}: {e}", file=sys.stderr)

# ... (run_cmd, ensure_dir, auto_patch_manifest 函數保持不變) ...
def run_cmd(cmd_parts, check_error=True):
    processed_cmd = []
    if cmd_parts[0].endswith(".jar"):
        processed_cmd = ["java", "-jar"] + cmd_parts
    elif sys.platform == "win32" and cmd_parts[0].endswith((".bat", ".cmd")):
        processed_cmd = ["cmd", "/c"] + cmd_parts
    else:
        processed_cmd = cmd_parts
    print(f"🚀 Running: {' '.join(processed_cmd)}")
    try:
        result = subprocess.run(processed_cmd, capture_output=True, text=True, encoding='utf-8', check=check_error)
        if result.stdout: print(result.stdout)
        if result.stderr: print(result.stderr, file=sys.stderr)
        return result
    except FileNotFoundError:
        print(f"❌ 錯誤: 找不到命令或檔案 '{processed_cmd[0]}'", file=sys.stderr)
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"❌ 命令失敗 (Exit Code: {e.returncode}): {' '.join(e.cmd)}", file=sys.stderr)
        if e.stdout: print(f"--- STDOUT ---\n{e.stdout}", file=sys.stderr)
        if e.stderr: print(f"--- STDERR ---\n{e.stderr}", file=sys.stderr)
        sys.exit(1)

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def auto_patch_manifest(manifest_path, loader_app_name):
    print(f"[+] 正在修補 AndroidManifest.xml: {manifest_path}")
    with open(manifest_path, "r", encoding="utf-8") as f: content = f.read()
    if re.search(r'<application[^>]*android:name=', content):
        print(f"⚙️ 找到 android:name in <application> → 替換為: {loader_app_name}")
        content = re.sub(r'(<application[^>]*android:name=")[^"]*(")', r'\1' + loader_app_name + r'\2', content, 1)
    else:
        print("⚙️ 未找到 android:name → 插入屬性")
        content = re.sub(r'<application', r'<application android:name="' + loader_app_name + '"', content, 1)
    with open(manifest_path, "w", encoding="utf-8") as f: f.write(content)
    print("[+] AndroidManifest.xml 修補完成。")


# === 主函數 (修改後) ===
def main(input_apk, output_apk, task_id):
    """主執行函數，現在也接收 task_id 來更新狀態。"""

    # 狀態檔案的路徑。我們將其放在主目錄下，方便 FastAPI 讀取。
    status_file = Path(f"{task_id}.status")

    if not os.path.exists(input_apk): # ... (檢查邏輯不變) ...
        update_status(status_file, "error")
        print(f"❌ 錯誤: 找不到輸入檔案 {input_apk}", file=sys.stderr)
        sys.exit(1)
    
    if not os.path.exists(LOADER_DEX_PATH): # ... (檢查邏輯不變) ...
        update_status(status_file, "error")
        print(f"❌ 錯誤: 找不到 Loader DEX 檔案 '{LOADER_DEX_PATH}'", file=sys.stderr)
        sys.exit(1)

    work_dir = f"temp_work_{os.path.basename(input_apk)}_{os.getpid()}"
    # ... (路徑設定不變) ...
    class_dir = os.path.join(work_dir, "unpacked_dex")
    build_dir = os.path.join(work_dir, "apktool_build")
    assets_dir = os.path.join(work_dir, "assets")

    if os.path.exists(work_dir): shutil.rmtree(work_dir)
    for d in [class_dir, build_dir, assets_dir]: ensure_dir(d)

    try:
        # === Step 1 & 2: 加殼保護 ===
        update_status(status_file, "protecting") # <-- 更新狀態
        print("== Step 1 & 2: 解壓、加密、修改 (加殼保護) ==")
        with zipfile.ZipFile(input_apk, 'r') as zip_ref: zip_ref.extractall(class_dir)
        run_cmd([APKTOOL_PATH, "d", input_apk, "-o", build_dir, "-f"])
        
        original_dex_path = os.path.join(class_dir, "classes.dex")
        if not os.path.exists(original_dex_path): raise FileNotFoundError(f"找不到 classes.dex")
        
        with open(original_dex_path, "rb") as f: plaintext = f.read()
        nonce = get_random_bytes(12)
        cipher = AES.new(ENCRYPTION_KEY, AES.MODE_GCM, nonce=nonce)
        ciphertext, tag = cipher.encrypt_and_digest(plaintext)
        payload_data = nonce + ciphertext + tag
        
        encrypted_bin_path = os.path.join(assets_dir, ENCRYPTED_BIN_NAME)
        with open(encrypted_bin_path, "wb") as f: f.write(payload_data)
        
        manifest_path = os.path.join(build_dir, "AndroidManifest.xml")
        auto_patch_manifest(manifest_path, LOADER_APPLICATION_NAME)
        
        temp_rebuilt_apk = os.path.join(work_dir, "rebuilt.apk")
        run_cmd([APKTOOL_PATH, "b", build_dir, "-o", temp_rebuilt_apk])
        
        temp_unsigned_apk = os.path.join(work_dir, "unsigned.apk")
        with zipfile.ZipFile(temp_rebuilt_apk, 'r') as src, zipfile.ZipFile(temp_unsigned_apk, 'w', zipfile.ZIP_DEFLATED) as dst:
            for item in src.infolist():
                if item.filename.lower() == "classes.dex": continue
                dst.writestr(item, src.read(item.filename))
            dst.write(LOADER_DEX_PATH, "classes.dex")
            dst.write(encrypted_bin_path, f"assets/{ENCRYPTED_BIN_NAME}")

        # === Step 6: 對齊 ===
        update_status(status_file, "aligning") # <-- 更新狀態
        print("\n== Step 6: Zipalign 對齊 ==")
        aligned_apk = os.path.join(work_dir, "aligned.apk")
        run_cmd([ZIPALIGN_PATH, "-v", "4", temp_unsigned_apk, aligned_apk])

        # === Step 7 & 8: 簽章 ===
        update_status(status_file, "signing") # <-- 更新狀態
        print("\n== Step 7 & 8: 檢查 Keystore 並進行簽章 ==")
        if not os.path.exists(KEYSTORE):
            print("🔑 正在產生新的 Keystore...")
            keytool_cmd = [KEYTOOL_PATH, "-genkey", "-v", "-keystore", KEYSTORE, "-alias", ALIAS, "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000", "-storepass", KEYPASS, "-keypass", KEYPASS, "-dname", "CN=Demo, OU=Protect, O=Research, L=Taipei, S=TW, C=TW"]
            run_cmd(keytool_cmd)
        else:
            print(f"✅ 使用現有的 Keystore: {KEYSTORE}")
            
        apksigner_cmd = [APKSIGNER_PATH, "sign", "--ks", KEYSTORE, "--ks-pass", f"pass:{KEYPASS}", "--out", output_apk, aligned_apk]
        run_cmd(apksigner_cmd)
        
        print(f"\n✅ 完成！最終保護後的 APK 已儲存至: {output_apk}")

    except Exception as e:
        update_status(status_file, "error") # <-- 發生錯誤時也更新狀態
        print(f"\n❌ 發生錯誤: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        print("\n== 清理暫存目錄與狀態檔案 ==")
        if os.path.exists(work_dir): shutil.rmtree(work_dir)
        if status_file.exists(): status_file.unlink() # 刪除狀態檔案


# === 腳本入口 (修改後) ===
if __name__ == "__main__":
    if len(sys.argv) not in [2, 4]:
        print("❌ 使用方式:")
        print("   1. (手動測試): python pack_apk.py <input_apk_path>")
        print("   2. (後端調用): python pack_apk.py <input_apk_path> <output_apk_path> <task_id>")
        sys.exit(1)

    if len(sys.argv) == 2:
        # 手動測試，task_id 設為 "manual_test"
        input_file = sys.argv[1]
        base_name = os.path.splitext(os.path.basename(input_file))[0]
        output_file = f"{base_name}_protected.apk"
        task_id = "manual_test"
        main(input_file, output_file, task_id)
    else: # len(sys.argv) == 4
        # 後端調用
        input_file = sys.argv[1]
        output_file = sys.argv[2]
        task_id = sys.argv[3]
        main(input_file, output_file, task_id)
```
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

- 正式生產模式: 使用購買的雲端主機的公開 IP 地址或網域名稱 (例如 http://203.0.113.55:8000)。這將指向一台 24/7 全天候運行的穩定伺服器。

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

### 已經測試完的pack_apk.py:
```python
import os
import subprocess
import shutil
import zipfile
import sys
import re
import glob
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from pathlib import Path

# === 設定區 ===
# --- 基礎工具路徑 ---
APKTOOL_PATH = "apktool.jar"
APKSIGNER_PATH = r"C:\Users\user\AppData\Local\Android\Sdk\build-tools\35.0.0\apksigner.bat"
ZIPALIGN_PATH = r"C:\Users\user\AppData\Local\Android\Sdk\build-tools\35.0.0\zipalign.exe"
KEYTOOL_PATH = "keytool"

# --- Java 編譯與 D8 工具路徑 ---
JAVAC_PATH = "javac"
ANDROID_JAR_PATH = r"C:\Users\user\AppData\Local\Android\Sdk\platforms\android-36\android.jar"
D8_PATH = r"C:\Users\user\AppData\Local\Android\Sdk\build-tools\35.0.0\d8.bat"

# --- ProGuard 相關設定 (已移除) ---
# PROGUARD_JAR_PATH 和 PROGUARD_CONFIG_PATH 已被移除

# --- 專案原始碼與設定 ---
JAVA_SOURCE_DIR = "java_sources"
LOADER_APPLICATION_NAME = "com.cymetrics.real.RealApp"

# --- 簽章設定 ---
KEYSTORE = "my-release-key.jks"
ALIAS = "my-alias"
KEYPASS = "123456"

# --- 加密設定 ---
ENCRYPTION_KEY = bytes.fromhex("d44f165a478f7fdfee5f7beb791c492e19edead1088c3d60df7d2f3a19be48ab")
ENCRYPTED_BIN_NAME = "payload.bin"

# === 工具函數 (已簡化) ===
def update_status(status_file_path, status):
    print(f"STATUS UPDATE: {status}")
    try:
        with open(status_file_path, "w", encoding="utf-8") as f:
            f.write(status)
    except Exception as e:
        print(f"Warning: Could not update status file {status_file_path}: {e}", file=sys.stderr)

def run_cmd(cmd_parts, check_error=True):
    processed_cmd = []
    
    if cmd_parts[0].endswith(".jar"):
        # 為 apktool.jar 設定一個合理的記憶體限制，避免崩潰
        if APKTOOL_PATH in cmd_parts[0]:
            print("  -> 偵測到 Apktool，分配標準記憶體...")
            processed_cmd = ["java", "-Xmx1g", "-jar"] + cmd_parts
        else:
            # 對於其他 .jar 檔案，使用預設設定
            processed_cmd = ["java", "-jar"] + cmd_parts
    
    elif sys.platform == "win32" and cmd_parts[0].endswith((".bat", ".cmd")):
        processed_cmd = ["cmd", "/c"] + cmd_parts
    else:
        processed_cmd = cmd_parts
        
    print(f"🚀 Running: {' '.join(processed_cmd)}")
    try:
        result = subprocess.run(processed_cmd, capture_output=True, text=True, encoding='utf-8', check=check_error)
        if result.stdout: print(result.stdout)
        if result.stderr: print(result.stderr, file=sys.stderr)
        return result
    except FileNotFoundError:
        print(f"❌ 錯誤: 找不到命令或檔案 '{processed_cmd[0]}'", file=sys.stderr)
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"❌ 命令失敗 (Exit Code: {e.returncode}): {' '.join(e.cmd)}", file=sys.stderr)
        if e.stdout: print(f"--- STDOUT ---\n{e.stdout}", file=sys.stderr)
        if e.stderr: print(f"--- STDERR ---\n{e.stderr}", file=sys.stderr)
        sys.exit(1)

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def auto_patch_manifest(manifest_path, loader_app_name):
    print(f"[+] 正在修補 AndroidManifest.xml: {manifest_path}")
    with open(manifest_path, "r", encoding="utf-8") as f: content = f.read()
    if re.search(r'<application[^>]*android:name=', content):
        content = re.sub(r'(<application[^>]*android:name=")[^"]*(")', r'\1' + loader_app_name + r'\2', content, 1)
    else:
        content = re.sub(r'<application', r'<application android:name="' + loader_app_name + '"', content, 1)
    with open(manifest_path, "w", encoding="utf-8") as f: f.write(content)
    print("[+] AndroidManifest.xml 修補完成。")


# === 主函數 (已簡化) ===
def main(input_apk, output_apk, task_id):
    status_file = Path(f"{task_id}.status")

    if not os.path.exists(input_apk):
        update_status(status_file, "error")
        print(f"❌ 錯誤: 找不到輸入檔案 {input_apk}", file=sys.stderr)
        sys.exit(1)

    work_dir = f"temp_work_{os.path.basename(input_apk)}_{os.getpid()}"
    class_dir = os.path.join(work_dir, "unpacked_dex")
    build_dir = os.path.join(work_dir, "apktool_build")
    assets_dir = os.path.join(work_dir, "assets")

    if os.path.exists(work_dir): shutil.rmtree(work_dir)
    for d in [class_dir, build_dir, assets_dir]: ensure_dir(d)

    try:
        # === Step 0: 編譯 Java 原始碼並建立 Loader DEX ===
        print("\n== Step 0: 編譯 Java 並建立 Loader DEX ==")
        update_status(status_file, "protecting")

        java_out_class_dir = os.path.join(work_dir, "out_class")
        java_out_dex_dir = os.path.join(work_dir, "out_dex")
        for d in [java_out_class_dir, java_out_dex_dir]: ensure_dir(d)

        # 1. 編譯 Java 原始碼
        if not os.path.isdir(JAVA_SOURCE_DIR): raise FileNotFoundError(f"'{JAVA_SOURCE_DIR}' 不存在！")
        java_files = glob.glob(os.path.join(JAVA_SOURCE_DIR, "**", "*.java"), recursive=True)
        if not java_files: raise FileNotFoundError(f"在 '{JAVA_SOURCE_DIR}' 中找不到 .java 檔案。")
        
        print("  -> 正在編譯 Java 原始碼...")
        javac_cmd = [JAVAC_PATH, "-classpath", ANDROID_JAR_PATH, "-d", java_out_class_dir] + java_files
        run_cmd(javac_cmd)
        print("  -> Java 編譯完成。")
        
        # 2. 執行 d8 將 .class 轉為 classes.dex
        print("  -> 正在使用 d8 轉換為 DEX...")
        class_files = glob.glob(os.path.join(java_out_class_dir, "**", "*.class"), recursive=True)
        if not class_files:
            raise FileNotFoundError(f"在 '{java_out_class_dir}' 中找不到編譯後的 .class 檔案。")

        d8_cmd = [
            D8_PATH,
            "--output", java_out_dex_dir,
            "--classpath", ANDROID_JAR_PATH
        ] + class_files
        run_cmd(d8_cmd)

        generated_dex_path = os.path.join(java_out_dex_dir, "classes.dex")
        if not os.path.exists(generated_dex_path):
            raise FileNotFoundError("d8 未能成功產生 classes.dex！")
        print(f"  -> DEX 檔案已成功建立: {generated_dex_path}")
        
        # --- 原有流程開始 ---
        print("\n== Step 1 & 2: 解壓、加密、修改 (加殼保護) ==")

        with zipfile.ZipFile(input_apk, 'r') as zip_ref: zip_ref.extractall(class_dir)
        run_cmd([APKTOOL_PATH, "d", input_apk, "-o", build_dir, "-f"])
        
        original_dex_path = os.path.join(class_dir, "classes.dex")
        if not os.path.exists(original_dex_path): raise FileNotFoundError(f"找不到 classes.dex")
        
        with open(original_dex_path, "rb") as f: plaintext = f.read()
        nonce = get_random_bytes(12)
        cipher = AES.new(ENCRYPTION_KEY, AES.MODE_GCM, nonce=nonce)
        ciphertext, tag = cipher.encrypt_and_digest(plaintext)
        payload_data = nonce + ciphertext + tag
        
        encrypted_bin_path = os.path.join(assets_dir, ENCRYPTED_BIN_NAME)
        with open(encrypted_bin_path, "wb") as f: f.write(payload_data)
        
        manifest_path = os.path.join(build_dir, "AndroidManifest.xml")
        auto_patch_manifest(manifest_path, LOADER_APPLICATION_NAME)
        
        temp_rebuilt_apk = os.path.join(work_dir, "rebuilt.apk")
        run_cmd([APKTOOL_PATH, "b", build_dir, "-o", temp_rebuilt_apk])
        
        temp_unsigned_apk = os.path.join(work_dir, "unsigned.apk")
        with zipfile.ZipFile(temp_rebuilt_apk, 'r') as src, zipfile.ZipFile(temp_unsigned_apk, 'w', zipfile.ZIP_DEFLATED) as dst:
            for item in src.infolist():
                if item.filename.lower() == "classes.dex": continue
                dst.writestr(item, src.read(item.filename))
            dst.write(generated_dex_path, "classes.dex")
            dst.write(encrypted_bin_path, f"assets/{ENCRYPTED_BIN_NAME}")

        # === Step 6: 對齊 ===
        update_status(status_file, "aligning")
        print("\n== Step 6: Zipalign 對齊 ==")
        aligned_apk = os.path.join(work_dir, "aligned.apk")
        run_cmd([ZIPALIGN_PATH, "-v", "4", temp_unsigned_apk, aligned_apk])

        # === Step 7 & 8: 簽章 ===
        update_status(status_file, "signing")
        print("\n== Step 7 & 8: 檢查 Keystore 並進行簽章 ==")
        if not os.path.exists(KEYSTORE):
            keytool_cmd = [KEYTOOL_PATH, "-genkey", "-v", "-keystore", KEYSTORE, "-alias", ALIAS, "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000", "-storepass", KEYPASS, "-keypass", KEYPASS, "-dname", "CN=Demo, OU=Protect, O=Research, L=Taipei, S=TW, C=TW"]
            run_cmd(keytool_cmd)
            
        apksigner_cmd = [APKSIGNER_PATH, "sign", "--ks", KEYSTORE, "--ks-pass", f"pass:{KEYPASS}", "--out", output_apk, aligned_apk]
        run_cmd(apksigner_cmd)
        
        print(f"\n✅ 完成！最終保護後的 APK 已儲存至: {output_apk}")

    except Exception as e:
        update_status(status_file, "error")
        print(f"\n❌ 發生錯誤: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        print("\n== 清理暫存目錄與狀態檔案 ==")
        if os.path.exists(work_dir): shutil.rmtree(work_dir)
        if status_file.exists(): status_file.unlink()

# === 腳本入口 (保持不變) ===
if __name__ == "__main__":
    if len(sys.argv) not in [2, 4]:
        print("❌ 使用方式:")
        print("   1. (手動測試): python pack_apk.py <input_apk_path>")
        print("   2. (後端調用): python pack_apk.py <input_apk_path> <output_apk_path> <task_id>")
        sys.exit(1)
    if len(sys.argv) == 2:
        input_file = sys.argv[1]
        base_name = os.path.splitext(os.path.basename(input_file))[0]
        output_file = f"{base_name}_protected.apk"
        task_id = "manual_test"
        main(input_file, output_file, task_id)
    else:
        input_file = sys.argv[1]
        output_file = sys.argv[2]
        task_id = sys.argv[3]
        main(input_file, output_file, task_id)
```

### 正在測試的pack_apk.py:(已完成加混淆)
```python
import os
import subprocess
import shutil
import zipfile
import sys
import re
import glob
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from pathlib import Path

# === 設定區 ===
# --- 基礎工具路徑 ---
APKTOOL_PATH = "apktool.jar"
APKSIGNER_PATH = r"C:\Users\user\AppData\Local\Android\Sdk\build-tools\35.0.0\apksigner.bat"
ZIPALIGN_PATH = r"C:\Users\user\AppData\Local\Android\Sdk\build-tools\35.0.0\zipalign.exe"
KEYTOOL_PATH = "keytool"

# --- Java 編譯與 D8 工具路徑 ---
JAVAC_PATH = "javac"
ANDROID_JAR_PATH = r"C:\Users\user\AppData\Local\Android\Sdk\platforms\android-36\android.jar"
D8_PATH = r"C:\Users\user\AppData\Local\Android\Sdk\build-tools\35.0.0\d8.bat"

# --- 新增：ProGuard 混淆工具路徑 ---
# *** 請將此路徑修改為電腦上 proguard.jar 的實際位置 ***
PROGUARD_JAR_PATH = r"C:\Users\user\proguard-7.8.0\lib\proguard.jar"
# ProGuard 規則檔案的路徑
PROGUARD_CONFIG_PATH = "proguard-rules.pro"

# --- 專案原始碼與設定 ---
JAVA_SOURCE_DIR = "java_sources"
LOADER_APPLICATION_NAME = "com.cymetrics.real.RealApp"

# --- 簽章設定 ---
KEYSTORE = "my-release-key.jks"
ALIAS = "my-alias"
KEYPASS = "123456"

# --- 加密設定 ---
ENCRYPTION_KEY = bytes.fromhex("d44f165a478f7fdfee5f7beb791c492e19edead1088c3d60df7d2f3a19be48ab")
ENCRYPTED_BIN_NAME = "payload.bin"

# === 工具函數 (保持不變) ===
def update_status(status_file_path, status):
    print(f"STATUS UPDATE: {status}")
    try:
        with open(status_file_path, "w", encoding="utf-8") as f:
            f.write(status)
    except Exception as e:
        print(f"Warning: Could not update status file {status_file_path}: {e}", file=sys.stderr)

def run_cmd(cmd_parts, check_error=True):
    processed_cmd = []
    
    # 判斷是否為 java -jar 指令
    if cmd_parts[0].endswith(".jar"):
        # 檢查是否為 ProGuard，只為它增加記憶體
        if PROGUARD_JAR_PATH in cmd_parts[0]:
            print("  -> Detected ProGuard, allocating more memory...")
            processed_cmd = [
                "java", 
                "-Xmx2g", # 將最大堆疊記憶體設為 2GB
                "-XX:ReservedCodeCacheSize=512m", # 增加程式碼快取大小
                "-jar"
            ] + cmd_parts
        else:
            # 對於其他 .jar 檔案 (例如 apktool.jar)，使用預設的記憶體設定
            processed_cmd = ["java", "-jar"] + cmd_parts
    
    elif sys.platform == "win32" and cmd_parts[0].endswith((".bat", ".cmd")):
        processed_cmd = ["cmd", "/c"] + cmd_parts
    else:
        processed_cmd = cmd_parts
        
    print(f"🚀 Running: {' '.join(processed_cmd)}")
    try:
        # ... 後續的 try/except 區塊保持不變 ...
        result = subprocess.run(processed_cmd, capture_output=True, text=True, encoding='utf-8', check=check_error)
        if result.stdout: print(result.stdout)
        if result.stderr: print(result.stderr, file=sys.stderr)
        return result
    except FileNotFoundError:
        print(f"❌ 錯誤: 找不到命令或檔案 '{processed_cmd[0]}'", file=sys.stderr)
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"❌ 命令失敗 (Exit Code: {e.returncode}): {' '.join(e.cmd)}", file=sys.stderr)
        if e.stdout: print(f"--- STDOUT ---\n{e.stdout}", file=sys.stderr)
        if e.stderr: print(f"--- STDERR ---\n{e.stderr}", file=sys.stderr)
        sys.exit(1)

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def auto_patch_manifest(manifest_path, loader_app_name):
    print(f"[+] 正在修補 AndroidManifest.xml: {manifest_path}")
    with open(manifest_path, "r", encoding="utf-8") as f: content = f.read()
    if re.search(r'<application[^>]*android:name=', content):
        content = re.sub(r'(<application[^>]*android:name=")[^"]*(")', r'\1' + loader_app_name + r'\2', content, 1)
    else:
        content = re.sub(r'<application', r'<application android:name="' + loader_app_name + '"', content, 1)
    with open(manifest_path, "w", encoding="utf-8") as f: f.write(content)
    print("[+] AndroidManifest.xml 修補完成。")


# === 主函數 (已修改) ===
def main(input_apk, output_apk, task_id):
    status_file = Path(f"{task_id}.status")

    if not os.path.exists(input_apk):
        update_status(status_file, "error")
        print(f"❌ 錯誤: 找不到輸入檔案 {input_apk}", file=sys.stderr)
        sys.exit(1)

    work_dir = f"temp_work_{os.path.basename(input_apk)}_{os.getpid()}"
    class_dir = os.path.join(work_dir, "unpacked_dex")
    build_dir = os.path.join(work_dir, "apktool_build")
    assets_dir = os.path.join(work_dir, "assets")

    if os.path.exists(work_dir): shutil.rmtree(work_dir)
    for d in [class_dir, build_dir, assets_dir]: ensure_dir(d)

    try:
        # === Step 0: 編譯、混淆 Java 原始碼並建立 Loader DEX ===
        print("\n== Step 0: 編譯、混淆並建立 Loader DEX ==")
        update_status(status_file, "protecting")

        java_out_class_dir = os.path.join(work_dir, "out_class")
        unobfuscated_jar = os.path.join(work_dir, "unobfuscated_loader.jar")
        obfuscated_jar = os.path.join(work_dir, "obfuscated_loader.jar")
        java_out_dex_dir = os.path.join(work_dir, "out_dex")
        for d in [java_out_class_dir, java_out_dex_dir]: ensure_dir(d)

        # 1. 編譯 Java 原始碼
        if not os.path.isdir(JAVA_SOURCE_DIR): raise FileNotFoundError(f"'{JAVA_SOURCE_DIR}' 不存在！")
        java_files = glob.glob(os.path.join(JAVA_SOURCE_DIR, "**", "*.java"), recursive=True)
        if not java_files: raise FileNotFoundError(f"在 '{JAVA_SOURCE_DIR}' 中找不到 .java 檔案。")
        
        print("  -> 正在編譯 Java 原始碼...")
        javac_cmd = [JAVAC_PATH, "-classpath", ANDROID_JAR_PATH, "-d", java_out_class_dir] + java_files
        run_cmd(javac_cmd)
        print("  -> Java 編譯完成。")

        # 2. 將編譯後的 .class 檔案打包成一個 JAR
        print("  -> 正在打包 .class 檔案為 JAR...")
        with zipfile.ZipFile(unobfuscated_jar, 'w') as zf:
            for root, _, files in os.walk(java_out_class_dir):
                for file in files:
                    if file.endswith('.class'):
                        abs_path = os.path.join(root, file)
                        rel_path = os.path.relpath(abs_path, java_out_class_dir)
                        zf.write(abs_path, rel_path)
        print(f"  -> 未混淆的 JAR 已建立: {unobfuscated_jar}")

        # 3. 執行 ProGuard 進行混淆
        print("  -> 正在使用 ProGuard 進行混淆...")
        if not os.path.exists(PROGUARD_CONFIG_PATH):
            raise FileNotFoundError(f"ProGuard 規則檔案 '{PROGUARD_CONFIG_PATH}' 不存在！")
        
        # 在 main 函數的 Step 3 中
        print("  -> 正在使用 ProGuard 進行混淆...")
        if not os.path.exists(PROGUARD_CONFIG_PATH):
            raise FileNotFoundError(f"ProGuard 規則檔案 '{PROGUARD_CONFIG_PATH}' 不存在！")

        proguard_cmd = [
            PROGUARD_JAR_PATH,
            f"@{PROGUARD_CONFIG_PATH}",  # <-- 關鍵修正：確保這裡使用的是 PROGUARD_CONFIG_PATH
            "-injars", unobfuscated_jar,
            "-outjars", obfuscated_jar,
            "-libraryjars", ANDROID_JAR_PATH
        ]
        run_cmd(proguard_cmd)
        print(f"  -> 混淆後的 JAR 已建立: {obfuscated_jar}")
        
        # 4. 執行 d8 將混淆後的 JAR 轉為 DEX
        print("  -> 正在使用 d8 將混淆後的 JAR 轉換為 DEX...")
        d8_cmd = [ D8_PATH, "--output", java_out_dex_dir, obfuscated_jar ]
        run_cmd(d8_cmd)

        generated_dex_path = os.path.join(java_out_dex_dir, "classes.dex")
        if not os.path.exists(generated_dex_path):
            raise FileNotFoundError("d8 未能成功產生 classes.dex！")
        print(f"  -> 混淆後的 DEX 檔案已成功建立: {generated_dex_path}")
        
        # --- 原有流程開始 ---
        print("\n== Step 1 & 2: 解壓、加密、修改 (加殼保護) ==")
        with zipfile.ZipFile(input_apk, 'r') as zip_ref: zip_ref.extractall(class_dir)
        run_cmd([APKTOOL_PATH, "d", input_apk, "-o", build_dir, "-f"])
        
        original_dex_path = os.path.join(class_dir, "classes.dex")
        if not os.path.exists(original_dex_path): raise FileNotFoundError(f"找不到 classes.dex")
        
        with open(original_dex_path, "rb") as f: plaintext = f.read()
        nonce = get_random_bytes(12)
        cipher = AES.new(ENCRYPTION_KEY, AES.MODE_GCM, nonce=nonce)
        ciphertext, tag = cipher.encrypt_and_digest(plaintext)
        payload_data = nonce + ciphertext + tag
        
        encrypted_bin_path = os.path.join(assets_dir, ENCRYPTED_BIN_NAME)
        with open(encrypted_bin_path, "wb") as f: f.write(payload_data)
        
        manifest_path = os.path.join(build_dir, "AndroidManifest.xml")
        auto_patch_manifest(manifest_path, LOADER_APPLICATION_NAME)
        
        temp_rebuilt_apk = os.path.join(work_dir, "rebuilt.apk")
        run_cmd([APKTOOL_PATH, "b", build_dir, "-o", temp_rebuilt_apk])
        
        temp_unsigned_apk = os.path.join(work_dir, "unsigned.apk")
        with zipfile.ZipFile(temp_rebuilt_apk, 'r') as src, zipfile.ZipFile(temp_unsigned_apk, 'w', zipfile.ZIP_DEFLATED) as dst:
            for item in src.infolist():
                if item.filename.lower() == "classes.dex": continue
                dst.writestr(item, src.read(item.filename))
            dst.write(generated_dex_path, "classes.dex") # 使用混淆後的 DEX
            dst.write(encrypted_bin_path, f"assets/{ENCRYPTED_BIN_NAME}")

        # === Step 6: 對齊 ===
        update_status(status_file, "aligning")
        print("\n== Step 6: Zipalign 對齊 ==")
        aligned_apk = os.path.join(work_dir, "aligned.apk")
        run_cmd([ZIPALIGN_PATH, "-v", "4", temp_unsigned_apk, aligned_apk])

        # === Step 7 & 8: 簽章 ===
        update_status(status_file, "signing")
        print("\n== Step 7 & 8: 檢查 Keystore 並進行簽章 ==")
        if not os.path.exists(KEYSTORE):
            keytool_cmd = [KEYTOOL_PATH, "-genkey", "-v", "-keystore", KEYSTORE, "-alias", ALIAS, "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000", "-storepass", KEYPASS, "-keypass", KEYPASS, "-dname", "CN=Demo, OU=Protect, O=Research, L=Taipei, S=TW, C=TW"]
            run_cmd(keytool_cmd)
            
        apksigner_cmd = [APKSIGNER_PATH, "sign", "--ks", KEYSTORE, "--ks-pass", f"pass:{KEYPASS}", "--out", output_apk, aligned_apk]
        run_cmd(apksigner_cmd)
        
        print(f"\n✅ 完成！最終保護後的 APK 已儲存至: {output_apk}")

    except Exception as e:
        update_status(status_file, "error")
        print(f"\n❌ 發生錯誤: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        print("\n== 清理暫存目錄與狀態檔案 ==")
        if os.path.exists(work_dir): shutil.rmtree(work_dir)
        if status_file.exists(): status_file.unlink()

# === 腳本入口 (保持不變) ===
if __name__ == "__main__":
    if len(sys.argv) not in [2, 4]:
        print("❌ 使用方式:")
        print("   1. (手動測試): python pack_apk.py <input_apk_path>")
        print("   2. (後端調用): python pack_apk.py <input_apk_path> <output_apk_path> <task_id>")
        sys.exit(1)
    if len(sys.argv) == 2:
        input_file = sys.argv[1]
        base_name = os.path.splitext(os.path.basename(input_file))[0]
        output_file = f"{base_name}_protected.apk"
        task_id = "manual_test"
        main(input_file, output_file, task_id)
    else:
        input_file = sys.argv[1]
        output_file = sys.argv[2]
        task_id = sys.argv[3]
        main(input_file, output_file, task_id)
```
