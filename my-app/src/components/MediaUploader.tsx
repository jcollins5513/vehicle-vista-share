"use client";

import React, { useCallback, useRef, useState } from "react";

interface MediaUploaderProps {
  vehicleId?: string | null; // if provided, saves media to that vehicle; otherwise to general playlist
  onUploaded?: () => void; // callback after persistence
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
  const [error, setError] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    try {
      setError(null);
      setProgressMsg("Uploading…");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }

      const json = (await res.json()) as { url: string; key: string };

      // Persist metadata to DB
      const mediaType = file.type.startsWith("image/") ? "IMAGE" : "VIDEO";
      const persistRes = await fetch(
        vehicleId
          ? `/api/vehicles/${vehicleId}/media`
          : "/api/media/general",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: json.url, type: mediaType }),
        }
      );
      if (!persistRes.ok) {
        throw new Error("Failed to save media record");
      }

      setProgressMsg(null);
      onUploaded?.();
    } catch (err: unknown) {
      console.error(err);
      setProgressMsg(null);
      const message = err instanceof Error ? err.message : "Upload error";
      setError(message);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(uploadFile);
  };

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
    []
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
      {progressMsg && <p className="text-blue-600 text-sm">{progressMsg}</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
