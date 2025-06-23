import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/vehicles
export async function GET() {
  try {
    const vehicles = await prisma.vehicle.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(vehicles);
  } catch (err) {
    console.error('[API] vehicles GET error', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
