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

  // 4. 執行 fetch 請求到後端 (您的 Tunnel)，並將後端的回應直接回傳給瀏覽器
  try {
    console.log(`Forwarding request to: ${backendRequestUrl}`); // 增加日誌以便偵錯
    return await fetch(backendRequest);
  } catch (e) {
    console.error(`Failed to connect to backend: ${e}`);
    return new Response("Failed to connect to the backend service via Pages Function.", { status: 502 }); // 502 Bad Gateway
  }
}
