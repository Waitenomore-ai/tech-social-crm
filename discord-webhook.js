(() => {
  'use strict';
  if (window.__TECH_SOCIAL_DISCORD__) return;
  window.__TECH_SOCIAL_DISCORD__ = true;

  const KEY = 'tech_social_discord_webhook';
  const get = () => localStorage.getItem(KEY) || '';
  const set = v => localStorage.setItem(KEY, v.trim());
  const valid = url => /^https:\/\/discord(?:app)?\.com\/api\/webhooks\//i.test(url || '');
  const toast = (msg,bad=false) => window.toast?.(msg,bad);

  async function send(message) {
    const url = get();
    if (!valid(url)) throw new Error('Discord is not connected yet.');
    const response = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:String(message).slice(0,2000),allowed_mentions:{parse:[]}})});
    if (!response.ok) throw new Error(`Discord returned ${response.status}.`);
    return true;
  }

  async function test(){try{await send('**Tech Social CRM — Discord connected successfully.**');toast('Discord test notification sent.');}catch(e){toast(e.message||'Discord test failed.',true);}}

  function connect(){
    const current=get();
    if(current && window.confirm('Discord is already connected. Press OK to send a test notification, or Cancel to change the webhook.')) return test();
    const value=window.prompt('Paste your Discord channel webhook URL:',current);
    if(value===null)return;
    if(!valid(value)){toast('That is not a valid Discord webhook URL.',true);return;}
    set(value);toast('Discord connected.');render();
  }
  function disconnect(){localStorage.removeItem(KEY);toast('Discord disconnected.');render();}

  function render(){
    const grid=document.querySelector('#accountsGrid');
    if(!grid || grid.querySelector('#discordAccountCard'))return;
    const existing=grid.querySelector('.account-card, article, .social-account-card');
    const card=document.createElement(existing?.tagName||'article');
    card.id='discordAccountCard'; card.className=existing?.className||'account-card';
    card.innerHTML=`<div class="account-card-head" style="display:flex;align-items:center;gap:12px"><span style="width:42px;height:42px;border-radius:12px;background:#5865F2;color:#fff;display:grid;place-items:center;font-weight:900;font-size:20px">D</span><div><strong>Discord</strong><small style="display:block;color:#7a8291">Webhook notifications</small></div></div><div style="margin-top:16px"><span class="account-status ${get()?'ready':''}">${get()?'CONNECTED':'NOT CONNECTED'}</span></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="button button-primary" id="discordConnectButton" type="button">${get()?'Test connection':'Connect Discord'}</button>${get()?'<button class="button button-outline" id="discordDisconnectButton" type="button">Disconnect</button>':''}</div><p style="font-size:10px;color:#7a8291;margin:12px 0 0">Connect a Discord channel webhook for CRM notifications. The webhook is stored only in this browser and is never committed to GitHub.</p>`;
    grid.appendChild(card);
    card.querySelector('#discordConnectButton').onclick=connect;
    card.querySelector('#discordDisconnectButton')?.addEventListener('click',disconnect);
  }

  function init(){
    render();
    new MutationObserver(render).observe(document.body,{childList:true,subtree:true});
    window.techSocialDiscord={send,test,connect,disconnect,connected:()=>valid(get())};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
