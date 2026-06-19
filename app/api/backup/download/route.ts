import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const dbPath = path.join(process.cwd(), 'hail.db');
  if (!fs.existsSync(dbPath)) {
    return NextResponse.json({ success: false, error: 'База не найдена' }, { status: 404 });
  }
  const buffer = fs.readFileSync(dbPath);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="hail-${new Date().toISOString().split('T')[0]}.db"`,
    },
  });
}
