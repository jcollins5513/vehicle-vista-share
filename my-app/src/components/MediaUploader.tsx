"use client";

import React, { useCallback, useRef, useState } from "react";
import { Media } from "@prisma/client";

interface MediaUploaderProps {
  vehicleId?: string | null; // if provided, saves media to that vehicle; otherwise to general playlist
  onUploaded?: (media: Omit<Media, 'id' | 'createdAt' | 'updatedAt' | 'vehicleId' | 'order' | 'mediaType'> & { url: string; key: string }) => void; // callback after persistence
  accept?: string; // default: images and mp4
  multiple?: boolean;
}

export default function MediaUploader({
  vehicleId = null,
  onUploaded,
  accept = "image/*,video/mp4",
  multiple = false,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadFile = useCallback(
    (file: File) => {
      return new Promise<void>((resolve, reject) => {
        setUploadStatus('uploading');
        setUploadProgress(0);
        setErrorMessage(null);

        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const newMedia = JSON.parse(xhr.responseText);
            setUploadStatus('success');
            onUploaded?.({ url: newMedia.url, key: newMedia.key, ...newMedia });
            // Reset after a short delay to allow user to see success message
            setTimeout(() => {
              setUploadStatus('idle');
            }, 3000);
            resolve();
          } else {
            let errorText = 'Upload failed';
            try {
              const errorJson = JSON.parse(xhr.responseText);
              errorText = errorJson.error || errorText;
            } catch (e) {
              // response is not json
              errorText = xhr.responseText || errorText;
            }
            setErrorMessage(errorText);
            setUploadStatus('error');
            reject(new Error(errorText));
          }
        };

        xhr.onerror = () => {
          setErrorMessage('Upload failed due to a network error.');
          setUploadStatus('error');
          reject(new Error('Network error'));
        };

        const formData = new FormData();
        formData.append("file", file);
        if (vehicleId) {
          formData.append("vehicleId", vehicleId);
        }

        xhr.open("POST", "/api/upload", true);
        xhr.send(formData);
      });
    },
    [onUploaded, vehicleId]
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      
      setUploadStatus('idle'); // Reset status for new batch of files

      for (const file of Array.from(files)) {
        try {
          await uploadFile(file);
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
          // Stop processing further files on the first error
          break; 
        }
      }
    },
    [uploadFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer?.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDragEnter = () => setDragActive(true);
  const onDragLeave = () => setDragActive(false);

  return (
    <div className="space-y-2">
      <div
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-md p-6 cursor-pointer transition-colors ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
      >
        <p className="text-sm text-gray-600 select-none">
          {dragActive ? "Drop files here" : "Drag & drop or click to upload"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onInputChange}
          aria-label="Upload media file"
          className="hidden"
        />
      </div>
      {uploadStatus === 'uploading' && (
        <div className="mt-2 space-y-1 text-center">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-700">{uploadProgress}% Complete</p>
        </div>
      )}
      {uploadStatus === 'success' && (
        <p className="mt-2 text-green-600 text-sm text-center">Upload successful! Ready for next file.</p>
      )}
      {uploadStatus === 'error' && (
        <p className="mt-2 text-red-600 text-sm text-center">Error: {errorMessage}</p>
      )}
    </div>
  );
}
