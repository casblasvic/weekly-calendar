import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Esquema para validar los IDs en los parámetros
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de tarifa inválido." }), // tariffId
  productId: z.string().cuid({ message: "ID de producto inválido." }),
});

// Esquema para validar el cuerpo de la petición PATCH
const updateProductPriceSchema = z.object({
  price: z.number().min(0, "El precio no puede ser negativo.").optional(),
  vatTypeId: z.string().cuid({ message: "ID de tipo de IVA inválido." }).nullable().optional(),
  isActive: z.boolean().optional(),
});

/**
 * Handler para ACTUALIZAR los detalles de un producto DENTRO de una tarifa.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; productId: string } }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user.systemId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const systemId = session.user.systemId;

    const paramsValidation = ParamsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return new NextResponse(
        JSON.stringify({ error: "Bad Request: Invalid IDs.", details: paramsValidation.error.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const { id: tariffId, productId } = paramsValidation.data;

    const json = await request.json();
    const validatedBody = updateProductPriceSchema.safeParse(json);
    if (!validatedBody.success) {
      return new NextResponse(
        JSON.stringify({ error: "Bad Request: Invalid input.", details: validatedBody.error.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const dataToUpdate = validatedBody.data;

    const existingRelation = await prisma.tariffProductPrice.findUnique({
      where: {
        tariffId_productId: {
          tariffId: tariffId,
          productId: productId,
        },
        tariff: { systemId: systemId }
      },
    });

    if (!existingRelation) {
      return new NextResponse(
        JSON.stringify({ error: "Not Found: La relación tarifa-producto no existe." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const updatedRelation = await prisma.tariffProductPrice.update({
      where: {
        tariffId_productId: {
          tariffId: tariffId,
          productId: productId,
        },
      },
      data: dataToUpdate,
    });

    console.log(`[API TARIFFS] Updated Product ${productId} in Tariff ${tariffId} for System ${systemId}`);

    return new NextResponse(JSON.stringify(updatedRelation), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`[API TARIFFS/${params.id}/PRODUCTS/${params.productId} PATCH]`, error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handler para ELIMINAR (desasociar) un producto específico de una tarifa.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; productId: string } }
) {
  console.log(`[API DELETE /tariffs/${params?.id}/products/${params?.productId}] Received request.`);
  const { id: tariffId, productId } = params;
  console.log(`[API DELETE /tariffs/.../products/...] Extracted params: tariffId=${tariffId}, productId=${productId}`);

  try {
    const session = await getServerAuthSession();
    if (!session?.user.systemId) {
      console.warn(`[API DELETE /tariffs/.../products/...] Unauthorized access attempt.`);
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const systemId = session.user.systemId;
    console.log(`[API DELETE /tariffs/${tariffId}/products/${productId}] Authorized for systemId: ${systemId}`);

    const paramsValidation = ParamsSchema.safeParse({ id: tariffId, productId: productId });

    console.log(`[API DELETE /tariffs/${tariffId}/products/${productId}] Zod Params Validation Result:`, { success: paramsValidation.success });
    if (!paramsValidation.success) {
       console.error(`[API DELETE /tariffs/${tariffId}/products/${productId}] Zod Params Validation Failed:`, paramsValidation.error.errors);
      return new NextResponse(
        JSON.stringify({ error: "Bad Request: Invalid IDs.", details: paramsValidation.error.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    console.log(`[API DELETE /tariffs/${tariffId}/products/${productId}] Params validated successfully.`);

    const existingRelation = await prisma.tariffProductPrice.findUnique({
       where: {
        tariffId_productId: {
          tariffId: tariffId,
          productId: productId,
        },
        tariff: { systemId: systemId }
      },
       select: { tariffId: true }
    });

    if (!existingRelation) {
      console.warn(`[API DELETE /tariffs/${tariffId}/products/${productId}] Relation not found.`);
      return new NextResponse(
        JSON.stringify({ error: "Not Found: La relación tarifa-producto no existe." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
     console.log(`[API DELETE /tariffs/${tariffId}/products/${productId}] Existing relation found. Proceeding to delete.`);

    await prisma.tariffProductPrice.delete({
      where: {
        tariffId_productId: {
          tariffId: tariffId,
          productId: productId,
        },
      },
    });

    console.log(`[API TARIFFS] Deleted Product ${productId} from Tariff ${tariffId} for System ${systemId}`);

    return new NextResponse(null, { status: 204 });

  } catch (error) {
     console.error(`[API TARIFFS/${tariffId}/PRODUCTS/${productId} DELETE]`, error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 