export async function getOpenCashSessionForClinic(tx: any, clinicId: string, systemId: string) {
  return await tx.cashSession.findFirst({
    where: {
      clinicId,
      systemId,
      status: 'OPEN',
    },
    orderBy: { openingTime: 'desc' },
  });
} 