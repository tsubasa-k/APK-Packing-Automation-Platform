
import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  errorMessage: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, errorMessage }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-10 text-center transition-colors duration-200
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400'}
        ${errorMessage ? 'border-red-500 bg-red-50' : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        accept=".apk"
        onChange={handleChange}
      />
      <label htmlFor="file-upload" className="flex flex-col items-center justify-center space-y-4 cursor-pointer">
        <UploadIcon className={`w-12 h-12 ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
        <p className="text-slate-600">
          <span className="font-semibold text-blue-600">點擊上傳</span> 或拖放檔案到此處
        </p>
        <p className="text-sm text-slate-500">僅限 Android APK 檔案</p>
      </label>
      {errorMessage && (
         <p className="mt-4 text-sm text-red-600 font-medium">{errorMessage}</p>
      )}
    </div>
  );
};

export default FileUpload;
