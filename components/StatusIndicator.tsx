import React from 'react';
import { ProcessStatus } from '../types';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface StatusIndicatorProps {
  status: ProcessStatus;
  fileName?: string;
}

const statusMessages: Record<ProcessStatus, string> = {
  [ProcessStatus.IDLE]: '等待開始...',
  [ProcessStatus.UPLOADING]: '正在上傳 APK...',
  [ProcessStatus.UNPACKING]: '正在解包 APK...',
  [ProcessStatus.ENCRYPTING_DEX]: '正在加密 DEX 檔案...',
  [ProcessStatus.INJECTING_STUB]: '正在注入解密 Stub...',
  [ProcessStatus.ALIGNING]: '正在對齊封裝以優化效能...',
  [ProcessStatus.SIGNING]: '正在使用產品金鑰簽章...',
  [ProcessStatus.COMPLETE]: '處理完成！',
  [ProcessStatus.ERROR]: '發生錯誤。',
};

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, fileName }) => {
  return (
    <div className="text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-8 flex flex-col items-center justify-center space-y-4">
      <SpinnerIcon className="w-10 h-10 text-blue-600" />
      <h2 className="text-xl font-semibold text-slate-800">{statusMessages[status]}</h2>
      {fileName && (
        <p className="text-slate-500 text-sm">
          正在處理檔案： <span className="font-medium text-slate-700">{fileName}</span>
        </p>
      )}
       <div className="w-full bg-slate-200 rounded-full h-2.5 mt-4">
          <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
        </div>
    </div>
  );
};

export default StatusIndicator;
