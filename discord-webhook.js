(() => {
  'use strict';
  if (window.__TECH_SOCIAL_DISCORD__) return;
  window.__TECH_SOCIAL_DISCORD__ = true;

  const KEY='tech_social_discord_webhook';
  const get=()=>localStorage.getItem(KEY)||'';
  const set=v=>localStorage.setItem(KEY,v.trim());
  const valid=url=>/^https:\/\/discord(?:app)?\.com\/api\/webhooks\//i.test(url||'');
  const toast=(msg,bad=false)=>window.toast?.(msg,bad);

  async function check(){
    const url=get();
    if(!valid(url)) return false;
    try{
      const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:'Tech Social CRM connection check',allowed_mentions:{parse:[]}})});
      return r.ok;
    }catch{return false;}
  }
  async function refreshStatus(){
    const card=document.querySelector('#discordAccountCard');
    if(!card)return;
    const connected=await check();
    const status=card.querySelector('.discord-status');
    if(status){status.textContent=connected?'CONNECTED':'NOT CONNECTED';status.classList.toggle('ready',connected);}
    card.querySelector('#discordConnectButton')?.replaceChildren(document.createTextNode(connected?'Test connection':'Connect Discord'));
  }
  async function send(message){
    const url=get();if(!valid(url))throw new Error('Discord is not connected yet.');
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:String(message).slice(0,2000),allowed_mentions:{parse:[]}})});
    if(!r.ok)throw new Error(`Discord returned ${r.status}.`);return true;
  }
  async function test(){try{await send('**Tech Social CRM — Discord connection test successful.**');toast('Discord test notification sent.');await refreshStatus();}catch(e){toast(e.message||'Discord test failed.',true);await refreshStatus();}}
  async function connect(){
    const value=window.prompt('Paste your Discord channel webhook URL:',get());if(value===null)return;
    if(!valid(value)){toast('That is not a valid Discord webhook URL.',true);return;}
    set(value);
    if(await check()){toast('Discord connected.');render();}else{localStorage.removeItem(KEY);toast('Discord webhook could not be verified.',true);render();}
  }
  function disconnect(){localStorage.removeItem(KEY);toast('Discord disconnected.');render();}

  function render(){
    const grid=document.querySelector('#accountsGrid');if(!grid||grid.querySelector('#discordAccountCard')){refreshStatus();return;}
    const card=document.createElement('article');card.id='discordAccountCard';card.className='account-card';
    card.innerHTML=`<div class="account-card-head" style="display:flex;align-items:center;gap:12px"><span class="social-icon discord-icon" aria-label="Discord">D</span><div><strong>Discord</strong><small>Webhook notifications</small></div></div><div style="margin-top:16px"><span class="account-status discord-status ${get()?'ready':''}">${get()?'CONNECTED':'NOT CONNECTED'}</span></div><div class="account-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="button button-primary" id="discordConnectButton" type="button">${get()?'Test connection':'Connect Discord'}</button>${get()?'<button class="button button-outline" id="discordDisconnectButton" type="button">Disconnect</button>':''}</div>`;
    grid.appendChild(card);card.querySelector('#discordConnectButton').onclick=()=>get()?test():connect();card.querySelector('#discordDisconnectButton')?.addEventListener('click',disconnect);refreshStatus();
  }
  function init(){render();new MutationObserver(render).observe(document.body,{childList:true,subtree:true});window.techSocialDiscord={send,test,connect,disconnect,connected:()=>valid(get())};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
