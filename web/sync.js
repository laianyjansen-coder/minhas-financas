/*
 * sync.js — login (Firebase Authentication) e sincronização (Cloud Firestore)
 * usando apenas as APIs REST do Firebase, sem bibliotecas externas.
 * Os dados continuam salvos no aparelho e funcionam sem internet;
 * quando há conexão, são enviados para a sua conta e recebidos dos outros aparelhos.
 */
(function () {
  'use strict';
  var CFG_KEY = 'fin-fbcfg', AUTH_KEY = 'fin-auth', META_KEY = 'fin-sync-meta', SEM_KEY = 'fin-semsync';
  var POLL_MS = 20000, PUSH_MS = 1200;

  function ler(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function gravar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function pad(n) { return String(n).padStart(2, '0'); }
  function hojeISO() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function horaTxt(ts) { var d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  function configPadrao() {
    var c = window.FIREBASE_CONFIG || {};
    if (c.apiKey && c.projectId && !/COLE/.test(c.apiKey)) return { apiKey: c.apiKey, projectId: c.projectId };
    return null;
  }
  var cfg = ler(CFG_KEY) || configPadrao();
  var auth = ler(AUTH_KEY);
  var meta = ler(META_KEY) || {};
  var inst = null, estado = 'local', erroTxt = '', pushTimer = null, enviando = false, deNovo = false, ultimoOk = meta.ultimoOk || 0;
  var origSalvar = null;

  // ---------- Firebase REST ----------
  function chamar(url, opcoes) {
    return fetch(url, opcoes).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
        if (!r.ok) { var err = new Error((j && j.error && (j.error.message || j.error.status)) || ('HTTP ' + r.status)); err.status = r.status; throw err; }
        return j;
      });
    });
  }
  function postJSON(url, corpo) { return chamar(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }); }
  function guardarAuth(r, email) {
    auth = { uid: r.localId || r.user_id, email: email || r.email || (auth && auth.email), idToken: r.idToken || r.id_token, refreshToken: r.refreshToken || r.refresh_token, exp: Date.now() + (Number(r.expiresIn || r.expires_in || 3600) * 1000) };
    gravar(AUTH_KEY, auth);
  }
  function entrar(email, senha, criar) {
    var url = 'https://identitytoolkit.googleapis.com/v1/accounts:' + (criar ? 'signUp' : 'signInWithPassword') + '?key=' + encodeURIComponent(cfg.apiKey);
    return postJSON(url, { email: email, password: senha, returnSecureToken: true }).then(function (r) {
      guardarAuth(r, email); meta = {}; gravar(META_KEY, meta);
    });
  }
  function redefinirSenha(email) {
    return postJSON('https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=' + encodeURIComponent(cfg.apiKey), { requestType: 'PASSWORD_RESET', email: email });
  }
  function token() {
    if (!auth) return Promise.reject(new Error('sem login'));
    if (auth.exp - 60000 > Date.now()) return Promise.resolve(auth.idToken);
    return fetch('https://securetoken.googleapis.com/v1/token?key=' + encodeURIComponent(cfg.apiKey), {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(auth.refreshToken)
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error((j.error && j.error.message) || 'TOKEN'); e.status = r.status; throw e; } return j; }); })
      .then(function (j) { guardarAuth(j); return auth.idToken; });
  }
  function docUrl() { return 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(cfg.projectId) + '/databases/(default)/documents/usuarios/' + encodeURIComponent(auth.uid); }
  function buscar(completo) {
    return token().then(function (t) {
      return chamar(docUrl() + (completo ? '' : '?mask.fieldPaths=atualizadoEm'), { headers: { Authorization: 'Bearer ' + t } })
        .catch(function (e) { if (e.status === 404) return null; throw e; });
    });
  }
  function enviarDoc(d) {
    var q = '?updateMask.fieldPaths=json&updateMask.fieldPaths=atualizadoEm&updateMask.fieldPaths=dispositivo';
    var corpo = { fields: { json: { stringValue: JSON.stringify(d) }, atualizadoEm: { timestampValue: new Date().toISOString() }, dispositivo: { stringValue: window.AndroidApp ? 'android' : 'web' } } };
    return token().then(function (t) {
      return chamar(docUrl() + q, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(corpo) });
    });
  }

  // ---------- dados ----------
  function dadosAtuais() { return inst ? (inst._d || inst.state.d) : null; }
  function normalizar(d) {
    ['migrarCategorias', 'migrarParcelas', 'importarListas', 'importarFaturas', 'migrarAcabados'].forEach(function (f) { try { if (typeof window[f] === 'function') window[f](d); } catch (e) {} });
    return d;
  }
  function aplicarRemoto(d) {
    normalizar(d);
    if (origSalvar) origSalvar(d);
    if (inst) { inst._d = d; inst.setState({ d: d }); }
    avisarAndroid(d);
  }
  function setEstado(e, msg) { estado = e; erroTxt = msg || ''; if (window.DCLite) window.DCLite.render(); desenharBotao(); }

  function agendarEnvio() { clearTimeout(pushTimer); pushTimer = setTimeout(enviar, PUSH_MS); }
  function enviar() {
    if (!cfg || !auth) return Promise.resolve();
    if (enviando) { deNovo = true; return Promise.resolve(); }
    var d = dadosAtuais(); if (!d) return Promise.resolve();
    enviando = true; setEstado('enviando');
    return enviarDoc(d).then(function (r) {
      meta.updateTime = r && r.updateTime; meta.dirty = false; meta.ultimoOk = ultimoOk = Date.now(); gravar(META_KEY, meta);
      setEstado('ok');
    }).catch(tratarErro).then(function () { enviando = false; if (deNovo) { deNovo = false; enviar(); } });
  }
  function tratarErro(e) {
    var m = String(e && e.message || e);
    if (/TOKEN_EXPIRED|INVALID_REFRESH_TOKEN|USER_NOT_FOUND|USER_DISABLED|sem login/.test(m)) { sair(); setEstado('erro', 'Sua sessão expirou. Entre novamente.'); mostrarLogin(); return; }
    if (e && e.status === 403) { setEstado('erro', 'O Firestore recusou o acesso. Confira as regras de segurança (veja o LEIA-ME).'); return; }
    if (e && e.status === 404 && /database/i.test(m)) { setEstado('erro', 'O banco Firestore ainda não foi criado no projeto (passo 4 do GUIA-FIREBASE).'); return; }
    if (/SERVICE_DISABLED|has not been used|is disabled/i.test(m)) { setEstado('erro', 'O Firestore ainda não foi ativado neste projeto (passo 4 do GUIA-FIREBASE).'); return; }
    if (/API key not valid|API_KEY_INVALID/i.test(m)) { setEstado('erro', 'Chave de API inválida. Toque em Sincronização › Sair e confira a configuração.'); return; }
    if (!navigator.onLine || e instanceof TypeError) { setEstado('offline'); return; }
    setEstado('erro', m);
  }
  function sincronizar() {
    if (!cfg || !auth || document.hidden) return Promise.resolve();
    if (meta.dirty && enviando) return Promise.resolve();
    return buscar(false).then(function (r) {
      if (!r) return enviar();                                   // ainda não há dados na conta: envia os deste aparelho
      if (r.updateTime === meta.updateTime) { if (meta.dirty) return enviar(); meta.ultimoOk = ultimoOk = Date.now(); gravar(META_KEY, meta); setEstado('ok'); return; }
      return buscar(true).then(function (full) {                 // a conta tem uma versão mais nova
        var txt = full && full.fields && full.fields.json && full.fields.json.stringValue;
        if (!txt) return enviar();
        if (meta.dirty || !meta.updateTime) gravar('fin-backup-local', { em: Date.now(), d: dadosAtuais() });
        aplicarRemoto(JSON.parse(txt));
        meta.updateTime = full.updateTime; meta.dirty = false; meta.ultimoOk = ultimoOk = Date.now(); gravar(META_KEY, meta);
        setEstado('ok');
      });
    }).catch(tratarErro);
  }
  function sair() { auth = null; gravar(AUTH_KEY, null); meta = {}; gravar(META_KEY, meta); desenharBotao(); }

  // ---------- Android (lembrete diário) ----------
  var ultimoLembrete = null;
  function avisarAndroid(d) {
    var A = window.AndroidApp; if (!A || !d) return;
    try {
      var hora = (d.settings && d.settings.lembreteHora) || '20:00';
      if (hora !== ultimoLembrete) { A.agendarLembrete(hora); ultimoLembrete = hora; }
      if (d.habitos && d.habitos[hojeISO()] != null) A.marcarRegistrado(hojeISO());
    } catch (e) {}
  }

  // ---------- interface (login, configuração, conta) ----------
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'onclick') e.addEventListener('click', attrs[k]); else if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  var camada = null;
  function fecharCamada() { if (camada) { camada.remove(); camada = null; } }
  function abrirCamada(conteudo) {
    fecharCamada();
    camada = el('div', { class: 'sx-camada', role: 'dialog', 'aria-modal': 'true' }, [el('div', { class: 'sx-caixa' }, conteudo)]);
    document.body.appendChild(camada);
    var p = camada.querySelector('input,textarea'); if (p) setTimeout(function () { p.focus(); }, 50);
  }
  function campo(rotulo, attrs) { var i = el(attrs.tag || 'input', attrs.tag ? {} : attrs); if (attrs.tag) Object.keys(attrs).forEach(function (k) { if (k !== 'tag') i.setAttribute(k, attrs[k]); }); return { box: el('label', { class: 'sx-campo' }, [el('span', { text: rotulo }), i]), input: i }; }
  function msgErroAuth(m) {
    if (/EMAIL_NOT_FOUND|INVALID_PASSWORD|INVALID_LOGIN_CREDENTIALS/.test(m)) return 'E-mail ou senha incorretos.';
    if (/EMAIL_EXISTS/.test(m)) return 'Já existe uma conta com esse e-mail. Use “Entrar”.';
    if (/WEAK_PASSWORD/.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.';
    if (/INVALID_EMAIL/.test(m)) return 'E-mail inválido.';
    if (/OPERATION_NOT_ALLOWED|CONFIGURATION_NOT_FOUND/.test(m)) return 'O login por e-mail e senha ainda não foi ativado no Firebase (Authentication › Sign-in method › E-mail/senha).';
    if (/API_KEY|API key/i.test(m)) return 'A apiKey do Firebase parece inválida. Confira a configuração.';
    if (/TOO_MANY_ATTEMPTS/.test(m)) return 'Muitas tentativas. Aguarde alguns minutos.';
    if (/Failed to fetch|NetworkError|TypeError/.test(m)) return 'Sem conexão com a internet.';
    return m;
  }

  function mostrarConfig() {
    var k = campo('Chave de API da Web (Web API Key)', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'AIza…' });
    var p = campo('ID do projeto (Project ID)', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'ex.: minhas-financas-1a2b3' });
    if (cfg) { k.input.value = cfg.apiKey || ''; p.input.value = cfg.projectId || ''; }
    var aviso = el('p', { class: 'sx-erro' });
    // Se colarem o trecho firebaseConfig inteiro em qualquer campo, separa sozinho.
    function extrair(txt) {
      var ak = /apiKey["']?\s*:\s*["']([^"']+)/.exec(txt), pid = /projectId["']?\s*:\s*["']([^"']+)/.exec(txt);
      if (ak) k.input.value = ak[1].trim();
      if (pid) p.input.value = pid[1].trim();
    }
    [k.input, p.input].forEach(function (i) { i.addEventListener('input', function () { if (/apiKey|projectId/.test(i.value)) extrair(i.value); }); });
    abrirCamada([
      el('h2', { text: 'Conectar ao Firebase' }),
      el('p', { class: 'sx-sub', text: 'No Console do Firebase, clique na engrenagem › Configurações do projeto (Project settings), aba Geral. Copie o “ID do projeto” e a “Chave de API da Web”. Se aparecer “Nenhuma chave de API da Web”, ative antes o login por e-mail em Authentication (veja o GUIA-FIREBASE).' }),
      k.box, p.box, aviso,
      el('div', { class: 'sx-acoes' }, [
        el('button', { class: 'sx-btn sx-p', text: 'Salvar e continuar', onclick: function () {
          var ak = k.input.value.trim().replace(/^["']|["',]$/g, ''), pid = p.input.value.trim().replace(/^["']|["',]$/g, '').toLowerCase();
          if (!/^AIza[\w-]{30,}$/.test(ak)) { aviso.textContent = 'A chave de API começa com “AIza” e tem cerca de 39 caracteres. Confira se copiou inteira.'; return; }
          if (!/^[a-z0-9][a-z0-9-]{3,}$/.test(pid)) { aviso.textContent = 'O ID do projeto tem só letras minúsculas, números e hífens (ex.: minhas-financas-1a2b3). Não use o nome do projeto.'; return; }
          cfg = { apiKey: ak, projectId: pid }; gravar(CFG_KEY, cfg); gravar(SEM_KEY, null);
          mostrarLogin();
        } }),
        el('button', { class: 'sx-btn', text: 'Usar sem sincronizar', onclick: function () { gravar(SEM_KEY, 1); fecharCamada(); setEstado('local'); } })
      ])
    ]);
  }
  function mostrarLogin() {
    var e = campo('E-mail', { type: 'email', autocomplete: 'email', inputmode: 'email' });
    var s = campo('Senha', { type: 'password', autocomplete: 'current-password' });
    var aviso = el('p', { class: 'sx-erro' });
    function agir(criar) {
      var email = e.input.value.trim(), senha = s.input.value;
      if (!email || !senha) { aviso.textContent = 'Preencha e-mail e senha.'; return; }
      aviso.textContent = criar ? 'Criando conta…' : 'Entrando…'; aviso.className = 'sx-info';
      entrar(email, senha, criar).then(function () { fecharCamada(); setEstado('enviando'); return sincronizar(); })
        .catch(function (x) { aviso.className = 'sx-erro'; aviso.textContent = msgErroAuth(String(x && x.message || x)); });
    }
    abrirCamada([
      el('h2', { text: 'Entrar' }),
      el('p', { class: 'sx-sub', text: 'Use o mesmo e-mail e senha no celular e na web: os dados ficam iguais nos dois.' }),
      e.box, s.box, aviso,
      el('div', { class: 'sx-acoes' }, [
        el('button', { class: 'sx-btn sx-p', text: 'Entrar', onclick: function () { agir(false); } }),
        el('button', { class: 'sx-btn', text: 'Criar conta', onclick: function () { agir(true); } })
      ]),
      el('div', { class: 'sx-links' }, [
        el('button', { class: 'sx-link', text: 'Esqueci a senha', onclick: function () {
          var email = e.input.value.trim(); if (!email) { aviso.textContent = 'Digite seu e-mail acima.'; return; }
          redefinirSenha(email).then(function () { aviso.className = 'sx-info'; aviso.textContent = 'Enviamos um e-mail para redefinir a senha.'; }).catch(function (x) { aviso.className = 'sx-erro'; aviso.textContent = msgErroAuth(String(x.message)); });
        } }),
        el('button', { class: 'sx-link', text: 'Alterar configuração do Firebase', onclick: mostrarConfig }),
        el('button', { class: 'sx-link', text: 'Usar sem sincronizar', onclick: function () { gravar(SEM_KEY, 1); fecharCamada(); setEstado('local'); } })
      ])
    ]);
  }
  function mostrarConta() {
    var linhas = [el('h2', { text: 'Sincronização' })];
    if (auth) {
      linhas.push(el('p', { class: 'sx-sub', text: 'Conectada como ' + auth.email + '.' }));
      linhas.push(el('p', { class: 'sx-sub', text: textoEstado() }));
      linhas.push(el('div', { class: 'sx-acoes' }, [
        el('button', { class: 'sx-btn sx-p', text: 'Sincronizar agora', onclick: function () { fecharCamada(); setEstado('enviando'); (meta.dirty ? enviar() : sincronizar()); } }),
        el('button', { class: 'sx-btn', text: 'Sair da conta', onclick: function () { sair(); fecharCamada(); setEstado('local'); } })
      ]));
    } else {
      linhas.push(el('p', { class: 'sx-sub', text: 'A sincronização está desligada: os dados ficam só neste aparelho.' }));
      linhas.push(el('div', { class: 'sx-acoes' }, [el('button', { class: 'sx-btn sx-p', text: 'Ativar sincronização', onclick: function () { if (cfg) mostrarLogin(); else mostrarConfig(); } })]));
    }
    linhas.push(el('div', { class: 'sx-links' }, [el('button', { class: 'sx-link', text: 'Fechar', onclick: fecharCamada })]));
    abrirCamada(linhas);
  }

  function textoEstado() {
    if (!cfg || !auth) return 'Dados só neste aparelho · toque em “Sincronização” para conectar';
    if (estado === 'enviando') return 'Sincronizando…';
    if (estado === 'offline') return 'Sem internet · as alterações serão enviadas quando a conexão voltar';
    if (estado === 'erro') return 'Erro na sincronização: ' + erroTxt;
    if (meta.dirty) return 'Alterações aguardando envio';
    return 'Sincronizado com ' + auth.email + (ultimoOk ? ' · ' + horaTxt(ultimoOk) : '');
  }
  var botao = null;
  function desenharBotao() {
    if (!botao) { botao = el('button', { class: 'sx-fab', type: 'button', 'aria-label': 'Sincronização', onclick: mostrarConta }); document.body.appendChild(botao); }
    var cor = !auth ? '#BDB3A3' : estado === 'erro' ? '#C47F70' : (estado === 'offline' || meta.dirty) ? '#D1AE55' : estado === 'enviando' ? '#6F8FA8' : '#7FA578';
    botao.innerHTML = '<span class="sx-dot" style="background:' + cor + '"></span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/></svg><span>Sincronização</span>';
    botao.title = textoEstado();
  }

  // ---------- integração com a dashboard ----------
  function iniciar() {
    var C = window.DashComponent;
    origSalvar = window.salvarLS;
    window.salvarLS = function (d) {
      var ok = origSalvar(d);
      if (cfg && auth) { meta.dirty = true; gravar(META_KEY, meta); agendarEnvio(); }
      avisarAndroid(d);
      return ok;
    };
    var origRV = C.prototype.renderVals;
    C.prototype.renderVals = function () {
      var r = origRV.call(this);
      r.salvoTxt = textoEstado();
      if (window.AndroidApp) {
        var self = this;
        r.ativarNotif = function () {
          try { window.AndroidApp.pedirPermissaoNotificacao(); window.AndroidApp.agendarLembrete((self.state.d.settings && self.state.d.settings.lembreteHora) || '20:00'); } catch (e) {}
          self.setState({ notif: 'granted' });
        };
        r.notifTxt = 'No celular, o lembrete chega como notificação do Android no horário escolhido (e só se você ainda não registrou o dia).';
      }
      return r;
    };
    inst = window.DCLite.mount(document.getElementById('app'), window.DC_TEMPLATE, C);
    avisarAndroid(dadosAtuais());
    desenharBotao();

    if (!cfg) { if (!ler(SEM_KEY)) mostrarConfig(); }
    else if (!auth) { if (!ler(SEM_KEY)) mostrarLogin(); }
    else sincronizar();

    setInterval(sincronizar, POLL_MS);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) sincronizar(); });
    window.addEventListener('online', function () { meta.dirty ? enviar() : sincronizar(); });
    window.addEventListener('offline', function () { setEstado('offline'); });
    window.addEventListener('pagehide', function () { if (meta.dirty) enviar(); });
  }
  window.FinSync = { iniciar: iniciar, sincronizar: sincronizar, estado: function () { return { estado: estado, meta: meta, auth: !!auth, cfg: !!cfg }; } };
})();
