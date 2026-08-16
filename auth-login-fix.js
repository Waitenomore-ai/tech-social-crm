/* Tech Social CRM login recovery guard.
 * The main CRM starts two workspace-open paths after SIGNED_IN. This small
 * capture-phase handler owns password sign-in, gives the user a timeout/error,
 * and reloads once Supabase has created the session so initializeAuth opens the
 * workspace exactly once.
 */
(() => {
  if (window.__TECH_SOCIAL_LOGIN_FIX__) return;
  window.__TECH_SOCIAL_LOGIN_FIX__ = true;

  const form = document.querySelector('#authForm');
  const button = document.querySelector('#authSubmitButton');
  const message = document.querySelector('#authMessage');
  if (!form || !button || !message || !window.supabase || !window.TECH_SOCIAL_CONFIG) return;

  const isSignInMode = () => {
    const active = document.querySelector('[data-auth-mode].active');
    return !active || active.dataset.authMode === 'signin';
  };

  const setMessage = (text = '', success = false) => {
    message.textContent = text;
    message.classList.toggle('success', success);
  };

  const withTimeout = (promise, ms) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase sign-in timed out. Please refresh the page and try again.')), ms))
  ]);

  form.addEventListener('submit', async event => {
    if (!isSignInMode()) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const email = document.querySelector('#authEmail')?.value.trim().toLowerCase() || '';
    const password = document.querySelector('#authPassword')?.value || '';
    if (!email || !password) return;

    button.disabled = true;
    button.textContent = 'Signing in…';
    setMessage('');

    try {
      const client = window.supabase.createClient(
        window.TECH_SOCIAL_CONFIG.supabaseUrl,
        window.TECH_SOCIAL_CONFIG.supabaseAnonKey,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
      );
      const { error } = await withTimeout(client.auth.signInWithPassword({ email, password }), 15000);
      if (error) throw error;
      setMessage('Sign-in successful. Opening your workspace…', true);
      setTimeout(() => location.reload(), 150);
    } catch (error) {
      setMessage(error?.message || 'Sign-in failed. Please try again.');
      button.disabled = false;
      button.textContent = 'Sign in securely';
    }
  }, true);
})();
