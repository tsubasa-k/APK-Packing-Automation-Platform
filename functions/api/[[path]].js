// 檔案路徑: /functions/api/[[path]].js

export async function onRequest(context) {
  const backendUrl = context.env.BACKEND_URL;
  const apiKey = context.env.BACKEND_API_KEY; // 請在 Cloudflare Pages 後台設定此變數

  if (!backendUrl || !apiKey) {
    return new Response("Server configuration missing.", { status: 500 });
  }

  const originalUrl = new URL(context.request.url);
  const backendRequestUrl = new URL(originalUrl.pathname, backendUrl);
  backendRequestUrl.search = originalUrl.search;

  // 資安強化：建立新的標頭並注入 API Key
  const newHeaders = new Headers(context.request.headers);
  newHeaders.set("X-API-Key", apiKey);

  const backendRequest = new Request(backendRequestUrl, {
    method: context.request.method,
    headers: newHeaders,
    body: context.request.body,
    redirect: 'manual'
  });

  try {
    return await fetch(backendRequest);
  } catch (e) {
    return new Response("Backend connection failed.", { status: 502 });
  }
}
