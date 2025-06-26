import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Construir la ruta al archivo schema.prisma
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');

    const modelRegex = /model\s+(\w+)\s*\{/g;
    let match;
    const models = new Set<string>();

    while ((match = modelRegex.exec(schemaContent)) !== null) {
      models.add(match[1]);
    }

    return NextResponse.json(Array.from(models).sort());

  } catch (error) {
    console.error("Error reading prisma schema:", error);
    return NextResponse.json({ error: 'Could not read prisma schema' }, { status: 500 });
  }
} 