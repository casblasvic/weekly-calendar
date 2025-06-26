import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest, { params }: { params: Promise<{ modelName: string }> }) {
  const resolvedParams = await params
  const { modelName } = resolvedParams

  try {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');

    // Regex para encontrar el bloque del modelo específico
    const modelRegex = new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)\\}`, 'm');
    const modelMatch = schemaContent.match(modelRegex);

    if (!modelMatch) {
      return NextResponse.json({ error: `Model ${modelName} not found` }, { status: 404 });
    }
    
    const modelContent = modelMatch[1];
    
    // Regex para encontrar los campos (mejorado)
    const fieldRegex = /^\s*(\w+)\s+([\w\[\]?]+)/gm;
    let match;
    const fields = [];

    while ((match = fieldRegex.exec(modelContent)) !== null) {
      const fieldName = match[1];
      const fullFieldType = match[2];
      
      // Limpiar el tipo (remover decoradores y modificadores)
      const fieldType = fullFieldType
        .replace(/\?/g, '')
        .replace(/\[\]/g, '')
        .replace(/@.*$/, '')
        .trim();
      
      const isOptional = fullFieldType.includes('?');
      const isList = fullFieldType.includes('[]');
      
      // Excluir relaciones (tipos que NO son primitivos de Prisma) y campos de sistema
      const primitiveTypes = ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes', 'BigInt', 'Decimal'];
      if (fieldType.charAt(0) === fieldType.charAt(0).toUpperCase() && !primitiveTypes.includes(fieldType)) {
        continue;
      }
      if (['id', 'createdAt', 'updatedAt', 'systemId'].includes(fieldName)) {
        continue;
      }

      fields.push({
        name: fieldName,
        type: fieldType,
        isOptional: isOptional,
        isList: isList
      });
    }

    return NextResponse.json(fields);

  } catch (error) {
    console.error(`Error reading fields for model ${modelName}:`, error);
    return NextResponse.json({ error: 'Could not process prisma schema' }, { status: 500 });
  }
} 