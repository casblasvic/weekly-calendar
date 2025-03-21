"use client";
import { useState } from "react";
import Image from "next/image";

interface ImageUploaderProps {
  onImageUpload: (imagePath: string) => void;
  defaultImage?: string;
}

export default function ImageUploader({ onImageUpload, defaultImage }: ImageUploaderProps) {
  const [imagePath, setImagePath] = useState(defaultImage || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsLoading(true);
      
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        
        const data = await response.json();
        
        if (data.success && data.filePath) {
          setImagePath(data.filePath);
          onImageUpload(data.filePath);
        } else {
          console.error("Error al subir la imagen:", data.error);
        }
      } catch (error) {
        console.error("Error al procesar la imagen:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-40 h-40 border rounded-lg overflow-hidden">
        {imagePath ? (
          <Image
            src={imagePath}
            alt="Imagen subida"
            fill
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <span className="text-gray-400">Sin imagen</span>
          </div>
        )}
      </div>
      
      <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
        {isLoading ? "Subiendo..." : "Subir imagen"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />
      </label>
    </div>
  );
} 