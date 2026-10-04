import crypto from 'crypto'; import { cookies, headers } from 'next/headers'; import { ensureSchema, sql } from './db'
const enc=(v:string)=>crypto.createHash('sha256').update(v).digest('hex');
function hashPass(p:string,salt=crypto.randomBytes(16).toString('hex')){const h=crypto.scryptSync(p,salt,64).toString('hex');return `${salt}:${h}`}
function verifyPass(p:string,stored:string){const [s,h]=stored.split(':');const x=crypto.scryptSync(p,s,64);return crypto.timingSafeEqual(x,Buffer.from(h,'hex'))}
export async function bootstrapAdmin(){
  await ensureSchema();
  const q=sql();
  const name=process.env.ADMIN_USERNAME||'Shazi786';
  const pass=process.env.ADMIN_PASSWORD||'Shazi786.?@';
  const stored=hashPass(pass);
  const admins=await q`SELECT id,username FROM users WHERE role='admin' ORDER BY id ASC LIMIT 1`;
  if(admins.length){
    await q`UPDATE users SET username=${name},password_hash=${stored},is_premium=true,is_active=true WHERE id=${admins[0].id}`;
  }else{
    await q`INSERT INTO users(username,password_hash,role,is_premium,is_active) VALUES(${name},${stored},'admin',true,true)`;
  }
}
export async function createUser(username:string,password:string){await bootstrapAdmin();if(username.length<3||password.length<6)throw new Error('Invalid username/password');const q=sql();await q`INSERT INTO users(username,password_hash) VALUES(${username},${hashPass(password)})`}
export async function login(username:string,password:string){await bootstrapAdmin();const q=sql();const r=await q`SELECT * FROM users WHERE username=${username} LIMIT 1`;const u=r[0];if(!u||!u.is_active||!verifyPass(password,u.password_hash))return null;const token=crypto.randomBytes(32).toString('base64url');const h=await headers();await q`INSERT INTO sessions(user_id,token_hash,ip,user_agent) VALUES(${u.id},${enc(token)},${h.get('x-forwarded-for')||''},${h.get('user-agent')||''})`;await q`UPDATE users SET last_login_at=now() WHERE id=${u.id}`;(await cookies()).set('rst_session',token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:2592000});return u}
export async function logout(){const c=await cookies();const t=c.get('rst_session')?.value;if(t){const q=sql();await q`UPDATE sessions SET active=false WHERE token_hash=${enc(t)}`}c.delete('rst_session')}
export async function me(){await bootstrapAdmin();const t=(await cookies()).get('rst_session')?.value;if(!t)return null;const q=sql();const r=await q`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=${enc(t)} AND s.active=true AND u.is_active=true LIMIT 1`;if(!r.length)return null;await q`UPDATE sessions SET last_seen_at=now() WHERE token_hash=${enc(t)}`;return r[0]}
export async function requireUser(admin=false){const u=await me();if(!u||(admin&&u.role!=='admin'))throw new Error('UNAUTHORIZED');return u}
export function isPremium(u:any){return u.role==='admin'||(u.is_premium&&(!u.premium_until||new Date(u.premium_until)>new Date()))}
export {hashPass}