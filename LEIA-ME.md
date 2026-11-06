# Minhas Finanças — app Android + versão web sincronizados

Este projeto tem a mesma dashboard em dois lugares, com os dados sincronizados pela sua conta:

- **App Android (APK)**: funciona sem internet e envia as alterações quando a conexão volta. Tem lembrete diário como notificação do celular.
- **Site**: o mesmo app aberto no navegador do computador.

Os dados ficam no **Firebase** (do Google, plano gratuito), numa conta só sua (e-mail e senha). O APK e o site são gerados automaticamente pelo **GitHub** (gratuito), sem instalar nenhum programa no computador.

Faça os passos abaixo uma vez. Leva cerca de 20 minutos.

---

## 1. Criar o banco de dados (Firebase)

Siga o arquivo **GUIA-FIREBASE.md**, com o passo a passo detalhado e as soluções para os problemas mais comuns. Em resumo:

1. Crie um projeto em **console.firebase.google.com** (sem Gemini e sem Analytics).
2. **Não** clique no ícone do Android: o app não é criado no Firebase.
3. **Security › Authentication › Get started**: ative **E-mail/senha**.
4. **Databases & Storage › Firestore › Create database**: edição Standard, local São Paulo, modo de produção.
5. Aba **Rules**: cole o conteúdo de `firestore.rules` e clique em **Publish**.
6. **Engrenagem › Configurações do projeto › Geral**: copie o **ID do projeto** e a **Chave de API da Web** e coloque em `web/config.js`, ou cole os dois na primeira tela do app.

## 2. Gerar o app e o site (GitHub)

1. Crie uma conta em **github.com** (se ainda não tiver).
2. Clique em **New repository**. Nome: `minhas-financas`. Marque **Public** (necessário para o site gratuito). Clique em **Create repository**.
3. Na página do repositório, clique em **uploading an existing file**. Arraste **todo o conteúdo** da pasta `MinhasFinancas` (incluindo a pasta `.github`, `android`, `web`, etc.). Clique em **Commit changes**.
   - Se a pasta `.github` não aparecer para arrastar (pastas que começam com ponto ficam ocultas): no Mac, aperte `Cmd + Shift + .` no Finder; no Windows, em "Exibir", marque "Itens ocultos".
4. Vá em **Settings › Pages** e, em "Source", escolha **GitHub Actions**.
5. Abra a aba **Actions**. Se ainda não houver um processo rodando, clique em **Gerar app e site › Run workflow**. Espere ficar verde (uns 5 minutos).

Pronto:

- **Site**: `https://SEU-USUARIO.github.io/minhas-financas/`
- **App**: `https://github.com/SEU-USUARIO/minhas-financas/releases/latest/download/MinhasFinancas.apk`

## 3. Instalar no celular

1. No celular, abra o link do **App** acima. O Android vai baixar `MinhasFinancas.apk`.
2. Toque no arquivo baixado. Na primeira vez, o Android pede para **permitir a instalação de apps desta fonte** (o navegador). Permita e volte para instalar.
3. Abra **Minhas Finanças**, toque em **Criar conta** (e-mail e senha). No computador, use o **mesmo e-mail e senha** no site.
4. Para receber o lembrete diário: na aba **Rastreador de hábitos**, escolha o horário e toque em **Ativar notificações**.

## 4. Levar os dados que você já tem

Os dados atuais estão na dashboard do Claude. Para trazê-los:

1. Na dashboard do Claude, clique em **Backup dos dados** (menu lateral) › **Copiar dados**.
2. No site (ou no app), já conectada à sua conta, clique em **Backup dos dados**, cole no campo **Importar dados** e toque em **Importar e substituir dados** duas vezes para confirmar.
3. Em alguns segundos os dados aparecem no outro aparelho.

## Como a sincronização funciona

- Cada alteração é salva no aparelho na hora e enviada para a conta em 1 a 2 segundos.
- Os outros aparelhos buscam novidades a cada 20 segundos e sempre que o app volta para a tela.
- Sem internet, tudo continua funcionando; as alterações são enviadas quando a conexão volta.
- O botão **Sincronização** (canto inferior direito) mostra o estado: verde = sincronizado, amarelo = aguardando envio ou sem internet, vermelho = erro.
- Se dois aparelhos alterarem os dados ao mesmo tempo, vale a última versão salva. Antes de substituir os dados de um aparelho, o app guarda uma cópia de segurança local.

## Atualizar o app

Quando a dashboard mudar, peça ao Claude para gerar os arquivos novos e substitua no GitHub os arquivos `web/template.js` e `web/component.js` (ou rode `python3 tools/gerar_web.py Main.dc.html`). O GitHub gera um APK novo; instale por cima do anterior, sem perder dados.

## Estrutura

| Pasta/arquivo | Conteúdo |
|---|---|
| `web/` | O app (mesmo código no celular e no site) |
| `web/config.js` | Configuração do Firebase |
| `web/sync.js` | Login e sincronização |
| `web/dc-lite.js` | Desenha a dashboard |
| `web/template.js`, `web/component.js` | A dashboard (gerados a partir da versão do Claude) |
| `android/` | Projeto Android (abre também no Android Studio) |
| `.github/workflows/build.yml` | Gera o APK e publica o site |
| `firestore.rules` | Regras de segurança do banco |
| `GUIA-FIREBASE.md` | Passo a passo do Firebase |
| `tools/gerar_web.py` | Atualiza o app a partir da dashboard do Claude |
