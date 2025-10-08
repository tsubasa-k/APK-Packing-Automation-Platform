// 檔案路徑: /functions/api/[[path]].js

export async function onRequest(context) {
  // context.env.api_gateway 對應到您在儀表板上設定的 Service Binding
  // 它的 Variable name 必須是 api_gateway
  const service = context.env.api_gateway;

  if (!service) {
    return new Response("API gateway service binding not found.", { status: 500 });
  }

  // 將原始請求直接轉發給綁定的 Worker 服務
  return await service.fetch(context.request);
}
