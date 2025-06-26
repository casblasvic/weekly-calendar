import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto';

const prisma = new PrismaClient()

interface RouteContext {
  params: Promise<{
    webhookId: string
    slug: string
  }>
}

async function handleWebhookProcessing(
  request: NextRequest,
  webhookId: string,
  slug: string,
  method: string
) {
  try {
    // Obtener el webhook por ID y slug para mayor seguridad
    const webhook = await prisma.webhook.findFirst({
      where: { 
        id: webhookId,
        slug: slug
      },
      include: {
        system: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }

    // Verificar si el webhook está activo
    if (!webhook.isActive) {
      return NextResponse.json(
        { error: 'Webhook is disabled' },
        { status: 403, headers: { 'x-robots-tag': 'noindex, nofollow' } }
      )
    }

    // NUEVO: Bloque de verificación de autenticación
    if (webhook.requiresAuth) {
        const authHeader = request.headers.get('Authorization');
        const signatureHeader = request.headers.get('X-Signature');
        
        // La lógica se basa en la existencia de token o secretKey
        if (webhook.token) { // Implica Bearer
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401, headers: { 'x-robots-tag': 'noindex, nofollow' } });
            }
            const token = authHeader.split(' ')[1];
            if (token !== webhook.token) {
                return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: { 'x-robots-tag': 'noindex, nofollow' } });
            }
        } else if (webhook.secretKey) { // Implica HMAC
            const bodyForHmac = await request.clone().text(); // Clonar para poder leer el body aquí y luego otra vez
            if (!signatureHeader) {
                return NextResponse.json({ error: 'Missing signature header' }, { status: 401, headers: { 'x-robots-tag': 'noindex, nofollow' } });
            }
            const hmac = crypto.createHmac('sha256', webhook.secretKey);
            hmac.update(bodyForHmac);
            const expectedSignature = `sha256=${hmac.digest('hex')}`;
            
            if (signatureHeader !== expectedSignature) {
                return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401, headers: { 'x-robots-tag': 'noindex, nofollow' } });
            }
        }
    }

    // Verificar método permitido
    const allowedMethods = Array.isArray(webhook.allowedMethods) 
      ? webhook.allowedMethods 
      : []
    
    if (!allowedMethods.includes(method)) {
      return NextResponse.json(
        { error: `Method ${method} not allowed` },
        { status: 405 }
      )
    }

    // Obtener datos del request
    const bodyString = method !== 'GET' ? await request.clone().text() : null;
    const body = bodyString ? JSON.parse(bodyString) : null;
    const headers = Object.fromEntries(request.headers.entries())
    const sourceIp = headers['x-forwarded-for']?.split(',')[0] || 
                    headers['x-real-ip'] || 
                    'unknown'

    // Preparar datos para el log
    const logData: any = {
      webhookId: webhook.id,
      systemId: webhook.systemId,
      method,
      url: request.url,
      headers,
      body,
      sourceIp,
      wasProcessed: false,
    };

    try {
      let processingResult: any = { message: "Webhook recibido, sin acción de escritura configurada." };

      // >>> INICIO: LÓGICA DE PROCESAMIENTO Y ESCRITURA EN BD <<<
      if (webhook.dataMapping && typeof webhook.dataMapping === 'object') {
        const { targetTable, fieldMappings } = webhook.dataMapping as { targetTable: string, fieldMappings: Record<string, any> };

        if (targetTable && fieldMappings && prisma[targetTable]) {
          
          const dataPayload = { ...body };
          const dataToCreate: { [key: string]: any } = {};
          
          if (method === 'POST') {
            for (const [targetField, mappingConfig] of Object.entries(fieldMappings)) {
              if (dataPayload[mappingConfig.source]) {
                let value = dataPayload[mappingConfig.source];
                
                // Aplicar transformaciones
                switch (mappingConfig.transform) {
                  case 'integer': value = parseInt(value, 10); break;
                  case 'float': value = parseFloat(value); break;
                  case 'boolean': value = Boolean(value); break;
                  case 'datetime': value = new Date(value); break;
                }
                
                // Validar tipo (simple)
                if ( (mappingConfig.transform === 'integer' || mappingConfig.transform === 'float') && isNaN(value) ) {
                    throw new Error(`El campo ${mappingConfig.source} con valor "${dataPayload[mappingConfig.source]}" no se pudo convertir a número.`);
                }
                if ( mappingConfig.transform === 'datetime' && isNaN(value.getTime()) ) {
                    throw new Error(`El campo ${mappingConfig.source} con valor "${dataPayload[mappingConfig.source]}" no se pudo convertir a fecha.`);
                }

                dataToCreate[targetField] = value;
              } else if (mappingConfig.required) {
                throw new Error(`Campo requerido "${mappingConfig.source}" no encontrado en el payload.`);
              }
            }
            dataToCreate.systemId = webhook.systemId;
            const createdRecord = await prisma[targetTable].create({ data: dataToCreate });
            processingResult = { message: `Registro creado exitosamente en la tabla ${targetTable}.`, recordId: createdRecord.id, data: { id: createdRecord.id } };

          } else if (method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
            const idMapping = Object.entries(fieldMappings).find(([tf]) => tf === 'id');
            if (!idMapping) throw new Error("Se requiere un mapeo para el campo 'id' para operaciones de actualización/borrado.");
            
            const idSourceField = idMapping[1].source;
            const recordId = dataPayload[idSourceField];
            if (!recordId) throw new Error(`El campo identificador '${idSourceField}' no se encontró en el payload.`);

            if (method === 'DELETE') {
              await prisma[targetTable].delete({ where: { id: recordId } });
              processingResult = { message: `Registro ${recordId} eliminado de la tabla ${targetTable}.`};
            } else {
              const dataToUpdate: { [key: string]: any } = {};
              for (const [targetField, mappingConfig] of Object.entries(fieldMappings)) {
                if (targetField !== 'id' && dataPayload[mappingConfig.source] !== undefined) {
                  let value = dataPayload[mappingConfig.source];
                  
                  // Aplicar transformaciones
                  switch (mappingConfig.transform) {
                    case 'integer': value = parseInt(value, 10); break;
                    case 'float': value = parseFloat(value); break;
                    case 'boolean': value = Boolean(value); break;
                    case 'datetime': value = new Date(value); break;
                  }
                  
                  // Validar tipo (simple)
                  if ( (mappingConfig.transform === 'integer' || mappingConfig.transform === 'float') && isNaN(value) ) {
                      throw new Error(`El campo ${mappingConfig.source} con valor "${dataPayload[mappingConfig.source]}" no se pudo convertir a número.`);
                  }
                  if ( mappingConfig.transform === 'datetime' && isNaN(value.getTime()) ) {
                      throw new Error(`El campo ${mappingConfig.source} con valor "${dataPayload[mappingConfig.source]}" no se pudo convertir a fecha.`);
                  }

                  dataToUpdate[targetField] = value;
                }
              }
              const updatedRecord = await prisma[targetTable].update({ where: { id: recordId }, data: dataToUpdate });
              processingResult = { message: `Registro ${recordId} actualizado en la tabla ${targetTable}.`, recordId: updatedRecord.id, data: { id: updatedRecord.id } };
            }
          }
          logData.wasProcessed = true;
        } else {
          throw new Error(`La tabla de destino "${targetTable}" o los mapeos no son válidos.`);
        }
      }
      // >>> FIN: LÓGICA DE PROCESAMIENTO Y ESCRITURA EN BD <<<
      
      logData.isSuccess = true;
      logData.statusCode = 200;
      await prisma.webhookLog.create({ data: logData });

      // Configurar respuesta según lo definido en el webhook
      const responseConfig = webhook.responseConfig as any || { type: 'simple' };
      let responseBody: any = { success: true, message: processingResult.message };
      
      if (responseConfig.type === 'created_record' && processingResult.data) {
        responseBody = { success: true, ...processingResult.data };
      } else if (responseConfig.type === 'custom_json' && responseConfig.customJson) {
        responseBody = JSON.parse(responseConfig.customJson);
      }

      return NextResponse.json(responseBody, {
        status: responseConfig.successStatusCode || 200,
        headers: { 'x-robots-tag': 'noindex, nofollow' }
      });

    } catch (processingError) {
      console.error('Error processing webhook:', processingError);
      
      const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown error';
      logData.isSuccess = false;
      logData.processingError = errorMessage;
      logData.statusCode = 500;
      await prisma.webhookLog.create({ data: logData });

      return NextResponse.json(
        { error: 'Error processing webhook', details: errorMessage },
        { status: 500, headers: { 'x-robots-tag': 'noindex, nofollow' } }
      );
    }

  } catch (error) {
    console.error('Error in webhook handler:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'x-robots-tag': 'noindex, nofollow' } }
    )
  }
}

// Manejar todos los métodos HTTP
export async function GET(request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params
  return handleWebhookProcessing(request, resolvedParams.webhookId, resolvedParams.slug, 'GET')
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params
  return handleWebhookProcessing(request, resolvedParams.webhookId, resolvedParams.slug, 'POST')
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params
  return handleWebhookProcessing(request, resolvedParams.webhookId, resolvedParams.slug, 'PUT')
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params
  return handleWebhookProcessing(request, resolvedParams.webhookId, resolvedParams.slug, 'PATCH')
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params
  return handleWebhookProcessing(request, resolvedParams.webhookId, resolvedParams.slug, 'DELETE')
}

export async function HEAD(request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params
  return handleWebhookProcessing(request, resolvedParams.webhookId, resolvedParams.slug, 'HEAD')
}

export async function OPTIONS(request: NextRequest, { params }: RouteContext) {
  const resolvedParams = await params
  return handleWebhookProcessing(request, resolvedParams.webhookId, resolvedParams.slug, 'OPTIONS')
} 