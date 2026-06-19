import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const dbPath = path.join(process.cwd(), 'hail.db');
  return NextResponse.json({
    status: 'ok',
    db: fs.existsSync(dbPath),
    time: new Date().toISOString(),
  });
}
