/* Gerado por tools/gerar_web.py — não edite à mão. */

var KEY = 'financas-dashboard-v2';
var COLS = [
  { id: 'visa', nome: 'VISA', cor: '#2E6349' },
  { id: 'master', nome: 'MASTER', cor: '#A9C9B3' },
  { id: 'cartao', nome: 'CARTÃO', cor: '#CDB591' },
  { id: 'demais', nome: 'DEMAIS DESPESAS', cor: '#7FAE8E' }
];
var MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var MES_C = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
var FORMAS = ['Crédito','Débito','Pix','Dinheiro','Boleto','Transferência'];
var INV_STATUS = ['Fechado','Em uso','Acabando'];
function unid(pr) { return Math.max(1, parseInt(pr && pr.quantidade, 10) || 1); }
function somaUn(l, f) { return l.reduce(function (t, x) { return t + unid(f ? f(x) : x); }, 0); }
function lerPref(k, padrao) { try { var v = window.localStorage.getItem(k); return v == null ? padrao : v; } catch (e) { return padrao; } }
function gravarPref(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
function telaEstreita() { try { return window.innerWidth <= 720; } catch (e) { return false; } }
function temaInicial() { var t = lerPref('fin-tema', ''); if (t === 'claro' || t === 'escuro') return t; try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'; } catch (e) { return 'claro'; } }
function aplicarTema(t) {
  try { if (window.DCLite && window.DCLite.setTema) window.DCLite.setTema(t); } catch (e) {}
  try { if (window.AndroidApp && window.AndroidApp.definirTema) window.AndroidApp.definirTema(t); } catch (e) {}
}
function isoDe(dt) { return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); }
function addDias(iso, n) { var p = iso.split('-').map(Number); return isoDe(new Date(p[0], p[1] - 1, p[2] + n)); }
function migrarAcabados(d) {
  if (d.acabV >= 1) return d;
  d.acabados = d.acabados || [];
  var fica = [];
  (d.inventario || []).forEach(function (x) {
    if (x.status === 'Finalizado') {
      var it = clone(x); it.status = it.statusAnterior || ''; delete it.statusAnterior; delete it.finalizadoEm;
      d.acabados.push({ id: uid(), invId: x.id, nome: x.nome, marca: x.marca || '', categoria: x.categoria, tipo: x.tipo || '', unidades: Math.max(1, +x.quantidade || 1), data: x.finalizadoEm || hoje(), item: it });
    } else fica.push(x);
  });
  d.inventario = fica; d.acabV = 1; return d;
}
// ---------- IA (Google Gemini) ----------
var IA_RESERVA = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.8-flash', 'gemini-3.6-flash'];
var iaModelosCache = null;
function iaVazio(modo, mes) { return { modo: modo || '', mes: mes || '', chave: '', trocar: false, texto: '', proc: false, procTxt: '', erro: '', itens: [], gravando: false }; }
function blobBase64(blob) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1] || ''); }; r.onerror = function () { rej(r.error); }; r.readAsDataURL(blob); }); }
function paraWav(blob) {
  return blob.arrayBuffer().then(function (buf) {
    var AC = window.AudioContext || window.webkitAudioContext; var ac = new AC();
    return new Promise(function (res, rej) { ac.decodeAudioData(buf, res, rej); }).then(function (ab) {
      try { ac.close(); } catch (e) {}
      var rate = 16000, src = ab.sampleRate, len = ab.length, ch = ab.numberOfChannels;
      var mono = new Float32Array(len);
      for (var c = 0; c < ch; c++) { var dd = ab.getChannelData(c); for (var i = 0; i < len; i++) mono[i] += dd[i] / ch; }
      var n = Math.floor(len * rate / src), out = new Int16Array(n);
      for (var j = 0; j < n; j++) { var t = j * src / rate, i0 = Math.floor(t), f = t - i0; var v = mono[i0] * (1 - f) + (mono[i0 + 1] || 0) * f; v = Math.max(-1, Math.min(1, v)); out[j] = v < 0 ? v * 0x8000 : v * 0x7FFF; }
      var hd = new DataView(new ArrayBuffer(44)), ws = function (o, s) { for (var k = 0; k < s.length; k++) hd.setUint8(o + k, s.charCodeAt(k)); };
      ws(0, 'RIFF'); hd.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); hd.setUint32(16, 16, true); hd.setUint16(20, 1, true); hd.setUint16(22, 1, true);
      hd.setUint32(24, rate, true); hd.setUint32(28, rate * 2, true); hd.setUint16(32, 2, true); hd.setUint16(34, 16, true); ws(36, 'data'); hd.setUint32(40, n * 2, true);
      return new Blob([hd.buffer, out.buffer], { type: 'audio/wav' });
    });
  });
}
// lista os modelos "flash" que a chave pode usar, do mais novo para o mais antigo (guarda por 1 dia)
function modelosGemini(chave) {
  if (iaModelosCache && iaModelosCache.chave === chave && Date.now() - iaModelosCache.em < 864e5) return Promise.resolve(iaModelosCache.lista);
  try { var c = JSON.parse(lerPref('fin-ia-modelos', 'null')); if (c && c.chave === String(chave).slice(-6) && Date.now() - c.em < 864e5 && c.lista.length) { iaModelosCache = { chave: chave, em: c.em, lista: c.lista }; return Promise.resolve(c.lista); } } catch (e) {}
  return fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': chave } })
    .then(function (r) { return r.ok ? r.json() : { models: [] }; })
    .then(function (j) {
      var ver = function (n) { var m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
      var lista = (j.models || []).filter(function (m) {
        var n = String(m.name || '').replace('models/', '');
        return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0 && /^gemini-.*flash/.test(n) && !/image|tts|live|audio|embed|thinking|robotics|computer|exp/.test(n);
      }).map(function (m) { return String(m.name).replace('models/', ''); });
      lista.sort(function (a, b) {
        return ((/lite/.test(a)) - (/lite/.test(b))) || ((/preview/.test(a)) - (/preview/.test(b))) || (ver(b) - ver(a)) || ((/latest/.test(a)) - (/latest/.test(b))) || a.length - b.length;
      });
      lista = lista.slice(0, 6);
      if (lista.length) { iaModelosCache = { chave: chave, em: Date.now(), lista: lista }; gravarPref('fin-ia-modelos', JSON.stringify({ chave: String(chave).slice(-6), em: Date.now(), lista: lista })); }
      return lista;
    }).catch(function () { return []; });
}
function chamarGemini(chave, parts, schema) {
  var corpo = JSON.stringify({ contents: [{ role: 'user', parts: parts }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.1 } });
  return modelosGemini(chave).then(function (lista) {
    var fila = lista.concat(IA_RESERVA.filter(function (m) { return lista.indexOf(m) < 0; })), tentados = {};
    var tentar = function (i, ultimoErro) {
      while (i < fila.length && tentados[fila[i]]) i++;
      if (i >= fila.length) { iaModelosCache = null; gravarPref('fin-ia-modelos', 'null'); return Promise.reject(ultimoErro || new Error('Nenhum modelo da IA respondeu. Tente de novo em alguns minutos.')); }
      var modelo = fila[i]; tentados[modelo] = true;
      return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave }, body: corpo })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { st: r.status, j: j }; }); })
        .then(function (x) {
          if (x.st === 200) {
            var c = x.j.candidates && x.j.candidates[0], t = c && c.content && (c.content.parts || []).map(function (pp) { return pp.text || ''; }).join('');
            if (!t) { var e0 = new Error('A IA não conseguiu ler esse conteúdo. Tente de novo com um áudio mais claro ou outro arquivo.'); e0.fim = true; throw e0; }
            try { return JSON.parse(t); } catch (e) { var e1 = new Error('A IA respondeu num formato inesperado. Tente de novo.'); e1.fim = true; throw e1; }
          }
          var msg = (x.j.error && x.j.error.message) || '';
          var e = new Error('A IA do Google não respondeu agora (erro ' + x.st + '). Tente de novo em alguns minutos.');
          var sugerido = (msg.match(/use (?:models\/)?(gemini-[\w.-]+)/i) || [])[1];
          if (sugerido && !tentados[sugerido]) fila.splice(i + 1, 0, sugerido.replace(/[.,]$/, ''));
          if (x.st === 401 || (x.st === 400 && /API key|API_KEY/i.test(msg)) || (x.st === 403 && /API key|API_KEY|key/i.test(msg) && !/model/i.test(msg))) { e.message = 'A chave da IA não é válida. Toque em “Trocar a chave da IA” e cole a chave de novo.'; e.fim = true; }
          else if (x.st === 413) { e.message = 'O arquivo é grande demais para a IA. Envie um PDF ou imagem menor.'; e.fim = true; }
          else if (x.st === 429) e.message = 'Limite gratuito da IA atingido por agora. Espere um minuto e tente de novo.';
          else if (x.st === 503 || x.st === 500) e.message = 'A IA do Google está sobrecarregada agora. Tente de novo em alguns minutos.';
          else if (x.st === 400 && !/model/i.test(msg)) { e.message = 'A IA não aceitou esse conteúdo. Tente outro arquivo ou um print mais nítido.'; e.fim = true; }
          throw e;
        })
        .catch(function (e) { if (e.fim) throw e; if (e instanceof TypeError) { var en = new Error('Sem conexão com a IA. Verifique a internet e tente de novo.'); return tentar(i + 1, en); } return tentar(i + 1, e); });
    };
    return tentar(0, null);
  });
}


