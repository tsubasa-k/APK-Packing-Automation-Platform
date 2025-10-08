//App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { ProcessStatus, ProcessStep } from './types';
import FileUpload from './components/FileUpload';
import ProcessStepper from './components/ProcessStepper';
import StatusIndicator from './components/StatusIndicator';
import { CheckIcon } from './components/icons/CheckIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';

// 狀態與後端 API 的 'status' 字串對應
const statusMapping: { [key: string]: ProcessStatus } = {
  uploading: ProcessStatus.UPLOADING,
  protecting: ProcessStatus.PROTECTING,
  aligning: ProcessStatus.ALIGNING, // 假設後端也會回報這些狀態
  signing: ProcessStatus.SIGNING,   // 假設後端也會回報這些狀態
  complete: ProcessStatus.COMPLETE,
  error: ProcessStatus.ERROR,
};

const initialSteps: ProcessStep[] = [
  // 我們可以保留這個結構來驅動 UI，但實際進度由後端決定
  { name: '上傳 APK', status: ProcessStatus.UPLOADING, duration: 0 },
  { name: '加殼保護', status: ProcessStatus.PROTECTING, duration: 0 },
  { name: '對齊封裝', status: ProcessStatus.ALIGNING, duration: 0 },
  { name: '進行簽章', status: ProcessStatus.SIGNING, duration: 0 },
];

const App: React.FC = () => {
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [processState, setProcessState] = useState<ProcessStatus>(ProcessStatus.IDLE);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [protectedFileName, setProtectedFileName] = useState<string>('');

  const resetState = useCallback(() => {
    setApkFile(null);
    setTaskId(null);
    setProcessState(ProcessStatus.IDLE);
    setCurrentStepIndex(-1);
    setErrorMessage('');
    setProtectedFileName('');
  }, []);

  const handleFileSelect = (file: File) => {
    if (file && file.name.endsWith('.apk')) {
      setApkFile(file);
      setErrorMessage('');
      // 選擇檔案後立即開始上傳
      handleUpload(file);
    } else {
      setErrorMessage('檔案類型無效，請上傳 .apk 檔案。');
    }
  };
  
  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    setProcessState(ProcessStatus.UPLOADING);
    setCurrentStepIndex(0); // 進入第一個步驟 '上傳'

    try {
      // 所有 API 請求都發送到相對路徑 /api/，這將被 Cloudflare Worker 攔截
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '上傳失敗。');
      }

      const result = await response.json();
      setTaskId(result.task_id); // 儲存 task_id 以便後續查詢

    } catch (error) {
      setProcessState(ProcessStatus.ERROR);
      setErrorMessage(error instanceof Error ? error.message : '未知錯誤');
    }
  };

  const handleDownload = () => {
    if (!taskId) return;
    // 直接建立一個指向下載端點的連結
    const link = document.createElement('a');
    link.href = `/api/download/${taskId}`;
    link.setAttribute('download', protectedFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 在 App.tsx 中找到 useEffect hook，並用以下程式碼取代

useEffect(() => {
    // 如果沒有 task_id 或任務已結束，則不執行任何操作
    if (!taskId || processState === ProcessStatus.COMPLETE || processState === ProcessStatus.ERROR) {
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/status/${taskId}`);
        if (!response.ok) {
          if (response.status === 404) return; // 後端可能尚未準備好，靜默重試
          throw new Error('無法取得處理狀態。');
        }
        
        const data = await response.json();
        const newStatus = statusMapping[data.status] || processState; // 如果狀態未知，保持原樣

        // 更新 UI 狀態
        setProcessState(newStatus);
        
        const newStepIndex = initialSteps.findIndex(step => step.status === newStatus);
        if (newStepIndex !== -1) {
          setCurrentStepIndex(newStepIndex);
        }

        // !!! 關鍵修正 !!!
        // 當收到完成狀態時，先強制將進度條設定到最後一步
        if (newStatus === ProcessStatus.COMPLETE) {
          setCurrentStepIndex(initialSteps.length); // 強制設定為最後一步完成的索引
          setProtectedFileName(data.file_name || '');
        } else {
          // 如果尚未完成，則安排下一次輪詢
          setTimeout(pollStatus, 2000);
        }

      } catch (error) {
        setProcessState(ProcessStatus.ERROR);
        setErrorMessage(error instanceof Error ? error.message : '查詢狀態時發生錯誤');
      }
    };

    // 啟動第一次輪詢
    const timer = setTimeout(pollStatus, 2000);

    // 清理函數：當元件卸載或 task_id 改變時，清除計時器
    return () => clearTimeout(timer);

// eslint-disable-next-line react-hooks/exhaustive-deps
}, [taskId, processState]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8 space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-slate-800">APK 加殼自動化平台</h1>
          <p className="text-slate-500 mt-2">一鍵自動化進行的應用程式保護流程。</p>
        </header>

        {processState !== ProcessStatus.IDLE && (
          <ProcessStepper steps={initialSteps} currentStepIndex={currentStepIndex} />
        )}
        
        <main className="transition-all duration-300">
          {processState === ProcessStatus.IDLE && (
            <FileUpload onFileSelect={handleFileSelect} errorMessage={errorMessage} />
          )}

          {processState !== ProcessStatus.IDLE && processState !== ProcessStatus.COMPLETE && processState !== ProcessStatus.ERROR && (
            <StatusIndicator status={processState} fileName={apkFile?.name} />
          )}

          {/* 新增錯誤狀態的顯示 */}
          {processState === ProcessStatus.ERROR && (
             <div className="text-center bg-red-50 border-2 border-dashed border-red-200 rounded-lg p-8 flex flex-col items-center justify-center space-y-4">
               <h2 className="text-2xl font-semibold text-red-800">處理失敗</h2>
               <p className="text-slate-600 max-w-md">{errorMessage}</p>
               <button
                  onClick={resetState}
                  className="px-6 py-3 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300"
                >
                  重新開始
                </button>
             </div>
          )}

          {processState === ProcessStatus.COMPLETE && (
             <div className="text-center bg-green-50 border-2 border-dashed border-green-200 rounded-lg p-8 flex flex-col items-center justify-center space-y-4">
              <div className="bg-green-100 rounded-full p-3">
                <CheckIcon className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-green-800">處理完成！</h2>
              <p className="text-slate-600 max-w-md">
                您的 APK <span className="font-medium text-slate-800">{apkFile?.name}</span> 已成功加殼保護、對齊與簽章。
              </p>
              <div className="flex space-x-4 pt-4">
                <button 
                  onClick={handleDownload}
                  className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105"
                >
                  <DownloadIcon className="w-5 h-5 mr-2" />
                  下載已保護的 APK
                </button>
                <button
                  onClick={resetState}
                  className="px-6 py-3 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition"
                >
                  重新開始
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
