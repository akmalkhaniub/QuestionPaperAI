import React, { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { UploadIcon, FileIcon, XIcon } from 'lucide-react';

export interface FileInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange?: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // in bytes
  placeholder?: string;
  error?: string;
}

const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, onValueChange, accept, maxSize, placeholder, error, ...props }, ref) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [internalError, setInternalError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      validateAndSetFile(file);
    };

    const validateAndSetFile = (file: File | null) => {
      // Reset error state
      setInternalError(null);

      if (!file) {
        setSelectedFile(null);
        onValueChange?.(null);
        return;
      }

      // Check max size if provided
      if (maxSize && file.size > maxSize) {
        const errorMsg = `File size exceeds the maximum allowed size (${formatSize(maxSize)})`;
        setInternalError(errorMsg);
        return;
      }

      // Check file extension if accept is provided
      if (accept) {
        const allowedExtensions = accept.split(',').map(ext => ext.trim());
        const fileExtension = `.${file.name.split('.').pop()}`;
        
        const isValidExtension = allowedExtensions.some(ext => {
          // Handle mime types like "image/*" and extensions like ".pdf"
          if (ext.includes('/')) {
            const [type, subtype] = ext.split('/');
            return subtype === '*' 
              ? file.type.startsWith(type) 
              : file.type === ext;
          } else {
            return fileExtension.toLowerCase() === ext.toLowerCase();
          }
        });

        if (!isValidExtension) {
          setInternalError(`Invalid file type. Accepted: ${formatAcceptString(accept)}`);
          return;
        }
      }

      setSelectedFile(file);
      onValueChange?.(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = () => {
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        validateAndSetFile(e.dataTransfer.files[0]);
      }
    };

    const removeFile = () => {
      setSelectedFile(null);
      onValueChange?.(null);
      // Also reset the input value
      if (props.id) {
        const inputElement = document.getElementById(props.id) as HTMLInputElement;
        if (inputElement) inputElement.value = '';
      }
    };

    // Format file size to human-readable form (KB, MB, etc.)
    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Make accept string more human readable
    const formatAcceptString = (acceptStr: string) => {
      return acceptStr
        .split(',')
        .map(ext => ext.trim())
        .map(ext => ext.startsWith('.') ? ext.substring(1).toUpperCase() : ext)
        .join(', ');
    };

    return (
      <div className="space-y-1">
        <div
          className={cn(
            "flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md relative",
            isDragging ? "border-primary bg-primary/5" : "border-gray-300",
            selectedFile ? "border-primary/50" : "",
            className
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-1 text-center">
            {!selectedFile ? (
              <>
                <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor={props.id}
                    className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-focus focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                  >
                    <span>Upload a file</span>
                    <input
                      id={props.id}
                      ref={ref}
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                      accept={accept}
                      {...props}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  {placeholder || "File upload"}
                  {maxSize && ` (Max size: ${formatSize(maxSize)})`}
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2 text-left">
                <div className="flex-shrink-0">
                  <FileIcon className="h-10 w-10 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatSize(selectedFile.size)}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={removeFile}
                  className="rounded-full p-1 text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
        {(error || internalError) && (
          <p className="text-sm text-destructive mt-1">{error || internalError}</p>
        )}
      </div>
    );
  }
);

FileInput.displayName = "FileInput";

export { FileInput };
