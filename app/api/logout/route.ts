import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { hash, sameOrigin } from '@/lib/auth';
import { db } from '@/lib/db';
export async function POST(req:Request) {
 if(!sameOrigin(req)) return new Response(null,{status:403});
 const jar=await cookies(); const token=jar.get('pulse_session')?.value;
 if(token) await db.authSession.deleteMany({where:{tokenHash:hash(token)}});
 jar.delete('pulse_session');
 return NextResponse.redirect(new URL('/login',process.env.APP_URL),303);
}
