import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const entityId = req.nextUrl.searchParams.get('entityId');
  const entityType = req.nextUrl.searchParams.get('entityType');
  if(!entityId || !entityType) return NextResponse.json({message:'entityId y entityType son requeridos'},{status:400});
  const session = await getServerAuthSession();
  if(!session?.user?.systemId) return NextResponse.json({message:'No auth'},{status:401});
  const logs = await prisma.entityChangeLog.findMany({
    where:{ entityId, entityType: entityType as any, systemId:session.user.systemId },
    orderBy:{timestamp:'asc'},
    select:{ id:true, action:true, timestamp:true, user:{select:{firstName:true,lastName:true,email:true}} }
  });
  return NextResponse.json(logs,{status:200});
} 