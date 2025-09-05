import { NextResponse } from 'next/server';
import { loadProfiles } from '@/lib/data-loader';

export async function GET() {
  try {
    const profiles = loadProfiles();
    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Error loading profiles:', error);
    return NextResponse.json(
      { error: 'Failed to load profiles' },
      { status: 500 }
    );
  }
}