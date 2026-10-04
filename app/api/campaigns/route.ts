import {requireUser,isPremium} from '../../../lib/auth'
import {sql} from '../../../lib/db'

export async function POST(req:Request){
  const u=await requireUser()
  const premium=isPremium(u)
  const limit=premium?100:10,min=premium?1:240
  const f=await req.formData()
  const interval=Number(f.get('interval'))
  const deliveryMode=String(f.get('deliveryMode')||'bot')==='account'?'account':'bot'
  if(!Number.isFinite(interval)||interval<min)return new Response(null,{status:303,headers:{Location:'/dashboard'}})
  const q=sql()

  if(deliveryMode==='account'){
    const ids=f.getAll('dialogIds').map(Number).filter(Boolean)
    if(!ids.length||ids.length>limit)return new Response(null,{status:303,headers:{Location:'/dashboard'}})
    const valid=await q`SELECT d.id FROM telegram_dialogs d JOIN telegram_accounts a ON a.id=d.account_id WHERE a.user_id=${u.id} AND a.connected=true AND d.can_post=true AND d.id=ANY(${ids})`
    if(valid.length!==ids.length)return new Response(null,{status:303,headers:{Location:'/dashboard'}})
    const rows=await q`INSERT INTO campaigns(user_id,name,message,media_type,media_url,interval_minutes,status,next_run_at,delivery_mode) VALUES(${u.id},${String(f.get('name')||'Campaign').slice(0,120)},${String(f.get('message')||'')},${String(f.get('mediaType')||'')||null},${String(f.get('mediaUrl')||'')||null},${interval},'running',now(),'account') RETURNING id`
    for(const id of ids)await q`INSERT INTO campaign_dialogs(campaign_id,dialog_id) VALUES(${rows[0].id},${id})`
    return new Response(null,{status:303,headers:{Location:'/dashboard'}})
  }

  const ids=f.getAll('groupIds').map(Number).filter(Boolean)
  if(!ids.length||ids.length>limit)return new Response(null,{status:303,headers:{Location:'/dashboard'}})
  const valid=await q`SELECT id FROM authorized_groups WHERE user_id=${u.id} AND can_post=true AND id=ANY(${ids})`
  if(valid.length!==ids.length)return new Response(null,{status:303,headers:{Location:'/dashboard'}})
  const rows=await q`INSERT INTO campaigns(user_id,name,message,media_type,media_url,interval_minutes,status,next_run_at,delivery_mode) VALUES(${u.id},${String(f.get('name')||'Campaign').slice(0,120)},${String(f.get('message')||'')},${String(f.get('mediaType')||'')||null},${String(f.get('mediaUrl')||'')||null},${interval},'running',now(),'bot') RETURNING id`
  for(const id of ids)await q`INSERT INTO campaign_groups(campaign_id,group_id) VALUES(${rows[0].id},${id})`
  return new Response(null,{status:303,headers:{Location:'/dashboard'}})
}
