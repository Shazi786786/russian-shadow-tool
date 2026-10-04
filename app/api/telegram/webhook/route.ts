import {sql,ensureSchema} from '../../../../lib/db';
import {tg} from '../../../../lib/telegram';

export async function POST(req:Request){
  const secret=req.headers.get('x-telegram-bot-api-secret-token');
  if(process.env.TELEGRAM_WEBHOOK_SECRET&&secret!==process.env.TELEGRAM_WEBHOOK_SECRET)return new Response('forbidden',{status:403});
  await ensureSchema();
  const update=await req.json();
  const m=update.message||update.channel_post;
  if(!m?.chat||!m?.text)return Response.json({ok:true});

  const text=String(m.text).trim();

  if(/^\/start(?:@\w+)?$/i.test(text)){
    await tg('sendMessage',{
      chat_id:m.chat.id,
      text:[
        '👋 Welcome to Russian Shadow Tool',
        '',
        'This bot works with the Russian Shadow Tool dashboard.',
        '',
        'To connect a Telegram group:',
        '1. Add this bot to your group.',
        '2. Make the bot an admin and allow it to post messages.',
        '3. Open your dashboard and copy the 6-character registration code.',
        '4. Inside the group, a group admin sends:',
        '/register_group CODE',
        '',
        'After successful authorization, the group will appear in your dashboard.'
      ].join('\n')
    });
    return Response.json({ok:true});
  }

  const match=text.match(/^\/register_group(?:@\w+)?\s+([A-Z0-9]{6})$/i);
  if(!match)return Response.json({ok:true});

  if(!['group','supergroup'].includes(m.chat.type)){
    await tg('sendMessage',{chat_id:m.chat.id,text:'⚠️ Run /register_group CODE inside the Telegram group you want to authorize.'});
    return Response.json({ok:true});
  }
  if(!m.from){
    await tg('sendMessage',{chat_id:m.chat.id,text:'Could not verify the sender. Please run the command again as a group admin.'});
    return Response.json({ok:true});
  }

  const member=await tg('getChatMember',{chat_id:m.chat.id,user_id:m.from.id});
  if(!['administrator','creator'].includes(member.status)){
    await tg('sendMessage',{chat_id:m.chat.id,text:'❌ Only a group admin can authorize this group.'});
    return Response.json({ok:true});
  }

  const bot=await tg('getMe',{});
  const botMember=await tg('getChatMember',{chat_id:m.chat.id,user_id:bot.id});
  if(!['administrator','creator'].includes(botMember.status)){
    await tg('sendMessage',{chat_id:m.chat.id,text:'❌ Please make the bot an admin with permission to post messages, then run the command again.'});
    return Response.json({ok:true});
  }

  const q=sql();
  const c=await q`SELECT user_id FROM registration_codes WHERE upper(code)=upper(${match[1]}) AND expires_at>now() LIMIT 1`;
  if(!c.length){
    await tg('sendMessage',{chat_id:m.chat.id,text:'❌ Registration code is invalid or expired. Open the dashboard and copy the latest code.'});
    return Response.json({ok:true});
  }

  await q`INSERT INTO authorized_groups(user_id,chat_id,title,registered_by,can_post) VALUES(${c[0].user_id},${m.chat.id},${m.chat.title||'Telegram Group'},${m.from.id},true) ON CONFLICT(user_id,chat_id) DO UPDATE SET title=excluded.title,registered_by=excluded.registered_by,can_post=true`;
  await tg('sendMessage',{chat_id:m.chat.id,text:'✅ Group connected successfully. It will now appear in your Russian Shadow Tool dashboard.'});
  return Response.json({ok:true});
}
