import crypto from 'crypto'
import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions'
import * as QRCode from 'qrcode'
import { ensureSchema, sql } from './db'

type PendingAuth={
  userId:number
  client:TelegramClient
  status:'starting'|'code_sent'|'qr_ready'|'needs_password'|'connected'|'error'
  qrDataUrl?:string
  error?:string
  codeResolve?:(v:string)=>void
  passwordResolve?:(v:string)=>void
  createdAt:number
}

const root=globalThis as any
const pending:Map<string,PendingAuth>=root.__rstTelegramPending||(root.__rstTelegramPending=new Map())

function credentials(){
  const apiId=Number(process.env.TELEGRAM_API_ID||0)
  const apiHash=process.env.TELEGRAM_API_HASH||''
  if(!apiId||!apiHash)throw new Error('TELEGRAM_API_NOT_CONFIGURED')
  return {apiId,apiHash}
}

export function telegramAccountConfigured(){
  try{credentials();return true}catch{return false}
}

function sessionKey(){
  const src=process.env.TELEGRAM_SESSION_KEY||process.env.CRON_SECRET||process.env.TELEGRAM_WEBHOOK_SECRET||''
  if(!src)throw new Error('TELEGRAM_SESSION_KEY_NOT_CONFIGURED')
  return crypto.createHash('sha256').update(src).digest()
}

function encryptSession(value:string){
  const iv=crypto.randomBytes(12)
  const cipher=crypto.createCipheriv('aes-256-gcm',sessionKey(),iv)
  const enc=Buffer.concat([cipher.update(value,'utf8'),cipher.final()])
  const tag=cipher.getAuthTag()
  return Buffer.concat([iv,tag,enc]).toString('base64url')
}

function decryptSession(value:string){
  const raw=Buffer.from(value,'base64url')
  const iv=raw.subarray(0,12),tag=raw.subarray(12,28),enc=raw.subarray(28)
  const decipher=crypto.createDecipheriv('aes-256-gcm',sessionKey(),iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc),decipher.final()]).toString('utf8')
}

function challenge(){
  return crypto.randomBytes(18).toString('base64url')
}

async function newClient(session=''){
  const {apiId,apiHash}=credentials()
  const client=new TelegramClient(new StringSession(session),apiId,apiHash,{connectionRetries:5})
  await client.connect()
  return client
}

function maskPhone(phone?:string){
  if(!phone)return null
  const s=String(phone)
  return s.length<=4?'****':'*'.repeat(Math.max(4,s.length-4))+s.slice(-4)
}

async function persistAccountAndDialogs(userId:number,client:TelegramClient){
  await ensureSchema()
  const q=sql()
  const me:any=await client.getMe()
  const session=String((client.session as any).save())
  const display=[me?.firstName,me?.lastName].filter(Boolean).join(' ')||me?.username||'Telegram User'
  const rows=await q`INSERT INTO telegram_accounts(user_id,telegram_user_id,username,display_name,phone_masked,session_enc,connected,updated_at) VALUES(${userId},${String(me.id)},${me.username||null},${display},${maskPhone(me.phone)},${encryptSession(session)},true,now()) ON CONFLICT(user_id) DO UPDATE SET telegram_user_id=excluded.telegram_user_id,username=excluded.username,display_name=excluded.display_name,phone_masked=excluded.phone_masked,session_enc=excluded.session_enc,connected=true,updated_at=now() RETURNING id`
  const accountId=rows[0].id
  const dialogs:any[]=await client.getDialogs({limit:500})
  let count=0
  for(const d of dialogs){
    if(!d?.isGroup&&!d?.isChannel)continue
    const e:any=d.entity
    const broadcast=Boolean(e?.broadcast)
    const mega=Boolean(e?.megagroup)
    const creator=Boolean(e?.creator)
    const adminPost=Boolean(e?.adminRights?.postMessages||e?.adminRights?.sendMessages)
    const canPost=!broadcast||mega||creator||adminPost
    const kind=d.isGroup?(mega?'supergroup':'group'):(mega?'supergroup':'channel')
    const members=Number(e?.participantsCount||0)||null
    await q`INSERT INTO telegram_dialogs(account_id,chat_id,title,kind,can_post,member_count,updated_at) VALUES(${accountId},${String(d.id)},${String(d.title||'Telegram Chat')},${kind},${canPost},${members},now()) ON CONFLICT(account_id,chat_id) DO UPDATE SET title=excluded.title,kind=excluded.kind,can_post=excluded.can_post,member_count=excluded.member_count,updated_at=now()`
    count++
  }
  await q`UPDATE telegram_accounts SET last_sync_at=now() WHERE id=${accountId}`
  return {accountId,count,me}
}

async function complete(ch:string,state:PendingAuth){
  try{
    await persistAccountAndDialogs(state.userId,state.client)
    state.status='connected'
  }catch(e:any){
    state.status='error';state.error=String(e?.errorMessage||e?.message||e).slice(0,300)
  }finally{
    try{await state.client.disconnect()}catch{}
    setTimeout(()=>pending.delete(ch),10*60*1000)
  }
}

