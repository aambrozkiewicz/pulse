import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash, randomBytes } from 'node:crypto';
import { db } from './db';
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export async function requireUser() {
 const token = (await cookies()).get('pulse_session')?.value;
 const session = token && await db.authSession.findUnique({where:{tokenHash:hash(token)},include:{user:true}});
 if (!session || session.expiresAt < new Date()) redirect('/login');
 return session.user;
}
export async function startSession(userId: string) {
 const token = randomBytes(32).toString('hex');
 const expires = new Date(Date.now()+7*86400000);
 await db.authSession.create({data:{tokenHash:hash(token),userId,expiresAt:expires}});
 (await cookies()).set('pulse_session',token,{httpOnly:true,secure:new URL(process.env.APP_URL!).protocol==='https:',sameSite:'lax',path:'/',expires});
}
export function sameOrigin(req: Request) { return req.headers.get('origin') === new URL(process.env.APP_URL!).origin; }
export async function limit(key:string,max:number,seconds:number) {
 const bucket=Math.floor(Date.now()/(seconds*1000));
 const row=await db.rateLimit.upsert({where:{key:hash(key+':'+bucket)},create:{key:hash(key+':'+bucket),expiresAt:new Date((bucket+1)*seconds*1000)},update:{count:{increment:1}}});
 return row.count <= max;
}
