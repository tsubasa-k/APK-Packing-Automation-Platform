import React, { useState, useEffect, useCallback } from 'react';
import { ProcessStatus, ProcessStep } from './types';
import FileUpload from './components/FileUpload';
import ProcessStepper from './components/ProcessStepper';
import StatusIndicator from './components/StatusIndicator';
import { CheckIcon } from './components/icons/CheckIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';

const initialSteps: ProcessStep[] = [
  { name: '上傳 APK', status: ProcessStatus.UPLOADING, duration: 1500 },
  { name: '解包 APK', status: ProcessStatus.UNPACKING, duration: 1000 },
  { name: '加密 DEX', status: ProcessStatus.ENCRYPTING_DEX, duration: 2000 },
  { name: '注入 Stub', status: ProcessStatus.INJECTING_STUB, duration: 1500 },
  { name: '對齊封裝', status: ProcessStatus.ALIGNING, duration: 2000 },
  { name: '進行簽章', status: ProcessStatus.SIGNING, duration: 2500 },
];

const App: React.FC = () => {
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [processState, setProcessState] = useState<ProcessStatus>(ProcessStatus.IDLE);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const resetState = useCallback(() => {
    setApkFile(null);
    setProcessState(ProcessStatus.IDLE);
    setCurrentStepIndex(-1);
    setErrorMessage('');
  }, []);
  
  const handleFileSelect = (file: File) => {
    if (file && file.name.endsWith('.apk')) {
      setApkFile(file);
      setErrorMessage('');
    } else {
      setErrorMessage('檔案類型無效，請上傳 .apk 檔案。');
    }
  };

  const runProcessStep = useCallback((stepIndex: number) => {
    if (stepIndex >= initialSteps.length) {
      setProcessState(ProcessStatus.COMPLETE);
      setCurrentStepIndex(stepIndex);
      return;
    }
    
    const currentStep = initialSteps[stepIndex];
    setProcessState(currentStep.status);
    setCurrentStepIndex(stepIndex);

    setTimeout(() => {
      runProcessStep(stepIndex + 1);
    }, currentStep.duration);
  }, []);

  const handleDownload = () => {
    if (!apkFile) return;

    const protectedFileName = apkFile.name.replace(/\.apk$/, '-protected.apk');
    const url = URL.createObjectURL(apkFile);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', protectedFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  useEffect(() => {
    if (apkFile && processState === ProcessStatus.IDLE) {
      runProcessStep(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apkFile, processState, runProcessStep]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-8 space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-slate-800">APK 加殼自動化平台</h1>
          <p className="text-slate-500 mt-2">一鍵自動化，進行應用程式保護流程。</p>
        </header>

        {processState !== ProcessStatus.IDLE && (
          <ProcessStepper steps={initialSteps} currentStepIndex={currentStepIndex} />
        )}
        
        <main className="transition-all duration-300">
          {processState === ProcessStatus.IDLE && (
            <FileUpload onFileSelect={handleFileSelect} errorMessage={errorMessage} />
          )}

          {processState !== ProcessStatus.IDLE && processState !== ProcessStatus.COMPLETE && (
            <StatusIndicator status={processState} fileName={apkFile?.name} />
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