function pad(n) { return String(n).padStart(2, '0'); }
function hoje() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function brl(v) { return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function num(v) {
  if (typeof v === 'number') return v;
  var s = String(v == null ? '' : v).replace(/R\$|\s/g, '');
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  var n = parseFloat(s); return isNaN(n) ? 0 : n;
}
function r2(v) { return Math.round(v * 100) / 100; }
function dataBR(s) { if (!s) return ''; var p = String(s).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s; }
function mesNome(k) { var p = k.split('-'); return MESES[+p[1] - 1] + ' ' + p[0]; }
function mesCurto(k) { var p = k.split('-'); return MES_C[+p[1] - 1] + '/' + p[0].slice(2); }
function addMes(k, n) { var p = k.split('-').map(Number); var y = p[0], m = p[1] + n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return y + '-' + pad(m); }
function addMesData(iso) { if (!iso) return ''; var p = iso.split('-').map(Number); var k = addMes(p[0] + '-' + pad(p[1]), 1); var q = k.split('-').map(Number); var max = new Date(q[0], q[1], 0).getDate(); return k + '-' + pad(Math.min(p[2], max)); }
function diasNoMes(k) { var p = k.split('-').map(Number); return new Date(p[0], p[1], 0).getDate(); }
function diasAte(iso) { if (!iso) return null; var a = new Date(hoje() + 'T00:00:00'), b = new Date(iso + 'T00:00:00'); return Math.round((b - a) / 864e5); }
function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function pct(a, b) { return b > 0 ? Math.max(0, Math.min(100, a / b * 100)) : 0; }
function pctTxt(p) { return (Math.round(p * 10) / 10).toLocaleString('pt-BR') + '%'; }
function colNome(id) { var c = COLS.find(function (x) { return x.id === id; }); return c ? c.nome : id; }
function quandoTxt(dd) { if (dd === null) return 'Sem prazo'; if (dd === 0) return 'Vence hoje'; if (dd > 0) return 'Faltam ' + dd + (dd === 1 ? ' dia' : ' dias'); return 'Venceu há ' + (-dd) + (dd === -1 ? ' dia' : ' dias'); }
var PRIO = { 'Alta': ['#F1D9D2', '#8C3B2E'], 'Média': ['#EFE6D6', '#6E5418'], 'Baixa': ['#EFE6D6', '#6B5432'] };
var STAT = { 'Concluída': ['#D3E4D8', '#24533F'], 'Em andamento': ['#EFE6D6', '#6B5432'], 'Atrasada': ['#F1D9D2', '#8C3B2E'], 'Não iniciada': ['#EFE6D6', '#3D4440'] };

var FATURAS = [{"mes":"2026-09","data":"2026-06-19","descricao":"AMAZON CPI *A","categoria":"Compras","valor":32.51,"coluna":"visa","forma":"Crédito","parcelas":3,"parcelaAtual":3,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f1"},{"mes":"2026-09","data":"2026-06-21","descricao":"AMAZON BR *A","categoria":"Compras","valor":30.11,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":3,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it1","id":"f2"},{"mes":"2026-09","data":"2026-06-27","descricao":"AMAZONMKTPLC*C","categoria":"Compras","valor":32.5,"coluna":"visa","forma":"Crédito","parcelas":4,"parcelaAtual":3,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it2","id":"f3"},{"mes":"2026-09","data":"2026-06-28","descricao":"AMAZONMKTPLC*C","categoria":"Compras","valor":37.71,"coluna":"visa","forma":"Crédito","parcelas":3,"parcelaAtual":3,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f4"},{"mes":"2026-09","data":"2025-12-01","descricao":"PG *SEEDYSOLUC","categoria":"Compras","valor":26.8,"coluna":"visa","forma":"Crédito","parcelas":12,"parcelaAtual":9,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it3","id":"f5"},{"mes":"2026-09","data":"2026-06-30","descricao":"AMAZONMKTPLC*A","categoria":"Compras","valor":50.95,"coluna":"visa","forma":"Crédito","parcelas":9,"parcelaAtual":3,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it4","id":"f6"},{"mes":"2026-09","data":"2026-02-23","descricao":"AMAZON BR","categoria":"Compras","valor":53.32,"coluna":"visa","forma":"Crédito","parcelas":8,"parcelaAtual":6,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it5","id":"f7"},{"mes":"2026-09","data":"2026-07-04","descricao":"AMAZON BR *A","categoria":"Compras","valor":37.43,"coluna":"visa","forma":"Crédito","parcelas":3,"parcelaAtual":3,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f8"},{"mes":"2026-09","data":"2026-04-07","descricao":"SHOPEE *BBBELE","categoria":"Compras","valor":53.38,"coluna":"visa","forma":"Crédito","parcelas":5,"parcelaAtual":5,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f9"},{"mes":"2026-09","data":"2026-07-06","descricao":"AMAZON CPI *A","categoria":"Compras","valor":30.72,"coluna":"visa","forma":"Crédito","parcelas":3,"parcelaAtual":3,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f10"},{"mes":"2026-09","data":"2026-04-07","descricao":"AMAZON BR","categoria":"Compras","valor":32.3,"coluna":"visa","forma":"Crédito","parcelas":5,"parcelaAtual":5,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f11"},{"mes":"2026-09","data":"2026-07-10","descricao":"AMAZONMKTCPI*C","categoria":"Compras","valor":37.49,"coluna":"visa","forma":"Crédito","parcelas":7,"parcelaAtual":2,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it6","id":"f12"},{"mes":"2026-09","data":"2026-04-17","descricao":"AMAZON BR","categoria":"Compras","valor":47.41,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":4,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it7","id":"f13"},{"mes":"2026-09","data":"2026-07-10","descricao":"AMAZON BR *A","categoria":"Compras","valor":31.68,"coluna":"visa","forma":"Crédito","parcelas":4,"parcelaAtual":2,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it8","id":"f14"},{"mes":"2026-09","data":"2026-04-22","descricao":"AMAZON MARKETP","categoria":"Compras","valor":32.69,"coluna":"visa","forma":"Crédito","parcelas":4,"parcelaAtual":4,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f15"},{"mes":"2026-09","data":"2026-07-10","descricao":"MERCADOLIVRE*M","categoria":"Compras","valor":28.3,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":2,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it9","id":"f16"},{"mes":"2026-09","data":"2026-04-22","descricao":"EBN*TIKTOK SH","categoria":"Compras","valor":41.99,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":4,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it10","id":"f17"},{"mes":"2026-09","data":"2026-07-11","descricao":"TikTok Shop *T","categoria":"Compras","valor":61.35,"coluna":"visa","forma":"Crédito","parcelas":3,"parcelaAtual":2,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it11","id":"f18"},{"mes":"2026-09","data":"2026-04-26","descricao":"AMAZON BR","categoria":"Compras","valor":34.38,"coluna":"visa","forma":"Crédito","parcelas":4,"parcelaAtual":4,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f19"},{"mes":"2026-09","data":"2026-07-11","descricao":"MERCADOLIVRE*D","categoria":"Compras","valor":48.16,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":2,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it12","id":"f20"},{"mes":"2026-09","data":"2026-04-26","descricao":"PG *EXI IMP EX","categoria":"Compras","valor":41.95,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":4,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it13","id":"f21"},{"mes":"2026-09","data":"2026-07-16","descricao":"AMAZON CPI *A","categoria":"Compras","valor":32.81,"coluna":"visa","forma":"Crédito","parcelas":3,"parcelaAtual":2,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it14","id":"f22"},{"mes":"2026-09","data":"2026-04-30","descricao":"AMAZON BR","categoria":"Compras","valor":35.39,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":4,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it15","id":"f23"},{"mes":"2026-09","data":"2026-07-19","descricao":"MERCADOLIVRE*M","categoria":"Compras","valor":16.8,"coluna":"visa","forma":"Crédito","parcelas":3,"parcelaAtual":2,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it16","id":"f24"},{"mes":"2026-09","data":"2026-05-23","descricao":"SHOPEE *OOKASL","categoria":"Compras","valor":60.66,"coluna":"visa","forma":"Crédito","parcelas":3,"parcelaAtual":3,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f25"},{"mes":"2026-09","data":"2026-07-20","descricao":"PICPAY*Layani","categoria":"Outros","valor":135.73,"coluna":"visa","forma":"Crédito","parcelas":2,"parcelaAtual":2,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f26"},{"mes":"2026-09","data":"2026-05-25","descricao":"PICPAY*CVC BRA","categoria":"Lazer","valor":180.85,"coluna":"visa","forma":"Crédito","parcelas":3,"parcelaAtual":3,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f27"},{"mes":"2026-09","data":"2026-07-26","descricao":"MERCADOLIVRE*R","categoria":"Compras","valor":35.1,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":2,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it17","id":"f28"},{"mes":"2026-09","data":"2026-05-29","descricao":"AMAZON BR","categoria":"Compras","valor":34.42,"coluna":"visa","forma":"Crédito","parcelas":4,"parcelaAtual":3,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it18","id":"f29"},{"mes":"2026-09","data":"2026-07-27","descricao":"SHOPEE *EICOPR","categoria":"Compras","valor":68.56,"coluna":"visa","forma":"Crédito","parcelas":2,"parcelaAtual":2,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f30"},{"mes":"2026-09","data":"2026-06-09","descricao":"AMAZON BR *A","categoria":"Compras","valor":34.11,"coluna":"visa","forma":"Crédito","parcelas":5,"parcelaAtual":3,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it19","id":"f31"},{"mes":"2026-09","data":"2026-07-29","descricao":"MERCADOLIVRE*E","categoria":"Compras","valor":21.74,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":2,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it20","id":"f32"},{"mes":"2026-09","data":"2026-06-19","descricao":"AMAZON BR *A","categoria":"Compras","valor":44.34,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":3,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it21","id":"f33"},{"mes":"2026-09","data":"2026-07-29","descricao":"MERCADOLIVRE*E","categoria":"Compras","valor":17.89,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":2,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it22","id":"f34"},{"mes":"2026-09","data":"2026-08-09","descricao":"IFD *ZAMP SASAO","categoria":"Alimentação","valor":25.88,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f35"},{"mes":"2026-09","data":"2026-09-02","descricao":"DL *UberRidesS","categoria":"Transporte","valor":12.96,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f36"},{"mes":"2026-09","data":"2026-08-12","descricao":"SHOPEE *MAXSOFTOFICIALP","categoria":"Compras","valor":38.73,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f37"},{"mes":"2026-09","data":"2026-09-02","descricao":"DL*UberRidesSao PauloBR","categoria":"Transporte","valor":15.95,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f38"},{"mes":"2026-09","data":"2026-08-12","descricao":"SHOPEE *BEAUTY","categoria":"Compras","valor":77.18,"coluna":"visa","forma":"Crédito","parcelas":3,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it23","id":"f39"},{"mes":"2026-09","data":"2026-09-03","descricao":"DL *UberRidesS","categoria":"Transporte","valor":12.95,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f40"},{"mes":"2026-09","data":"2026-08-12","descricao":"SHOPEE *BraslimpoGuarul","categoria":"Compras","valor":39.51,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f41"},{"mes":"2026-09","data":"2026-09-06","descricao":"IFD*ANDERSON NUNES FRAS","categoria":"Alimentação","valor":30.98,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f42"},{"mes":"2026-09","data":"2026-08-13","descricao":"DL *UberRidesS","categoria":"Transporte","valor":7.89,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f43"},{"mes":"2026-09","data":"2026-08-14","descricao":"DL *UberRidesS","categoria":"Transporte","valor":12.94,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f44"},{"mes":"2026-09","data":"2026-08-14","descricao":"DL*UberRidesSao PauloBR","categoria":"Transporte","valor":14.94,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f45"},{"mes":"2026-09","data":"2026-08-14","descricao":"IFD*ANDERSON NUNES FRAS","categoria":"Alimentação","valor":30.98,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f46"},{"mes":"2026-09","data":"2026-08-16","descricao":"IFD*ANDERSON NUNES FRAS","categoria":"Alimentação","valor":31.98,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f47"},{"mes":"2026-09","data":"2026-08-16","descricao":"DL *UberRidesS","categoria":"Transporte","valor":17.96,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f48"},{"mes":"2026-09","data":"2026-08-17","descricao":"SHOPEE *Boutiq","categoria":"Compras","valor":34.31,"coluna":"visa","forma":"Crédito","parcelas":7,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it24","id":"f49"},{"mes":"2026-09","data":"2026-08-17","descricao":"PG *EXI IMP EX","categoria":"Compras","valor":58.97,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it25","id":"f50"},{"mes":"2026-09","data":"2026-08-18","descricao":"DL *UberRidesS","categoria":"Transporte","valor":13.93,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f51"},{"mes":"2026-09","data":"2026-08-18","descricao":"DL*UberRidesSao PauloBR","categoria":"Transporte","valor":13.95,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f52"},{"mes":"2026-09","data":"2026-08-19","descricao":"SHOPEE *SHPSTE","categoria":"Compras","valor":79.59,"coluna":"visa","forma":"Crédito","parcelas":2,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it26","id":"f53"},{"mes":"2026-09","data":"2026-08-20","descricao":"DL*UberRidesSao PauloBR","categoria":"Transporte","valor":14.95,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f54"},{"mes":"2026-09","data":"2026-08-20","descricao":"IFD*ASSIM ASSADO RESTAS","categoria":"Alimentação","valor":36.89,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f55"},{"mes":"2026-09","data":"2026-08-20","descricao":"DL*UberRidesSao PauloBR","categoria":"Transporte","valor":13.93,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f56"},{"mes":"2026-09","data":"2026-08-21","descricao":"DL *UberRidesS","categoria":"Transporte","valor":18.94,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f57"},{"mes":"2026-09","data":"2026-08-23","descricao":"SHOPEE *SHPSTE","categoria":"Compras","valor":31.84,"coluna":"visa","forma":"Crédito","parcelas":7,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it27","id":"f58"},{"mes":"2026-09","data":"2026-08-23","descricao":"SHOPEE *SHPSTE","categoria":"Compras","valor":43.83,"coluna":"visa","forma":"Crédito","parcelas":7,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","grupo":"it28","id":"f59"},{"mes":"2026-09","data":"2026-08-23","descricao":"IFD*ZAMP S.A.SAO LUISBR","categoria":"Alimentação","valor":32.98,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f60"},{"mes":"2026-09","data":"2026-08-24","descricao":"DL *UberRidesS","categoria":"Transporte","valor":12.95,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f61"},{"mes":"2026-09","data":"2026-08-24","descricao":"IFD*LV ALIMENTOS E DOCS","categoria":"Alimentação","valor":31.98,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f62"},{"mes":"2026-09","data":"2026-08-24","descricao":"DL *UberRidesS","categoria":"Transporte","valor":14.96,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f63"},{"mes":"2026-09","data":"2026-08-25","descricao":"DL *UberRidesS","categoria":"Transporte","valor":13.95,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f64"},{"mes":"2026-09","data":"2026-08-25","descricao":"DL *UberRidesS","categoria":"Transporte","valor":14.95,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f65"},{"mes":"2026-09","data":"2026-08-26","descricao":"Shopee*SHOPEE*CelinaCos","categoria":"Compras","valor":34.99,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f66"},{"mes":"2026-09","data":"2026-08-26","descricao":"IFD*M L SOARES PEREIRAS","categoria":"Alimentação","valor":19.99,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f67"},{"mes":"2026-09","data":"2026-08-27","descricao":"DL *UberRidesS","categoria":"Transporte","valor":12.93,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f68"},{"mes":"2026-09","data":"2026-08-27","descricao":"DL*UberRidesSao PauloBR","categoria":"Transporte","valor":13.93,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f69"},{"mes":"2026-09","data":"2026-08-28","descricao":"CANCELAMENTO PARCIAL DE","categoria":"Outros","valor":-21.79,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f70"},{"mes":"2026-09","data":"2026-08-28","descricao":"CANCELAMENTO PARCIAL DE","categoria":"Outros","valor":-109.6,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f71"},{"mes":"2026-09","data":"2026-08-28","descricao":"IFD*HIGO LEONARDO MARTS","categoria":"Alimentação","valor":25.98,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f72"},{"mes":"2026-09","data":"2026-08-30","descricao":"IFD*65983214 SILEIA DAS","categoria":"Alimentação","valor":19.89,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f73"},{"mes":"2026-09","data":"2026-09-01","descricao":"SHOPEE *PapelfotografiC","categoria":"Compras","valor":55.65,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f74"},{"mes":"2026-09","data":"2026-08-09","descricao":"ANTHROPIC* CLAUDE (US$ 21,69)","categoria":"Assinaturas","valor":116.91,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"Lançamento internacional","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f75"},{"mes":"2026-09","data":"","descricao":"Repasse de IOF internacional","categoria":"Assinaturas","valor":4.09,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f76"},{"mes":"2026-09","data":"2026-08-08","descricao":"Magalu Avisa","categoria":"Assinaturas","valor":7.99,"coluna":"visa","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"Produtos e serviços","cartao":"Itaú Visa (Luiza)","vencimento":"2026-09-15","id":"f77"},{"mes":"2026-10","data":"2025-12-01","descricao":"PG *SEEDYSOLUC","categoria":"Compras","valor":26.8,"coluna":"visa","forma":"Crédito","parcelas":12,"parcelaAtual":10,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it3","id":"f78"},{"mes":"2026-10","data":"2026-02-23","descricao":"AMAZON BR","categoria":"Compras","valor":53.32,"coluna":"visa","forma":"Crédito","parcelas":8,"parcelaAtual":7,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it5","id":"f79"},{"mes":"2026-10","data":"2026-04-17","descricao":"AMAZON BR","categoria":"Compras","valor":47.41,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":5,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it7","id":"f80"},{"mes":"2026-10","data":"2026-04-22","descricao":"EBN*TIKTOK SH","categoria":"Compras","valor":41.99,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":5,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it10","id":"f81"},{"mes":"2026-10","data":"2026-04-26","descricao":"PG *EXI IMP EX","categoria":"Compras","valor":41.95,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":5,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it13","id":"f82"},{"mes":"2026-10","data":"2026-04-30","descricao":"AMAZON BR","categoria":"Compras","valor":35.39,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":5,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it15","id":"f83"},{"mes":"2026-10","data":"2026-05-29","descricao":"AMAZON BR","categoria":"Compras","valor":34.42,"coluna":"visa","forma":"Crédito","parcelas":4,"parcelaAtual":4,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it18","id":"f84"},{"mes":"2026-10","data":"2026-06-09","descricao":"AMAZON BR *A","categoria":"Compras","valor":34.11,"coluna":"visa","forma":"Crédito","parcelas":5,"parcelaAtual":4,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it19","id":"f85"},{"mes":"2026-10","data":"2026-06-19","descricao":"AMAZON BR *A","categoria":"Compras","valor":44.34,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":4,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it21","id":"f86"},{"mes":"2026-10","data":"2026-06-21","descricao":"AMAZON BR *A","categoria":"Compras","valor":30.11,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":4,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it1","id":"f87"},{"mes":"2026-10","data":"2026-06-27","descricao":"AMAZONMKTPLC*C","categoria":"Compras","valor":32.5,"coluna":"visa","forma":"Crédito","parcelas":4,"parcelaAtual":4,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it2","id":"f88"},{"mes":"2026-10","data":"2026-06-30","descricao":"AMAZONMKTPLC*A","categoria":"Compras","valor":50.95,"coluna":"visa","forma":"Crédito","parcelas":9,"parcelaAtual":4,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it4","id":"f89"},{"mes":"2026-10","data":"2026-07-10","descricao":"AMAZONMKTCPI*C","categoria":"Compras","valor":37.49,"coluna":"visa","forma":"Crédito","parcelas":7,"parcelaAtual":3,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it6","id":"f90"},{"mes":"2026-10","data":"2026-07-10","descricao":"AMAZON BR *A","categoria":"Compras","valor":31.68,"coluna":"visa","forma":"Crédito","parcelas":4,"parcelaAtual":3,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it8","id":"f91"},{"mes":"2026-10","data":"2026-07-10","descricao":"MERCADOLIVRE*M","categoria":"Compras","valor":28.3,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":3,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it9","id":"f92"},{"mes":"2026-10","data":"2026-07-11","descricao":"TikTok Shop *T","categoria":"Compras","valor":61.35,"coluna":"visa","forma":"Crédito","parcelas":3,"parcelaAtual":3,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it11","id":"f93"},{"mes":"2026-10","data":"2026-07-11","descricao":"MERCADOLIVRE*D","categoria":"Compras","valor":48.16,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":3,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it12","id":"f94"},{"mes":"2026-10","data":"2026-07-16","descricao":"AMAZON CPI *A","categoria":"Compras","valor":32.81,"coluna":"visa","forma":"Crédito","parcelas":3,"parcelaAtual":3,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it14","id":"f95"},{"mes":"2026-10","data":"2026-07-19","descricao":"MERCADOLIVRE*M","categoria":"Compras","valor":16.8,"coluna":"visa","forma":"Crédito","parcelas":3,"parcelaAtual":3,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it16","id":"f96"},{"mes":"2026-10","data":"2026-07-26","descricao":"MERCADOLIVRE*R","categoria":"Compras","valor":35.1,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":3,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it17","id":"f97"},{"mes":"2026-10","data":"2026-07-29","descricao":"MERCADOLIVRE*E","categoria":"Compras","valor":21.74,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":3,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it20","id":"f98"},{"mes":"2026-10","data":"2026-07-29","descricao":"MERCADOLIVRE*E","categoria":"Compras","valor":17.89,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":3,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it22","id":"f99"},{"mes":"2026-10","data":"2026-08-12","descricao":"SHOPEE *BEAUTY","categoria":"Compras","valor":77.16,"coluna":"visa","forma":"Crédito","parcelas":3,"parcelaAtual":2,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it23","id":"f100"},{"mes":"2026-10","data":"2026-08-17","descricao":"SHOPEE *Boutiq","categoria":"Compras","valor":34.25,"coluna":"visa","forma":"Crédito","parcelas":7,"parcelaAtual":2,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it24","id":"f101"},{"mes":"2026-10","data":"2026-08-17","descricao":"PG *EXI IMP EX","categoria":"Compras","valor":58.96,"coluna":"visa","forma":"Crédito","parcelas":6,"parcelaAtual":2,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it25","id":"f102"},{"mes":"2026-10","data":"2026-08-19","descricao":"SHOPEE *SHPSTE","categoria":"Compras","valor":79.58,"coluna":"visa","forma":"Crédito","parcelas":2,"parcelaAtual":2,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it26","id":"f103"},{"mes":"2026-10","data":"2026-08-23","descricao":"SHOPEE *SHPSTE","categoria":"Compras","valor":31.78,"coluna":"visa","forma":"Crédito","parcelas":7,"parcelaAtual":2,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it27","id":"f104"},{"mes":"2026-10","data":"2026-08-23","descricao":"SHOPEE *SHPSTE","categoria":"Compras","valor":43.81,"coluna":"visa","forma":"Crédito","parcelas":7,"parcelaAtual":2,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Itaú Visa (Luiza)","previsto":true,"grupo":"it28","id":"f105"},{"mes":"2026-09","data":"2026-08-15","descricao":"EBN *TikTok Shop","categoria":"Compras","valor":66.87,"coluna":"master","forma":"Crédito","parcelas":4,"parcelaAtual":1,"obs":"","cartao":"Inter Mastercard","vencimento":"2026-09-20","grupo":"in29","id":"f106"},{"mes":"2026-09","data":"2026-08-15","descricao":"EBN*TIKTOK SH","categoria":"Compras","valor":62.78,"coluna":"master","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"Parcela 01 de 04 — antecipada","cartao":"Inter Mastercard","vencimento":"2026-09-20","id":"f107"},{"mes":"2026-09","data":"2026-08-15","descricao":"EBN*TIKTOK SH","categoria":"Compras","valor":62.75,"coluna":"master","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"Parcela 02 de 04 — antecipada","cartao":"Inter Mastercard","vencimento":"2026-09-20","id":"f108"},{"mes":"2026-09","data":"2026-08-15","descricao":"EBN*TIKTOK SH","categoria":"Compras","valor":62.75,"coluna":"master","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"Parcela 03 de 04 — antecipada","cartao":"Inter Mastercard","vencimento":"2026-09-20","id":"f109"},{"mes":"2026-09","data":"2026-08-15","descricao":"EBN*TIKTOK SH","categoria":"Compras","valor":62.75,"coluna":"master","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"Parcela 04 de 04 — antecipada","cartao":"Inter Mastercard","vencimento":"2026-09-20","id":"f110"},{"mes":"2026-09","data":"2026-08-19","descricao":"EBN *TikTok Shop","categoria":"Compras","valor":24.27,"coluna":"master","forma":"Crédito","parcelas":3,"parcelaAtual":1,"obs":"","cartao":"Inter Mastercard","vencimento":"2026-09-20","grupo":"in30","id":"f111"},{"mes":"2026-09","data":"2026-08-20","descricao":"EBN *TikTok Shop","categoria":"Compras","valor":25.11,"coluna":"master","forma":"Crédito","parcelas":7,"parcelaAtual":1,"obs":"","cartao":"Inter Mastercard","vencimento":"2026-09-20","grupo":"in31","id":"f112"},{"mes":"2026-09","data":"2026-06-14","descricao":"AMAZON BR","categoria":"Compras","valor":35.06,"coluna":"master","forma":"Crédito","parcelas":4,"parcelaAtual":3,"obs":"","cartao":"Inter Mastercard","vencimento":"2026-09-20","grupo":"in32","id":"f113"},{"mes":"2026-09","data":"2026-06-22","descricao":"PAGUEMENOS01188","categoria":"Compras","valor":43.15,"coluna":"master","forma":"Crédito","parcelas":3,"parcelaAtual":3,"obs":"","cartao":"Inter Mastercard","vencimento":"2026-09-20","id":"f114"},{"mes":"2026-09","data":"2026-06-30","descricao":"AFR1 ACESSORIOS LTDA","categoria":"Compras","valor":37.68,"coluna":"master","forma":"Crédito","parcelas":3,"parcelaAtual":3,"obs":"","cartao":"Inter Mastercard","vencimento":"2026-09-20","id":"f115"},{"mes":"2026-09","data":"2026-08-14","descricao":"PAGUEMENOS07073","categoria":"Compras","valor":45.19,"coluna":"master","forma":"Crédito","parcelas":3,"parcelaAtual":1,"obs":"","cartao":"Inter Mastercard","vencimento":"2026-09-20","grupo":"in33","id":"f116"},{"mes":"2026-09","data":"2026-08-16","descricao":"GIULIANO DE OLIVEIRA M","categoria":"Compras","valor":39.0,"coluna":"master","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Inter Mastercard","vencimento":"2026-09-20","id":"f117"},{"mes":"2026-09","data":"2026-08-21","descricao":"CAPPTA *COZINHA FAROFA","categoria":"Compras","valor":52.0,"coluna":"master","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"","cartao":"Inter Mastercard","vencimento":"2026-09-20","id":"f118"},{"mes":"2026-09","data":"","descricao":"Valor antecipado (fatura anterior)","categoria":"Compras","valor":-251.03,"coluna":"master","forma":"Crédito","parcelas":1,"parcelaAtual":1,"obs":"Crédito: parcelas do TikTok Shop antecipadas no mês passado","cartao":"Inter Mastercard","vencimento":"2026-09-20","id":"f119"},{"mes":"2026-10","data":"","descricao":"AMAZON BR","categoria":"Compras","valor":35.06,"coluna":"master","forma":"Crédito","parcelas":4,"parcelaAtual":4,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Inter Mastercard","previsto":true,"grupo":"in32","id":"f120"},{"mes":"2026-10","data":"","descricao":"PAGUEMENOS07073","categoria":"Compras","valor":45.17,"coluna":"master","forma":"Crédito","parcelas":3,"parcelaAtual":2,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Inter Mastercard","previsto":true,"grupo":"in33","id":"f121"},{"mes":"2026-10","data":"","descricao":"EBN *TikTok Shop","categoria":"Compras","valor":66.84,"coluna":"master","forma":"Crédito","parcelas":4,"parcelaAtual":2,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Inter Mastercard","previsto":true,"grupo":"in29","id":"f122"},{"mes":"2026-10","data":"","descricao":"EBN *TikTok Shop","categoria":"Compras","valor":24.25,"coluna":"master","forma":"Crédito","parcelas":3,"parcelaAtual":2,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Inter Mastercard","previsto":true,"grupo":"in30","id":"f123"},{"mes":"2026-10","data":"","descricao":"EBN *TikTok Shop","categoria":"Compras","valor":25.06,"coluna":"master","forma":"Crédito","parcelas":7,"parcelaAtual":2,"obs":"Informado na fatura de setembro (próxima fatura)","cartao":"Inter Mastercard","previsto":true,"grupo":"in31","id":"f124"}];
var INV_LISTAS = [{"nome":"OM Ouro","marca":"Yenzah","categoria":"Cabelos","tipo":"Pré-shampoo/tratamento pré lavagem","validade":"2023-01-31","validadeTxt":"01/2023","quantidade":1,"obs":"","id":"inv1"},{"nome":"Peptide Repair Rescue","marca":"Schwarzkopf","categoria":"Cabelos","tipo":"Pré-shampoo/tratamento pré lavagem","validade":"2023-08-31","validadeTxt":"08/2023","quantidade":1,"obs":"","id":"inv2"},{"nome":"Fluído Reconstrutor B Refibre","marca":"Medavita","categoria":"Cabelos","tipo":"Pré-shampoo/tratamento pré lavagem","validade":"2023-10-31","validadeTxt":"10/2023","quantidade":1,"obs":"","id":"inv3"},{"nome":"Máscara Multifuncional Restauração Nutritiva","marca":"Beto Bita","categoria":"Cabelos","tipo":"Pré-shampoo/tratamento pré lavagem","validade":"2024-12-31","validadeTxt":"2024","quantidade":1,"obs":"","id":"inv4"},{"nome":"Keratin Smooth Perfect","marca":"Schwarzkopf","categoria":"Cabelos","tipo":"Pré-shampoo/tratamento pré lavagem","validade":"2024-01-31","validadeTxt":"01/2024","quantidade":1,"obs":"","id":"inv5"},{"nome":"Cera Vegana","marca":"Truss","categoria":"Cabelos","tipo":"Pré-shampoo/tratamento pré lavagem","validade":"2025-06-30","validadeTxt":"06/2025","quantidade":1,"obs":"","id":"inv6"},{"nome":"Proteína Lola Vai à Praia","marca":"Lola Cosmetics","categoria":"Cabelos","tipo":"Pré-shampoo/tratamento pré lavagem","validade":"2025-10-31","validadeTxt":"10/2025","quantidade":1,"obs":"","id":"inv7"},{"nome":"Intensive treatment Acidic Bonding Concentrate","marca":"Redken","categoria":"Cabelos","tipo":"Pré-shampoo/tratamento pré lavagem","validade":"2025-11-30","validadeTxt":"11/2025","quantidade":1,"obs":"","id":"inv8"},{"nome":"Pre Shampooing Professionnel Metal Detox","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Pré-shampoo/tratamento pré lavagem","validade":"2026-10-31","validadeTxt":"10/2026","quantidade":1,"obs":"","id":"inv9"},{"nome":"Tratamento Pré Shampoo Bond Repair","marca":"Elseve","categoria":"Cabelos","tipo":"Pré-shampoo/tratamento pré lavagem","validade":"2028-12-31","validadeTxt":"2028","quantidade":3,"obs":"","id":"inv10"},{"nome":"Sense Verbena Essencial Shampoo","marca":"Chintsai","categoria":"Cabelos","tipo":"Shampoo","validade":"2023-06-30","validadeTxt":"06/2023","quantidade":1,"obs":"","id":"inv11"},{"nome":"Volume Shampoo","marca":"Senscience","categoria":"Cabelos","tipo":"Shampoo","validade":"2023-10-31","validadeTxt":"10/2023","quantidade":1,"obs":"","id":"inv12"},{"nome":"Bain Force Architecte Resistance","marca":"Kérastase","categoria":"Cabelos","tipo":"Shampoo","validade":"2024-01-31","validadeTxt":"01/2024","quantidade":1,"obs":"","id":"inv13"},{"nome":"Revitalizing Shampoo","marca":"Kerasys","categoria":"Cabelos","tipo":"Shampoo","validade":"2024-02-29","validadeTxt":"02/2024","quantidade":1,"obs":"","id":"inv14"},{"nome":"Bain Nutri Fortifiant Genesis","marca":"Kérastase","categoria":"Cabelos","tipo":"Shampoo","validade":"2024-02-29","validadeTxt":"02/2024","quantidade":1,"obs":"","id":"inv15"},{"nome":"Pro Longer","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Shampoo","validade":"2024-03-31","validadeTxt":"03/2024","quantidade":1,"obs":"","id":"inv16"},{"nome":"Ginger Red Ginseng","marca":"Dong UI","categoria":"Cabelos","tipo":"Shampoo","validade":"2024-03-31","validadeTxt":"03/2024","quantidade":1,"obs":"","id":"inv17"},{"nome":"Satin Oil","marca":"Keune","categoria":"Cabelos","tipo":"Shampoo","validade":"2024-05-31","validadeTxt":"05/2024","quantidade":1,"obs":"","id":"inv18"},{"nome":"Red Ginseng Flower Extract","marca":"Dong UI","categoria":"Cabelos","tipo":"Shampoo","validade":"2024-05-31","validadeTxt":"05/2024","quantidade":1,"obs":"","id":"inv19"},{"nome":"Acidic Bonding Concentrate","marca":"Redken","categoria":"Cabelos","tipo":"Shampoo","validade":"2024-06-30","validadeTxt":"06/2024","quantidade":1,"obs":"","id":"inv20"},{"nome":"Rich and Repair","marca":"We Do","categoria":"Cabelos","tipo":"Shampoo","validade":"2024-07-31","validadeTxt":"07/2024","quantidade":1,"obs":"","id":"inv21"},{"nome":"Bain Magistral Nutritive","marca":"Kérastase","categoria":"Cabelos","tipo":"Shampoo","validade":"2024-07-31","validadeTxt":"07/2024","quantidade":1,"obs":"","id":"inv22"},{"nome":"Balance Shampoo","marca":"Senscience","categoria":"Cabelos","tipo":"Shampoo","validade":"2024-09-30","validadeTxt":"09/2024","quantidade":1,"obs":"","id":"inv23"},{"nome":"Densiage","marca":"Ducray","categoria":"Cabelos","tipo":"Shampoo","validade":"2024-10-31","validadeTxt":"10/2024","quantidade":1,"obs":"","id":"inv24"},{"nome":"Argile Equilibrante Specifique","marca":"Kérastase","categoria":"Cabelos","tipo":"Shampoo","validade":"2024-10-31","validadeTxt":"10/2024","quantidade":1,"obs":"","id":"inv25"},{"nome":"Volumetry","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Shampoo","validade":"2024-12-31","validadeTxt":"2024","quantidade":1,"obs":"","id":"inv26"},{"nome":"Bain Vital Dermo Calma Specifique","marca":"Kérastase","categoria":"Cabelos","tipo":"Shampoo","validade":"2024-12-31","validadeTxt":"2024","quantidade":1,"obs":"","id":"inv27"},{"nome":"Curl Expression","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Shampoo","validade":"2025-01-31","validadeTxt":"01/2025","quantidade":1,"obs":"","id":"inv28"},{"nome":"Anti Hair Loss Scalp Nutrient","marca":"Steam Kerasys","categoria":"Cabelos","tipo":"Shampoo","validade":"2025-01-31","validadeTxt":"01/2025","quantidade":1,"obs":"","id":"inv29"},{"nome":"Cica","marca":"Derma & More","categoria":"Cabelos","tipo":"Shampoo","validade":"2025-02-28","validadeTxt":"02/2025","quantidade":1,"obs":"","id":"inv30"},{"nome":"Extreme Length","marca":"Redken","categoria":"Cabelos","tipo":"Shampoo","validade":"2025-04-30","validadeTxt":"04/2025","quantidade":1,"obs":"","id":"inv31"},{"nome":"Blondage High Bright","marca":"Redken","categoria":"Cabelos","tipo":"Shampoo","validade":"2025-05-31","validadeTxt":"05/2025","quantidade":1,"obs":"","id":"inv32"},{"nome":"Black Bean Oil Shampoo","marca":"Kerasys","categoria":"Cabelos","tipo":"Shampoo","validade":"2025-05-31","validadeTxt":"05/2025","quantidade":1,"obs":"","id":"inv33"},{"nome":"Bain Hydratation Douceur Curl Manifesto","marca":"Kérastase","categoria":"Cabelos","tipo":"Shampoo","validade":"2025-06-30","validadeTxt":"06/2025","quantidade":1,"obs":"","id":"inv34"},{"nome":"Sensi Balance","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Shampoo","validade":"2025-07-31","validadeTxt":"07/2025","quantidade":1,"obs":"","id":"inv35"},{"nome":"Oil Correction","marca":"Vichy","categoria":"Cabelos","tipo":"Shampoo","validade":"2025-07-31","validadeTxt":"07/2025","quantidade":1,"obs":"","id":"inv36"},{"nome":"Cera","marca":"Derma & More","categoria":"Cabelos","tipo":"Shampoo","validade":"2025-08-31","validadeTxt":"08/2025","quantidade":1,"obs":"","id":"inv37"},{"nome":"Salon de Magie","marca":"Kerasys","categoria":"Cabelos","tipo":"Shampoo","validade":"2025-08-31","validadeTxt":"08/2025","quantidade":1,"obs":"","id":"inv38"},{"nome":"Surf","marca":"Bumble and bumble","categoria":"Cabelos","tipo":"Shampoo","validade":"2025-08-31","validadeTxt":"08/2025","quantidade":1,"obs":"","id":"inv39"},{"nome":"Panthenol","marca":"Derma & More","categoria":"Cabelos","tipo":"Shampoo","validade":"2025-09-30","validadeTxt":"09/2025","quantidade":1,"obs":"","id":"inv40"},{"nome":"Kera Solutions","marca":"Vichy","categoria":"Cabelos","tipo":"Shampoo","validade":"2025-09-30","validadeTxt":"09/2025","quantidade":1,"obs":"","id":"inv41"},{"nome":"Bain Renegerant Chronologiste","marca":"Kérastase","categoria":"Cabelos","tipo":"Shampoo","validade":"2025-09-30","validadeTxt":"09/2025","quantidade":1,"obs":"","id":"inv42"},{"nome":"B7 Biotin","marca":"Derma & More","categoria":"Cabelos","tipo":"Shampoo","validade":"2025-11-30","validadeTxt":"11/2025","quantidade":1,"obs":"","id":"inv43"},{"nome":"Salon 10 Clinic Care","marca":"Mise en Scene","categoria":"Cabelos","tipo":"Shampoo","validade":"2026-06-30","validadeTxt":"06/2026","quantidade":1,"obs":"","id":"inv44"},{"nome":"Tropical Citrus","marca":"Clabo","categoria":"Cabelos","tipo":"Shampoo","validade":"2026-06-30","validadeTxt":"06/2026","quantidade":1,"obs":"","id":"inv45"},{"nome":"Papo Reto","marca":"Lola Cosmetics","categoria":"Cabelos","tipo":"Shampoo","validade":"2026-11-30","validadeTxt":"11/2026","quantidade":1,"obs":"","id":"inv46"},{"nome":"Damage Care","marca":"Mise en Scene","categoria":"Cabelos","tipo":"Shampoo","validade":"2026-12-31","validadeTxt":"12/2026","quantidade":1,"obs":"","id":"inv47"},{"nome":"Keratin Bond Puryfing","marca":"Kerasys","categoria":"Cabelos","tipo":"Shampoo","validade":"2027-01-31","validadeTxt":"01/2027","quantidade":1,"obs":"","id":"inv48"},{"nome":"Anticaspa DS","marca":"Vichy","categoria":"Cabelos","tipo":"Shampoo","validade":"2027-04-30","validadeTxt":"04/2027","quantidade":1,"obs":"","id":"inv49"},{"nome":"Hair Loss Expert Care","marca":"Ryo","categoria":"Cabelos","tipo":"Shampoo","validade":"2027-06-30","validadeTxt":"06/2027","quantidade":1,"obs":"","id":"inv50"},{"nome":"Antiqueda","marca":"Principia","categoria":"Cabelos","tipo":"Shampoo","validade":"2027-06-30","validadeTxt":"06/2027","quantidade":1,"obs":"","id":"inv51"},{"nome":"Root Gen: For Woman","marca":"Ryo","categoria":"Cabelos","tipo":"Shampoo","validade":"2027-08-31","validadeTxt":"08/2027","quantidade":1,"obs":"","id":"inv52"},{"nome":"Premium Volume and Repair","marca":"Tsubaki","categoria":"Cabelos","tipo":"Shampoo","validade":"2027-10-31","validadeTxt":"10/2027","quantidade":1,"obs":"","id":"inv53"},{"nome":"Bain Densité Densifique","marca":"Kérastase","categoria":"Cabelos","tipo":"Shampoo","validade":"2028-01-31","validadeTxt":"01/2028","quantidade":1,"obs":"","id":"inv54"},{"nome":"Propolis Hair Bonding","marca":"Kerasys","categoria":"Cabelos","tipo":"Shampoo","validade":"2028-04-30","validadeTxt":"04/2028","quantidade":1,"obs":"","id":"inv55"},{"nome":"Metal Detox","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Shampoo","validade":"2028-05-31","validadeTxt":"05/2028","quantidade":1,"obs":"","id":"inv56"},{"nome":"Energizante","marca":"Vichy","categoria":"Cabelos","tipo":"Shampoo","validade":"2028-06-30","validadeTxt":"06/2028","quantidade":1,"obs":"","id":"inv57"},{"nome":"Doctor Force Antiqueda","marca":"Darrow","categoria":"Cabelos","tipo":"Shampoo","validade":"2028-06-30","validadeTxt":"06/2028","quantidade":1,"obs":"","id":"inv58"},{"nome":"Nutrition and Moisture","marca":"Ryo","categoria":"Cabelos","tipo":"Shampoo","validade":"2028-07-31","validadeTxt":"07/2028","quantidade":1,"obs":"","id":"inv59"},{"nome":"Bond Repair","marca":"Pantene","categoria":"Cabelos","tipo":"Shampoo","validade":"2028-08-31","validadeTxt":"08/2028","quantidade":1,"obs":"","id":"inv60"},{"nome":"Reconstrução + Aminoácidos","marca":"Dove","categoria":"Cabelos","tipo":"Shampoo","validade":"2028-08-31","validadeTxt":"08/2028","quantidade":1,"obs":"","id":"inv61"},{"nome":"Detox Esfoliante","marca":"Carol Kyoko","categoria":"Cabelos","tipo":"Shampoo","validade":"2028-11-30","validadeTxt":"11/2028","quantidade":1,"obs":"","id":"inv62"},{"nome":"Revitalizing Conditioner","marca":"Kerasys","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv63"},{"nome":"Cica","marca":"Derma & More","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv64"},{"nome":"Tropical Citrus","marca":"Clabo","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv65"},{"nome":"Surf","marca":"Bumble and bumble","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv66"},{"nome":"Damage Care","marca":"Mise en Scene","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv67"},{"nome":"Densiage","marca":"Ducray","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv68"},{"nome":"Nutra-Therapy Conditioner","marca":"SH-RD","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv69"},{"nome":"Repairing","marca":"Kerasys","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv70"},{"nome":"Hairdresser's Invisible Oil","marca":"Bumble and bumble","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv71"},{"nome":"Silk Moisture","marca":"Senscience","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv72"},{"nome":"Pro Longer","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv73"},{"nome":"All Soft","marca":"Redken","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv74"},{"nome":"Acidic Bonding Concentrate","marca":"Redken","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv75"},{"nome":"Joifull Volumizing","marca":"Joico","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv76"},{"nome":"Blondage High Bright","marca":"Redken","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv77"},{"nome":"Rich and Repair","marca":"We Do","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv78"},{"nome":"Booster Danos Vorazes","marca":"Lola Cosmetics","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv79"},{"nome":"Scalp Spa","marca":"Kerasys","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv80"},{"nome":"Foundant Renforçateur Genesis","marca":"Kérastase","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv81"},{"nome":"Ciment Anti-Usure Resistance","marca":"Kérastase","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv82"},{"nome":"Foundant Hydratation Essentielle","marca":"Kérastase","categoria":"Cabelos","tipo":"Condicionadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv83"},{"nome":"Pérolas de Caviar","marca":"Widi Care","categoria":"Cabelos","tipo":"Máscaras","validade":"2022-08-31","validadeTxt":"08/2022","quantidade":1,"obs":"","id":"inv84"},{"nome":"Bond Building Repair Treatment","marca":"Bumble and bumble","categoria":"Cabelos","tipo":"Máscaras","validade":"2023-02-28","validadeTxt":"02/2023","quantidade":1,"obs":"","id":"inv85"},{"nome":"Huile d'Etole","marca":"Medavita","categoria":"Cabelos","tipo":"Máscaras","validade":"2023-06-30","validadeTxt":"06/2023","quantidade":1,"obs":"","id":"inv86"},{"nome":"Tec Oil","marca":"Arvensis","categoria":"Cabelos","tipo":"Máscaras","validade":"2023-10-31","validadeTxt":"10/2023","quantidade":1,"obs":"","id":"inv87"},{"nome":"Absolut Repair","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Máscaras","validade":"2023-10-31","validadeTxt":"10/2023","quantidade":1,"obs":"","id":"inv88"},{"nome":"Hyaluronic Moisture Kick","marca":"Schwarzkopf","categoria":"Cabelos","tipo":"Máscaras","validade":"2023-11-30","validadeTxt":"11/2023","quantidade":1,"obs":"","id":"inv89"},{"nome":"Redensifica e Encorpa","marca":"Amend","categoria":"Cabelos","tipo":"Máscaras","validade":"2023-11-30","validadeTxt":"11/2023","quantidade":1,"obs":"","id":"inv90"},{"nome":"Volume Boost","marca":"Wella","categoria":"Cabelos","tipo":"Máscaras","validade":"2023-11-30","validadeTxt":"11/2023","quantidade":1,"obs":"","id":"inv91"},{"nome":"B-Refibre","marca":"Medavita","categoria":"Cabelos","tipo":"Máscaras","validade":"2023-12-31","validadeTxt":"12/2023","quantidade":1,"obs":"","id":"inv92"},{"nome":"Nutrisubstance","marca":"Medavita","categoria":"Cabelos","tipo":"Máscaras","validade":"2023-12-31","validadeTxt":"12/2023","quantidade":1,"obs":"","id":"inv93"},{"nome":"Extreme","marca":"Redken","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-01-31","validadeTxt":"01/2024","quantidade":1,"obs":"","id":"inv94"},{"nome":"Nutritive Mask","marca":"Alfaparf","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-01-31","validadeTxt":"01/2024","quantidade":1,"obs":"","id":"inv95"},{"nome":"Deep Protect Density Mask","marca":"Nioxin","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-01-31","validadeTxt":"01/2024","quantidade":1,"obs":"","id":"inv96"},{"nome":"Óleos Marroquinos","marca":"Amend","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-01-31","validadeTxt":"01/2024","quantidade":1,"obs":"","id":"inv97"},{"nome":"Fusion","marca":"Wella","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-02-29","validadeTxt":"02/2024","quantidade":1,"obs":"","id":"inv98"},{"nome":"Pro Longer","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-02-29","validadeTxt":"02/2024","quantidade":1,"obs":"","id":"inv99"},{"nome":"Mythic Oil","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-02-29","validadeTxt":"02/2024","quantidade":1,"obs":"","id":"inv100"},{"nome":"Force Relax","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-02-29","validadeTxt":"02/2024","quantidade":1,"obs":"","id":"inv101"},{"nome":"Masquintense Nutritive","marca":"Kérastase","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-02-29","validadeTxt":"02/2024","quantidade":1,"obs":"","id":"inv102"},{"nome":"Hyaluronic Moisture Kick","marca":"Schwarzkopf","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-03-31","validadeTxt":"03/2024","quantidade":1,"obs":"","id":"inv103"},{"nome":"Masque Force Architecte Resistance","marca":"Kérastase","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-04-30","validadeTxt":"04/2024","quantidade":1,"obs":"","id":"inv104"},{"nome":"All Soft","marca":"Redken","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-05-31","validadeTxt":"05/2024","quantidade":1,"obs":"","id":"inv105"},{"nome":"Inforcer","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-06-30","validadeTxt":"06/2024","quantidade":1,"obs":"","id":"inv106"},{"nome":"Color Motion","marca":"Wella","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-07-31","validadeTxt":"07/2024","quantidade":1,"obs":"","id":"inv107"},{"nome":"Inner Restore Intensif","marca":"Senscience","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-07-31","validadeTxt":"07/2024","quantidade":1,"obs":"","id":"inv108"},{"nome":"Masque Magistral Nutritive","marca":"Kérastase","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-08-31","validadeTxt":"08/2024","quantidade":1,"obs":"","id":"inv109"},{"nome":"Hairdresser's invisible oil","marca":"Bumble and bumble","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-09-30","validadeTxt":"09/2024","quantidade":1,"obs":"","id":"inv110"},{"nome":"Metal Detox","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-10-31","validadeTxt":"10/2024","quantidade":1,"obs":"","id":"inv111"},{"nome":"Curl Expression","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-10-31","validadeTxt":"10/2024","quantidade":1,"obs":"","id":"inv112"},{"nome":"Penetraitt","marca":"Sebastian","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-10-31","validadeTxt":"10/2024","quantidade":1,"obs":"","id":"inv113"},{"nome":"Extreme Length","marca":"Redken","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-11-30","validadeTxt":"11/2024","quantidade":1,"obs":"","id":"inv114"},{"nome":"Super Máscara","marca":"Hidratei","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-12-31","validadeTxt":"12/2024","quantidade":1,"obs":"","id":"inv115"},{"nome":"Satin Oil","marca":"Keune","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-12-31","validadeTxt":"12/2024","quantidade":1,"obs":"","id":"inv116"},{"nome":"Óleos Egípcios","marca":"Amend","categoria":"Cabelos","tipo":"Máscaras","validade":"2024-12-31","validadeTxt":"2024","quantidade":1,"obs":"","id":"inv117"},{"nome":"Masque Reconstituiant Genesis","marca":"Kérastase","categoria":"Cabelos","tipo":"Máscaras","validade":"2025-02-28","validadeTxt":"02/2025","quantidade":1,"obs":"","id":"inv118"},{"nome":"Kera-Solutions","marca":"Vichy","categoria":"Cabelos","tipo":"Máscaras","validade":"2025-04-30","validadeTxt":"04/2025","quantidade":1,"obs":"","id":"inv119"},{"nome":"Nutricerat","marca":"Ducray","categoria":"Cabelos","tipo":"Máscaras","validade":"2025-04-30","validadeTxt":"04/2025","quantidade":1,"obs":"","id":"inv120"},{"nome":"Red Propolis Treatment","marca":"Kerasys","categoria":"Cabelos","tipo":"Máscaras","validade":"2025-04-30","validadeTxt":"04/2025","quantidade":1,"obs":"","id":"inv121"},{"nome":"Masque Cicaextreme Blond Absolu","marca":"Kérastase","categoria":"Cabelos","tipo":"Máscaras","validade":"2025-04-30","validadeTxt":"04/2025","quantidade":1,"obs":"","id":"inv122"},{"nome":"Stem Rootense","marca":"","categoria":"Cabelos","tipo":"Máscaras","validade":"2025-04-30","validadeTxt":"04/2025","quantidade":1,"obs":"","id":"inv123"},{"nome":"Moisture Recovery","marca":"Joico","categoria":"Cabelos","tipo":"Máscaras","validade":"2025-08-31","validadeTxt":"08/2025","quantidade":1,"obs":"","id":"inv124"},{"nome":"Masque Intense Renegerant Chronologiste","marca":"Kérastase","categoria":"Cabelos","tipo":"Máscaras","validade":"2025-08-31","validadeTxt":"08/2025","quantidade":1,"obs":"","id":"inv125"},{"nome":"Botanic Beauty","marca":"Amend","categoria":"Cabelos","tipo":"Máscaras","validade":"2025-09-30","validadeTxt":"09/2025","quantidade":1,"obs":"","id":"inv126"},{"nome":"Masque Chroma Filler Chroma Absolu","marca":"Kérastase","categoria":"Cabelos","tipo":"Máscaras","validade":"2025-10-31","validadeTxt":"10/2025","quantidade":1,"obs":"","id":"inv127"},{"nome":"Nutrição","marca":"Amend","categoria":"Cabelos","tipo":"Máscaras","validade":"2025-12-31","validadeTxt":"2025","quantidade":1,"obs":"","id":"inv128"},{"nome":"Tame my Hair Mask","marca":"Ice Professional","categoria":"Cabelos","tipo":"Máscaras","validade":"2025-12-31","validadeTxt":"2025","quantidade":1,"obs":"","id":"inv129"},{"nome":"Argan Oil Treatment","marca":"Kerasys","categoria":"Cabelos","tipo":"Máscaras","validade":"2026-02-28","validadeTxt":"02/2026","quantidade":1,"obs":"","id":"inv130"},{"nome":"Salon de Magie","marca":"Kerasys","categoria":"Cabelos","tipo":"Máscaras","validade":"2026-02-28","validadeTxt":"02/2026","quantidade":1,"obs":"","id":"inv131"},{"nome":"Perfect Serum","marca":"Mise en Scene","categoria":"Cabelos","tipo":"Máscaras","validade":"2026-04-30","validadeTxt":"04/2026","quantidade":1,"obs":"","id":"inv132"},{"nome":"Sleek and Shine","marca":"Keune","categoria":"Cabelos","tipo":"Máscaras","validade":"2026-05-31","validadeTxt":"05/2026","quantidade":1,"obs":"","id":"inv133"},{"nome":"Color Therapy Luster Lock","marca":"Joico","categoria":"Cabelos","tipo":"Máscaras","validade":"2026-05-31","validadeTxt":"05/2026","quantidade":1,"obs":"","id":"inv134"},{"nome":"Hair Mask Reconstruction","marca":"MAB Alfaparf","categoria":"Cabelos","tipo":"Máscaras","validade":"2026-07-31","validadeTxt":"07/2026","quantidade":1,"obs":"","id":"inv135"},{"nome":"Covalence","marca":"Image","categoria":"Cabelos","tipo":"Máscaras","validade":"2026-10-31","validadeTxt":"10/2026","quantidade":1,"obs":"","id":"inv136"},{"nome":"Moisturmeric","marca":"Image","categoria":"Cabelos","tipo":"Máscaras","validade":"2026-10-31","validadeTxt":"10/2026","quantidade":1,"obs":"","id":"inv137"},{"nome":"Máscara Hidratante","marca":"Kiwi Labs","categoria":"Cabelos","tipo":"Máscaras","validade":"2026-10-31","validadeTxt":"10/2026","quantidade":1,"obs":"","id":"inv138"},{"nome":"Salon 10","marca":"Mise en Scene","categoria":"Cabelos","tipo":"Máscaras","validade":"2026-10-31","validadeTxt":"10/2026","quantidade":1,"obs":"","id":"inv139"},{"nome":"Papo Reto","marca":"Lola Cosmetics","categoria":"Cabelos","tipo":"Máscaras","validade":"2026-10-31","validadeTxt":"10/2026","quantidade":1,"obs":"","id":"inv140"},{"nome":"Hair Loss Expert Care Deep Nutrition","marca":"Ryo","categoria":"Cabelos","tipo":"Máscaras","validade":"2026-11-30","validadeTxt":"11/2026","quantidade":1,"obs":"","id":"inv141"},{"nome":"Damage Care & Nourishing Treatment","marca":"Ryo","categoria":"Cabelos","tipo":"Máscaras","validade":"2026-11-30","validadeTxt":"11/2026","quantidade":1,"obs":"","id":"inv142"},{"nome":"Damage Care Treatment","marca":"Mise en Scene","categoria":"Cabelos","tipo":"Máscaras","validade":"2027-01-31","validadeTxt":"01/2027","quantidade":1,"obs":"","id":"inv143"},{"nome":"Moisture Ampoule 10x","marca":"Kerasys","categoria":"Cabelos","tipo":"Máscaras","validade":"2027-02-28","validadeTxt":"02/2027","quantidade":1,"obs":"","id":"inv144"},{"nome":"Treat me Right","marca":"Bed Head","categoria":"Cabelos","tipo":"Máscaras","validade":"2027-03-31","validadeTxt":"03/2027","quantidade":1,"obs":"","id":"inv145"},{"nome":"Salon 10 Cica Treatment","marca":"Mise en Scene","categoria":"Cabelos","tipo":"Máscaras","validade":"2027-05-31","validadeTxt":"05/2027","quantidade":1,"obs":"","id":"inv146"},{"nome":"Root Gen: For Woman","marca":"Ryo","categoria":"Cabelos","tipo":"Máscaras","validade":"2027-06-30","validadeTxt":"06/2027","quantidade":1,"obs":"","id":"inv147"},{"nome":"Food for Soft","marca":"Matrix","categoria":"Cabelos","tipo":"Máscaras","validade":"2027-06-30","validadeTxt":"06/2027","quantidade":1,"obs":"","id":"inv148"},{"nome":"Restore Mask So Pure","marca":"Keune","categoria":"Cabelos","tipo":"Máscaras","validade":"2027-07-31","validadeTxt":"07/2027","quantidade":1,"obs":"","id":"inv149"},{"nome":"Hair Mask Fino","marca":"","categoria":"Cabelos","tipo":"Máscaras","validade":"2027-07-31","validadeTxt":"07/2027","quantidade":1,"obs":"","id":"inv150"},{"nome":"Propolis Hair Bonding Pro Repair Treatment","marca":"Kerasys","categoria":"Cabelos","tipo":"Máscaras","validade":"2027-09-30","validadeTxt":"09/2027","quantidade":1,"obs":"","id":"inv151"},{"nome":"Keratin Bond Deep Repair","marca":"Kerasys","categoria":"Cabelos","tipo":"Máscaras","validade":"2027-09-30","validadeTxt":"09/2027","quantidade":1,"obs":"","id":"inv152"},{"nome":"Frizz Dismiss","marca":"Redken","categoria":"Cabelos","tipo":"Máscaras","validade":"2027-10-31","validadeTxt":"10/2027","quantidade":1,"obs":"","id":"inv153"},{"nome":"Premium Volume and Repair","marca":"Tsubaki","categoria":"Cabelos","tipo":"Máscaras","validade":"2027-11-30","validadeTxt":"11/2027","quantidade":1,"obs":"","id":"inv154"},{"nome":"Masque Therapist","marca":"Kérastase","categoria":"Cabelos","tipo":"Máscaras","validade":"2027-12-31","validadeTxt":"12/2027","quantidade":1,"obs":"","id":"inv155"},{"nome":"Keramide Ampoule Heat Protection Kerasys","marca":"","categoria":"Cabelos","tipo":"Máscaras","validade":"2027-12-31","validadeTxt":"12/2027","quantidade":1,"obs":"","id":"inv156"},{"nome":"Tsubaki Premium Ex","marca":"","categoria":"Cabelos","tipo":"Máscaras","validade":"2028-01-31","validadeTxt":"01/2028","quantidade":1,"obs":"","id":"inv157"},{"nome":"Luxe Oil","marca":"Wella","categoria":"Cabelos","tipo":"Máscaras","validade":"2028-02-29","validadeTxt":"02/2028","quantidade":1,"obs":"","id":"inv158"},{"nome":"Bond Repair","marca":"Elseve","categoria":"Cabelos","tipo":"Máscaras","validade":"2028-05-31","validadeTxt":"05/2028","quantidade":1,"obs":"","id":"inv159"},{"nome":"Nutriglow","marca":"Cadiveu","categoria":"Cabelos","tipo":"Máscaras","validade":"2028-07-31","validadeTxt":"07/2028","quantidade":1,"obs":"","id":"inv160"},{"nome":"Máscara liquida lamelar Bond Gloss Repair","marca":"Widi Care","categoria":"Cabelos","tipo":"Máscaras","validade":"2028-08-31","validadeTxt":"08/2028","quantidade":1,"obs":"","id":"inv161"},{"nome":"Pantene Reconstrução Molecular","marca":"","categoria":"Cabelos","tipo":"Máscaras","validade":"2028-10-31","validadeTxt":"10/2028","quantidade":1,"obs":"","id":"inv162"},{"nome":"Spray Multifuncional","marca":"Hidratei","categoria":"Cabelos","tipo":"Leave in","validade":"2025-12-31","validadeTxt":"12/2025","quantidade":1,"obs":"","id":"inv163"},{"nome":"Protein Spray Base Player","marca":"Bed Head","categoria":"Cabelos","tipo":"Leave in","validade":"2025-12-31","validadeTxt":"2025","quantidade":1,"obs":"","id":"inv164"},{"nome":"Nectar Thermique Nutritive","marca":"Kérastase","categoria":"Cabelos","tipo":"Leave in","validade":"2025-01-31","validadeTxt":"01/2025","quantidade":1,"obs":"","id":"inv165"},{"nome":"Repair Oil Serum Bond Building","marca":"Bumble and bumble","categoria":"Cabelos","tipo":"Leave in","validade":"2025-12-31","validadeTxt":"2025","quantidade":1,"obs":"","id":"inv166"},{"nome":"Repair Styling Cream Bond Building","marca":"Bumble and bumble","categoria":"Cabelos","tipo":"Leave in","validade":"2025-10-31","validadeTxt":"10/2025","quantidade":1,"obs":"","id":"inv167"},{"nome":"Acidic Bonding Concentrate","marca":"Redken","categoria":"Cabelos","tipo":"Leave in","validade":"2025-04-30","validadeTxt":"04/2025","quantidade":1,"obs":"","id":"inv168"},{"nome":"Cica Cream Extreme Bleach Recovery","marca":"Redken","categoria":"Cabelos","tipo":"Leave in","validade":"2025-02-28","validadeTxt":"02/2025","quantidade":1,"obs":"","id":"inv169"},{"nome":"After Party","marca":"Bed Head","categoria":"Cabelos","tipo":"Leave in","validade":"2025-12-31","validadeTxt":"2025","quantidade":1,"obs":"","id":"inv170"},{"nome":"Hairdresser's invisible oil Primer","marca":"Bumble and bumble","categoria":"Cabelos","tipo":"Leave in","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv171"},{"nome":"Taming Elixir","marca":"Sebastian","categoria":"Cabelos","tipo":"Leave in","validade":"2024-11-30","validadeTxt":"11/2024","quantidade":1,"obs":"","id":"inv172"},{"nome":"Oleo em Creme Nutri Acid Complex","marca":"Eudora Siage","categoria":"Cabelos","tipo":"Leave in","validade":"2028-05-31","validadeTxt":"05/2028","quantidade":1,"obs":"","id":"inv173"},{"nome":"Leave in Resgate Capilar Bond Repair","marca":"Elseve","categoria":"Cabelos","tipo":"Leave in","validade":"2028-04-30","validadeTxt":"04/2028","quantidade":1,"obs":"","id":"inv174"},{"nome":"Leave in Blond Reconstrutor","marca":"Cadiveu","categoria":"Cabelos","tipo":"Leave in","validade":"2027-05-31","validadeTxt":"05/2027","quantidade":1,"obs":"","id":"inv175"},{"nome":"Tratamento Leave In Pro Resgate Pantene","marca":"","categoria":"Cabelos","tipo":"Leave in","validade":"2028-08-31","validadeTxt":"08/2028","quantidade":1,"obs":"","id":"inv176"},{"nome":"No Wash Repair Treatment Propolis Hair Bonding Kerasys","marca":"","categoria":"Cabelos","tipo":"Leave in","validade":"2027-09-30","validadeTxt":"09/2027","quantidade":1,"obs":"","id":"inv177"},{"nome":"No Wash Ampoule Treatment Salon 10","marca":"Misen en Scene","categoria":"Cabelos","tipo":"Leave in","validade":"2027-11-30","validadeTxt":"11/2027","quantidade":1,"obs":"","id":"inv178"},{"nome":"Fluído Restaurador Multi Beneficios","marca":"Amend","categoria":"Cabelos","tipo":"Leave in","validade":"2028-07-31","validadeTxt":"07/2028","quantidade":1,"obs":"","id":"inv179"},{"nome":"Leave in Peptide Repair Hair Treatment","marca":"Creamy","categoria":"Cabelos","tipo":"Leave in","validade":"2027-09-30","validadeTxt":"09/2027","quantidade":1,"obs":"","id":"inv180"},{"nome":"Coat Spray Selagem Impermeabilizante","marca":"Tresseme","categoria":"Cabelos","tipo":"Leave in","validade":"2028-07-31","validadeTxt":"07/2028","quantidade":1,"obs":"","id":"inv181"},{"nome":"Trauma Treatment","marca":"Lanza","categoria":"Cabelos","tipo":"Leave in","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv182"},{"nome":"Gelatina Ativadora","marca":"Apse","categoria":"Cabelos","tipo":"Gel/gelatina/mousses e estilizadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv183"},{"nome":"Nutricurls EIMI","marca":"Wella","categoria":"Cabelos","tipo":"Gel/gelatina/mousses e estilizadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv184"},{"nome":"Guava Mousse Plot Twist","marca":"Lola Cosmetics","categoria":"Cabelos","tipo":"Gel/gelatina/mousses e estilizadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv185"},{"nome":"Big Blast Osis +","marca":"Schwarzkopf","categoria":"Cabelos","tipo":"Gel/gelatina/mousses e estilizadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv186"},{"nome":"Surf Spray","marca":"Bumble and bumble","categoria":"Cabelos","tipo":"Gel/gelatina/mousses e estilizadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv187"},{"nome":"Small Talk","marca":"Bed Head","categoria":"Cabelos","tipo":"Gel/gelatina/mousses e estilizadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv188"},{"nome":"Geleia Ativadora","marca":"Arvensis","categoria":"Cabelos","tipo":"Gel/gelatina/mousses e estilizadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv189"},{"nome":"Manipulator","marca":"Bed Head","categoria":"Cabelos","tipo":"Gel/gelatina/mousses e estilizadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv190"},{"nome":"Volumizing Styling Powder","marca":"Truss","categoria":"Cabelos","tipo":"Gel/gelatina/mousses e estilizadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv191"},{"nome":"Potion 9","marca":"Sebastian","categoria":"Cabelos","tipo":"Gel/gelatina/mousses e estilizadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv192"},{"nome":"Queen for a Day","marca":"Bed Head","categoria":"Cabelos","tipo":"Gel/gelatina/mousses e estilizadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv193"},{"nome":"Shampoo a seco menta","marca":"Ricca","categoria":"Cabelos","tipo":"Gel/gelatina/mousses e estilizadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv194"},{"nome":"Dirty Secret","marca":"Bed Head","categoria":"Cabelos","tipo":"Gel/gelatina/mousses e estilizadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv195"},{"nome":"Gelatina para definição","marca":"Soul Power","categoria":"Cabelos","tipo":"Gel/gelatina/mousses e estilizadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv196"},{"nome":"Gelatina Acidificante Nutri Waves","marca":"Ápice","categoria":"Cabelos","tipo":"Gel/gelatina/mousses e estilizadores","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv197"},{"nome":"Creme de Jour Fundamentale Curl Manifesto","marca":"Kérastase","categoria":"Cabelos","tipo":"Cremes de pentear","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv198"},{"nome":"Defining Cream BB Curl","marca":"Bumble and bumble","categoria":"Cabelos","tipo":"Cremes de pentear","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv199"},{"nome":"Creme Profissional","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Cremes de pentear","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv200"},{"nome":"Curls Rock Amplifier","marca":"Bed Head","categoria":"Cabelos","tipo":"Cremes de pentear","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv201"},{"nome":"All Soft Mega Curls","marca":"Redken","categoria":"Cabelos","tipo":"Cremes de pentear","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv202"},{"nome":"Curling Essence Volume Curl","marca":"Mise en Scene","categoria":"Cabelos","tipo":"Cremes de pentear","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv203"},{"nome":"Back It Up","marca":"Bed Head","categoria":"Cabelos","tipo":"Cremes de pentear","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv204"},{"nome":"Danos Vorazes","marca":"Lola Cosmetics","categoria":"Cabelos","tipo":"Cremes de pentear","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv205"},{"nome":"Nutri Waves","marca":"Ápice","categoria":"Cabelos","tipo":"Cremes de pentear","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv206"},{"nome":"Óleo Supremo Lamelar","marca":"Haskell","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv207"},{"nome":"Serum style Perfect Serum","marca":"Mise en Scene","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv208"},{"nome":"Serum Watery Perfect Serum","marca":"Mise en Scene","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv209"},{"nome":"Óleo Capilar Carol Kyoko","marca":"Left","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv210"},{"nome":"Dark Oil","marca":"Sebastian","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv211"},{"nome":"Moisture Ampoule","marca":"Kerasys","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv212"},{"nome":"Serum Original","marca":"Mise en Scene","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv213"},{"nome":"Hairdresser's Invisible Oil","marca":"Bumble and bumble","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv214"},{"nome":"Elixir Ultime","marca":"Kérastase","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv215"},{"nome":"Óleo Reparador Danos Vorazes","marca":"Lola Cosmetics","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv216"},{"nome":"Óleo Milagroso","marca":"Pantene","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv217"},{"nome":"All Soft","marca":"Redken","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv218"},{"nome":"Óleo Finalizador Brilho Lamelar","marca":"Tresseme","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv219"},{"nome":"Óleo Tratamento","marca":"Moroccanoil","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv220"},{"nome":"Serum Nutrisubstance","marca":"Medavita","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv221"},{"nome":"Mythic Oil","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv222"},{"nome":"Absolut Repair Oil","marca":"L'Oreal Professional","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv223"},{"nome":"Óleo Nutritivo 3 em 1","marca":"OX","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv224"},{"nome":"Supreme Oil","marca":"Cadiveu","categoria":"Cabelos","tipo":"Óleos capilares","validade":"","validadeTxt":"","quantidade":1,"obs":"","id":"inv225"},{"nome":"CBalm Bruna Tavares","marca":"","categoria":"Skincare","tipo":"Limpadores faciais em óleo","validade":"2025-09-30","validadeTxt":"09/2025","quantidade":1,"obs":"","id":"inv226"},{"nome":"Cleasing Balm Oceane","marca":"","categoria":"Skincare","tipo":"Limpadores faciais em óleo","validade":"2025-11-30","validadeTxt":"11/2025","quantidade":2,"obs":"Validades: 11/2025 e 07/2026","id":"inv227"},{"nome":"Blemish Cleasing Oil Papa Recipe","marca":"","categoria":"Skincare","tipo":"Limpadores faciais em óleo","validade":"2026-01-31","validadeTxt":"01/2026","quantidade":1,"obs":"","id":"inv228"},{"nome":"Limpador Enzimático em Pó The Joy Lab","marca":"","categoria":"Skincare","tipo":"Sabonetes faciais","validade":"2026-01-31","validadeTxt":"01/2026","quantidade":1,"obs":"","id":"inv229"},{"nome":"Mentholatum Acnes Creamy Wash","marca":"","categoria":"Skincare","tipo":"Sabonetes faciais","validade":"2026-04-30","validadeTxt":"04/2026","quantidade":1,"obs":"","id":"inv230"},{"nome":"Torriden Dive IN Cleansing Foam","marca":"","categoria":"Skincare","tipo":"Sabonetes faciais","validade":"2026-06-30","validadeTxt":"06/2026","quantidade":1,"obs":"","id":"inv231"},{"nome":"Gel de Limpeza Cerave","marca":"","categoria":"Skincare","tipo":"Sabonetes faciais","validade":"2027-07-31","validadeTxt":"07/2027","quantidade":1,"obs":"","id":"inv232"},{"nome":"Blemish Serum Papa Recipe","marca":"","categoria":"Skincare","tipo":"Serum de hidratação/recuperação","validade":"2026-03-31","validadeTxt":"03/2026","quantidade":1,"obs":"","id":"inv233"},{"nome":"The Hyaluron Acid 3 CosRx","marca":"","categoria":"Skincare","tipo":"Serum de hidratação/recuperação","validade":"2026-07-31","validadeTxt":"07/2026","quantidade":1,"obs":"","id":"inv234"},{"nome":"Balenceful Serum Torriden","marca":"","categoria":"Skincare","tipo":"Serum de hidratação/recuperação","validade":"2026-07-31","validadeTxt":"07/2026","quantidade":1,"obs":"","id":"inv235"},{"nome":"Peptide 9 Volume Bio Tox MediPeel","marca":"","categoria":"Skincare","tipo":"Serum de hidratação/recuperação","validade":"2026-08-31","validadeTxt":"08/2026","quantidade":1,"obs":"","id":"inv236"},{"nome":"Soft Skin Serum 3 Numbuzin","marca":"","categoria":"Skincare","tipo":"Serum de hidratação/recuperação","validade":"2026-09-30","validadeTxt":"09/2026","quantidade":2,"obs":"Validades: 09/2026 e 11/2026","id":"inv237"},{"nome":"Niacinamide B Complex Creamy","marca":"","categoria":"Skincare","tipo":"Serum de hidratação/recuperação","validade":"2026-11-30","validadeTxt":"11/2026","quantidade":1,"obs":"","id":"inv238"},{"nome":"Powerful Force The Joy Lab","marca":"","categoria":"Skincare","tipo":"Serum de hidratação/recuperação","validade":"2026-12-31","validadeTxt":"12/2026","quantidade":1,"obs":"","id":"inv239"},{"nome":"Premium Essence Melano CC","marca":"","categoria":"Skincare","tipo":"Serum de hidratação/recuperação","validade":"2027-03-31","validadeTxt":"03/2027","quantidade":1,"obs":"","id":"inv240"},{"nome":"Peptide Cream Creamy","marca":"","categoria":"Skincare","tipo":"Serum de hidratação/recuperação","validade":"2027-03-31","validadeTxt":"03/2027","quantidade":1,"obs":"","id":"inv241"},{"nome":"Essence Melano CC","marca":"","categoria":"Skincare","tipo":"Serum de hidratação/recuperação","validade":"2027-04-30","validadeTxt":"04/2027","quantidade":1,"obs":"","id":"inv242"},{"nome":"Super Niacinamida 20% Sallve","marca":"","categoria":"Skincare","tipo":"Serum de hidratação/recuperação","validade":"2027-08-31","validadeTxt":"08/2027","quantidade":1,"obs":"","id":"inv243"},{"nome":"Super Pro Colágeno Peptídeos 10% Sallve","marca":"","categoria":"Skincare","tipo":"Serum de hidratação/recuperação","validade":"2027-10-31","validadeTxt":"10/2027","quantidade":1,"obs":"","id":"inv244"},{"nome":"Gel Creme Retinol Creamy","marca":"","categoria":"Skincare","tipo":"Retinois","validade":"2026-11-30","validadeTxt":"11/2026","quantidade":1,"obs":"","id":"inv245"},{"nome":"Serum Facial Antiaging Creamy","marca":"","categoria":"Skincare","tipo":"Retinois","validade":"2028-01-31","validadeTxt":"01/2028","quantidade":1,"obs":"","id":"inv246"},{"nome":"Real Ferment Micro Toner Neogene","marca":"","categoria":"Skincare","tipo":"Toners","validade":"2026-06-30","validadeTxt":"06/2026","quantidade":1,"obs":"","id":"inv247"},{"nome":"Kiwamizu Hatomugi Lotion Hada Labo","marca":"","categoria":"Skincare","tipo":"Toners","validade":"2026-07-31","validadeTxt":"07/2026","quantidade":1,"obs":"","id":"inv248"},{"nome":"Blemish Peeling Toner Papa Recipe","marca":"","categoria":"Skincare","tipo":"Toners","validade":"2026-07-31","validadeTxt":"07/2026","quantidade":1,"obs":"","id":"inv249"},{"nome":"Numbuzin 3 Toner","marca":"","categoria":"Skincare","tipo":"Toners","validade":"2026-08-31","validadeTxt":"08/2026","quantidade":1,"obs":"","id":"inv250"},{"nome":"Rice Toner I'm From","marca":"","categoria":"Skincare","tipo":"Toners","validade":"2027-03-31","validadeTxt":"03/2027","quantidade":1,"obs":"","id":"inv251"},{"nome":"Spray Reparador Calmante Sallve","marca":"","categoria":"Skincare","tipo":"Toners","validade":"2027-03-31","validadeTxt":"03/2027","quantidade":1,"obs":"","id":"inv252"},{"nome":"Hada Labo Gokujyun Perfect Jelly","marca":"","categoria":"Skincare","tipo":"Essence","validade":"2026-05-31","validadeTxt":"05/2026","quantidade":1,"obs":"","id":"inv253"},{"nome":"Lotion Moist Melano CC","marca":"","categoria":"Skincare","tipo":"Essence","validade":"2026-05-31","validadeTxt":"05/2026","quantidade":1,"obs":"","id":"inv254"},{"nome":"Jin Boosting Essence Chogongjin","marca":"","categoria":"Skincare","tipo":"Essence","validade":"2026-06-30","validadeTxt":"06/2026","quantidade":1,"obs":"","id":"inv255"},{"nome":"The 6 Peptide Skin Booster CosRx","marca":"","categoria":"Skincare","tipo":"Essence","validade":"2026-10-31","validadeTxt":"10/2026","quantidade":1,"obs":"","id":"inv256"},{"nome":"Peptide 9 Volume Essence MediPeel","marca":"","categoria":"Skincare","tipo":"Essence","validade":"2026-10-31","validadeTxt":"10/2026","quantidade":1,"obs":"","id":"inv257"},{"nome":"Atoderm Intensive Baume Bioderma","marca":"","categoria":"Skincare","tipo":"Recuperadores de barreira","validade":"2025-08-31","validadeTxt":"08/2025","quantidade":1,"obs":"","id":"inv258"},{"nome":"Cica Sleeping Mask Laneige","marca":"","categoria":"Skincare","tipo":"Recuperadores de barreira","validade":"2025-09-30","validadeTxt":"09/2025","quantidade":1,"obs":"","id":"inv259"},{"nome":"Illiyoon Ceramide Ato Concentrate Cream","marca":"","categoria":"Skincare","tipo":"Recuperadores de barreira","validade":"2025-11-30","validadeTxt":"11/2025","quantidade":1,"obs":"","id":"inv260"},{"nome":"Good Cera Super Ceramide Cream in Serum Holika Holika","marca":"","categoria":"Skincare","tipo":"Recuperadores de barreira","validade":"2026-01-31","validadeTxt":"01/2026","quantidade":1,"obs":"","id":"inv261"},{"nome":"Comfort Ceramide Cream CosRx","marca":"","categoria":"Skincare","tipo":"Recuperadores de barreira","validade":"2026-02-28","validadeTxt":"02/2026","quantidade":1,"obs":"","id":"inv262"},{"nome":"Intensive Cream Barrierderm","marca":"","categoria":"Skincare","tipo":"Recuperadores de barreira","validade":"2026-02-28","validadeTxt":"02/2026","quantidade":1,"obs":"","id":"inv263"},{"nome":"Matcha Hydrating Relief Cream B.Lab","marca":"","categoria":"Skincare","tipo":"Recuperadores de barreira","validade":"2026-04-30","validadeTxt":"04/2026","quantidade":1,"obs":"","id":"inv264"},{"nome":"Cicabio Bioderma","marca":"","categoria":"Skincare","tipo":"Recuperadores de barreira","validade":"2026-06-30","validadeTxt":"06/2026","quantidade":2,"obs":"Validades: 06/2026 e 03/2027","id":"inv265"},{"nome":"Loção Facial Hidratante Cerave","marca":"","categoria":"Skincare","tipo":"Hidratantes diurnos","validade":"2025-06-30","validadeTxt":"06/2025","quantidade":1,"obs":"","id":"inv266"},{"nome":"Advanced Snail 92 CosRx","marca":"","categoria":"Skincare","tipo":"Hidratantes diurnos","validade":"2025-09-30","validadeTxt":"09/2025","quantidade":1,"obs":"","id":"inv267"},{"nome":"Ultra Hyaluron Cream Missha","marca":"","categoria":"Skincare","tipo":"Hidratantes diurnos","validade":"2025-12-31","validadeTxt":"12/2025","quantidade":1,"obs":"","id":"inv268"},{"nome":"Calming Watery Cream Fraijour","marca":"","categoria":"Skincare","tipo":"Hidratantes diurnos","validade":"2026-06-30","validadeTxt":"06/2026","quantidade":1,"obs":"","id":"inv269"},{"nome":"Creme Calmante Multirreparador Principia","marca":"","categoria":"Skincare","tipo":"Hidratantes diurnos","validade":"2026-10-31","validadeTxt":"10/2026","quantidade":1,"obs":"","id":"inv270"},{"nome":"Calming Cream Creamy","marca":"","categoria":"Skincare","tipo":"Hidratantes diurnos","validade":"2027-04-30","validadeTxt":"04/2027","quantidade":1,"obs":"","id":"inv271"},{"nome":"Skin Aqua Super Moisture Milk","marca":"","categoria":"Skincare","tipo":"Protetor solar","validade":"2027-05-31","validadeTxt":"05/2027","quantidade":2,"obs":"Validades: 05/2027 e 01/2028","id":"inv272"},{"nome":"PS-01 Principia","marca":"","categoria":"Skincare","tipo":"Protetor solar","validade":"2026-10-31","validadeTxt":"10/2026","quantidade":1,"obs":"","id":"inv273"},{"nome":"AHC Premier","marca":"","categoria":"Skincare","tipo":"Área dos olhos","validade":"2026-08-31","validadeTxt":"08/2026","quantidade":1,"obs":"","id":"inv274"},{"nome":"Balm Redutor de Rugas Natura","marca":"","categoria":"Skincare","tipo":"Área dos olhos","validade":"2026-10-31","validadeTxt":"10/2026","quantidade":1,"obs":"","id":"inv275"}];
var FATURAS_OUT = [{"mes": "2026-10", "data": "2026-09-08", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo1", "valor": 20.95, "obs": ""}, {"mes": "2026-10", "data": "2026-09-08", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo2", "valor": 12.95, "obs": ""}, {"mes": "2026-10", "data": "2026-09-09", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo3", "valor": 17.94, "obs": "Data aproximada (09 ou 10/09) — cabeçalho fora do print"}, {"mes": "2026-10", "data": "2026-09-09", "descricao": "ANTHROPIC* CLAUDE SUB", "categoria": "Outros", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo4", "valor": 117.13, "obs": "Data aproximada (09 ou 10/09) — cabeçalho fora do print"}, {"mes": "2026-10", "data": "2026-09-09", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo5", "valor": 13.95, "obs": "Data aproximada (09 ou 10/09) — cabeçalho fora do print"}, {"mes": "2026-10", "data": "2026-09-10", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo6", "valor": 15.95, "obs": ""}, {"mes": "2026-10", "data": "2026-09-10", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo7", "valor": 10.96, "obs": ""}, {"mes": "2026-10", "data": "2026-09-11", "descricao": "IFD*ANDERSON NUNES FRA", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo8", "valor": 31.98, "obs": ""}, {"mes": "2026-10", "data": "2026-09-12", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo9", "valor": 22.96, "obs": ""}, {"mes": "2026-10", "data": "2026-09-12", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo10", "valor": 17.93, "obs": ""}, {"mes": "2026-10", "data": "2026-09-13", "descricao": "IFD*ZAMP S.A.", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo11", "valor": 45.87, "obs": ""}, {"mes": "2026-10", "data": "2026-09-14", "descricao": "AMAZON BR *AMA", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 2, "parcelaAtual": 1, "id": "fo12", "valor": 20.37, "grupo": "ito12", "obs": "Compra de R$ 40,74 em 2x — parcela calculada (conferir na fatura)"}, {"mes": "2026-10", "data": "2026-09-15", "descricao": "SHOPEE *ORIENTALIVARIE", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo13", "valor": 28.39, "obs": ""}, {"mes": "2026-10", "data": "2026-09-15", "descricao": "IFD*TW ORIENTAL LTDA", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo14", "valor": 34.97, "obs": ""}, {"mes": "2026-10", "data": "2026-09-15", "descricao": "AMAZONMKTCPI*AMA", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 5, "parcelaAtual": 1, "id": "fo15", "valor": 29.63, "grupo": "ito15", "obs": "Compra de R$ 148,17 em 5x — parcela calculada (conferir na fatura)"}, {"mes": "2026-10", "data": "2026-09-15", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo16", "valor": 15.28, "obs": ""}, {"mes": "2026-10", "data": "2026-09-15", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo17", "valor": 13.94, "obs": ""}, {"mes": "2026-10", "data": "2026-09-15", "descricao": "ESTORNO AMAZONMKTCPI*AMAZON BR", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo18", "valor": -31.63, "obs": "Crédito em fatura (estorno)"}, {"mes": "2026-10", "data": "2026-09-16", "descricao": "IFD*SP MA GELATERIA LT", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo19", "valor": 14.89, "obs": ""}, {"mes": "2026-10", "data": "2026-09-17", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo20", "valor": 15.28, "obs": ""}, {"mes": "2026-10", "data": "2026-09-17", "descricao": "IFD*TW ORIENTAL LTDA", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo21", "valor": 31.98, "obs": ""}, {"mes": "2026-10", "data": "2026-09-17", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo22", "valor": 11.94, "obs": ""}, {"mes": "2026-10", "data": "2026-09-19", "descricao": "IFD*HIGO LEONARDO MARTINS", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo23", "valor": 25.98, "obs": ""}, {"mes": "2026-10", "data": "2026-09-21", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo24", "valor": 21.93, "obs": ""}, {"mes": "2026-10", "data": "2026-09-22", "descricao": "AMAZON BR *AMA", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 2, "parcelaAtual": 1, "id": "fo25", "valor": 24.99, "grupo": "ito25", "obs": "Compra de R$ 49,98 em 2x — parcela calculada (conferir na fatura)"}, {"mes": "2026-10", "data": "2026-09-22", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo26", "valor": 14.95, "obs": ""}, {"mes": "2026-10", "data": "2026-09-23", "descricao": "SHOPEE *SCHWARZKOPFOFI", "categoria": "Beleza", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo27", "valor": 50.15, "obs": ""}, {"mes": "2026-10", "data": "2026-09-23", "descricao": "SHOPEE *GIGIL", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 4, "parcelaAtual": 1, "id": "fo28", "valor": 28.86, "grupo": "ito28", "obs": "Compra de R$ 115,45 em 4x — parcela calculada (conferir na fatura)"}, {"mes": "2026-10", "data": "2026-09-23", "descricao": "SHOPEE *GIGIL", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 4, "parcelaAtual": 1, "id": "fo29", "valor": 27.16, "grupo": "ito29", "obs": "Compra de R$ 108,63 em 4x — parcela calculada (conferir na fatura)"}, {"mes": "2026-10", "data": "2026-09-23", "descricao": "SHOPEE *NOVEHORAS", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo30", "valor": 32.9, "obs": ""}, {"mes": "2026-10", "data": "2026-09-24", "descricao": "SHOPEE *SCHWARZKOPFOFI", "categoria": "Beleza", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo31", "valor": 35.8, "obs": ""}, {"mes": "2026-10", "data": "2026-09-24", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo32", "valor": 13.95, "obs": ""}, {"mes": "2026-10", "data": "2026-09-24", "descricao": "IFD*TW ORIENTAL LTDA", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo33", "valor": 36.97, "obs": ""}, {"mes": "2026-10", "data": "2026-09-24", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo34", "valor": 12.93, "obs": ""}, {"mes": "2026-10", "data": "2026-09-25", "descricao": "IFOODCOM AGENCIA DE R", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo35", "valor": 17.99, "obs": ""}, {"mes": "2026-10", "data": "2026-09-25", "descricao": "SHOPEE *CASAECOM", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 7, "parcelaAtual": 1, "id": "fo36", "valor": 64.65, "grupo": "ito36", "obs": "Compra de R$ 452,58 em 7x — parcela calculada (conferir na fatura)"}, {"mes": "2026-10", "data": "2026-09-26", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo37", "valor": 28.94, "obs": ""}, {"mes": "2026-10", "data": "2026-09-26", "descricao": "IFD*IMIFARMA PRO", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 4, "parcelaAtual": 1, "id": "fo38", "valor": 29.59, "grupo": "ito38", "obs": "Compra de R$ 118,35 em 4x — parcela calculada (conferir na fatura)"}, {"mes": "2026-10", "data": "2026-09-26", "descricao": "AMAZON CPI *AMA", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 5, "parcelaAtual": 1, "id": "fo39", "valor": 22.68, "grupo": "ito39", "obs": "Compra de R$ 113,39 em 5x — parcela calculada (conferir na fatura)"}, {"mes": "2026-10", "data": "2026-09-26", "descricao": "AMAZON CPI *AMA", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 5, "parcelaAtual": 1, "id": "fo40", "valor": 23.36, "grupo": "ito40", "obs": "Compra de R$ 116,79 em 5x — parcela calculada (conferir na fatura)"}, {"mes": "2026-10", "data": "2026-09-27", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo41", "valor": 29.94, "obs": ""}, {"mes": "2026-10", "data": "2026-09-27", "descricao": "AMAZON BR *AMAZON BR", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo42", "valor": 20.86, "obs": ""}, {"mes": "2026-10", "data": "2026-09-28", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo43", "valor": 14.94, "obs": ""}, {"mes": "2026-10", "data": "2026-09-28", "descricao": "IFOODCOM AGENCIA DE R", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo44", "valor": 37.48, "obs": ""}, {"mes": "2026-10", "data": "2026-09-28", "descricao": "AMAZON CPI *AMA", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 4, "parcelaAtual": 1, "id": "fo45", "valor": 28.76, "grupo": "ito45", "obs": "Compra de R$ 115,05 em 4x — parcela calculada (conferir na fatura)"}, {"mes": "2026-10", "data": "2026-09-28", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo46", "valor": 14.95, "obs": ""}, {"mes": "2026-10", "data": "2026-09-29", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo47", "valor": 12.96, "obs": ""}, {"mes": "2026-10", "data": "2026-09-29", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo48", "valor": 13.94, "obs": ""}, {"mes": "2026-10", "data": "2026-09-30", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo49", "valor": 11.96, "obs": ""}, {"mes": "2026-10", "data": "2026-09-30", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo50", "valor": 12.95, "obs": ""}, {"mes": "2026-10", "data": "2026-10-01", "descricao": "IFOODCOM AGENCIA DE R", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo51", "valor": 32.98, "obs": ""}, {"mes": "2026-10", "data": "2026-10-01", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo52", "valor": 12.94, "obs": ""}, {"mes": "2026-10", "data": "2026-10-01", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo53", "valor": 14.95, "obs": ""}, {"mes": "2026-10", "data": "2026-10-01", "descricao": "AMAZON BR *AMA", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 2, "parcelaAtual": 1, "id": "fo54", "valor": 25.7, "grupo": "ito54", "obs": "Compra de R$ 51,41 em 2x — parcela calculada (conferir na fatura)"}, {"mes": "2026-10", "data": "2026-10-02", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo55", "valor": 8.94, "obs": ""}, {"mes": "2026-10", "data": "2026-10-03", "descricao": "DL *UBERRIDES", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo56", "valor": 18.99, "obs": ""}, {"mes": "2026-10", "data": "2026-10-03", "descricao": "SHOPEE *SCHWARZKO", "categoria": "Beleza", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 4, "parcelaAtual": 1, "id": "fo57", "valor": 12.49, "grupo": "ito57", "obs": "Compra de R$ 49,96 em 4x — parcela calculada (conferir na fatura)"}, {"mes": "2026-10", "data": "2026-10-04", "descricao": "IFD*MARANHAO CALZONARIA C", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo58", "valor": 28.83, "obs": ""}, {"mes": "2026-10", "data": "2026-10-04", "descricao": "ESTORNO IFD*MARANHAO CALZONARIA C", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo59", "valor": -13.9, "obs": "Crédito em fatura (estorno)"}, {"mes": "2026-10", "data": "2026-10-05", "descricao": "SHOPEE *EVAS", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 5, "parcelaAtual": 1, "id": "fo60", "valor": 17.75, "grupo": "ito60", "obs": "Compra de R$ 88,73 em 5x — parcela calculada (conferir na fatura)"}, {"mes": "2026-10", "data": "2026-10-05", "descricao": "IFD*EMPREENDIMENTOS PA", "categoria": "Compras", "coluna": "visa", "forma": "Crédito", "cartao": "Itaú Visa (Luiza)", "vencimento": "2026-10-15", "parcelas": 1, "parcelaAtual": 1, "id": "fo61", "valor": 37.88, "obs": ""}];
function invDaLista(x) { return Object.assign({ aquisicao: '', valor: 0, status: '' }, x); }
function G(o) { return Object.assign({ id: uid(), mes: '2026-06', data: '', descricao: '', categoria: 'Outros', valor: 0, coluna: 'demais', forma: '', cartao: '', parcelas: 1, parcelaAtual: 1, vencimento: '', obs: '', recorrente: false }, o); }

function seed() {
  return {
    v: 1,
    settings: { metaDiaria: 50, lembreteHora: '20:00', ultimoAviso: '' },
    catV: 2,
    categorias: CATS.slice(),
    gastos: [
      G({ id: 'g1', descricao: 'Casa', categoria: 'Moradia', valor: 525, recorrente: true }),
      G({ id: 'g2', descricao: 'TIM', categoria: 'Telefonia', valor: 75.99, recorrente: true }),
      G({ id: 'g3', descricao: 'Terapia', categoria: 'Saúde', valor: 360, recorrente: true }),
      G({ id: 'g4', descricao: 'Potiguar', categoria: 'Compras', valor: 24.2, parcelas: 10, parcelaAtual: 8, obs: 'Junho' }),
      G({ id: 'g5', descricao: 'Papai', categoria: 'Família', valor: 500, obs: 'Paguei 2º do ventilador' }),
      G({ id: 'g6', grupo: 'it5', descricao: 'Ventilador', categoria: 'Compras', valor: 53.32, coluna: 'visa', forma: 'Crédito', cartao: 'Magazine Luíza (Itaú Visa)', parcelas: 8, parcelaAtual: 3, obs: 'Maio — "deve meu cartão"' }),
      G({ id: 'g7', descricao: 'Capacete', categoria: 'Compras', valor: 53.78, coluna: 'visa', forma: 'Crédito', cartao: 'Magazine Luíza (Itaú Visa)', parcelas: 2, parcelaAtual: 1 })
    ].concat(FATURAS.map(function (f) { return G(f); })).concat(FATURAS_OUT.map(function (f) { return G(f); })).concat(FATURAS_MASTER_OUT.map(function (f) { return G(f); })).map(confirmarMasterOut),
    receitas: [],
    metas: [{
      id: 'm1', nome: 'Economizar R$ 10.000,00', objetivo: 10000, alcancado: 0, prazo: '', prioridade: 'Alta',
      submetas: [
        { id: 's1', nome: 'Primeira etapa', valor: 1000, prazo: '' },
        { id: 's2', nome: 'Segunda etapa', valor: 2500, prazo: '' },
        { id: 's3', nome: 'Terceira etapa', valor: 5000, prazo: '' },
        { id: 's4', nome: 'Quarta etapa', valor: 7500, prazo: '' },
        { id: 's5', nome: 'Objetivo final', valor: 10000, prazo: '' }
      ]
    }],
    habitos: {},
    wishCats: ['Skincare', 'Maquiagem', 'Cabelos', 'Corpo', 'Perfumes', 'Higiene', 'Acessórios', 'Outros'],
    wishlist: [],
    inventario: INV_LISTAS.map(invDaLista),
    invImport: 1,
    parcV: 1,
    fatImport: 2,
    acabados: [],
    acabV: 1
  };
}
var FATURAS_MASTER_OUT = [{"mes": "2026-10", "coluna": "master", "forma": "Crédito", "cartao": "Inter Mastercard", "vencimento": "2026-10-20", "parcelas": 2, "parcelaAtual": 1, "obs": "", "data": "2026-10-01", "descricao": "BEAUTYESSENDYCOSMETICO Serra", "categoria": "Beleza", "valor": 31.28, "grupo": "in34", "id": "fm1"}, {"mes": "2026-10", "coluna": "master", "forma": "Crédito", "cartao": "Inter Mastercard", "vencimento": "2026-10-20", "parcelas": 1, "parcelaAtual": 1, "obs": "Restaurante", "data": "2026-09-25", "descricao": "VIGNOLI LITORANEA", "categoria": "Outros", "valor": 88.88, "id": "fm2"}, {"mes": "2026-10", "coluna": "master", "forma": "Crédito", "cartao": "Inter Mastercard", "vencimento": "2026-10-20", "parcelas": 1, "parcelaAtual": 1, "obs": "Crédito: pagamento antecipado na fatura", "data": "2026-09-25", "descricao": "PAGAMENTO ON LINE", "categoria": "Outros", "valor": -40.0, "id": "fm3"}, {"mes": "2026-10", "coluna": "master", "forma": "Crédito", "cartao": "Inter Mastercard", "vencimento": "2026-10-20", "parcelas": 1, "parcelaAtual": 1, "obs": "Restaurante", "data": "2026-09-23", "descricao": "ARABIAN GRILL", "categoria": "Outros", "valor": 36.0, "id": "fm4"}, {"mes": "2026-10", "coluna": "master", "forma": "Crédito", "cartao": "Inter Mastercard", "vencimento": "2026-10-20", "parcelas": 1, "parcelaAtual": 1, "obs": "Restaurante", "data": "2026-09-21", "descricao": "AZU JAPONESES E CONT", "categoria": "Outros", "valor": 70.0, "id": "fm5"}, {"mes": "2026-10", "coluna": "master", "forma": "Crédito", "cartao": "Inter Mastercard", "vencimento": "2026-10-20", "parcelas": 1, "parcelaAtual": 1, "obs": "Restaurante", "data": "2026-09-21", "descricao": "AZU JAPONESES E CONT", "categoria": "Outros", "valor": 52.5, "id": "fm6"}, {"mes": "2026-10", "coluna": "master", "forma": "Crédito", "cartao": "Inter Mastercard", "vencimento": "2026-10-20", "parcelas": 4, "parcelaAtual": 1, "obs": "", "data": "2026-09-20", "descricao": "CubboBrasilServicosdeL", "categoria": "Outros", "valor": 24.44, "grupo": "in35", "id": "fm7"}];
var MASTER_OUT_CONF = ["f120","f121","f122","f123","f124"];
function confirmarMasterOut(g) { if (MASTER_OUT_CONF.indexOf(g.id) >= 0 && g.previsto) { g.previsto = false; g.vencimento = "2026-10-20"; g.obs = "Confirmado na fatura de outubro"; } return g; }
var CATS = ['Uber', 'IFood', 'Gastos Essenciais', 'Mercado', 'Beleza', 'Papelaria', 'Outros'];
var CAT_COR = { 'Uber': '#2E6349', 'IFood': '#A9C9B3', 'Gastos Essenciais': '#7FAE8E', 'Mercado': '#CDB591', 'Beleza': '#B89B72', 'Papelaria': '#8A918C', 'Outros': '#A3A9A4' };
var CAT_EXTRA = ['#5E8C76', '#CDB591', '#8A918C', '#9DB58A', '#D4BE98'];
function corCat(k, i) { return CAT_COR[k] || CAT_EXTRA[i % CAT_EXTRA.length]; }
var CATS_ANTIGAS = ['Moradia', 'Telefonia', 'Saúde', 'Família', 'Compras', 'Alimentação', 'Transporte', 'Lazer', 'Beleza', 'Assinaturas', 'Outros'];
function categorizar(g) {
  var u = String(g.descricao || '').toUpperCase(), c = g.categoria;
  if (CATS.indexOf(c) >= 0 && c !== 'Outros') return c;
  if (u.indexOf('UBER') >= 0) return 'Uber';
  if (/^IFD|IFOOD/.test(u)) return 'IFood';
  if (/PAPEL/.test(u)) return 'Papelaria';
  if (/BEAUTY|BELE|COS$|COSMET/.test(u) || g.obs === 'Compra da wishlist') return 'Beleza';
  if (/MERCADO(?!LIVRE)|SUPERMERC|ATACAD/.test(u)) return 'Mercado';
  if (['Moradia', 'Telefonia', 'Saúde'].indexOf(c) >= 0) return 'Gastos Essenciais';
  if (c === 'Alimentação') return 'Mercado';
  if (c === 'Transporte') return 'Uber';
  if (CATS_ANTIGAS.indexOf(c) < 0 && c) return c;
  return 'Outros';
}
function migrarCategorias(d) {
  if (d.catV >= 2) return d;
  var extras = (d.categorias || []).filter(function (c) { return CATS_ANTIGAS.indexOf(c) < 0 && CATS.indexOf(c) < 0; });
  d.categorias = CATS.concat(extras);
  d.gastos.forEach(function (g) { g.categoria = categorizar(g); });
  d.catV = 2; return d;
}
function importarListas(d) {
  if (d.invImport >= 1) return d;
  var ids = {}; (d.inventario || []).forEach(function (x) { ids[x.id] = true; });
  d.inventario = (d.inventario || []).concat(INV_LISTAS.filter(function (x) { return !ids[x.id]; }).map(invDaLista));
  if (d.wishCats.indexOf('Cabelos') < 0) d.wishCats.push('Cabelos');
  if (d.wishCats.indexOf('Skincare') < 0) d.wishCats.push('Skincare');
  d.invImport = 1; return d;
}
function importarFaturas(d) {
  if (d.fatImport >= 2) return d;
  var ids = {}; d.gastos.forEach(function (g) { ids[g.id] = true; });
  FATURAS_OUT.forEach(function (f) { if (!ids[f.id]) { var g = G(f); g.categoria = categorizar(g); d.gastos.push(g); } });
  if (!(d.fatImport >= 2)) {
    var ids2 = {}; d.gastos.forEach(function (g) { ids2[g.id] = true; confirmarMasterOut(g); });
    FATURAS_MASTER_OUT.forEach(function (f) { if (!ids2[f.id]) d.gastos.push(G(f)); });
  }
  d.fatImport = 2; return d;
}
function migrarParcelas(d) {
  if (d.parcV >= 1) return d;
  var v = d.gastos.find(function (g) { return g.id === 'g6'; });
  if (v && !v.grupo && +v.valor === 53.32 && +v.parcelas === 8) v.grupo = 'it5';
  d.parcV = 1; return d;
}
window.migrarAcabados = migrarAcabados;
function carregar() {
  try { var s = window.localStorage.getItem(KEY); if (s) { var d = JSON.parse(s); if (d && d.gastos) { var antes = d.catV, ai = d.invImport, af = d.fatImport; migrarCategorias(d); var apv = d.parcV; migrarParcelas(d); if (apv !== d.parcV) salvarLS(d); importarListas(d); importarFaturas(d); var aa = d.acabV; migrarAcabados(d); if (antes !== d.catV || ai !== d.invImport || af !== d.fatImport || aa !== d.acabV) salvarLS(d); return { d: d, salvo: true }; } } } catch (e) {}
  var n = seed(); n.gastos.forEach(function (g) { g.categoria = categorizar(g); }); return { d: n, salvo: null };
}
function salvarLS(d) { try { window.localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
function ultimoMes(d) { var ms = d.gastos.filter(function (g) { return !g.previsto; }).map(function (g) { return g.mes; }).filter(Boolean).sort(); return ms.length ? ms[ms.length - 1] : hoje().slice(0, 7); }

function fgVazio() { return { pago: false, editId: '', data: '', descricao: '', categoria: 'Outros', valor: '', coluna: 'demais', forma: '', cartao: '', parcelas: '1', parcelaAtual: '1', vencimento: '', obs: '', recorrente: false }; }
function frVazio() { return { data: '', descricao: '', valor: '' }; }
function fmVazio() { return { editId: '', tipo: 'valor', nome: '', objetivo: '', alcancado: '', prazo: '', prioridade: 'Média' }; }
function fsVazio() { return { metaId: '', nome: '', valor: '', prazo: '' }; }
function fwVazio(cat) { return { editId: '', cat: cat || 'Skincare', nome: '', marca: '', validade: '', valor: '', prioridade: 'Média', link: '', obs: '' }; }
function fiVazio() { return { novaCat: '', catAnterior: '', novoTipo: '', editId: '', validadeOrig: '', validadeTxt: '', tipo: '', nome: '', categoria: 'Skincare', marca: '', aquisicao: '', validade: '', quantidade: '1', valor: '', status: 'Fechado', obs: '' }; }
function fiCom(cat, tipo) { var f = fiVazio(); f.categoria = cat; f.tipo = tipo || ''; return f; }

function chaveParc(g) { return g.grupo ? 'grp:' + g.grupo : ['k', String(g.descricao).trim().toLowerCase(), g.coluna, g.parcelas, g.data || '', r2(+g.valor || 0)].join('|'); }
function addMesData2(iso, n) { var r = iso; for (var i = 0; i < n; i++) r = addMesData(r); return r; }
// parcelas futuras projetadas automaticamente: { 'AAAA-MM': [itens virtuais] }
function parcelasVirtuais(d) {
  var ult = {}, tem = {};
  d.gastos.forEach(function (g) {
    var p = +g.parcelas || 1; if (p <= 1) return;
    var k = chaveParc(g), a = +g.parcelaAtual || 1; tem[k + '@' + g.mes] = true;
    var u = ult[k]; if (!u || a > (+u.parcelaAtual || 1) || (a === (+u.parcelaAtual || 1) && g.mes > u.mes)) ult[k] = g;
  });
  var porMes = {}, pul = d.pulos || {}, cor = d.cortes || {};
  Object.keys(ult).forEach(function (k) {
    var g = ult[k], p = +g.parcelas, a = +g.parcelaAtual || 1;
    for (var i = 1; i <= p - a; i++) {
      var m = addMes(g.mes, i); if (tem[k + '@' + m] || pul[k + '@' + m] || (cor[k] && m >= cor[k] && g.mes < cor[k])) continue;
      (porMes[m] = porMes[m] || []).push(Object.assign({}, g, { id: 'v_' + g.id + '_' + i, mes: m, parcelaAtual: a + i, virtual: true, previsto: true, vencimento: g.vencimento ? addMesData2(g.vencimento, i) : '', obs: '' }));
    }
  });
  return porMes;
}
function diffMeses(a, b) { var x = a.split('-').map(Number), y = b.split('-').map(Number); return (y[0] * 12 + y[1]) - (x[0] * 12 + x[1]); }
function chaveRec(g) { return String(g.descricao).trim().toLowerCase() + '|' + g.coluna; }
// despesas recorrentes projetadas em todos os meses após o último lançamento real
function recorrentesVirtuais(d, mes) {
  var ult = {}, tem = {};
  d.gastos.forEach(function (g) { if ((+g.parcelas || 1) > 1) return; var k = chaveRec(g); tem[k + '@' + g.mes] = true; if (!ult[k] || g.mes > ult[k].mes) ult[k] = g; });
  var out = [];
  Object.keys(ult).forEach(function (k) {
    var g = ult[k], pul = d.pulos || {}, cor = d.cortes || {}; if (!g.recorrente || g.mes >= mes || tem[k + '@' + mes] || pul[k + '@' + mes] || (cor[k] && mes >= cor[k] && g.mes < cor[k])) return;
    var n = diffMeses(g.mes, mes);
    out.push(Object.assign({}, g, { id: 'r_' + g.id + '_' + mes, mes: mes, virtual: true, previsto: true, data: '', vencimento: g.vencimento ? addMesData2(g.vencimento, n) : '', obs: '' }));
  });
  return out;
}
function gastosDoMes(d, mes, virt) { return d.gastos.filter(function (g) { return g.mes === mes; }).concat((virt || parcelasVirtuais(d))[mes] || []).concat(recorrentesVirtuais(d, mes)); }
function totalMes(d, mes, virt) { return r2(gastosDoMes(d, mes, virt).reduce(function (a, g) { return a + (+g.valor || 0); }, 0)); }

function projecao(d, mes, virt) {
  virt = virt || parcelasVirtuais(d);
  var next = addMes(mes, 1);
  var chave = function (g) { return (+g.parcelas || 1) > 1 ? chaveParc(g) : (g.grupo ? 'grp:' + g.grupo : String(g.descricao).trim().toLowerCase() + '|' + g.coluna); };
  var ja = d.gastos.filter(function (g) { return g.mes === next; });
  var jaK = {}; ja.forEach(function (g) { jaK[chave(g)] = true; });
  var itens = ja.map(function (g) { return Object.assign({}, g, { origem: 'Já lançado' }); });
  (virt[next] || []).forEach(function (g) { itens.push(Object.assign({}, g, { origem: 'Parcela ' + g.parcelaAtual + '/' + g.parcelas })); });
  recorrentesVirtuais(d, next).forEach(function (g) { itens.push(Object.assign({}, g, { origem: 'Recorrente' })); });
  // todas as parcelas de meses posteriores ao mês atual (lançadas ou projetadas)
  var futuras = 0;
  d.gastos.forEach(function (g) { if (g.mes > mes && (+g.parcelas || 1) > 1) futuras += +g.valor || 0; });
  Object.keys(virt).forEach(function (m) { if (m > mes) virt[m].forEach(function (g) { futuras += +g.valor || 0; }); });
  var tot = function (f) { return r2(itens.filter(f).reduce(function (s, i) { return s + (+i.valor || 0); }, 0)); };
  return {
    next: next, itens: itens, futuras: r2(futuras),
    total: tot(function () { return true; }),
    parcelas: tot(function (i) { return i.origem.indexOf('Parcela') === 0 || (i.origem === 'Já lançado' && (+i.parcelas || 1) > 1); }),
    recorr: tot(function (i) { return i.origem === 'Recorrente'; }),
    ja: tot(function (i) { return i.origem === 'Já lançado'; }),
    porCol: COLS.map(function (c) { return tot(function (i) { return i.coluna === c.id; }); })
  };
}
// cronograma de parcelas mês a mês até a última
function cronograma(d, mes, virt) {
  var meses = {};
  var add = function (g) { if (g.mes <= mes || !((+g.parcelas || 1) > 1)) return; var m = meses[g.mes] = meses[g.mes] || { total: 0, n: 0, fim: 0, libera: 0, cols: {} }; m.total += +g.valor || 0; m.n++; if ((+g.parcelaAtual || 1) >= (+g.parcelas || 1)) { m.fim++; m.libera += +g.valor || 0; } m.cols[g.coluna] = (m.cols[g.coluna] || 0) + (+g.valor || 0); };
  d.gastos.forEach(add); Object.keys(virt).forEach(function (k) { virt[k].forEach(add); });
  return Object.keys(meses).sort().map(function (k) { var m = meses[k]; return { mes: k, total: r2(m.total), n: m.n, fim: m.fim, libera: r2(m.libera), cols: m.cols }; });
}
function validadeInfo(iso, rot) {
  var dd = diasAte(iso), lab = rot || dataBR(iso);
  if (dd === null) return { k: 'sem', txt: 'Sem validade', bg: '#EFE6D6', fg: '#3D4440', dot: '#C9CDC9' };
  if (dd < 0) return { k: 'vermelho', txt: 'Vencido · ' + lab, bg: '#F1D9D2', fg: '#8C3B2E', dot: '#C46A58' };
  if (dd <= 15) return { k: 'vermelho', txt: dd === 0 ? 'Vence hoje' : 'Vence em ' + dd + 'd', bg: '#F1D9D2', fg: '#8C3B2E', dot: '#C46A58' };
  if (dd <= 60) return { k: 'amarelo', txt: 'Vence em ' + dd + 'd', bg: '#F3E7C6', fg: '#6E5418', dot: '#C9A24F' };
  return { k: 'verde', txt: 'Validade ' + lab, bg: '#D3E4D8', fg: '#24533F', dot: '#4F8A68' };
}

class Component extends DCLogic {
  state = (function () {
    var c = carregar();
    return {
      d: c.d, salvo: c.salvo, tab: 'home', mes: ultimoMes(c.d), hMes: hoje().slice(0, 7), hSel: hoje(), hValor: '',
      showFg: false, fg: fgVazio(), erro: '', busca: '', fCat: 'Todas', ordem: 'valor-desc', novaCat: '',
      fr: frVazio(), conf: '',
      showFm: false, fm: fmVazio(), fs: fsVazio(), aporte: {}, novo: {},
      showFw: false, fw: fwVazio(), wFiltro: 'Todas', novaWCat: '', cp: null,
      showFi: false, fi: fiVazio(), iBusca: '', iCat: 'Todas', iMarca: 'Todas', iStatus: 'Todos', iTipo: 'Todos', iVal: 'todos',
      notif: '', tick: 0, showBackup: false, importTxt: '', importMsg: '', backupMsg: '',
      menu: telaEstreita() ? 'fechado' : lerPref('fin-menu', 'aberto'), tema: temaInicial(),
      colAbertas: {}, invAbertas: {}, tiposAbertos: {}, acAbertos: {}, acabando: '', acabarSemData: false, ia: iaVazio()
    };
  })();

  componentDidMount() {
    var self = this;
    var v = this.state.d.habitos[this.state.hSel];
    if (v != null) this.setState({ hValor: String(v).replace('.', ',') });
    aplicarTema(this.state.tema);
    this._t = setInterval(function () { self.checarAviso(); self.setState({ tick: Date.now() }); }, 60000);
    this.checarAviso();
  }
  componentWillUnmount() { clearInterval(this._t); }

  precisaLembrar() {
    var d = this.state.d, h = hoje();
    if (d.habitos[h] != null) return false;
    var agora = new Date(); var t = pad(agora.getHours()) + ':' + pad(agora.getMinutes());
    return t >= (d.settings.lembreteHora || '20:00');
  }
  checarAviso() {
    try {
      if (!this.precisaLembrar()) return;
      var d = this.state.d; if (d.settings.ultimoAviso === hoje()) return;
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Minhas Finanças', { body: 'Não esqueça de registrar seus gastos de hoje.' });
        this.upd(function (x) { x.settings.ultimoAviso = hoje(); });
      }
    } catch (e) {}
  }
  ativarNotif() {
    var self = this;
    try {
      if (typeof Notification === 'undefined') { this.setState({ notif: 'indisponivel' }); return; }
      Notification.requestPermission().then(function (p) { self.setState({ notif: p }); self.checarAviso(); }).catch(function () { self.setState({ notif: 'indisponivel' }); });
    } catch (e) { this.setState({ notif: 'indisponivel' }); }
  }

  upd(fn) { var d = clone(this._d || this.state.d); fn(d); this._d = d; var ok = salvarLS(d); this.setState({ d: d, salvo: ok }); }
  bind(k, f) { var self = this; return function (e) { var t = e && e.target; var v = t ? (t.type === 'checkbox' ? t.checked : t.value) : e; self.setState(function (s) { var o = Object.assign({}, s[k]); o[f] = v; var r = {}; r[k] = o; return r; }); }; }
  binder(k) { var o = {}, self = this, src = this.state[k] || {}; Object.keys(src).forEach(function (f) { o[f] = self.bind(k, f); }); return o; }
  setv(k) { var self = this; return function (e) { var r = {}; r[k] = e.target.value; self.setState(r); }; }
  confirmar(key, fn) { var self = this; return function () { if (self.state.conf === key) { fn(); self.setState({ conf: '' }); } else self.setState({ conf: key }); }; }
  delTxt(key) { return this.state.conf === key ? 'Confirmar exclusão' : 'Excluir'; }
  irTab(t) { var self = this; return function () {
    var r = { tab: t, erro: '', conf: '', acabando: '' };
    if (t === 'gastos') r.colAbertas = {};
    if (t === 'inventario') { r.invAbertas = {}; r.tiposAbertos = {}; }
    if (telaEstreita()) r.menu = 'fechado';
    self.setState(r); try { window.scrollTo(0, 0); } catch (e) {}
  }; }
  alternarTema() { var t = this.state.tema === 'escuro' ? 'claro' : 'escuro'; gravarPref('fin-tema', t); aplicarTema(t); this.setState({ tema: t }); }
  alternarMenu() { var m = this.state.menu === 'aberto' ? 'fechado' : 'aberto'; if (!telaEstreita()) gravarPref('fin-menu', m); this.setState({ menu: m }); }

  // ---------- acabados ----------
  acabar(id, todas, semData) {
    var self = this;
    this.upd(function (d) {
      var z = d.inventario.find(function (q) { return q.id === id; }); if (!z) return;
      var tem = Math.max(1, parseInt(z.quantidade, 10) || 1), n = todas ? tem : 1;
      d.acabados = d.acabados || [];
      var snap = clone(z); snap.quantidade = n;
      d.acabados.push({ id: uid(), invId: z.id, nome: z.nome, marca: z.marca || '', categoria: z.categoria, tipo: z.tipo || '', unidades: n, data: semData ? '' : hoje(), item: snap });
      if (tem - n >= 1) z.quantidade = tem - n;
      else d.inventario = d.inventario.filter(function (q) { return q.id !== id; });
    });
    this.setState({ acabando: '' });
  }
  devolver(acId) {
    this.upd(function (d) {
      var a = (d.acabados || []).find(function (x) { return x.id === acId; }); if (!a) return;
      var z = d.inventario.find(function (q) { return q.id === a.invId; });
      if (z) z.quantidade = Math.max(1, parseInt(z.quantidade, 10) || 1) + (+a.unidades || 1);
      else { var it = Object.assign({ id: a.invId || uid(), nome: a.nome, marca: a.marca, categoria: a.categoria, tipo: a.tipo, status: 'Fechado' }, a.item || {}); it.quantidade = +a.unidades || 1; d.inventario.push(it); }
      d.acabados = d.acabados.filter(function (x) { return x.id !== acId; });
    });
  }

  // ---------- IA ----------
  iaSet(o) { this.setState({ ia: Object.assign({}, this.state.ia, o) }); }
  iaAbrir(modo) { this.setState({ ia: iaVazio(modo, this.state.mes) }); try { window.scrollTo(0, 0); } catch (e) {} }
  iaFechar() { this.iaPararGravacao(true); this.setState({ ia: iaVazio() }); }
  iaPararGravacao(descartar) { var g = this._grav; if (!g) return; g.descartar = !!descartar; clearTimeout(g.tm); try { g.rec.stop(); } catch (e) {} }
  iaGravar() {
    var self = this;
    if (this._grav) { this.iaPararGravacao(false); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') { this.iaSet({ erro: 'Este aparelho não permite gravar áudio aqui. Escreva o texto no campo abaixo.' }); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var rec = new MediaRecorder(stream), partes = [], g = { rec: rec, stream: stream };
      rec.ondataavailable = function (e) { if (e.data && e.data.size) partes.push(e.data); };
      rec.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        self._grav = null;
        if (g.descartar) return;
        self.iaSet({ gravando: false });
        var blob = new Blob(partes, { type: rec.mimeType || 'audio/webm' });
        if (!blob.size) { self.iaSet({ erro: 'Nenhum som foi gravado. Tente de novo.' }); return; }
        self.iaSet({ proc: true, procTxt: 'Preparando o áudio…', erro: '' });
        paraWav(blob).then(function (w) { return blobBase64(w).then(function (b) { return { mimeType: 'audio/wav', data: b }; }); })
          .catch(function () { return blobBase64(blob).then(function (b) { return { mimeType: String(blob.type || 'audio/webm').split(';')[0], data: b }; }); })
          .then(function (inl) { self.iaEnviar([{ inlineData: inl }], 'áudio'); });
      };
      self._grav = g; rec.start();
      g.tm = setTimeout(function () { self.iaPararGravacao(false); }, 120000);
      self.iaSet({ gravando: true, erro: '' });
    }).catch(function () { self.iaSet({ erro: 'Sem permissão para usar o microfone. Libere o microfone para o app (ou para o site) e tente de novo.' }); });
  }
  iaArquivo(e) {
    var self = this, f = e.target.files && e.target.files[0]; try { e.target.value = ''; } catch (x) {}
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) { this.iaSet({ erro: 'Arquivo com mais de 15 MB. Envie um arquivo menor.' }); return; }
    var tipo = f.type || (/\.pdf$/i.test(f.name) ? 'application/pdf' : 'image/jpeg');
    this.iaSet({ proc: true, procTxt: 'Lendo o arquivo…', erro: '' });
    blobBase64(f).then(function (b) { self.iaEnviar([{ inlineData: { mimeType: tipo, data: b } }], /pdf/.test(tipo) ? 'PDF' : 'imagem'); })
      .catch(function () { self.iaSet({ proc: false, erro: 'Não foi possível ler o arquivo.' }); });
  }
  iaEnviarTexto() { var t = String(this.state.ia.texto || '').trim(); if (!t) return; this.iaEnviar([{ text: 'Texto da usuária: ' + t }], 'texto'); }
  iaEnviar(conteudo, oque) {
    var self = this, d = this._d || this.state.d, ia = this.state.ia, chave = d.settings.geminiKey;
    if (!chave) { this.iaSet({ proc: false, erro: 'Salve a chave da IA primeiro.' }); return; }
    var prompt, schema, H = hoje();
    if (ia.modo === 'gastos') {
      prompt = 'Você extrai despesas para um app brasileiro de finanças pessoais. Hoje é ' + dataBR(H) + ' (' + H + ').\n' +
        'Leia o conteúdo a seguir (' + oque + ') e liste cada despesa.\n' +
        '- Se for fatura de cartão: liste cada compra, parcela, tarifa, juros ou IOF. NÃO inclua pagamentos da fatura anterior, saldo anterior, totais, limites nem créditos de pagamento. Estornos entram com valor negativo.\n' +
        '- Compras parceladas: informe parcelaAtual e parcelas (ex.: "03/10" → parcelaAtual 3, parcelas 10). À vista: 1 e 1.\n' +
        '- valor: número em reais com ponto decimal (ex.: 32.5). data: AAAA-MM-DD da compra; se o ano não aparecer, use o mais provável; se não houver data, deixe vazio. "Ontem", "hoje" etc. são relativos a hoje.\n' +
        '- coluna: "visa" = cartão Itaú Visa; "master" = cartão Inter Mastercard; "cartao" = outro cartão de crédito; "demais" = Pix, débito, dinheiro, boleto, contas e quando não souber.\n' +
        '- categoria: escolha a mais adequada entre: ' + d.categorias.join(', ') + '. Uber/99/táxi → Uber; iFood/delivery → IFood; supermercado → Mercado; contas da casa, luz, água, internet, telefone, saúde → Gastos Essenciais.\n' +
        '- mesFatura: se for fatura, o mês do vencimento em AAAA-MM; senão vazio.\n' +
        '- Não invente nada. Se algo não estiver claro, deixe o campo vazio. Se não houver despesas, devolva a lista vazia.';
      schema = { type: 'OBJECT', properties: { mesFatura: { type: 'STRING' }, itens: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
        descricao: { type: 'STRING' }, valor: { type: 'NUMBER' }, data: { type: 'STRING' }, categoria: { type: 'STRING', enum: d.categorias.slice() },
        coluna: { type: 'STRING', enum: ['visa', 'master', 'cartao', 'demais'] }, parcelaAtual: { type: 'INTEGER' }, parcelas: { type: 'INTEGER' } }, required: ['descricao', 'valor'] } } }, required: ['itens'] };
    } else {
      var cats = {}; d.inventario.forEach(function (x) { if (!x.categoria) return; cats[x.categoria] = cats[x.categoria] || {}; if (x.tipo) cats[x.categoria][x.tipo] = 1; });
      Object.keys(d.invTipos || {}).forEach(function (c) { cats[c] = cats[c] || {}; (d.invTipos[c] || []).forEach(function (t) { cats[c][t] = 1; }); });
      var lista = Object.keys(cats).map(function (c) { var t = Object.keys(cats[c]); return '- ' + c + (t.length ? ' (tipos: ' + t.join('; ') + ')' : ''); }).join('\n');
      prompt = 'Você cadastra produtos no inventário de beleza e casa de um app brasileiro. Hoje é ' + dataBR(H) + ' (' + H + ').\n' +
        'Leia o conteúdo a seguir (' + oque + ') e liste cada produto mencionado.\n' +
        '- nome: nome do produto sem a marca. marca: a marca, se dita.\n' +
        '- categoria e tipo: use de preferência uma destas categorias e tipos já existentes:\n' + lista + '\n  Se nenhuma servir, sugira um nome curto.\n' +
        '- quantidade: número de unidades (padrão 1).\n' +
        '- validade: AAAA-MM-DD; se só tiver mês e ano, use o último dia do mês; se não for dita, deixe vazio.\n' +
        '- valor: preço pago em reais com ponto decimal, se dito; senão 0.\n' +
        '- Não invente nada.';
      schema = { type: 'OBJECT', properties: { produtos: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
        nome: { type: 'STRING' }, marca: { type: 'STRING' }, categoria: { type: 'STRING' }, tipo: { type: 'STRING' }, quantidade: { type: 'INTEGER' }, validade: { type: 'STRING' }, valor: { type: 'NUMBER' } }, required: ['nome'] } } }, required: ['produtos'] };
    }
    this.iaSet({ proc: true, procTxt: 'A IA está lendo o ' + oque + '…', erro: '', itens: [] });
    chamarGemini(chave, [{ text: prompt }].concat(conteudo), schema).then(function (r) {
      var cur = self.state.ia; if (!cur.modo) return;
      var dd = self._d || self.state.d, itens, ex = {};
      var dataOk = function (s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? s : ''; };
      if (cur.modo === 'gastos') {
        var mesAlvo = /^\d{4}-\d{2}$/.test(r.mesFatura || '') ? r.mesFatura : cur.mes;
        dd.gastos.forEach(function (g) { ex[[g.mes, String(g.descricao).trim().toLowerCase(), r2(+g.valor || 0)].join('|')] = 1; });
        itens = (r.itens || []).filter(function (x) { return x && x.descricao && +x.valor; }).map(function (x) {
          var pa = Math.max(1, parseInt(x.parcelas, 10) || 1), at = Math.min(pa, Math.max(1, parseInt(x.parcelaAtual, 10) || 1));
          var dup = !!ex[[mesAlvo, String(x.descricao).trim().toLowerCase(), r2(+x.valor)].join('|')];
          return { incluir: !dup, dup: dup, descricao: String(x.descricao).trim(), valor: String(r2(+x.valor)).replace('.', ','), data: dataOk(x.data),
            coluna: ['visa', 'master', 'cartao', 'demais'].indexOf(x.coluna) >= 0 ? x.coluna : 'demais', categoria: dd.categorias.indexOf(x.categoria) >= 0 ? x.categoria : 'Outros',
            parcelaAtual: String(at), parcelas: String(pa) };
        });
        self.iaSet({ proc: false, itens: itens, mes: mesAlvo, erro: itens.length ? '' : 'A IA não encontrou despesas nesse conteúdo.' });
      } else {
        itens = (r.produtos || []).filter(function (x) { return x && x.nome; }).map(function (x) {
          return { incluir: true, dup: false, nome: String(x.nome).trim(), marca: String(x.marca || '').trim(), categoria: String(x.categoria || 'Outros').trim(), tipo: String(x.tipo || '').trim(),
            quantidade: String(Math.max(1, parseInt(x.quantidade, 10) || 1)), validade: dataOk(x.validade), valor: +x.valor ? String(r2(+x.valor)).replace('.', ',') : '' };
        });
        self.iaSet({ proc: false, itens: itens, erro: itens.length ? '' : 'A IA não encontrou produtos nesse conteúdo.' });
      }
    }).catch(function (e) { self.iaSet({ proc: false, erro: (e && e.message) || 'Não foi possível falar com a IA.' }); });
  }
  iaSalvar() {
    var self = this, ia = this.state.ia, sel = ia.itens.filter(function (x) { return x.incluir; });
    if (!sel.length) { this.iaSet({ erro: 'Marque ao menos um item para salvar.' }); return; }
    if (ia.modo === 'gastos') {
      var ok = sel.filter(function (x) { return String(x.descricao).trim() && num(x.valor); });
      this.upd(function (d) {
        ok.forEach(function (x) {
          var pa = Math.max(1, parseInt(x.parcelas, 10) || 1), at = Math.min(pa, Math.max(1, parseInt(x.parcelaAtual, 10) || 1));
          d.gastos.push({ id: uid(), mes: ia.mes, data: x.data, descricao: String(x.descricao).trim(), categoria: x.categoria, valor: r2(num(x.valor)), coluna: x.coluna,
            forma: x.coluna === 'demais' ? '' : 'Crédito', cartao: '', parcelas: pa, parcelaAtual: at, vencimento: '', obs: 'Lançado com IA', recorrente: false, pago: false, pagoEm: '' });
        });
      });
      this.setState({ ia: iaVazio(), mes: ia.mes, tab: 'gastos', colAbertas: {} });
    } else {
      var abrir = Object.assign({}, this.state.invAbertas);
      sel.forEach(function (x) { if (String(x.categoria).trim()) { var c = self.criarCatInv(x.categoria); x.categoria = c; abrir[c] = true; if (x.tipo) self.registrarTipo(c, x.tipo); } });
      this.upd(function (d) {
        sel.forEach(function (x) {
          d.inventario.push({ id: uid(), nome: x.nome, marca: x.marca, categoria: x.categoria || 'Outros', tipo: x.tipo, aquisicao: hoje(), validade: x.validade,
            quantidade: Math.max(1, parseInt(x.quantidade, 10) || 1), valor: r2(num(x.valor)), status: 'Fechado', obs: '' });
        });
      });
      this.setState({ ia: iaVazio(), invAbertas: abrir });
    }
  }
  selDia(iso) { var v = this.state.d.habitos[iso]; this.setState({ hSel: iso, hValor: v == null ? '' : String(v).replace('.', ',') }); }

  // ---------- gastos ----------
  salvarGasto() {
    var f = this.state.fg, valor = num(f.valor);
    if (!String(f.descricao).trim() || !valor) { this.setState({ erro: 'Informe ao menos a descrição e o valor (use valor negativo para estornos e créditos).' }); return; }
    var parcelas = Math.max(1, parseInt(f.parcelas, 10) || 1);
    var atual = Math.min(parcelas, Math.max(1, parseInt(f.parcelaAtual, 10) || 1));
    var g = { descricao: String(f.descricao).trim(), data: f.data, categoria: f.categoria, valor: r2(valor), coluna: f.coluna, forma: f.forma, cartao: String(f.cartao).trim(), parcelas: parcelas, parcelaAtual: atual, vencimento: f.vencimento, obs: String(f.obs).trim(), recorrente: !!f.recorrente, pago: !!f.pago, pagoEm: f.pago ? (f.pagoEm || hoje()) : '' };
    var mes = this.state.mes;
    this.upd(function (d) {
      if (f.editId) { var i = d.gastos.findIndex(function (x) { return x.id === f.editId; }); if (i >= 0) d.gastos[i] = Object.assign({}, d.gastos[i], g); }
      else d.gastos.push(Object.assign({ id: uid(), mes: mes }, g));
    });
    this.setState({ fg: fgVazio(), showFg: false, erro: '' });
  }
  editarGasto(g) {
    this.setState({ showFg: true, erro: '', fg: { editId: g.id, data: g.data || '', descricao: g.descricao, categoria: g.categoria, valor: String(g.valor).replace('.', ','), coluna: g.coluna, forma: g.forma || '', cartao: g.cartao || '', parcelas: String(g.parcelas || 1), parcelaAtual: String(g.parcelaAtual || 1), vencimento: g.vencimento || '', obs: g.obs || '', recorrente: !!g.recorrente, pago: !!g.pago, pagoEm: g.pagoEm || '' } });
  }
  excluirGasto(g, modo) {
    var parc = (+g.parcelas || 1) > 1, k = parc ? chaveParc(g) : chaveRec(g);
    var chaveDe = function (y) { return (+y.parcelas || 1) > 1 ? 'p' + chaveParc(y) : 'r' + chaveRec(y); }, alvo = (parc ? 'p' : 'r') + k;
    this.upd(function (x) {
      x.pulos = x.pulos || {}; x.cortes = x.cortes || {};
      if (modo === 'serie') {
        x.cortes[k] = g.mes;
        x.gastos = x.gastos.filter(function (y) { return y.mes < g.mes || chaveDe(y) !== alvo; });
      } else {
        if (!g.virtual) x.gastos = x.gastos.filter(function (y) { return y.id !== g.id; });
        if (modo === 'mes') x.pulos[k + '@' + g.mes] = true;
      }
    });
    this.setState({ conf: '' });
  }
  addCat() {
    var n = String(this.state.novaCat).trim(); if (!n) return;
    if (this.state.d.categorias.indexOf(n) < 0) this.upd(function (d) { d.categorias.push(n); });
    this.setState({ novaCat: '', fg: Object.assign({}, this.state.fg, { categoria: n }) });
  }
  iniciarProximo() {
    var mes = this.state.mes, p = projecao(this.state.d, mes), novos = p.itens.filter(function (i) { return i.origem !== 'Já lançado'; });
    this.upd(function (d) {
      novos.forEach(function (i) {
        d.gastos.push({ id: uid(), mes: p.next, data: (+i.parcelas || 1) > 1 ? (i.data || '') : '', descricao: i.descricao, categoria: i.categoria, valor: i.valor, coluna: i.coluna, forma: i.forma || '', cartao: i.cartao || '', parcelas: i.parcelas, parcelaAtual: i.parcelaAtual, vencimento: addMesData(i.vencimento), obs: i.obs || '', recorrente: !!i.recorrente, grupo: i.grupo || '' });
      });
    });
    this.setState({ mes: p.next });
  }
  salvarReceita() {
    var f = this.state.fr, v = num(f.valor);
    if (!String(f.descricao).trim() || !(v > 0)) return;
    var mes = this.state.mes;
    this.upd(function (d) { d.receitas.push({ id: uid(), mes: mes, data: f.data, descricao: String(f.descricao).trim(), valor: r2(v) }); });
    this.setState({ fr: frVazio() });
  }

  // ---------- metas ----------
  salvarMeta() {
    var f = this.state.fm, ob = num(f.objetivo), chk = f.tipo === 'checklist';
    if (!String(f.nome).trim() || (!chk && !(ob > 0))) { this.setState({ erro: chk ? 'Informe o nome da meta.' : 'Informe o nome e o valor objetivo.' }); return; }
    var m = chk ? { tipo: 'checklist', nome: String(f.nome).trim(), prazo: f.prazo, prioridade: f.prioridade }
      : { tipo: 'valor', nome: String(f.nome).trim(), objetivo: r2(ob), alcancado: r2(num(f.alcancado)), prazo: f.prazo, prioridade: f.prioridade };
    this.upd(function (d) {
      if (f.editId) { var i = d.metas.findIndex(function (x) { return x.id === f.editId; }); if (i >= 0) d.metas[i] = Object.assign({}, d.metas[i], m, chk ? { itens: d.metas[i].itens || [] } : {}); }
      else d.metas.push(Object.assign({ id: uid(), submetas: [], itens: [] }, m));
    });
    this.setState({ fm: fmVazio(), showFm: false, erro: '' });
  }
  salvarSub() {
    var f = this.state.fs, v = num(f.valor);
    var alvo = this.state.d.metas.find(function (x) { return x.id === f.metaId; });
    var chk = alvo && alvo.tipo === 'checklist';
    if (!f.metaId || !String(f.nome).trim() || (!chk && !(v > 0))) return;
    this.upd(function (d) { var m = d.metas.find(function (x) { return x.id === f.metaId; }); if (!m) return; m.submetas = m.submetas || [];
      m.submetas.push(chk ? { id: uid(), nome: String(f.nome).trim(), prazo: f.prazo, itens: [], feito: false } : { id: uid(), nome: String(f.nome).trim(), valor: r2(v), prazo: f.prazo }); });
    this.setState({ fs: fsVazio() });
  }

  // ---------- pagamentos ----------
  marcarPago(lista, v) {
    var hj = hoje();
    this.upd(function (d) {
      lista.forEach(function (g) {
        if (g.virtual) { if (!v) return; var n = Object.assign({}, g); delete n.virtual; delete n.previsto; n.id = uid(); n.pago = true; n.pagoEm = hj; d.gastos.push(n); }
        else { var r = d.gastos.find(function (x) { return x.id === g.id; }); if (r) { r.pago = v; r.pagoEm = v ? hj : ''; } }
      });
    });
  }

  // ---------- checklists de metas ----------
  alvoLista(d, metaId, subId) { var m = d.metas.find(function (x) { return x.id === metaId; }); if (!m) return null; if (!subId) { m.itens = m.itens || []; return m.itens; } var s = (m.submetas || []).find(function (x) { return x.id === subId; }); if (!s) return null; s.itens = s.itens || []; return s.itens; }
  addItem(metaId, subId) {
    var key = subId ? 's:' + subId : 'm:' + metaId, txt = String(this.state.novo[key] || '').trim(), self = this; if (!txt) return;
    this.upd(function (d) { var l = self.alvoLista(d, metaId, subId); if (l) l.push({ id: uid(), texto: txt, feito: false }); });
    var n = Object.assign({}, this.state.novo); n[key] = ''; this.setState({ novo: n });
  }
  marcarItem(metaId, subId, itemId, v) { var self = this; this.upd(function (d) { var l = self.alvoLista(d, metaId, subId); var it = l && l.find(function (x) { return x.id === itemId; }); if (it) { it.feito = v; it.feitoEm = v ? hoje() : ''; } }); }
  removerItem(metaId, subId, itemId) { var self = this; this.upd(function (d) { var m = d.metas.find(function (x) { return x.id === metaId; }); if (!m) return; if (!subId) m.itens = (m.itens || []).filter(function (x) { return x.id !== itemId; }); else { var s = (m.submetas || []).find(function (x) { return x.id === subId; }); if (s) s.itens = (s.itens || []).filter(function (x) { return x.id !== itemId; }); } }); }
  marcarSub(metaId, subId, v) { this.upd(function (d) { var m = d.metas.find(function (x) { return x.id === metaId; }); var s = m && (m.submetas || []).find(function (x) { return x.id === subId; }); if (s) s.feito = v; }); }

  // ---------- wishlist ----------
  salvarW() {
    var f = this.state.fw;
    if (!String(f.nome).trim()) { this.setState({ erro: 'Informe o nome do produto.' }); return; }
    var w = { cat: f.cat, nome: String(f.nome).trim(), marca: String(f.marca).trim(), validade: f.validade, valor: r2(num(f.valor)), prioridade: f.prioridade, link: String(f.link).trim(), obs: String(f.obs).trim() };
    this.upd(function (d) {
      if (f.editId) { var i = d.wishlist.findIndex(function (x) { return x.id === f.editId; }); if (i >= 0) d.wishlist[i] = Object.assign({}, d.wishlist[i], w); }
      else d.wishlist.push(Object.assign({ id: uid(), status: 'Desejado', incluido: hoje() }, w));
    });
    this.setState({ fw: fwVazio(f.cat), showFw: false, erro: '' });
  }
  addWCat() {
    var n = String(this.state.novaWCat).trim(); if (!n) return;
    if (this.state.d.wishCats.indexOf(n) < 0) this.upd(function (d) { d.wishCats.push(n); });
    this.setState({ novaWCat: '', wFiltro: n });
  }
  confirmarCompra() {
    var c = this.state.cp; if (!c) return; var val = r2(num(c.valor));
    this.upd(function (d) {
      var w = d.wishlist.find(function (x) { return x.id === c.id; }); if (!w || w.status === 'Adquirido') return;
      w.status = 'Adquirido'; w.compradoEm = c.data;
      d.inventario.push({ id: uid(), nome: w.nome, categoria: w.cat, marca: w.marca, aquisicao: c.data, validade: w.validade, quantidade: 1, valor: val, status: 'Fechado', obs: w.obs, origem: 'wishlist' });
      if (c.registrar && val > 0) d.gastos.push({ id: uid(), mes: (c.data || hoje()).slice(0, 7), data: c.data, descricao: w.nome, categoria: 'Beleza', valor: val, coluna: c.coluna, forma: '', cartao: '', parcelas: 1, parcelaAtual: 1, vencimento: '', obs: 'Compra da wishlist', recorrente: false });
    });
    this.setState({ cp: null });
  }

  // ---------- inventário ----------
  criarCatInv(nome) {
    nome = String(nome || '').trim(); if (!nome) return '';
    var exist = (this._d || this.state.d).wishCats.find(function (x) { return x.toLowerCase() === nome.toLowerCase(); });
    var n = exist || nome;
    this.upd(function (d) { if (d.wishCats.indexOf(n) < 0) d.wishCats.push(n); d.invCats = d.invCats || []; if (d.invCats.indexOf(n) < 0) d.invCats.push(n); if (d.invFechadas) delete d.invFechadas[n]; });
    var o = Object.assign({}, this.state.invAbertas); o[n] = true; this.setState({ invAbertas: o });
    return n;
  }
  togglaCat(cat, abrir) { this.upd(function (d) { d.invFechadas = d.invFechadas || {}; if (abrir) delete d.invFechadas[cat]; else d.invFechadas[cat] = true; }); }
  tiposDaCat(cat) {
    var d = this._d || this.state.d, t = {};
    d.inventario.forEach(function (x) { if (x.categoria === cat && x.tipo) t[x.tipo] = true; });
    ((d.invTipos || {})[cat] || []).forEach(function (x) { t[x] = true; });
    return Object.keys(t).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
  }
  registrarTipo(cat, nome) {
    this.upd(function (d) { d.invTipos = d.invTipos || {}; var l = d.invTipos[cat] = d.invTipos[cat] || []; if (l.indexOf(nome) < 0) l.push(nome); });
  }
  criarTipo() {
    var f = this.state.fi, nt = String(f.novoTipo || '').trim(); if (!nt) return;
    var existe = this.tiposDaCat(f.categoria).find(function (x) { return x.toLowerCase() === nt.toLowerCase(); });
    if (!existe) this.registrarTipo(f.categoria, nt);
    this.setState({ fi: Object.assign({}, this.state.fi, { tipo: existe || nt, novoTipo: '' }), erro: '' });
  }
  salvarI() {
    var f = Object.assign({}, this.state.fi);
    if (!String(f.nome).trim()) { this.setState({ erro: 'Informe o nome do produto.' }); return; }
    if (f.categoria === '__nova__') { var nc = this.criarCatInv(f.novaCat); if (!nc) { this.setState({ erro: 'Digite o nome da nova categoria ou escolha uma existente.' }); return; } f.categoria = nc; }
    if (f.tipo === '__novo__') { var nt = String(f.novoTipo || '').trim(); if (!nt) { this.setState({ erro: 'Digite o nome do novo tipo ou escolha um tipo existente.' }); return; } this.registrarTipo(f.categoria, nt); f.tipo = nt; }
    var p = { nome: String(f.nome).trim(), categoria: f.categoria, marca: String(f.marca).trim(), aquisicao: f.aquisicao, validade: f.validade, quantidade: Math.max(1, parseInt(f.quantidade, 10) || 1), valor: r2(num(f.valor)), status: f.status, obs: String(f.obs).trim(), tipo: String(f.tipo || '').trim(), validadeTxt: f.validade === f.validadeOrig ? (f.validadeTxt || '') : '' };
    this.upd(function (d) {
      if (f.editId) { var i = d.inventario.findIndex(function (x) { return x.id === f.editId; }); if (i >= 0) d.inventario[i] = Object.assign({}, d.inventario[i], p); }
      else d.inventario.push(Object.assign({ id: uid() }, p));
    });
    this.setState({ fi: fiVazio(), showFi: false, erro: '' });
  }

  novoProdutoEm(cat, tipo) {
    var o = Object.assign({}, this.state.invAbertas); o[cat] = true;
    this.setState({ showFi: true, erro: '', fi: fiCom(cat, tipo), invAbertas: o });
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { try { window.scrollTo(0, 0); } catch (x) {} }
  }
  renderVals() {
    var self = this, s = this.state, d = s.d, mes = s.mes, H = hoje();
    var meta = +d.settings.metaDiaria || 50;
    var tabs = ['home', 'gastos', 'metas', 'habitos', 'wishlist', 'inventario', 'acabados'];
    var nb = {}, nf = {}, go = {};
    tabs.forEach(function (t) { nb[t] = s.tab === t ? '#1F4D3A' : 'transparent'; nf[t] = s.tab === t ? '#FFFFFE' : '#3D4440'; go[t] = self.irTab(t); });

    // ----- gastos do mês -----
    var virt = parcelasVirtuais(d);
    var doMes = gastosDoMes(d, mes, virt);
    var totCol = COLS.map(function (c) { return r2(doMes.filter(function (g) { return g.coluna === c.id; }).reduce(function (a, g) { return a + (+g.valor || 0); }, 0)); });
    var total = r2(totCol.reduce(function (a, b) { return a + b; }, 0));
    var receitasMes = d.receitas.filter(function (r) { return r.mes === mes; });
    var receita = r2(receitasMes.reduce(function (a, r) { return a + (+r.valor || 0); }, 0));
    var saldo = r2(receita - total);

    var q = String(s.busca).trim().toLowerCase();
    var ord = {
      'valor-desc': function (a, b) { return b.valor - a.valor; },
      'valor-asc': function (a, b) { return a.valor - b.valor; },
      'data': function (a, b) { return String(a.data || '9999').localeCompare(String(b.data || '9999')); },
      'descricao': function (a, b) { return String(a.descricao).localeCompare(String(b.descricao), 'pt-BR'); }
    }[s.ordem];
    var cols = COLS.map(function (c, ci) {
      var itens = doMes.filter(function (g) {
        if (g.coluna !== c.id) return false;
        if (s.fCat !== 'Todas' && g.categoria !== s.fCat) return false;
        if (!q) return true;
        return [g.descricao, g.categoria, g.cartao, g.obs, g.forma].join(' ').toLowerCase().indexOf(q) >= 0;
      }).sort(ord).map(function (g) {
        var key = 'g:' + g.id, ehParc = (+g.parcelas || 1) > 1;
        var serie = ehParc || !!g.virtual || !!g.recorrente || d.gastos.some(function (y) { return (+y.parcelas || 1) <= 1 && y.recorrente && y.mes < g.mes && chaveRec(y) === chaveRec(g); });
        var ult = (+g.parcelas || 1) > 1 && (+g.parcelaAtual || 1) >= (+g.parcelas || 1);
        var det = [];
        if (g.data) det.push(dataBR(g.data));
        if (g.forma) det.push(g.forma);
        if (g.cartao) det.push(g.cartao);
        if (g.vencimento) det.push('vence ' + dataBR(g.vencimento));
        return {
          descricao: g.descricao, categoria: g.categoria, valorTxt: brl(g.valor),
          temParc: (+g.parcelas || 1) > 1, parcTxt: (ult ? 'Última parcela ' : 'Parcela ') + pad(g.parcelaAtual) + '/' + pad(g.parcelas),
          parcBg: ult ? '#4F8A68' : '#EFE6D6', parcFg: ult ? '#FFFFFE' : '#6B5432',
          rowBg: ult ? '#E8F1EA' : 'transparent', rowPad: ult ? '10px' : '0px', rowRad: ult ? '12px' : '0px', rowLine: ult ? 'inset 3px 0 0 #4F8A68' : 'none',
          recorrente: !!g.recorrente, semData: !g.data && !g.virtual, detalhe: det.join(' · '),
          virtual: !!g.virtual, real: !g.virtual, pago: !!g.pago, pagoAria: 'Pago: ' + g.descricao,
          togglePago: function (e) { self.marcarPago([g], e.target.checked); },
          temObs: !!g.obs, obs: g.obs,
          edit: function () { self.editarGasto(g); },
          del: serie ? function () { self.setState({ conf: self.state.conf === key ? '' : key }); } : self.confirmar(key, function () { self.excluirGasto(g, 'unico'); }),
          delTxt: serie ? 'Excluir' : self.delTxt(key),
          perguntando: serie && s.conf === key,
          pergunta: ehParc ? 'Excluir a compra parcelada “' + g.descricao + '”:' : 'Excluir o gasto recorrente “' + g.descricao + '”:',
          delMes: function () { self.excluirGasto(g, 'mes'); }, delMesTxt: 'Só ' + mesNome(g.mes),
          delSerie: function () { self.excluirGasto(g, 'serie'); }, delSerieTxt: ehParc ? 'Esta e as próximas parcelas' : 'Este e os próximos meses',
          cancelarDel: function () { self.setState({ conf: '' }); }
        };
      });
      var todos = doMes.filter(function (g) { return g.coluna === c.id; });
      var pagoV = r2(todos.filter(function (g) { return g.pago; }).reduce(function (a, g) { return a + (+g.valor || 0); }, 0));
      var todoPago = todos.length > 0 && todos.every(function (g) { return g.pago; });
      var colAb = !!s.colAbertas[c.id] || !!q || s.fCat !== 'Todas';
      return { aberto: colAb, ariaExp: colAb ? 'true' : 'false', rot: colAb ? '90deg' : '0deg',
        resumoTxt: todos.length ? (todoPago ? 'pago' : todos.length + (todos.length === 1 ? ' lançamento' : ' lançamentos')) : 'vazio',
        toggle: function () { var o = Object.assign({}, self.state.colAbertas); o[c.id] = !o[c.id]; self.setState({ colAbertas: o }); },
        temItens: todos.length > 0, todoPago: todoPago, pagoFg: todoPago ? '#2E6349' : '#5E6560',
        pagoLabel: todoPago ? (c.id === 'demais' ? 'Tudo pago' : 'Fatura paga') : (c.id === 'demais' ? 'Marcar tudo como pago' : 'Marcar fatura como paga'),
        pagoResumo: todoPago ? 'pago ' + brl(pagoV) : 'em aberto ' + brl(r2(totCol[ci] - pagoV)),
        togglePago: function (e) { self.marcarPago(todos, e.target.checked); },
        nome: c.nome, cor: c.cor, totalTxt: brl(totCol[ci]), itens: itens, vazio: itens.length === 0, vazioTxt: (q || s.fCat !== 'Todas') ? 'Nada encontrado com esse filtro.' : 'Nenhum lançamento neste mês.' };
    });

    // ----- projeção -----
    var p = projecao(d, mes, virt);
    var cr = cronograma(d, mes, virt), crMax = Math.max.apply(null, cr.map(function (m) { return m.total; }).concat([1]));
    var cron = cr.map(function (m) {
      return { label: mesCurto(m.mes), totalTxt: brl(m.total).replace(',00', ''), h: (m.total / crMax * 100).toFixed(1) + '%',
        nTxt: m.n + (m.n === 1 ? ' parcela' : ' parcelas'), fimTxt: m.fim ? m.fim + (m.fim === 1 ? ' termina' : ' terminam') : '', liberaTxt: m.libera ? '−' + brl(m.libera).replace(',00', '') : '',
        segs: COLS.filter(function (c) { return m.cols[c.id]; }).map(function (c) { return { cor: c.cor, h: (m.cols[c.id] / m.total * 100).toFixed(2) + '%' }; }) };
    });
    var cronLibera = r2(cr.reduce(function (a, m) { return a + m.libera; }, 0));
    var diff = total > 0 ? (p.total - total) / total : (p.total > 0 ? 1 : 0);
    var pTend = Math.abs(diff) <= 0.02 ? { txt: '→ Estável em relação a ' + mesCurto(mes), bg: '#EFE6D6', fg: '#3D4440' }
      : diff > 0 ? { txt: '↑ Aumento de ' + pctTxt(diff * 100) + ' vs. ' + mesCurto(mes), bg: '#F1D9D2', fg: '#8C3B2E' }
      : { txt: '↓ Redução de ' + pctTxt(-diff * 100) + ' vs. ' + mesCurto(mes), bg: '#D3E4D8', fg: '#24533F' };

    // ----- gráficos -----
    var meses = {}; d.gastos.forEach(function (g) { meses[g.mes] = true; }); meses[mes] = true;
    var lista = Object.keys(meses).sort().slice(-12);
    var tots = lista.map(function (m) { return totalMes(d, m, virt); });
    var mx = Math.max.apply(null, tots.concat([1]));
    var evol = lista.map(function (m, i) { return { label: mesCurto(m), valorTxt: brl(tots[i]).replace(',00', ''), h: (tots[i] / mx * 100).toFixed(1) + '%', cor: m === mes ? '#7FAE8E' : '#E2D3BA', lc: m === mes ? '#1E2421' : '#6B716C' }; });

    var catTot = {}, catQtd = {};
    doMes.forEach(function (g) { var k = g.categoria || 'Outros'; catTot[k] = (catTot[k] || 0) + (+g.valor || 0); catQtd[k] = (catQtd[k] || 0) + 1; });
    var catLista = d.categorias.slice(); Object.keys(catTot).forEach(function (k) { if (catLista.indexOf(k) < 0) catLista.push(k); });
    var catRows = catLista.map(function (k, i) { return { nome: k, v: r2(catTot[k] || 0), cor: corCat(k, i) }; }).filter(function (x) { return x.v !== 0; }).sort(function (a, b) { return b.v - a.v; });
    var somaPos = catRows.reduce(function (a, x) { return a + Math.max(0, x.v); }, 0);
    var acc = 0, stops = [];
    catRows.forEach(function (x) { if (somaPos > 0 && x.v > 0) { var a = acc, b = acc + x.v / somaPos * 100; stops.push(x.cor + ' ' + a.toFixed(2) + '% ' + b.toFixed(2) + '%'); acc = b; } });
    var donut = stops.length ? 'conic-gradient(' + stops.join(', ') + ')' : '#ECEDE9';
    var donutLeg = catRows.length ? catRows.map(function (x) { return { nome: x.nome, cor: x.cor, valorTxt: brl(x.v), pctTxt: pctTxt(pct(Math.max(0, x.v), somaPos)) }; }) : [{ nome: 'Sem gastos neste mês', cor: '#ECEDE9', valorTxt: '', pctTxt: '' }];
    var balanco = ['Uber', 'IFood', 'Mercado'].map(function (k) {
      var v = r2(catTot[k] || 0), n = catQtd[k] || 0;
      return { nome: k, cor: corCat(k, 0), bg: { Uber: '#E8F1EA', IFood: '#EEF4F0', Mercado: '#F7F2E9' }[k], valorTxt: brl(v),
        sub: n ? n + (n === 1 ? ' lançamento' : ' lançamentos') + ' · ' + pctTxt(pct(v, total)) : 'Sem lançamentos',
        w: pct(v, total) + '%', v: v };
    });
    var balMax = Math.max.apply(null, balanco.map(function (b) { return b.v; }).concat([1]));
    balanco.forEach(function (b) { b.h = (Math.max(0, b.v) / balMax * 100).toFixed(1) + '%'; });
    var balSoma = r2(balanco.reduce(function (a, b) { return a + b.v; }, 0));

    var ant = totalMes(d, addMes(mes, -1), virt);
    var anteriores = Object.keys(meses).filter(function (m) { return m < mes; });
    var media = anteriores.length ? r2(anteriores.reduce(function (a, m) { return a + totalMes(d, m, virt); }, 0) / anteriores.length) : 0;
    var cmx = Math.max(total, ant, media, 1);
    var comp = [
      { label: 'Mês atual (' + mesCurto(mes) + ')', valorTxt: brl(total), w: pct(total, cmx) + '%', cor: '#7FAE8E' },
      { label: 'Mês anterior (' + mesCurto(addMes(mes, -1)) + ')', valorTxt: brl(ant), w: pct(ant, cmx) + '%', cor: '#2E6349' },
      { label: anteriores.length ? 'Média dos meses anteriores (' + anteriores.length + ')' : 'Média dos meses anteriores (sem histórico)', valorTxt: brl(media), w: pct(media, cmx) + '%', cor: '#CDB591' }
    ];
    var pmx = Math.max(total, p.total, 1);
    var projBars = [
      { label: 'Realizado em ' + mesCurto(mes), valorTxt: brl(total), w: pct(total, pmx) + '%', cor: '#7FAE8E' },
      { label: 'Projetado para ' + mesCurto(p.next), valorTxt: brl(p.total), w: pct(p.total, pmx) + '%', cor: '#A9C9B3' }
    ];

    // ----- metas -----
    var somaOb = 0, somaAl = 0, proximas = [];
    var pcts = [];
    var itemVM = function (m, sid, it) { return { texto: it.texto, feito: !!it.feito, risco: it.feito ? 'line-through' : 'none', op: it.feito ? '0.6' : '1',
      toggle: function (e) { self.marcarItem(m.id, sid, it.id, e.target.checked); }, del: function () { self.removerItem(m.id, sid, it.id); } }; };
    var novoH = function (key) { return function (e) { var n = Object.assign({}, self.state.novo); n[key] = e.target.value; self.setState({ novo: n }); }; };
    var metas = d.metas.map(function (m) {
      var dd = diasAte(m.prazo);
      if (m.tipo === 'checklist') {
        var mi = m.itens || [], subsC = [];
        var tot = mi.length, feitos = mi.filter(function (x) { return x.feito; }).length;
        var segs = [{ nome: 'Checklist da meta', flex: 1, w: pct(feitos, mi.length) + '%', cor: '#1F4D3A' }];
        var csubs = subsC.map(function (sm) {
          var si = sm.itens || [], st2 = si.length || 1, sf = si.length ? si.filter(function (x) { return x.feito; }).length : (sm.feito ? 1 : 0);
          tot += st2; feitos += sf;
          var sdd = diasAte(sm.prazo), sp = pct(sf, st2);
          var sst = sf >= st2 ? 'Concluída' : (sdd !== null && sdd < 0) ? 'Atrasada' : sf > 0 ? 'Em andamento' : 'Não iniciada';
          if (sm.prazo && sst !== 'Concluída') proximas.push({ nome: sm.nome, sub: m.nome, prazo: sm.prazo, dd: sdd });
          var cor = sst === 'Concluída' ? '#4F8A68' : sst === 'Atrasada' ? '#C46A58' : '#7FAE8E';
          segs.push({ nome: sm.nome, flex: st2, w: sp + '%', cor: cor });
          var key = 's:' + sm.id;
          return { nome: sm.nome, status: sst, stBg: STAT[sst][0], stFg: STAT[sst][1], w: sp + '%', cor: cor, pctTxt: pctTxt(sp),
            progTxt: si.length ? sf + ' de ' + si.length + (si.length === 1 ? ' tarefa' : ' tarefas') : (sm.feito ? 'concluída' : 'sem tarefas — marque quando concluir'),
            prazoTxt: sm.prazo ? 'até ' + dataBR(sm.prazo) + ' · ' + quandoTxt(sdd) : 'sem prazo',
            semItens: si.length === 0, feito: !!sm.feito, risco: sst === 'Concluída' ? 'line-through' : 'none', ckAria: 'Submeta concluída: ' + sm.nome,
            toggle: function (e) { self.marcarSub(m.id, sm.id, e.target.checked); },
            itens: si.map(function (it) { return itemVM(m, sm.id, it); }),
            novoVal: s.novo[key] || '', onNovo: novoH(key), addItem: function () { self.addItem(m.id, sm.id); },
            del: self.confirmar(key, function () { self.upd(function (x) { var mm = x.metas.find(function (y) { return y.id === m.id; }); if (mm) mm.submetas = mm.submetas.filter(function (y) { return y.id !== sm.id; }); }); }),
            delTxt: self.delTxt(key) };
        });
        var pc = pct(feitos, tot); pcts.push(pc);
        var stc = (tot > 0 && feitos >= tot) ? 'Concluída' : (dd !== null && dd < 0) ? 'Atrasada' : feitos > 0 ? 'Em andamento' : 'Não iniciada';
        if (m.prazo && stc !== 'Concluída') proximas.push({ nome: m.nome, sub: 'Meta principal', prazo: m.prazo, dd: dd });
        var keyc = 'm:' + m.id;
        return {
          ehCheck: true, ehValor: false, nome: m.nome, prioridade: m.prioridade, pBg: (PRIO[m.prioridade] || PRIO['Média'])[0], pFg: (PRIO[m.prioridade] || PRIO['Média'])[1],
          status: stc, stBg: STAT[stc][0], stFg: STAT[stc][1], pctTxt: pctTxt(pc), w: pc + '%', feitosTxt: feitos + ' / ' + tot, segs: segs,
          prazoTxt: m.prazo ? 'Prazo: ' + dataBR(m.prazo) + ' · ' + quandoTxt(dd) : 'Sem prazo definido',
          itens: mi.map(function (it) { return itemVM(m, null, it); }), semItens: mi.length === 0,
          novoVal: s.novo[keyc] || '', onNovo: novoH(keyc), addItem: function () { self.addItem(m.id, null); },
          csubs: csubs, subs: [], marcos: [], semSubs: csubs.length === 0,
          edit: function () { self.setState({ showFm: true, erro: '', fm: { editId: m.id, tipo: 'checklist', nome: m.nome, objetivo: '', alcancado: '', prazo: m.prazo || '', prioridade: m.prioridade || 'Média' } }); },
          del: self.confirmar(keyc, function () { self.upd(function (x) { x.metas = x.metas.filter(function (y) { return y.id !== m.id; }); }); }),
          delTxt: self.delTxt(keyc),
          subAberto: s.fs.metaId === m.id,
          abrirSub: function () { self.setState({ fs: Object.assign(fsVazio(), { metaId: m.id }) }); }
        };
      }
      var al = +m.alcancado || 0, ob = +m.objetivo || 0; somaOb += ob; somaAl += Math.min(al, ob); pcts.push(pct(al, ob));
      var st = (ob > 0 && al >= ob) ? 'Concluída' : (dd !== null && dd < 0) ? 'Atrasada' : al > 0 ? 'Em andamento' : 'Não iniciada';
      if (m.prazo && st !== 'Concluída') proximas.push({ nome: m.nome, sub: 'Meta principal', prazo: m.prazo, dd: dd });
      var prev = 0;
      var subsOrd = (m.submetas || []).slice().sort(function (a, b) { return a.valor - b.valor; });
      var subs = subsOrd.map(function (sm) {
        var v = +sm.valor || 0, sdd = diasAte(sm.prazo);
        var sst = al >= v ? 'Concluída' : (sdd !== null && sdd < 0) ? 'Atrasada' : al > prev ? 'Em andamento' : 'Não iniciada';
        prev = v;
        if (sm.prazo && sst !== 'Concluída') proximas.push({ nome: sm.nome, sub: m.nome, prazo: sm.prazo, dd: sdd });
        var sp = pct(Math.min(al, v), v), key = 's:' + sm.id;
        return {
          nome: sm.nome, status: sst, stBg: STAT[sst][0], stFg: STAT[sst][1],
          progTxt: brl(Math.min(al, v)) + ' / ' + brl(v), pctTxt: pctTxt(sp), w: sp + '%',
          cor: sst === 'Concluída' ? '#4F8A68' : sst === 'Atrasada' ? '#C46A58' : '#7FAE8E',
          prazoTxt: sm.prazo ? 'até ' + dataBR(sm.prazo) : 'sem prazo',
          del: self.confirmar(key, function () { self.upd(function (x) { var mm = x.metas.find(function (y) { return y.id === m.id; }); if (mm) mm.submetas = mm.submetas.filter(function (y) { return y.id !== sm.id; }); }); }),
          delTxt: self.delTxt(key)
        };
      });
      var marcos = subsOrd.filter(function (sm) { return ob > 0 && sm.valor < ob; }).map(function (sm) { return { left: pct(sm.valor, ob) + '%', bg: al >= sm.valor ? '#1F4D3A' : '#A3A9A4' }; });
      var p2 = pct(al, ob), key = 'm:' + m.id;
      return {
        ehValor: true, ehCheck: false, csubs: [], itens: [], segs: [],
        nome: m.nome, prioridade: m.prioridade, pBg: (PRIO[m.prioridade] || PRIO['Média'])[0], pFg: (PRIO[m.prioridade] || PRIO['Média'])[1],
        status: st, stBg: STAT[st][0], stFg: STAT[st][1],
        alTxt: brl(al), obTxt: brl(ob), pctTxt: pctTxt(p2), w: p2 + '%', restTxt: brl(Math.max(0, ob - al)),
        prazoTxt: m.prazo ? 'Prazo: ' + dataBR(m.prazo) + ' · ' + quandoTxt(dd) : 'Sem prazo definido',
        marcos: marcos, subs: subs,
        aporteVal: s.aporte[m.id] || '',
        onAporte: function (e) { var a = Object.assign({}, self.state.aporte); a[m.id] = e.target.value; self.setState({ aporte: a }); },
        addAporte: function () { var v = num(self.state.aporte[m.id]); if (!v) return; self.upd(function (x) { var mm = x.metas.find(function (y) { return y.id === m.id; }); if (mm) mm.alcancado = r2((+mm.alcancado || 0) + v); }); var a = Object.assign({}, self.state.aporte); a[m.id] = ''; self.setState({ aporte: a }); },
        edit: function () { self.setState({ showFm: true, erro: '', fm: { editId: m.id, tipo: 'valor', nome: m.nome, objetivo: String(m.objetivo).replace('.', ','), alcancado: String(m.alcancado || 0).replace('.', ','), prazo: m.prazo || '', prioridade: m.prioridade || 'Média' } }); },
        del: self.confirmar(key, function () { self.upd(function (x) { x.metas = x.metas.filter(function (y) { return y.id !== m.id; }); }); }),
        delTxt: self.delTxt(key),
        subAberto: s.fs.metaId === m.id,
        abrirSub: function () { self.setState({ fs: Object.assign(fsVazio(), { metaId: m.id }) }); }
      };
    });
    proximas.sort(function (a, b) { return a.prazo.localeCompare(b.prazo); });
    proximas = proximas.slice(0, 4).map(function (x) { return { nome: x.nome, sub: x.sub, prazoTxt: dataBR(x.prazo), quando: quandoTxt(x.dd), cor: x.dd !== null && x.dd < 0 ? '#8C3B2E' : '#1F4D3A' }; });
    var metasPct = pcts.length ? pcts.reduce(function (a, b) { return a + b; }, 0) / pcts.length : 0;

    // ----- hábitos -----
    var hm = s.hMes, nd = diasNoMes(hm), hp = hm.split('-').map(Number);
    var first = new Date(hp[0], hp[1] - 1, 1).getDay();
    var cells = [];
    for (var i = 0; i < first; i++) cells.push({ vazio: true, dia: 0 });
    var regs = [];
    for (var dia = 1; dia <= nd; dia++) {
      (function (dia) {
        var iso = hm + '-' + pad(dia), v = d.habitos[iso], fut = iso > H, sel = iso === s.hSel;
        var bg = '#FFFFFF', bd = '#E3E5E1', fg = '#3D4440';
        if (v != null) { regs.push(+v); if (+v <= meta) { bg = '#D3E4D8'; bd = '#4F8A68'; fg = '#24533F'; } else { bg = '#F1D9D2'; bd = '#C46A58'; fg = '#8C3B2E'; } }
        else if (fut) { bg = '#F5F6F3'; fg = '#7C837E'; }
        cells.push({ vazio: false, dia: dia, valorTxt: v != null ? brl(v).replace(',00', '') : (iso === H ? 'hoje' : ''),
          bg: bg, fg: fg, bd: (sel ? '2px solid #1E2421' : '1px solid ' + bd), aria: dataBR(iso) + (v != null ? ': ' + brl(v) : ': sem registro'),
          pick: function () { self.selDia(iso); } });
      })(dia);
    }
    var hn = regs.length, hsum = regs.reduce(function (a, b) { return a + b; }, 0), hmed = hn ? r2(hsum / hn) : 0;
    var dentro = regs.filter(function (v) { return v <= meta; }).length;
    var folga = r2(meta - hmed);
    var ind = !hn ? { txt: 'Sem registros', sub: 'Registre os gastos de cada dia', bg: '#FFFFFF', bd: '#E3E5E1', fg: '#3D4440' }
      : hmed <= meta ? { txt: 'META CUMPRIDA', sub: 'Média ' + brl(hmed) + ' ≤ ' + brl(meta), bg: '#E8F1EA', bd: '#A9C9B3', fg: '#24533F' }
      : { txt: 'META NÃO CUMPRIDA', sub: 'Média ' + brl(hmed) + ' > ' + brl(meta), bg: '#F8ECE8', bd: '#D9A496', fg: '#8C3B2E' };

    var metaMensal = +d.settings.metaMensal || 0;
    var metaMes = function (k) { return metaMensal > 0 ? metaMensal : r2(meta * diasNoMes(k)); };
    var somaMes = function (k) { return r2(Object.keys(d.habitos).filter(function (x) { return x.slice(0, 7) === k; }).reduce(function (a, x) { return a + (+d.habitos[x] || 0); }, 0)); };
    var resumoMeta = function (k) {
      var g = somaMes(k), mt = metaMes(k), nd2 = diasNoMes(k), hk = H.slice(0, 7);
      var decorridos = k < hk ? nd2 : k > hk ? 0 : +H.slice(8, 10);
      var ritmo = mt * decorridos / nd2, acima = g > mt, alerta = !acima && decorridos > 0 && g > ritmo;
      return { gastoTxt: brl(g), metaTxt: brl(mt), w: pct(g, mt) + '%',
        cor: acima ? '#C46A58' : alerta ? '#C9A24F' : '#4F8A68',
        status: acima ? 'Acima da meta' : alerta ? 'Acima do ritmo' : 'Dentro da meta',
        chipBg: acima ? '#F1D9D2' : alerta ? '#F3E7C6' : '#D3E4D8', chipFg: acima ? '#8C3B2E' : alerta ? '#6E5418' : '#24533F',
        txt: brl(g) + ' / ' + brl(mt),
        sub: (acima ? brl(r2(g - mt)) + ' acima da meta' : 'Restam ' + brl(r2(mt - g))) + (metaMensal > 0 ? '' : ' · meta sugerida: ' + brl(meta) + ' × ' + nd2 + ' dias') };
    };
    var hmm = resumoMeta(hm), mm = resumoMeta(H.slice(0, 7));
    var dtH = new Date(+H.slice(0, 4), +H.slice(5, 7) - 1, +H.slice(8, 10)), domingo = addDias(H, -dtH.getDay());
    var LETRAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    var semanaMini = LETRAS.map(function (l, i) {
      var iso = addDias(domingo, i), v = d.habitos[iso], fut = iso > H, ehHoje = iso === H;
      var bg = 'transparent', bd = '#E2D3BA', fg = '#6B716C';
      if (v != null) { if (+v <= meta) { bg = '#4F8A68'; bd = '#4F8A68'; fg = '#FFFFFE'; } else { bg = '#C46A58'; bd = '#C46A58'; fg = '#FFFFFE'; } }
      else if (fut) { bd = '#E3E5E1'; fg = '#A3A9A4'; }
      if (ehHoje && v == null) bd = '#1E2421';
      return { letra: l, dia: String(+iso.slice(8, 10)), bg: bg, bd: bd, fg: fg, valorTxt: v != null ? brl(v).replace(',00', '') : (ehHoje ? 'hoje' : ''),
        aria: dataBR(iso) + (v != null ? ': ' + brl(v) + (+v <= meta ? ' (dentro da meta)' : ' (acima da meta)') : ': sem registro') };
    });
    var seq = 0, cur = d.habitos[H] != null ? H : addDias(H, -1);
    while (d.habitos[cur] != null && +d.habitos[cur] <= meta && seq < 3660) { seq++; cur = addDias(cur, -1); }
    var ser = seq > 0 ? { txt: seq + (seq === 1 ? ' dia na meta' : ' dias seguidos na meta'), bg: '#D3E4D8', fg: '#24533F' } : { txt: 'Sem sequência', bg: '#EFE6D6', fg: '#3D4440' };
    var serTxt = seq > 0 ? 'Você está há ' + seq + (seq === 1 ? ' dia' : ' dias') + ' seguidos gastando até ' + brl(meta) + ' por dia.' + (d.habitos[H] == null ? ' Registre hoje para continuar.' : '')
      : (d.habitos[H] == null ? 'Registre os gastos de hoje para começar uma sequência dentro da meta de ' + brl(meta) + ' por dia.' : 'O último dia registrado passou da meta de ' + brl(meta) + '. Amanhã começa uma nova sequência.');

    // média diária na visão geral
    var habMes = Object.keys(d.habitos).filter(function (k) { return k.slice(0, 7) === mes; });
    var kMedia, kMediaSub;
    if (habMes.length) { kMedia = brl(habMes.reduce(function (a, k) { return a + (+d.habitos[k] || 0); }, 0) / habMes.length); kMediaSub = 'Rastreador · ' + habMes.length + ' dias registrados'; }
    else { kMedia = brl(total / diasNoMes(mes)); kMediaSub = 'Gastos do mês ÷ ' + diasNoMes(mes) + ' dias'; }

    // ----- wishlist -----
    var mesAtual = H.slice(0, 7);
    var wSaldo = r2(d.receitas.filter(function (r) { return r.mes === mesAtual; }).reduce(function (a, r) { return a + (+r.valor || 0); }, 0) - totalMes(d, mesAtual, virt));
    var wl = d.wishlist;
    var desejados = wl.filter(function (w) { return w.status !== 'Adquirido'; });
    var wTotal = r2(desejados.reduce(function (a, w) { return a + (+w.valor || 0); }, 0));
    var alta = desejados.filter(function (w) { return w.prioridade === 'Alta'; });
    var wChips = ['Todas'].concat(d.wishCats).map(function (c) {
      var n = c === 'Todas' ? wl.length : wl.filter(function (w) { return w.cat === c; }).length, at = s.wFiltro === c;
      return { nome: c, qtd: String(n), bg: at ? '#1F4D3A' : '#FFFFFF', fg: at ? '#FFFFFE' : '#1E2421', bd: at ? '#1F4D3A' : '#D9DCD7', pick: function () { self.setState({ wFiltro: c }); } };
    });
    var secs = s.wFiltro === 'Todas' ? d.wishCats.filter(function (c) { return wl.some(function (w) { return w.cat === c; }); }) : [s.wFiltro];
    if (s.wFiltro === 'Todas' && !secs.length) secs = d.wishCats.slice(0, 1);
    var pOrd = { 'Alta': 0, 'Média': 1, 'Baixa': 2 };
    var wSecoes = secs.map(function (c) {
      var its = wl.filter(function (w) { return w.cat === c; }).sort(function (a, b) { return (a.status === 'Adquirido') - (b.status === 'Adquirido') || (pOrd[a.prioridade] - pOrd[b.prioridade]); });
      var tot = r2(its.filter(function (w) { return w.status !== 'Adquirido'; }).reduce(function (a, w) { return a + (+w.valor || 0); }, 0));
      return {
        nome: c, totalTxt: brl(tot), qtdTxt: its.length + (its.length === 1 ? ' produto' : ' produtos'), vazio: its.length === 0,
        itens: its.map(function (w) {
          var det = []; if (w.marca) det.push(w.marca); if (w.validade) det.push('validade ' + dataBR(w.validade)); if (w.incluido) det.push('incluído em ' + dataBR(w.incluido)); if (w.compradoEm) det.push('comprado em ' + dataBR(w.compradoEm));
          var key = 'w:' + w.id, adq = w.status === 'Adquirido', pr = PRIO[w.prioridade] || PRIO['Média'];
          return {
            nome: w.nome, detalhe: det.join(' · ') || '—', valorTxt: w.valor ? brl(w.valor) : 'Valor a preencher', prioridade: w.prioridade, pBg: pr[0], pFg: pr[1],
            adquirido: adq, desejado: !adq, risco: adq ? 'line-through' : 'none', temObs: !!w.obs, obs: w.obs,
            temSaldo: !adq && +w.valor > 0, bg: (!adq && +w.valor > 0) ? (+w.valor <= wSaldo ? '#E8F1EA' : '#F8ECE8') : 'transparent',
            sBg: +w.valor <= wSaldo ? '#D3E4D8' : '#F1D9D2', sFg: +w.valor <= wSaldo ? '#24533F' : '#8C3B2E', sTxt: +w.valor <= wSaldo ? 'Dá para comprar' : 'Sem saldo',
            temLink: /^https?:\/\//i.test(w.link || ''), link: w.link,
            comprar: function () { self.setState({ cp: { id: w.id, nome: w.nome, valor: w.valor ? String(w.valor).replace('.', ',') : '', coluna: 'demais', registrar: true, data: hoje() } }); },
            edit: function () { self.setState({ showFw: true, erro: '', fw: { editId: w.id, cat: w.cat, nome: w.nome, marca: w.marca || '', validade: w.validade || '', valor: w.valor ? String(w.valor).replace('.', ',') : '', prioridade: w.prioridade || 'Média', link: w.link || '', obs: w.obs || '' } }); },
            del: self.confirmar(key, function () { self.upd(function (x) { x.wishlist = x.wishlist.filter(function (y) { return y.id !== w.id; }); }); }),
            delTxt: self.delTxt(key)
          };
        })
      };
    });

    // ----- inventário -----
    var inv = d.inventario.map(function (pr) { return { pr: pr, vi: validadeInfo(pr.validade, pr.validadeTxt) }; });
    var tiposInv = {}; d.inventario.forEach(function (pr) { if (pr.tipo) tiposInv[pr.tipo] = true; });
    var iq = String(s.iBusca).trim().toLowerCase();
    var marcas = {}; d.inventario.forEach(function (pr) { if (pr.marca) marcas[pr.marca] = true; });
    var iItens = inv.filter(function (x) {
      var pr = x.pr;
      if (s.iCat !== 'Todas' && pr.categoria !== s.iCat) return false;
      if (s.iMarca !== 'Todas' && pr.marca !== s.iMarca) return false;
      if (s.iStatus !== 'Todos' && pr.status !== s.iStatus) return false;
      if (s.iTipo !== 'Todos' && (pr.tipo || '') !== s.iTipo) return false;
      if (s.iVal !== 'todos' && x.vi.k !== s.iVal) return false;
      if (iq && [pr.nome, pr.marca, pr.tipo].join(' ').toLowerCase().indexOf(iq) < 0) return false;
      return true;
    }).sort(function (a, b) { return String(a.pr.validade || '9999').localeCompare(String(b.pr.validade || '9999')); }).map(function (x) {
      var pr = x.pr, key = 'i:' + pr.id, det = [], un = Math.max(1, parseInt(pr.quantidade, 10) || 1);
      if (pr.marca) det.push(pr.marca);
      if (pr.aquisicao) det.push('adquirido em ' + dataBR(pr.aquisicao)); if (pr.valor) det.push(brl(pr.valor)); if (pr.validade) det.push('validade ' + (pr.validadeTxt || dataBR(pr.validade)));
      return {
        grupo: pr.categoria + (pr.tipo ? ' · ' + pr.tipo : ''), tipoG: pr.tipo || 'Sem tipo', vermelho: x.vi.k === 'vermelho', nome: pr.nome,
        final: false, op: '1', ckAria: 'Acabou: ' + pr.nome,
        un: un, unTxt: un + (un === 1 ? ' un.' : ' un.'), marcando: s.acabando === pr.id, variasUn: un > 1,
        pergunta: un > 1 ? 'Você tem ' + un + ' unidades. O que acabou?' : (s.acabarSemData ? 'Marcar “' + pr.nome + '” como acabado, sem data?' : 'Marcar “' + pr.nome + '” como acabado em ' + dataBR(H) + '?'),
        acabou1Txt: un > 1 ? 'Acabou 1 unidade' : 'Sim, acabou', acabouTodasTxt: 'Acabaram as ' + un,
        acabou1: function () { self.acabar(pr.id, false, self.state.acabarSemData); }, acabouTodas: function () { self.acabar(pr.id, true, self.state.acabarSemData); }, cancelarAcabar: function () { self.setState({ acabando: '' }); },
        semData: !!s.acabarSemData, onSemData: function (e) { self.setState({ acabarSemData: e.target.checked }); },
        toggle: function (e) { self.setState({ acabando: e.target.checked ? pr.id : '', acabarSemData: false }); }, categoria: pr.categoria, status: pr.status, temStatus: !!pr.status, detalhe: det.join(' · '), temObs: !!pr.obs, obs: pr.obs,
        alerta: x.vi.txt, aBg: x.vi.bg, aFg: x.vi.fg, dot: x.vi.dot,
        edit: function () { self.setState({ showFi: true, erro: '', fi: { editId: pr.id, validadeOrig: pr.validade || '', validadeTxt: pr.validadeTxt || '', tipo: pr.tipo || '', nome: pr.nome, categoria: pr.categoria, marca: pr.marca || '', aquisicao: pr.aquisicao || '', validade: pr.validade || '', quantidade: String(pr.quantidade == null ? 1 : pr.quantidade), valor: pr.valor ? String(pr.valor).replace('.', ',') : '', status: pr.status || '', obs: pr.obs || '' } }); },
        del: self.confirmar(key, function () { self.upd(function (y) { y.inventario = y.inventario.filter(function (z) { return z.id !== pr.id; }); }); }),
        delTxt: self.delTxt(key)
      };
    });
    var gOrd = [], gMap = {};
    d.inventario.forEach(function (pr) { var g = pr.categoria + (pr.tipo ? ' · ' + pr.tipo : ''); if (!gMap[g]) { gMap[g] = []; gOrd.push(g); } });
    iItens.forEach(function (it) { gMap[it.grupo].push(it); });
    var iGrupos = gOrd.filter(function (g) { return gMap[g].length; }).map(function (g) { var n = gMap[g].length; return { titulo: g, qtdTxt: n + (n === 1 ? ' produto' : ' produtos'), itens: gMap[g] }; });
    var filtroAtivo = !!iq || s.iCat !== 'Todas' || s.iMarca !== 'Todas' || s.iStatus !== 'Todos' || s.iTipo !== 'Todos' || s.iVal !== 'todos';
    var invCats = d.invCats || [];
    var catOrd = []; d.wishCats.forEach(function (c) { if (catOrd.indexOf(c) < 0 && (d.inventario.some(function (x) { return x.categoria === c; }) || invCats.indexOf(c) >= 0)) catOrd.push(c); });
    d.inventario.forEach(function (x) { if (catOrd.indexOf(x.categoria) < 0) catOrd.push(x.categoria); });
    var iCats = catOrd.map(function (c) {
      var its = iItens.filter(function (it) { return it.categoria === c; });
      var gm = {}, go = [];
      its.forEach(function (it) { var t = it.tipoG; if (!gm[t]) { gm[t] = []; go.push(t); } gm[t].push(it); });
      go.sort(function (a, b) { return (a === 'Sem tipo') - (b === 'Sem tipo') || a.localeCompare(b, 'pt-BR'); });
      var todosCat = inv.filter(function (x) { return x.pr.categoria === c; });
      var verm = somaUn(todosCat.filter(function (x) { return x.vi.k === 'vermelho'; }), function (x) { return x.pr; });
      var totCat = somaUn(todosCat, function (x) { return x.pr; }), unVis = its.reduce(function (t, it) { return t + it.un; }, 0);
      var aberto = filtroAtivo || !!s.invAbertas[c], n = its.length;
      return { nome: c, aberto: aberto, ariaExp: aberto ? 'true' : 'false', rot: aberto ? '90deg' : '0deg',
        qtdTxt: (filtroAtivo ? unVis + ' de ' + totCat : totCat) + (totCat === 1 ? ' produto' : ' produtos'),
        temAlerta: verm > 0, alertaTxt: verm + (verm === 1 ? ' vencido/iminente' : ' vencidos/iminentes'),
        addAria: 'Adicionar produto em ' + c, adicionar: function () { self.novoProdutoEm(c, ''); },
        vazio: todosCat.length === 0, mostrar: n > 0 || (!filtroAtivo && todosCat.length === 0),
        toggle: function () { var o = Object.assign({}, self.state.invAbertas); o[c] = !o[c]; self.setState({ invAbertas: o }); },
        grupos: go.map(function (t) {
          var k = gm[t].reduce(function (q, it) { return q + it.un; }, 0), kk = c + '|' + t, ab = filtroAtivo || !!s.tiposAbertos[kk];
          var vt = gm[t].filter(function (it) { return it.vermelho; }).reduce(function (q, it) { return q + it.un; }, 0);
          return { titulo: t, qtdTxt: k + (k === 1 ? ' produto' : ' produtos'), itens: gm[t], aberto: ab, ariaExp: ab ? 'true' : 'false', rot: ab ? '90deg' : '0deg',
            temAlerta: vt > 0, alertaTxt: vt + (vt === 1 ? ' vencido/iminente' : ' vencidos/iminentes'),
            addAria: 'Adicionar produto em ' + c + (t !== 'Sem tipo' ? ' · ' + t : ''), adicionar: function () { self.novoProdutoEm(c, t === 'Sem tipo' ? '' : t); },
            toggle: function () { var o = Object.assign({}, self.state.tiposAbertos); o[kk] = !o[kk]; self.setState({ tiposAbertos: o }); } };
        }) };
    }).filter(function (x) { return x.mostrar; });
    var cnt = function (k) { return somaUn(inv.filter(function (x) { return x.vi.k === k; }), function (x) { return x.pr; }); };

    // ----- acabados -----
    var acab = (d.acabados || []).slice().sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); });
    var acPorMes = {}, acMeses = [];
    var acSem = [];
    acab.forEach(function (a) { if (!a.data) { acSem.push(a); return; } var k = String(a.data).slice(0, 7); if (!acPorMes[k]) { acPorMes[k] = []; acMeses.push(k); } acPorMes[k].push(a); });
    acMeses.sort().reverse();
    var unMes = function (k) { return (acPorMes[k] || []).reduce(function (t, a) { return t + (+a.unidades || 1); }, 0); };
    var acTotalUn = acab.reduce(function (t, a) { return t + (+a.unidades || 1); }, 0);
    var acGrupos = acMeses.map(function (k, idx) {
      var ab = s.acAbertos[k] != null ? s.acAbertos[k] : idx === 0, u = unMes(k);
      return { titulo: mesNome(k), qtdTxt: u + (u === 1 ? ' produto' : ' produtos'), aberto: ab, ariaExp: ab ? 'true' : 'false', rot: ab ? '90deg' : '0deg',
        toggle: function () { var o = Object.assign({}, self.state.acAbertos); o[k] = !ab; self.setState({ acAbertos: o }); },
        itens: acPorMes[k].map(acItem) };
    });
    function acItem(a) {
          var key = 'a:' + a.id, det = [a.categoria + (a.tipo ? ' · ' + a.tipo : '')]; if (a.marca) det.unshift(a.marca);
          return { nome: a.nome, unTxt: (+a.unidades || 1) + ' un.', detalhe: det.join(' · '), dataTxt: dataBR(a.data), temData: !!a.data, semData: !a.data,
            onData: function (e) { var v = e.target.value; if (!v) return; self.upd(function (x) { var y = (x.acabados || []).find(function (z) { return z.id === a.id; }); if (y) y.data = v; }); },
            desfazer: function () { self.devolver(a.id); },
            del: self.confirmar(key, function () { self.upd(function (x) { x.acabados = (x.acabados || []).filter(function (y) { return y.id !== a.id; }); }); }), delTxt: self.delTxt(key) };
    }
    if (acSem.length) {
      var abS = s.acAbertos.__sem != null ? s.acAbertos.__sem : !acMeses.length, uS = acSem.reduce(function (t, a) { return t + (+a.unidades || 1); }, 0);
      acGrupos.unshift({ titulo: 'ACABADOS', qtdTxt: uS + (uS === 1 ? ' produto' : ' produtos') + ' · sem data', aberto: abS, ariaExp: abS ? 'true' : 'false', rot: abS ? '90deg' : '0deg',
        toggle: function () { var o = Object.assign({}, self.state.acAbertos); o.__sem = !abS; self.setState({ acAbertos: o }); }, itens: acSem.map(acItem) });
    }
    var gl = acMeses.length ? acMeses[acMeses.length - 1] : mesAtual, gIni = addMes(mesAtual, -11); if (gl > gIni) gIni = gl; if (diffMeses(gIni, mesAtual) < 5) gIni = addMes(mesAtual, -5);
    var acGL = []; for (var gk = gIni; gk <= mesAtual; gk = addMes(gk, 1)) acGL.push(gk);
    var acMx = Math.max.apply(null, acGL.map(unMes).concat([1]));
    var acGraf = acGL.map(function (k) { var u = unMes(k); return { n: String(u), label: mesCurto(k), h: (u / acMx * 100).toFixed(1) + '%', cor: k === mesAtual ? '#2E6349' : '#A9C9B3' }; });

    var notifTxt = { '': 'Se o navegador não permitir notificações, um aviso aparece no topo da dashboard após o horário escolhido.', granted: 'Notificações ativadas. O lembrete aparece no horário escolhido enquanto a dashboard estiver aberta.', denied: 'Notificações bloqueadas pelo navegador — o aviso no topo da dashboard continua funcionando.', 'default': 'Permissão não concedida — o aviso no topo da dashboard continua funcionando.', indisponivel: 'Notificações não estão disponíveis aqui — o aviso no topo da dashboard continua funcionando.' }[s.notif] || '';

    return {
      hojeTxt: dataBR(H), nb: nb, nf: nf, go: go,
      menuAberto: s.menu === 'aberto', menuCls: s.menu === 'aberto' ? 'aberto' : 'fechado', menuExp: s.menu === 'aberto' ? 'true' : 'false',
      menuAria: s.menu === 'aberto' ? 'Recolher menu' : 'Abrir menu', alternarMenu: function () { self.alternarMenu(); }, fecharMenu: function () { self.setState({ menu: 'fechado' }); },
      temaEscuro: s.tema === 'escuro', temaClaro: s.tema !== 'escuro', temaTxt: s.tema === 'escuro' ? 'Tema claro' : 'Tema escuro', alternarTema: function () { self.alternarTema(); },
      semanaMini: semanaMini, ser: ser, serTxt: serTxt, mm: mm, hmm: hmm, mmMetaTxt: brl(metaMes(hm)),
      metaMensalTxt: metaMensal > 0 ? String(metaMensal).replace('.', ',') : '', metaMensalSug: 'Sugestão: ' + brl(r2(meta * nd)),
      onMetaMensal: function (e) { var t = String(e.target.value).trim(), v = num(t); self.upd(function (x) { if (!t || !(v > 0)) delete x.settings.metaMensal; else x.settings.metaMensal = r2(v); }); },
      cronLibera: brl(cronLibera),
      wSaldoTxt: brl(wSaldo), wSaldoMes: mesNome(mesAtual), wSaldoCor: wSaldo < 0 ? '#8C3B2E' : '#24533F', wSaldoBg: wSaldo < 0 ? '#F8ECE8' : '#E8F1EA',
      acGrupos: acGrupos, acVazio: acab.length === 0, acTemGraf: acMeses.length > 0, acGraf: acGraf, acTotal: String(acTotalUn),
      acMesAtual: String(unMes(mesAtual)), acMesNome: mesNome(mesAtual), acMesPassado: String(unMes(addMes(mesAtual, -1))),
      acMedia: acMeses.length ? (Math.round((acTotalUn - acSem.reduce(function (t, a) { return t + (+a.unidades || 1); }, 0)) / acMeses.length * 10) / 10).toLocaleString('pt-BR') : '0',
      iaAberto: !!s.ia.modo, iaModoGastos: s.ia.modo === 'gastos', iaModoInv: s.ia.modo === 'inv',
      iaTitulo: s.ia.modo === 'inv' ? 'Adicionar produtos por voz' : 'Lançar gastos por voz, PDF ou print',
      iaDica: s.ia.modo === 'inv' ? 'Toque em Gravar e diga os produtos, por exemplo: “comprei dois shampoos Lola de cachos, validade dezembro de 2027”. Toque de novo para parar. A IA monta a lista e você confere antes de salvar.'
        : 'Grave um áudio com os gastos (ex.: “ontem gastei 32 reais no iFood no Visa”), envie o PDF da fatura ou um print. A IA monta a lista e você confere antes de salvar.',
      iaPlaceholder: s.ia.modo === 'inv' ? 'Ex.: 1 condicionador Salon Line, validade 03/2027' : 'Ex.: mercado 154,90 no débito hoje',
      iaSemChave: !d.settings.geminiKey || s.ia.trocar, iaTemChave: !!d.settings.geminiKey && !s.ia.trocar,
      iaChaveTxt: s.ia.chave, iaOnChave: function (e) { self.iaSet({ chave: e.target.value }); },
      iaSalvarChave: function () { var k = String(self.state.ia.chave || '').trim(); k = k.replace(/\s+/g, ''); if (!/^(AIza[\w-]{30,}|AQ\.[\w.-]{20,})$/.test(k)) { self.iaSet({ erro: 'Essa chave não parece certa. Copie a chave inteira no Google AI Studio (botão “Copiar chave”): ela começa com AQ. ou AIza.' }); return; } self.upd(function (x) { x.settings.geminiKey = k; }); self.iaSet({ chave: '', trocar: false, erro: '' }); },
      iaTrocarChave: function () { self.iaSet({ trocar: true, chave: '' }); },
      iaGravar: function () { self.iaGravar(); }, iaGravTxt: s.ia.gravando ? 'Parar e enviar' : 'Gravar áudio', iaGravCls: s.ia.gravando ? 'gravando' : '',
      iaArquivo: function (e) { self.iaArquivo(e); },
      iaTexto: s.ia.texto, iaOnTexto: function (e) { self.iaSet({ texto: e.target.value }); }, iaEnviarTexto: function () { self.iaEnviarTexto(); },
      iaProcessando: s.ia.proc || s.ia.gravando, iaProcTxt: s.ia.gravando ? 'Gravando… fale os itens e toque em “Parar e enviar”.' : s.ia.procTxt,
      iaTemErro: !!s.ia.erro, iaErro: s.ia.erro,
      iaTemItens: s.ia.itens.length > 0,
      iaResumo: (function () { var n = s.ia.itens.filter(function (x) { return x.incluir; }).length; if (s.ia.modo === 'inv') return n + (n === 1 ? ' produto selecionado' : ' produtos selecionados'); var t = r2(s.ia.itens.filter(function (x) { return x.incluir; }).reduce(function (a, x) { return a + num(x.valor); }, 0)); return n + (n === 1 ? ' gasto' : ' gastos') + ' · ' + brl(t); })(),
      iaMes: s.ia.mes, iaOnMes: function (e) { self.iaSet({ mes: e.target.value }); },
      iaMesOpts: (function () { var b = s.ia.mes || mes, o = []; for (var i = -6; i <= 6; i++) { var k = addMes(b, i); o.push({ v: k, l: mesNome(k) }); } return o; })(),
      iaItens: s.ia.itens.map(function (it, i) {
        var on = {}; Object.keys(it).forEach(function (f) { on[f] = function (e) { var l = self.state.ia.itens.slice(); l[i] = Object.assign({}, l[i]); l[i][f] = e.target.value; self.iaSet({ itens: l }); }; });
        return Object.assign({}, it, { on: on, bg: it.incluir ? '#FFFFFF' : '#F5F6F3',
          onIncluir: function (e) { var l = self.state.ia.itens.slice(); l[i] = Object.assign({}, l[i], { incluir: e.target.checked }); self.iaSet({ itens: l }); } });
      }),
      iaSalvar: function () { self.iaSalvar(); }, iaSalvarTxt: s.ia.modo === 'inv' ? 'Salvar no inventário' : 'Lançar gastos', iaDescartar: function () { self.iaSet({ itens: [], erro: '' }); },
      iaFechar: function () { self.iaFechar(); }, iaAbrirGastos: function () { self.iaAbrir('gastos'); }, iaAbrirInv: function () { self.iaAbrir('inv'); },
      tabHome: s.tab === 'home', tabGastos: s.tab === 'gastos', tabMetas: s.tab === 'metas', tabHab: s.tab === 'habitos', tabWish: s.tab === 'wishlist', tabInv: s.tab === 'inventario', tabAcab: s.tab === 'acabados',
      showBackup: s.showBackup, backupTxt: s.showBackup ? JSON.stringify(d) : '',
      abrirBackup: function () { self.setState({ showBackup: true, importMsg: '', backupMsg: '' }); },
      fecharBackup: function () { self.setState({ showBackup: false, importTxt: '', importMsg: '' }); },
      semEdicao: function () {}, selecionarTudo: function (e) { try { e.target.select(); } catch (x) {} },
      copiarBackup: function () {
        var txt = JSON.stringify(self.state.d);
        try { navigator.clipboard.writeText(txt).then(function () { self.setState({ backupMsg: 'Copiado.' }); }, function () { self.setState({ backupMsg: 'Não foi possível copiar automaticamente: toque no campo, selecione tudo e copie.' }); }); }
        catch (x) { self.setState({ backupMsg: 'Não foi possível copiar automaticamente: toque no campo, selecione tudo e copie.' }); }
      },
      importTxt: s.importTxt, onImportTxt: this.setv('importTxt'), importMsg: s.importMsg, importCor: /^Dados importados/.test(s.importMsg) ? '#2E6349' : '#8C3B2E',
      importarTxtBtn: s.conf === 'importar' ? 'Confirmar: substituir todos os dados' : 'Importar e substituir dados',
      importarBackup: function () {
        var nd; try { nd = JSON.parse(String(self.state.importTxt || '').trim()); if (nd && nd.d && nd.d.gastos) nd = nd.d; } catch (x) { nd = null; }
        if (!nd || !Array.isArray(nd.gastos) || !Array.isArray(nd.inventario || [])) { self.setState({ importMsg: 'O texto colado não é um backup válido desta dashboard.', conf: '' }); return; }
        if (self.state.conf !== 'importar') { self.setState({ conf: 'importar', importMsg: 'Isso substitui todos os dados atuais. Toque de novo para confirmar.' }); return; }
        try { migrarCategorias(nd); migrarParcelas(nd); importarListas(nd); importarFaturas(nd); migrarAcabados(nd); } catch (x) {}
        self.upd(function (x) { Object.keys(x).forEach(function (k) { delete x[k]; }); Object.assign(x, nd); });
        self.setState({ conf: '', importTxt: '', importMsg: 'Dados importados com sucesso.', mes: ultimoMes(nd) });
      },
      salvoTxt: s.salvo === false ? 'Atenção: este navegador não permitiu salvar os dados.' : 'Seus dados ficam salvos neste navegador.',
      lembrete: this.precisaLembrar(),
      irRegistrar: function () { self.setState({ tab: 'habitos', hMes: H.slice(0, 7) }); self.selDia(H); },
      mesTxt: mesNome(mes), mesPrev: function () { self.setState({ mes: addMes(mes, -1), conf: '' }); }, mesNext: function () { self.setState({ mes: addMes(mes, 1), conf: '' }); },

      saudacao: (function () { var hr = new Date().getHours(); return (hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite') + ' · ' + new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); })(),
      kTendTxt: ant > 0 ? (total <= ant ? '↓ ' : '↑ ') + pctTxt(Math.abs(total - ant) / ant * 100) + ' gastos vs ' + mesCurto(addMes(mes, -1)) : 'Sem mês anterior para comparar',
      kSaldoHeroCor: saldo < 0 ? 'rgba(255,196,180,1)' : 'rgba(255,255,255,1)',
      novoGastoHome: function () { self.setState({ tab: 'gastos', showFg: true, fg: fgVazio(), erro: '', colAbertas: {} }); try { window.scrollTo(0, 0); } catch (e) {} },
      bc: { home: s.tab === 'home' ? 'ativo' : '', gastos: s.tab === 'gastos' ? 'ativo' : '', habitos: s.tab === 'habitos' ? 'ativo' : '', mais: ['metas', 'wishlist', 'inventario', 'acabados'].indexOf(s.tab) >= 0 ? 'ativo' : '' },
      kReceita: brl(receita), kGastos: brl(total), kSaldo: brl(saldo), kSaldoCor: saldo < 0 ? '#8C3B2E' : '#24533F', kSaldoBg: saldo < 0 ? '#F8ECE8' : '#E8F1EA',
      kMedia: kMedia, kMediaSub: kMediaSub, kMeta: brl(meta), kMetasPct: pctTxt(metasPct), kMetasW: metasPct + '%',
      fr: s.fr, frOn: this.binder('fr'), salvarReceita: function () { self.salvarReceita(); },
      semReceitas: receitasMes.length === 0,
      receitas: receitasMes.map(function (r) { var key = 'r:' + r.id; return { descricao: r.descricao, dataTxt: r.data ? dataBR(r.data) : 'sem data', valorTxt: brl(r.valor), del: self.confirmar(key, function () { self.upd(function (x) { x.receitas = x.receitas.filter(function (y) { return y.id !== r.id; }); }); }), delTxt: self.delTxt(key) }; }),
      colResumo: COLS.map(function (c, i) { return { nome: c.nome, cor: c.cor, totalTxt: brl(totCol[i]), w: pct(totCol[i], total) + '%' }; }),
      proximas: proximas, semProximas: proximas.length === 0,
      wQtd: String(desejados.length), wAdq: String(wl.length - desejados.length), wTotalTxt: brl(wTotal),

      cols: cols, totalGeral: brl(total),
      pagoTxt: brl(doMes.filter(function (g) { return g.pago; }).reduce(function (a, g) { return a + (+g.valor || 0); }, 0)),
      abertoTxt: brl(doMes.filter(function (g) { return !g.pago; }).reduce(function (a, g) { return a + (+g.valor || 0); }, 0)),
      showFg: s.showFg, fg: s.fg, fgOn: this.binder('fg'), fgTitulo: s.fg.editId ? 'Editar lançamento' : 'Novo lançamento em ' + mesNome(mes),
      abrirFg: function () { self.setState({ showFg: true, fg: fgVazio(), erro: '' }); }, fecharFg: function () { self.setState({ showFg: false, fg: fgVazio(), erro: '' }); },
      salvarGasto: function () { self.salvarGasto(); },
      erro: s.erro, temErro: !!s.erro,
      colOpts: COLS.map(function (c) { return { v: c.id, l: c.nome }; }),
      catOpts: d.categorias.map(function (c) { return { v: c }; }),
      formaOpts: FORMAS.map(function (f) { return { v: f }; }),
      novaCat: s.novaCat, onNovaCat: this.setv('novaCat'), addCat: function () { self.addCat(); },
      busca: s.busca, onBusca: this.setv('busca'), fCat: s.fCat, onFCat: this.setv('fCat'), ordem: s.ordem, onOrdem: this.setv('ordem'),

      nextTxt: mesNome(p.next), nextCurto: mesCurto(p.next),
      iniciarProximo: this.confirmar('proximo', function () { self.iniciarProximo(); }),
      pTotal: brl(p.total), pParcelas: brl(p.parcelas), pRecorr: brl(p.recorr), pJa: brl(p.ja), pFuturas: brl(p.futuras), cron: cron, semCron: cron.length === 0, cronFim: cr.length ? mesNome(cr[cr.length - 1].mes) : '—', cronLeg: COLS.map(function (c) { return { nome: c.nome, cor: c.cor }; }), pTend: pTend,
      pCols: COLS.map(function (c, i) { return { nome: c.nome, cor: c.cor, atualTxt: brl(totCol[i]), totalTxt: brl(p.porCol[i]) }; }),
      pItens: p.itens.map(function (i) { var u = (+i.parcelas || 1) > 1 && (+i.parcelaAtual || 1) >= (+i.parcelas || 1); return { descricao: i.descricao, origem: u ? 'Última parcela ' + pad(i.parcelaAtual) + '/' + pad(i.parcelas) : (i.origem === 'Já lançado' && (+i.parcelas || 1) > 1 ? 'Parcela ' + pad(i.parcelaAtual) + '/' + pad(i.parcelas) : i.origem), colNome: colNome(i.coluna), valorTxt: brl(i.valor), rowBg: u ? '#E8F1EA' : 'transparent', rowPad: u ? '10px' : '0px', rowRad: u ? '12px' : '0px' }; }),
      semPItens: p.itens.length === 0,
      evol: evol, donut: donut, donutLeg: donutLeg, balanco: balanco, balTotal: brl(balSoma), balPct: pctTxt(pct(balSoma, total)), comp: comp, projBars: projBars,

      metas: metas, semMetas: metas.length === 0,
      showFm: s.showFm, fm: s.fm, fmOn: this.binder('fm'), fmValor: s.fm.tipo !== 'checklist', fmTitulo: s.fm.editId ? 'Editar meta' : 'Nova meta',
      abrirFm: function () { self.setState({ showFm: true, fm: fmVazio(), erro: '' }); }, fecharFm: function () { self.setState({ showFm: false, fm: fmVazio(), erro: '' }); },
      salvarMeta: function () { self.salvarMeta(); },
      fs: s.fs, fsOn: this.binder('fs'), salvarSub: function () { self.salvarSub(); }, fecharSub: function () { self.setState({ fs: fsVazio() }); },

      hMesTxt: mesNome(hm), hPrev: function () { self.setState({ hMes: addMes(hm, -1) }); }, hNext: function () { self.setState({ hMes: addMes(hm, 1) }); },
      semana: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'], cells: cells,
      hSelTxt: 'Dia ' + dataBR(s.hSel), hValor: s.hValor, onHValor: this.setv('hValor'),
      salvarDia: function () { var v = String(self.state.hValor).trim(); var iso = self.state.hSel; if (v === '') return; var n = r2(num(v)); self.upd(function (x) { x.habitos[iso] = n; }); },
      limparDia: function () { var iso = self.state.hSel; self.upd(function (x) { delete x.habitos[iso]; }); self.setState({ hValor: '' }); },
      hMedia: hn ? brl(hmed) : '—', hDentro: String(dentro), hAcima: String(hn - dentro), hPct: pctTxt(pct(dentro, hn)),
      hFolgaTxt: !hn ? 'nenhum dia registrado' : folga >= 0 ? 'folga de ' + brl(folga) + ' até o limite' : brl(-folga) + ' acima do limite',
      ind: ind,
      metaDiariaTxt: String(meta).replace('.', ','), onMetaDiaria: function (e) { var v = num(e.target.value); if (v > 0) self.upd(function (x) { x.settings.metaDiaria = r2(v); }); },
      lembreteHora: d.settings.lembreteHora || '20:00', onLembrete: function (e) { var v = e.target.value; self.upd(function (x) { x.settings.lembreteHora = v; x.settings.ultimoAviso = ''; }); },
      ativarNotif: function () { self.ativarNotif(); }, notifTxt: notifTxt,

      wChips: wChips, wSecoes: wSecoes, wAltaQtd: String(alta.length), wAltaTxt: alta.length ? brl(alta.reduce(function (a, w) { return a + (+w.valor || 0); }, 0)) + ' estimado' : 'nenhum produto',
      showFw: s.showFw, fw: s.fw, fwOn: this.binder('fw'), fwTitulo: s.fw.editId ? 'Editar produto' : 'Novo produto na wishlist',
      abrirFw: function () { self.setState({ showFw: true, erro: '', fw: fwVazio(self.state.wFiltro !== 'Todas' ? self.state.wFiltro : d.wishCats[0]) }); },
      fecharFw: function () { self.setState({ showFw: false, fw: fwVazio(), erro: '' }); }, salvarW: function () { self.salvarW(); },
      wCatOpts: d.wishCats.map(function (c) { return { v: c }; }),
      novaWCat: s.novaWCat, onNovaWCat: this.setv('novaWCat'), addWCat: function () { self.addWCat(); },
      showCompra: !!s.cp, cp: s.cp || { valor: '', data: '', coluna: 'demais', registrar: true }, cpOn: this.binder('cp'), cpNome: s.cp ? s.cp.nome : '',
      confirmarCompra: function () { self.confirmarCompra(); }, cancelarCompra: function () { self.setState({ cp: null }); },

      iQtd: String(somaUn(d.inventario)), iQtdSub: d.inventario.length + (d.inventario.length === 1 ? ' item cadastrado' : ' itens cadastrados') + ' · somando as unidades',
      verFinal: function () { self.setState({ iStatus: self.state.iStatus === 'Finalizado' ? 'Todos' : 'Finalizado' }); }, verFinalTxt: s.iStatus === 'Finalizado' ? 'Mostrar todos' : 'Ver finalizados', iVerde: String(cnt('verde')), iAmarelo: String(cnt('amarelo')), iVermelho: String(cnt('vermelho')),
      showFi: s.showFi, fi: s.fi, fiOn: this.binder('fi'),
      fiTipoOpts: (function () { var l = self.tiposDaCat(s.fi.categoria); if (s.fi.tipo && s.fi.tipo !== '__novo__' && l.indexOf(s.fi.tipo) < 0) l.push(s.fi.tipo); return l.map(function (x) { return { v: x }; }); })(),
      fiNovoTipo: s.fi.tipo === '__novo__',
      fiMudaCat: function (e) { var cat = e.target.value, f = self.state.fi;
        if (cat === '__nova__') { self.setState({ fi: Object.assign({}, f, { categoria: '__nova__', catAnterior: f.categoria === '__nova__' ? f.catAnterior : f.categoria, tipo: '' }) }); return; } var manter = f.tipo === '__novo__' || self.tiposDaCat(cat).indexOf(f.tipo) >= 0; self.setState({ fi: Object.assign({}, f, { categoria: cat, tipo: manter ? f.tipo : '' }) }); },
      criarTipo: function () { self.criarTipo(); }, cancelarTipo: function () { self.setState({ fi: Object.assign({}, self.state.fi, { tipo: '', novoTipo: '' }) }); }, fiTitulo: s.fi.editId ? 'Editar produto' : 'Novo produto no inventário',
      abrirFi: function () { self.setState({ showFi: true, fi: fiVazio(), erro: '' }); }, fecharFi: function () { self.setState({ showFi: false, fi: fiVazio(), erro: '' }); },
      salvarI: function () { self.salvarI(); },
      iStatusOpts: INV_STATUS.map(function (x) { return { v: x }; }),
      iMarcaOpts: Object.keys(marcas).sort().map(function (x) { return { v: x }; }),
      iBusca: s.iBusca, onIBusca: this.setv('iBusca'), iCat: s.iCat, onICat: this.setv('iCat'), iMarca: s.iMarca, onIMarca: this.setv('iMarca'),
      iStatus: s.iStatus, onIStatus: this.setv('iStatus'), iVal: s.iVal, onIVal: this.setv('iVal'),
      iCats: iCats, novaICat: s.novaICat || '', onNovaICat: this.setv('novaICat'),
      addICat: function () { var n = self.criarCatInv(self.state.novaICat); if (n) self.setState({ novaICat: '' }); },
      expandirTodas: function () { var a = {}, t = {}; catOrd.forEach(function (c) { a[c] = true; }); d.inventario.forEach(function (pr) { t[pr.categoria + '|' + (pr.tipo || 'Sem tipo')] = true; }); self.setState({ invAbertas: a, tiposAbertos: t }); },
      recolherTodas: function () { self.setState({ invAbertas: {}, tiposAbertos: {} }); },
      fiNovaCat: s.fi.categoria === '__nova__',
      criarCatForm: function () { var n = self.criarCatInv(self.state.fi.novaCat); if (n) self.setState({ fi: Object.assign({}, self.state.fi, { categoria: n, novaCat: '', tipo: '' }), erro: '' }); },
      cancelarCatForm: function () { var f = self.state.fi; self.setState({ fi: Object.assign({}, f, { categoria: f.catAnterior || 'Skincare', novaCat: '' }) }); }, iVazio: iItens.length === 0, iTipo: s.iTipo, onITipo: this.setv('iTipo'), iTipoOpts: Object.keys(tiposInv).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); }).map(function (x) { return { v: x }; }),
      iVazioTxt: d.inventario.length ? 'Nenhum produto com esses filtros.' : 'Nenhum produto cadastrado. Ao marcar um item da wishlist como comprado, ele aparece aqui automaticamente.'
    };
  }
}

window.DashComponent = Component;
