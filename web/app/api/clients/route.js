export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalisePhone } from '@/lib/normalise';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { company: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    const clients = await db.client.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ clients });
  } catch (err) {
    console.error('[API Clients GET Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { name, phone: rawPhone, email: rawEmail, company } = body;

    // Validate name
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    const cleanName = name.trim();
    if (cleanName.length > 150) {
      return NextResponse.json(
        { error: 'Name must be 150 characters or less' },
        { status: 400 }
      );
    }

    // Validate and clean email
    let cleanEmail = null;
    if (rawEmail && typeof rawEmail === 'string' && rawEmail.trim()) {
      cleanEmail = rawEmail.trim().toLowerCase();
      if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 255) {
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 }
        );
      }
    }

    // Validate and clean phone
    let cleanPhone = null;
    if (rawPhone && typeof rawPhone === 'string' && rawPhone.trim()) {
      cleanPhone = normalisePhone(rawPhone);
      if (!/^\d{7,15}$/.test(cleanPhone)) {
        return NextResponse.json(
          { error: 'Phone number must contain between 7 and 15 digits' },
          { status: 400 }
        );
      }
    }

    // Validate company
    const cleanCompany = company && typeof company === 'string' ? company.trim().slice(0, 150) : null;

    // Check uniqueness conflicts
    if (cleanEmail) {
      const existingEmail = await db.client.findUnique({
        where: { email: cleanEmail },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Client with this email already exists' },
          { status: 409 }
        );
      }
    }

    if (cleanPhone) {
      const existingPhone = await db.client.findUnique({
        where: { phone: cleanPhone },
      });
      if (existingPhone) {
        return NextResponse.json(
          { error: 'Client with this phone already exists' },
          { status: 409 }
        );
      }
    }

    const client = await db.client.create({
      data: {
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        company: cleanCompany,
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (err) {
    console.error('[API Clients POST Error]:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}