export async function startPhoneLogin(userId:number,phone:string){
  if(!/^\+?[0-9]{7,16}$/.test(phone.replace(/[\s()-]/g,'')))throw new Error('INVALID_PHONE')
  const client=await newClient('')
  const ch=challenge()
  const state:PendingAuth={userId,client,status:'starting',createdAt:Date.now()}
  pending.set(ch,state)
  const {apiId,apiHash}=credentials()
  client.signInUser({apiId,apiHash},{
    phoneNumber:phone,
    phoneCode:async()=>{
      state.status='code_sent'
      return await new Promise<string>(resolve=>state.codeResolve=resolve)
    },
    password:async()=>{
      state.status='needs_password'
      return await new Promise<string>(resolve=>state.passwordResolve=resolve)
    },
    onError:async(err:any)=>{
      state.status='error';state.error=String(err?.errorMessage||err?.message||err).slice(0,300)
      return true
    }
  }).then(()=>complete(ch,state)).catch((e:any)=>{
    state.status='error';state.error=String(e?.errorMessage||e?.message||e).slice(0,300)
    try{client.disconnect()}catch{}
  })
  return {challenge:ch,status:state.status}
}

export async function startQrLogin(userId:number){
  const client=await newClient('')
  const ch=challenge()
  const state:PendingAuth={userId,client,status:'starting',createdAt:Date.now()}
  pending.set(ch,state)
  const {apiId,apiHash}=credentials()
  client.signInUserWithQrCode({apiId,apiHash},{
    qrCode:async(code:any)=>{
      const url=`tg://login?token=${code.token.toString('base64url')}`
      state.qrDataUrl=await QRCode.toDataURL(url,{width:300,margin:1})
      state.status='qr_ready'
    },
    password:async()=>{
      state.status='needs_password'
      return await new Promise<string>(resolve=>state.passwordResolve=resolve)
    },
    onError:async(err:any)=>{
      state.status='error';state.error=String(err?.errorMessage||err?.message||err).slice(0,300)
      return true
    }
  }).then(()=>complete(ch,state)).catch((e:any)=>{
    state.status='error';state.error=String(e?.errorMessage||e?.message||e).slice(0,300)
    try{client.disconnect()}catch{}
  })
  return {challenge:ch,status:state.status}
}

export function authStatus(userId:number,ch:string){
  const s=pending.get(ch)
  if(!s||s.userId!==Number(userId))return {status:'expired'}
  return {status:s.status,qrDataUrl:s.qrDataUrl,error:s.error}
}

export function submitPhoneCode(userId:number,ch:string,code:string){
  const s=pending.get(ch)
  if(!s||s.userId!==Number(userId)||!s.codeResolve)throw new Error('AUTH_NOT_WAITING_FOR_CODE')
  const resolve=s.codeResolve;s.codeResolve=undefined;resolve(code.trim())
  return {ok:true}
}

export function submitTwoFactor(userId:number,ch:string,password:string){
  const s=pending.get(ch)
  if(!s||s.userId!==Number(userId)||!s.passwordResolve)throw new Error('AUTH_NOT_WAITING_FOR_PASSWORD')
  const resolve=s.passwordResolve;s.passwordResolve=undefined;resolve(password)
  return {ok:true}
}

async function clientForUser(userId:number){
  await ensureSchema()
  const q=sql()
  const rows=await q`SELECT * FROM telegram_accounts WHERE user_id=${userId} AND connected=true LIMIT 1`
  if(!rows.length||!rows[0].session_enc)throw new Error('TELEGRAM_ACCOUNT_NOT_CONNECTED')
  const client=await newClient(decryptSession(rows[0].session_enc))
  if(!(await client.checkAuthorization()))throw new Error('TELEGRAM_SESSION_EXPIRED')
  return client
}

export async function syncTelegramDialogs(userId:number){
  const client=await clientForUser(userId)
  try{return await persistAccountAndDialogs(userId,client)}
  finally{try{await client.disconnect()}catch{}}
}

export async function disconnectTelegramAccount(userId:number){
  await ensureSchema();const q=sql()
  const rows=await q`SELECT * FROM telegram_accounts WHERE user_id=${userId} LIMIT 1`
  if(rows.length&&rows[0].session_enc){
    try{const client=await newClient(decryptSession(rows[0].session_enc));await client.invoke(new Api.auth.LogOut());await client.disconnect()}catch{}
  }
  await q`DELETE FROM telegram_accounts WHERE user_id=${userId}`
  return {ok:true}
}

export async function sendViaTelegramAccount(userId:number,chatId:string,message:string,mediaType?:string|null,mediaUrl?:string|null){
  const client=await clientForUser(userId)
  try{
    const dialogs:any[]=await client.getDialogs({limit:500})
    const target=dialogs.find(d=>String(d.id)===String(chatId))
    if(!target)throw new Error('CHAT_NOT_AVAILABLE')
    if(!mediaType||!mediaUrl){
      await client.sendMessage(target.entity,{message})
      return
    }
    const res=await fetch(mediaUrl)
    if(!res.ok)throw new Error('MEDIA_DOWNLOAD_FAILED')
    const size=Number(res.headers.get('content-length')||0)
    if(size>20*1024*1024)throw new Error('MEDIA_TOO_LARGE')
    const buf=Buffer.from(await res.arrayBuffer())
    if(buf.length>20*1024*1024)throw new Error('MEDIA_TOO_LARGE')
    await client.sendFile(target.entity,{file:buf,caption:message,forceDocument:mediaType==='document'})
  }finally{try{await client.disconnect()}catch{}}
}
