import {requireUser} from '../../../lib/auth'
import {ensureSchema,sql} from '../../../lib/db'
import {startPhoneLogin,startQrLogin,authStatus,submitPhoneCode,submitTwoFactor,syncTelegramDialogs,disconnectTelegramAccount,telegramAccountConfigured} from '../../../lib/telegramAccount'

export async function GET(req:Request){
  const u=await requireUser()
  await ensureSchema()
  const q=sql()
  const url=new URL(req.url)
  const challenge=url.searchParams.get('challenge')
  if(challenge)return Response.json(authStatus(Number(u.id),challenge))
  const account=(await q`SELECT id,telegram_user_id,username,display_name,phone_masked,connected,last_sync_at FROM telegram_accounts WHERE user_id=${u.id} LIMIT 1`)[0]||null
  const count=account?(await q`SELECT count(*)::int AS n FROM telegram_dialogs WHERE account_id=${account.id} AND can_post=true`)[0]?.n||0:0
  return Response.json({configured:telegramAccountConfigured(),account,groups:Number(count)})
}

export async function POST(req:Request){
  const u=await requireUser()
  const body=await req.json().catch(()=>({}))
  try{
    switch(body.action){
      case 'start_phone': return Response.json(await startPhoneLogin(Number(u.id),String(body.phone||'')))
      case 'start_qr': return Response.json(await startQrLogin(Number(u.id)))
      case 'code': return Response.json(submitPhoneCode(Number(u.id),String(body.challenge||''),String(body.code||'')))
      case 'password': return Response.json(submitTwoFactor(Number(u.id),String(body.challenge||''),String(body.password||'')))
      case 'sync': return Response.json(await syncTelegramDialogs(Number(u.id)))
      case 'disconnect': return Response.json(await disconnectTelegramAccount(Number(u.id)))
      default:return Response.json({error:'INVALID_ACTION'},{status:400})
    }
  }catch(e:any){
    return Response.json({error:String(e?.errorMessage||e?.message||e).slice(0,300)},{status:400})
  }
}
