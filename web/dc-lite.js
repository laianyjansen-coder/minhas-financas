/*
 * dc-lite.js — renderizador leve para o mesmo template da dashboard web.
 * Interpreta {{campos}}, <sc-if>, <sc-for> e eventos onClick/onChange,
 * e atualiza a página sem recarregar (preserva foco e cursor dos campos).
 */
(function () {
  'use strict';
  var VOID = { input: 1, img: 1, br: 1, meta: 1, link: 1, hr: 1, source: 1, area: 1, col: 1, embed: 1, param: 1, track: 1, wbr: 1 };
  var SVGNS = 'http://www.w3.org/2000/svg';
  var ENT = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ', apos: "'" };
  function decode(s) { return s.replace(/&(amp|lt|gt|quot|#39|nbsp|apos);/g, function (m, e) { return ENT[e]; }); }

  // ---------- parser ----------
  var TAG = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
  var ATTR = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  var HOLE_ONLY = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;

  function compileVal(raw) {
    var m = HOLE_ONLY.exec(raw);
    if (m) return { k: 'raw', p: m[1] };
    if (raw.indexOf('{{') >= 0) return { k: 'str', s: raw };
    return { k: 'lit', v: decode(raw) };
  }
  function parseAttrs(s) {
    var out = [], m; ATTR.lastIndex = 0;
    while ((m = ATTR.exec(s))) {
      var name = m[1], raw = m[2] != null ? m[2] : m[3] != null ? m[3] : m[4] != null ? m[4] : '';
      if (m[2] == null && m[3] == null && m[4] == null) out.push([name, { k: 'lit', v: true }]);
      else out.push([name, compileVal(raw)]);
    }
    return out;
  }
  function parse(src) {
    var root = { tag: '#root', attrs: [], kids: [] }, stack = [root], last = 0, m;
    function text(t) { if (t) stack[stack.length - 1].kids.push({ text: t.indexOf('{{') >= 0 ? { k: 'str', s: t } : { k: 'lit', v: decode(t) } }); }
    TAG.lastIndex = 0;
    while ((m = TAG.exec(src))) {
      if (m.index > last) text(src.slice(last, m.index));
      last = TAG.lastIndex;
      if (m[0].charAt(1) === '!') continue;
      if (m[1]) { for (var k = stack.length - 1; k > 0; k--) { if (stack[k].tag === m[1]) { stack.length = k; break; } } continue; }
      var node = { tag: m[2], attrs: parseAttrs(m[3] || ''), kids: [] };
      stack[stack.length - 1].kids.push(node);
      if (!VOID[m[2].toLowerCase()] && !m[4]) stack.push(node);
    }
    text(src.slice(last));
    return root;
  }

  // ---------- avaliação ----------
  function lookup(path, scopes) {
    if (path === 'true') return true; if (path === 'false') return false; if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var parts = path.split('.'), head = parts[0], obj, found = false;
    for (var i = 0; i < scopes.length; i++) { if (scopes[i] && Object.prototype.hasOwnProperty.call(scopes[i], head)) { obj = scopes[i][head]; found = true; break; } }
    if (!found) return undefined;
    for (var j = 1; j < parts.length; j++) { if (obj == null) return undefined; obj = obj[parts[j]]; }
    return obj;
  }
  function evalVal(c, scopes) {
    if (c.k === 'lit') return c.v;
    if (c.k === 'raw') return lookup(c.p, scopes);
    return c.s.replace(HOLE, function (m, p) { var v = lookup(p, scopes); return v == null ? '' : String(v); });
  }
  function attrOf(node, name) { for (var i = 0; i < node.attrs.length; i++) if (node.attrs[i][0] === name) return node.attrs[i][1]; return null; }
  var TEXTUAL = { text: 1, number: 1, date: 1, time: 1, search: 1, url: 1, email: 1, tel: 1, password: 1, 'datetime-local': 1, month: 1, week: 1 };
  function eventName(attr, node) {
    var ev = attr.slice(2).toLowerCase();
    if (ev === 'change') {
      var t = node.tag.toLowerCase();
      if (t === 'textarea') return 'input';
      if (t === 'input') { var ty = attrOf(node, 'type'); var tv = ty && ty.k === 'lit' ? String(ty.v).toLowerCase() : 'text'; if (TEXTUAL[tv]) return 'input'; }
    }
    if (ev === 'focus') return 'focusin';
    return ev;
  }

  function build(node, scopes, out) {
    if (node.text) { out.push({ t: evalVal(node.text, scopes) }); return; }
    if (node.tag === 'sc-if') { var c = attrOf(node, 'value'); if (c && evalVal(c, scopes)) for (var i = 0; i < node.kids.length; i++) build(node.kids[i], scopes, out); return; }
    if (node.tag === 'sc-for') {
      var lc = attrOf(node, 'list'), ac = attrOf(node, 'as'), list = lc ? evalVal(lc, scopes) : null, as = ac ? String(ac.v) : 'item';
      if (list && list.length) for (var ix = 0; ix < list.length; ix++) {
        var sc = {}; sc[as] = list[ix]; sc.$index = ix; var ns = [sc].concat(scopes);
        for (var j = 0; j < node.kids.length; j++) build(node.kids[j], ns, out);
      }
      return;
    }
    if (node.tag === 'helmet') return;
    var v = { tag: node.tag, a: {}, on: {}, kids: [] };
    for (var a = 0; a < node.attrs.length; a++) {
      var name = node.attrs[a][0];
      if (name.indexOf('hint-') === 0) continue;
      var val = evalVal(node.attrs[a][1], scopes);
      if (/^on[A-Z]/.test(name)) { if (typeof val === 'function') v.on[eventName(name, node)] = val; }
      else v.a[name] = COR_ATTR[name] ? cores(val) : val;
    }
    for (var k = 0; k < node.kids.length; k++) build(node.kids[k], scopes, v.kids);
    out.push(v);
  }

  // ---------- tema escuro: converte as cores claras da dashboard ----------
  var tema = 'claro', cacheCor = {}, estilosHelmet = [];
  function hexParaHsl(hex) {
    if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    var r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0;
    if (mx !== mn) {
      var dd = mx - mn; s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
      h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; h /= 6;
    }
    return [h, s, l];
  }
  function hslParaHex(h, s, l) {
    function f(n) { var k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); var c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return ('0' + Math.round(c * 255).toString(16)).slice(-2); }
    return '#' + f(0) + f(8) + f(4);
  }
  var FIXOS = { '#1f4d3a': '#1F4D3A', '#173b2d': '#173B2D', '#fffffe': '#FFFFFE' };
  function corEscura(hex) {
    var k = hex.toLowerCase(); if (cacheCor[k]) return cacheCor[k];
    if (FIXOS[k]) return FIXOS[k]; // verdes de destaque e branco sobre verde ficam iguais no escuro
    var hsl = hexParaHsl(k), l = hsl[2], s = hsl[1], nl;
    if (l >= 0.8) nl = l >= 0.93 ? 0.095 + (l - 0.93) * 1.15 : 0.095 + (0.93 - l) * 3.4; // fundos claros -> fundos escuros (cartões e trilhas mais claros que o fundo)
    else if (l <= 0.32) nl = 0.93 - l * 0.45;          // textos escuros -> textos claros
    else nl = 1.02 - l;                                // tons médios: espelha
    if (l >= 0.8) s = Math.min(s, 0.16);
    return (cacheCor[k] = hslParaHex(hsl[0], s, Math.max(0, Math.min(1, nl))));
  }
  var HEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
  function cores(str) { return tema === 'escuro' && typeof str === 'string' && str.indexOf('#') >= 0 ? str.replace(HEX, corEscura) : str; }
  var COR_ATTR = { style: 1, fill: 1, stroke: 1, 'stop-color': 1, color: 1 };
  function aplicarTemaHelmet() {
    estilosHelmet.forEach(function (st) { st.el.textContent = cores(st.css); });
    document.documentElement.style.colorScheme = tema === 'escuro' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-tema', tema);
  }
  function setTema(t) { tema = t === 'escuro' ? 'escuro' : 'claro'; aplicarTemaHelmet(); schedule(); }

  // ---------- aplicação no DOM ----------
  function dispatch(e) { var h = this.__on && this.__on[e.type]; if (h) h(e); }
  var PROPS = { value: 1, checked: 1, selected: 1 };
  var FORM = { INPUT: 1, SELECT: 1, TEXTAREA: 1 };
  function setAttrs(el, v) {
    var old = el.__a || {}, na = v.a, n;
    for (n in old) if (!(n in na)) { if (n === 'class') el.removeAttribute('class'); else el.removeAttribute(n); }
    for (n in na) {
      var val = na[n];
      if (PROPS[n] && FORM[el.nodeName]) continue;
      if (old[n] === val && n !== 'style') continue;
      if (val == null || val === false) el.removeAttribute(n);
      else el.setAttribute(n, val === true ? '' : String(val));
    }
    el.__a = Object.assign({}, na);
    var on = el.__on || (el.__on = {});
    for (var t in v.on) { if (!on[t]) el.addEventListener(t, dispatch); on[t] = v.on[t]; }
    for (var u in on) if (!v.on[u]) { el.removeEventListener(u, dispatch); delete on[u]; }
  }
  function setProps(el, v) {
    if (!FORM[el.nodeName]) return;
    var a = v.a;
    if ('checked' in a) { var c = !!a.checked; if (el.checked !== c) el.checked = c; }
    if ('value' in a) { var s = a.value == null ? '' : String(a.value); if (el.value !== s) el.value = s; }
    if ('selected' in a) el.selected = !!a.selected;
  }
  function create(v, svg) {
    if (v.t != null) return document.createTextNode(v.t);
    var isSvg = svg || v.tag === 'svg';
    var el = isSvg ? document.createElementNS(SVGNS, v.tag) : document.createElement(v.tag);
    setAttrs(el, v);
    for (var i = 0; i < v.kids.length; i++) el.appendChild(create(v.kids[i], isSvg));
    setProps(el, v);
    return el;
  }
  function same(dom, v) {
    if (v.t != null) return dom.nodeType === 3;
    return dom.nodeType === 1 && dom.nodeName.toLowerCase() === v.tag.toLowerCase();
  }
  function patchKids(parent, vs, svg) {
    var nodes = parent.childNodes, i;
    for (i = 0; i < vs.length; i++) {
      var v = vs[i], dom = nodes[i];
      if (!dom) { parent.appendChild(create(v, svg)); continue; }
      if (!same(dom, v)) { parent.replaceChild(create(v, svg), dom); continue; }
      if (v.t != null) { if (dom.nodeValue !== v.t) dom.nodeValue = v.t; continue; }
      var isSvg = svg || v.tag === 'svg';
      setAttrs(dom, v);
      patchKids(dom, v.kids, isSvg);
      setProps(dom, v);
    }
    while (nodes.length > vs.length) parent.removeChild(parent.lastChild);
  }

  // ---------- componente ----------
  var mounted = null, pending = false;
  function render() {
    pending = false;
    if (!mounted) return;
    var vals;
    try { vals = mounted.inst.renderVals(); } catch (e) { console.error(e); return; }
    var out = [];
    for (var i = 0; i < mounted.tree.kids.length; i++) build(mounted.tree.kids[i], [vals], out);
    patchKids(mounted.el, out, false);
  }
  function schedule() { if (!pending) { pending = true; Promise.resolve().then(render); } }

  function DCLogic(props) { this.props = props || {}; this.state = this.state || {}; }
  DCLogic.prototype.setState = function (u, cb) {
    var patch = typeof u === 'function' ? u(this.state, this.props) : u;
    if (patch) this.state = Object.assign({}, this.state, patch);
    schedule();
    if (cb) Promise.resolve().then(cb);
  };
  DCLogic.prototype.forceUpdate = function () { schedule(); };

  function extract(src, tag) {
    var a = src.indexOf('<' + tag + '>'), b = src.indexOf('</' + tag + '>');
    return a >= 0 && b > a ? src.slice(a + tag.length + 2, b) : '';
  }
  function mount(el, templateSrc, Comp) {
    var helmet = extract(templateSrc, 'helmet');
    if (helmet) {
      var hd = document.createElement('div'); hd.innerHTML = helmet;
      Array.prototype.forEach.call(hd.querySelectorAll('style'), function (st) { estilosHelmet.push({ el: st, css: st.textContent }); });
      while (hd.firstChild) document.head.appendChild(hd.firstChild);
      aplicarTemaHelmet();
    }
    var body = templateSrc.replace(/<helmet>[\s\S]*?<\/helmet>/, '');
    var inst = new Comp({});
    mounted = { el: el, tree: parse(body), inst: inst };
    el.innerHTML = '';
    render();
    if (typeof inst.componentDidMount === 'function') inst.componentDidMount();
    return inst;
  }

  window.DCLogic = DCLogic;
  window.DCLite = { mount: mount, render: schedule, parse: parse, setTema: setTema, tema: function () { return tema; }, cor: function (c) { return cores(c); } };
})();
