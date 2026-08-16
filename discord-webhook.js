(() => {
  'use strict';
  if (window.__TECH_SOCIAL_DISCORD__) return;
  window.__TECH_SOCIAL_DISCORD__ = true;

  const KEY = 'tech_social_discord_webhook';
  const get = () => localStorage.getItem(KEY) || '';
  const set = v => localStorage.setItem(KEY, v.trim());
  const valid = url => /^https:\/\/discord(?:app)?\.com\/api\/webhooks\//i.test(url || '');

  async function send(message) {
    const url = get();
    if (!valid(url)) throw new Error('Discord webhook is not configured.');
    const response = await fetch(url, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:message.slice(0,2000),allowed_mentions:{parse:[]}})});
    if (!response.ok) throw new Error(`Discord returned ${response.status}.`);
    return true;
  }

  function notify(type, data = {}) {
    const lines = [`**Tech Social CRM — ${type}**`];
    Object.entries(data).forEach(([key,value]) => { if (value !== undefined && value !== null && value !== '') lines.push(`**${key}:** ${String(value)}`); });
    return send(lines.join('\n'));
  }

  function settingsPanel() {
    if (document.querySelector('#discordIntegrationPanel')) return;
    const settings = document.querySelector('#settingsView, [data-view="settings"], .settings-panel');
    if (!settings) return;
    const panel = document.createElement('section'); panel.id='discordIntegrationPanel'; panel.className='settings-card'; panel.style.marginTop='16px';
    panel.innerHTML = `<div class="settings-card-head"><div><p>INTEGRATION</p><h3>Discord notifications</h3><span>Send CRM notifications to a Discord channel using a secure webhook URL.</span></div></div><div style="display:grid;gap:8px"><label><span style="font-size:10px;font-weight:700">DISCORD WEBHOOK URL</span><input id="discordWebhookInput" type="password" autocomplete="off" placeholder="https://discord.com/api/webhooks/..." /></label><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="button button-primary" id="saveDiscordWebhook" type="button">Save connection</button><button class="button button-outline" id="testDiscordWebhook" type="button">Send test notification</button><button class="button button-outline" id="removeDiscordWebhook" type="button">Disconnect</button></div><small style="font-size:9px;color:var(--muted)">The webhook is stored locally in this browser. It is never committed to GitHub.</small></div>`;
    settings.appendChild(panel);
    const input=panel.querySelector('#discordWebhookInput'); input.value=get();
    panel.querySelector('#saveDiscordWebhook').onclick=()=>{const v=input.value;if(!valid(v)){window.toast?.('Enter a valid Discord webhook URL.',true);return;}set(v);window.toast?.('Discord connection saved.');};
    panel.querySelector('#testDiscordWebhook').onclick=async()=>{try{await notify('Test notification',{Status:'Connected successfully'});window.toast?.('Discord test notification sent.');}catch(e){window.toast?.(e.message,true);}};
    panel.querySelector('#removeDiscordWebhook').onclick=()=>{localStorage.removeItem(KEY);input.value='';window.toast?.('Discord connection removed.');};
  }

  function init(){
    settingsPanel();
    window.techSocialDiscord={send,notify,connected:()=>valid(get())};
    new MutationObserver(settingsPanel).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
