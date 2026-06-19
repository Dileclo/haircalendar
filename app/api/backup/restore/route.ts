import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('db') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: 'Файл не найден' }, { status: 400 });
    }

    // Save backup first
    const dbPath = path.join(process.cwd(), 'hail.db');
    const backupPath = dbPath + '.backup';
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(dbPath, buffer);

    return NextResponse.json({
      success: true,
      message: 'База восстановлена. Старая сохранена как hail.db.backup',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
