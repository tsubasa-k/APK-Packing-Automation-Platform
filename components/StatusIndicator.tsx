import React from 'react';
import { ProcessStatus } from '../types';
import { SpinnerIcon } from './icons/SpinnerIcon';

// 定義組件接收的屬性介面
interface StatusIndicatorProps {
  status: ProcessStatus;
  fileName?: string;
  currentIndex: number; // 從 App.tsx 傳入目前的步驟索引
  totalSteps: number;  // 從 App.tsx 傳入總步驟數
}

// 各種狀態對應的顯示文字
const statusMessages: Record<ProcessStatus, string> = {
  [ProcessStatus.IDLE]: '等待開始...',
  [ProcessStatus.UPLOADING]: '正在上傳 APK...',
  [ProcessStatus.UNPACKING]: '正在解壓 APK...',
  [ProcessStatus.PROTECTING]: '正在加密 DEX 檔案並修改 Manifest...',
  [ProcessStatus.ALIGNING]: '正在對齊封裝以優化效能...',
  [ProcessStatus.SIGNING]: '正在使用產品金鑰簽章...',
  [ProcessStatus.COMPLETE]: '處理完成！',
  [ProcessStatus.ERROR]: '發生錯誤。',
};

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  fileName, 
  currentIndex, 
  totalSteps 
}) => {
  // 計算進度百分比：(目前索引 + 1) / 總數
  // Math.max 用於確保進度條至少顯示 10%，避免在開始時看起來像沒在動
  const percentage = totalSteps > 0 
    ? Math.max(((currentIndex + 1) / totalSteps) * 100, 10) 
    : 0;

  return (
    <div className="text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-8 flex flex-col items-center justify-center space-y-4">
      {// 旋轉動畫圖示 }
      <SpinnerIcon className="w-10 h-10 text-blue-600" />
      
      <h2 className="text-xl font-semibold text-slate-800">
        {statusMessages[status] || '處理中...'}
      </h2>
      
      {fileName && (
        <p className="text-slate-500 text-sm">
          正在處理檔案： <span className="font-medium text-slate-700">{fileName}</span>
        </p>
      )}
      
      {//進度條外框 }
      <div className="w-full bg-slate-200 rounded-full h-2.5 mt-4">
        {// 實際進度條內容，寬度會根據 percentage 動態變化 }
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default StatusIndicator;
