import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { db } from '@/lib/db';
import { sameOrigin, startSession, limit } from '@/lib/auth';
export async function POST(req:Request) {
 if(!sameOrigin(req)) return new Response(null,{status:403});
 if(!await limit('login-global',40,900)) return new Response('Za dużo prób. Spróbuj za 15 minut.',{status:429});
 const form=await req.formData(); const email=String(form.get('email')??'').trim().toLowerCase(); const password=String(form.get('password')??'');
 if(email.length>254 || password.length>128 || !await limit('login:'+email,8,900)) return new Response('Za dużo prób.',{status:429});
 const user=await db.user.findUnique({where:{email}});
 const valid=await compare(password,user?.passwordHash ?? '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
 if(!user || !valid) return NextResponse.redirect(new URL('/login?error=1',process.env.APP_URL),303);
 await startSession(user.id);
 return NextResponse.redirect(new URL('/dashboard',process.env.APP_URL),303);
}
