#!/usr/bin/env python3
"""Gera web/template.js e web/component.js a partir do Main.dc.html da dashboard.

Uso: python3 tools/gerar_web.py caminho/para/Main.dc.html
Rode sempre que a dashboard web (canvas) for alterada, para o app ficar igual.
"""
import json, re, sys, pathlib

src = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
web = pathlib.Path(__file__).resolve().parent.parent / 'web'

tpl = re.search(r'<x-dc>([\s\S]*)</x-dc>', src).group(1)
script = re.search(r'<script type="text/x-dc" data-dc-script[^>]*>([\s\S]*?)</script>', src).group(1)

(web / 'template.js').write_text(
    '/* Gerado por tools/gerar_web.py — não edite à mão. */\nwindow.DC_TEMPLATE = ' + json.dumps(tpl, ensure_ascii=False) + ';\n',
    encoding='utf-8')
(web / 'component.js').write_text(
    '/* Gerado por tools/gerar_web.py — não edite à mão. */\n' + script + '\nwindow.DashComponent = Component;\n',
    encoding='utf-8')
print('template.js e component.js atualizados')
