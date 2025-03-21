import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Directorio base para almacenamiento de archivos
const uploadDir = path.join(process.cwd(), "public", "uploads");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No se ha proporcionado ningún archivo" },
        { status: 400 }
      );
    }

    // Crear nombre único para el archivo
    const fileExtension = file.name.split(".").pop() || "";
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);
    
    // Convertir el archivo a un ArrayBuffer y luego a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Escribir el archivo al sistema de archivos
    await writeFile(filePath, buffer);
    
    // Devolver la ruta relativa para acceder al archivo
    const relativePath = `/uploads/${fileName}`;
    
    return NextResponse.json({ 
      success: true, 
      filePath: relativePath 
    });
    
  } catch (error) {
    console.error("Error al subir el archivo:", error);
    return NextResponse.json(
      { error: "Error al procesar el archivo" },
      { status: 500 }
    );
  }
} 