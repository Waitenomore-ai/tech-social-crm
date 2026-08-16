(() => {
  'use strict';
  if (window.__TECH_SOCIAL_DISCORD__) return;
  window.__TECH_SOCIAL_DISCORD__ = true;

  const KEY='tech_social_discord_webhook';
  const get=()=>localStorage.getItem(KEY)||'';
  const set=v=>localStorage.setItem(KEY,v.trim());
  const valid=url=>/^https:\/\/discord(?:app)?\.com\/api\/webhooks\//i.test(url||'');
  const toast=(msg,bad=false)=>window.toast?.(msg,bad);

  async function send(message){
    const url=get();
    if(!valid(url)) throw new Error('Discord is not connected yet.');
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:String(message).slice(0,2000),allowed_mentions:{parse:[]}})});
    if(!r.ok) throw new Error(`Discord returned ${r.status}.`);
    return true;
  }

  async function test(){
    try{await send('**Tech Social CRM — Discord connection test successful.**');toast('Discord test notification sent.');}
    catch(e){toast(e.message||'Discord test failed.',true);}
  }

  function connect(){
    const value=window.prompt('Paste your Discord channel webhook URL:',get());
    if(value===null)return;
    if(!valid(value)){toast('That is not a valid Discord webhook URL.',true);return;}
    set(value);
    render();
    toast('Discord connected.');
  }

  function disconnect(){
    localStorage.removeItem(KEY);
    toast('Discord disconnected.');
    render();
  }

  function render(){
    const grid=document.querySelector('#accountsGrid');
    if(!grid)return false;
    const old=grid.querySelector('#discordAccountCard');
    if(old)old.remove();
    const connected=valid(get());
    const card=document.createElement('article');
    card.id='discordAccountCard';
    card.className='account-card';
    card.innerHTML=`<div class="account-card-head" style="display:flex;align-items:center;gap:12px"><span class="social-icon discord-icon" aria-label="Discord">D</span><div><strong>Discord</strong><small>Webhook notifications</small></div></div><div style="margin-top:16px"><span class="account-status discord-status ${connected?'ready':''}">${connected?'CONNECTED':'NOT CONNECTED'}</span></div><div class="account-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="button button-primary" id="discordConnectButton" type="button">${connected?'Test connection':'Connect Discord'}</button>${connected?'<button class="button button-outline" id="discordDisconnectButton" type="button">Disconnect</button>':''}</div>`;
    grid.appendChild(card);
    card.querySelector('#discordConnectButton').onclick=()=>valid(get())?test():connect();
    card.querySelector('#discordDisconnectButton')?.addEventListener('click',disconnect);
    return true;
  }

  function init(){
    window.techSocialDiscord={send,test,connect,disconnect,connected:()=>valid(get()),refresh:render};
    if(render())return;
    // The CRM builds Settings dynamically. Watch only until the Connections grid exists,
    // then disconnect immediately so Discord cannot create a mutation/render loop.
    const observer=new MutationObserver(()=>{
      if(render()) observer.disconnect();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),10000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
