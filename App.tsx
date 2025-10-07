// App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { ProcessStatus, ProcessStep } from './types';
import FileUpload from './components/FileUpload';
import ProcessStepper from './components/ProcessStepper';
import StatusIndicator from './components/StatusIndicator';
import { CheckIcon } from './components/icons/CheckIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';

// 假設後端運行在 http://localhost:5000
const API_BASE_URL = 'http://localhost:5000';

const initialSteps: ProcessStep[] = [
  { name: '上傳 APK', status: ProcessStatus.UPLOADING },
  { name: '加殼保護', status: ProcessStatus.PROTECTING },
  { name: '對齊封裝', status: ProcessStatus.ALIGNING },
  { name: '進行簽章', status: ProcessStatus.SIGNING },
];

const App: React.FC = () => {
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [protectedApkUrl, setProtectedApkUrl] = useState<string | null>(null); // 新增狀態：已保護APK的下載URL
  const [protectedApkName, setProtectedApkName] = useState<string | null>(null); // 新增狀態：已保護APK的檔案名
  const [processState, setProcessState] = useState<ProcessStatus>(ProcessStatus.IDLE);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const resetState = useCallback(() => {
    setApkFile(null);
    setProtectedApkUrl(null);
    setProtectedApkName(null);
    setProcessState(ProcessStatus.IDLE);
    setCurrentStepIndex(-1);
    setErrorMessage('');
  }, []);
  
  const handleFileSelect = (file: File) => {
    if (file && file.name.endsWith('.apk')) {
      setApkFile(file);
      setErrorMessage('');
      setProcessState(ProcessStatus.UPLOADING); // 檔案選擇後立即進入上傳狀態
      setCurrentStepIndex(0); // 開始第一個步驟
    } else {
      setErrorMessage('檔案類型無效，請上傳 .apk 檔案。');
    }
  };

  const uploadAndProcessApk = useCallback(async () => {
    if (!apkFile) return;

    setCurrentStepIndex(0); // 上傳步驟
    setProcessState(ProcessStatus.UPLOADING);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('apkFile', apkFile);

      const response = await fetch(`${API_BASE_URL}/api/protect-apk`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '伺服器錯誤' }));
        throw new Error(errorData.error || `HTTP 錯誤! 狀態: ${response.status}`);
      }

      // 假設後端直接返回檔案
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'protected.apk'; // 預設檔名
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      setProtectedApkUrl(URL.createObjectURL(blob));
      setProtectedApkName(filename);

      // 模擬步驟進度，因為後端是同步處理，前端無法知道中間步驟
      // 可以在後端腳本中增加回調或 Websocket 來提供實時進度
      // 目前，我們簡單地假設所有步驟都已完成
      setCurrentStepIndex(initialSteps.length); // 直接跳到最後一個步驟之後
      setProcessState(ProcessStatus.COMPLETE);

    } catch (error: any) {
      console.error('APK 處理失敗:', error);
      setErrorMessage(`APK 處理失敗: ${error.message}`);
      setProcessState(ProcessStatus.ERROR);
      setCurrentStepIndex(-1); // 錯誤時重置步驟指示
    }
  }, [apkFile]);

  const handleDownload = () => {
    if (protectedApkUrl && protectedApkName) {
      const link = document.createElement('a');
      link.href = protectedAppUrl;
      link.setAttribute('download', protectedApkName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(protectedApkUrl);
      setProtectedApkUrl(null); // 清理 URL 對象
    }
  };
  
  useEffect(() => {
    // 當 apkFile 準備好且處於 IDLE 狀態時，觸發上傳和處理
    if (apkFile && processState === ProcessStatus.UPLOADING) { // 這裡確保只在上傳狀態觸發
      uploadAndProcessApk();
    }
  }, [apkFile, processState, uploadAndProcessApk]);

  // 模擬進度條 (因為後端目前是同步的，所以前端的進度條會快速跳過)
  useEffect(() => {
    if (processState !== ProcessStatus.IDLE && 
        processState !== ProcessStatus.COMPLETE && 
        processState !== ProcessStatus.ERROR && 
        currentStepIndex < initialSteps.length) {
      const timer = setTimeout(() => {
        // 模擬每個步驟的完成，直到後端返回結果
        if (processState === ProcessStatus.UPLOADING) {
          setProcessState(ProcessStatus.PROTECTING);
          setCurrentStepIndex(1);
        } else if (processState === ProcessStatus.PROTECTING) {
          setProcessState(ProcessStatus.ALIGNING);
          setCurrentStepIndex(2);
        } else if (processState === ProcessStatus.ALIGNING) {
          setProcessState(ProcessStatus.SIGNING);
          setCurrentStepIndex(3);
        }
      }, 1000); // 每個步驟模擬 1 秒
      return () => clearTimeout(timer);
    }
  }, [processState, currentStepIndex]);


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

          {(processState === ProcessStatus.UPLOADING || 
             processState === ProcessStatus.PROTECTING ||
             processState === ProcessStatus.ALIGNING ||
             processState === ProcessStatus.SIGNING) && (
            <StatusIndicator status={processState} fileName={apkFile?.name} />
          )}

          {processState === ProcessStatus.ERROR && (
            <div className="text-center bg-red-50 border-2 border-dashed border-red-200 rounded-lg p-8 flex flex-col items-center justify-center space-y-4">
                <div className="bg-red-100 rounded-full p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-red-800">處理失敗！</h2>
                <p className="text-slate-600 max-w-md">
                  您的 APK <span className="font-medium text-slate-800">{apkFile?.name}</span> 處理失敗。
                </p>
                {errorMessage && (
                  <p className="text-red-500 text-sm italic">{errorMessage}</p>
                )}
                <div className="pt-4">
                  <button
                    onClick={resetState}
                    className="px-6 py-3 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition"
                  >
                    重新開始
                  </button>
                </div>
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
