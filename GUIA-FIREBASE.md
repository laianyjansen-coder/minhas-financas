# Guia do Firebase — passo a passo

O Firebase é só o **banco de dados** onde seus dados ficam guardados para o celular e o site ficarem iguais.
O aplicativo em si **não é criado no Firebase**: ele é gerado pelo GitHub (veja o LEIA-ME, parte 2).

No Firebase você só precisa de **duas informações** no final: a **Chave de API da Web** e o **ID do projeto**.

> O Console do Firebase pode aparecer em português ou em inglês. Abaixo, os nomes em inglês estão entre parênteses.
> Tudo aqui é **gratuito** (plano Spark). Você **não precisa** cadastrar cartão nem mudar para o plano Blaze.

---

## Passo 1 — Criar o projeto

1. No computador, abra **console.firebase.google.com** e entre com sua conta Google.
2. Clique em **Criar um projeto** (*Create a project*). Em alguns casos o botão aparece como **Começar com um projeto do Firebase** (*Get started with a Firebase project*).
3. Digite um nome, por exemplo `minhas-financas`, e clique em **Continuar**.
   - Logo abaixo do nome aparece o **ID do projeto** (ex.: `minhas-financas-1a2b3`). Ele pode ter números a mais no final; tudo bem.
4. Se aparecer a pergunta sobre **Gemini** ou **Google Analytics**, desative e clique em **Continuar**.
5. Clique em **Criar projeto** (*Create project*), espere e clique em **Continuar**.

## Passo 2 — ⚠️ O que NÃO fazer

Na página inicial do projeto aparecem ícones para "Adicionar um app" (iOS, **Android**, Web, Unity, Flutter).

- **Não clique no ícone do Android.** Ele pede "nome do pacote", "SHA-1" e um arquivo `google-services.json` — nada disso é necessário para este app.
- Você também **não precisa** instalar o SDK, rodar `npm install` nem o "Firebase CLI" que o console sugere.

## Passo 3 — Ativar o login por e-mail e senha

1. No menu da esquerda, abra **Segurança › Authentication** (*Security › Authentication*).
   - Se não achar, use a busca no topo do console e digite **Authentication**. Em versões antigas do console fica em **Criação › Authentication** (*Build › Authentication*).
2. Clique em **Vamos começar** (*Get started*).
3. Na aba **Método de login** (*Sign-in method*), clique em **E-mail/senha** (*Email/Password*).
4. Ative a **primeira** chave (*Enable*). A segunda ("Link do e-mail") pode ficar desligada.
5. Clique em **Salvar** (*Save*).

## Passo 4 — Criar o banco de dados (Firestore)

1. No menu da esquerda, abra **Bancos de dados e armazenamento › Firestore** (*Databases & Storage › Firestore*).
   - Se não achar, busque **Firestore** no topo. Em versões antigas fica em **Criação › Firestore Database**.
2. Clique em **Criar banco de dados** (*Create database*).
3. Se perguntar a **edição**, escolha **Standard** (*Standard edition*). Não escolha "Enterprise".
4. **ID do banco**: deixe `(default)` como está.
5. **Local**: escolha **southamerica-east1 (São Paulo)**. Se não deixar escolher, siga com o que estiver marcado.
6. **Modo**: escolha **Iniciar no modo de produção** (*Start in production mode*).
7. Clique em **Criar** (*Create*) e espere o banco abrir.

## Passo 5 — Colar as regras de segurança

1. Ainda no Firestore, abra a aba **Regras** (*Rules*).
2. Apague todo o texto que estiver lá.
3. Cole exatamente isto (é o mesmo conteúdo do arquivo `firestore.rules`):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /usuarios/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

4. Clique em **Publicar** (*Publish*).

Isso garante que só você, logada com seu e-mail, consegue ler e gravar seus dados.

## Passo 6 — Copiar as duas informações

1. Clique na **engrenagem** ao lado de "Visão geral do projeto" (*Project Overview*) › **Configurações do projeto** (*Project settings*).
2. Na aba **Geral** (*General*), copie:
   - **ID do projeto** (*Project ID*) — ex.: `minhas-financas-1a2b3` (não confunda com o "Nome do projeto");
   - **Chave de API da Web** (*Web API Key*) — começa com `AIza` e tem cerca de 39 caracteres.
3. Nas versões mais novas do console, a **Chave de API da Web não aparece mais** nessa aba. Pegue-a de um destes jeitos:
   - **Jeito A (mais simples):** na mesma página, desça até **Seus apps** e clique no ícone **`</>`** (Web). Digite um apelido (ex.: `site`), **não** marque "Firebase Hosting" e clique em **Registrar app**. Aparece um trecho de código com `apiKey: "AIza..."`: copie o valor entre aspas. Clique em **Continuar no console**; não precisa instalar nada.
   - **Jeito B:** clique em **Ver no Google Cloud** (canto superior direito) › menu **APIs e serviços › Credenciais**. Em "Chaves de API", na linha **Browser key (auto created by Firebase)**, clique em **Mostrar chave** e copie.
   - Em versões antigas, se aparecer "Nenhuma chave de API da Web para este projeto", conclua o Passo 3 e recarregue a página.

Onde usar essas duas informações (escolha um):

- **No arquivo `web/config.js`** (recomendado, antes de enviar ao GitHub): troque `COLE_AQUI_A_API_KEY` pela chave e `COLE_AQUI_O_PROJECT_ID` pelo ID, mantendo as aspas. Exemplo:
  ```js
  window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyA1b2C3d4E5f6G7h8I9j0KlMnOpQrStUvW",
    projectId: "minhas-financas-1a2b3"
  };
  ```
- **Na primeira tela do app** ("Conectar ao Firebase"): cole a chave no primeiro campo e o ID no segundo.

> Se você já registrou um app Web (ícone `</>`) e copiou o trecho `const firebaseConfig = { ... }`, pode colar o trecho inteiro no primeiro campo do app: ele separa a chave e o ID sozinho.

Pronto: o Firebase está configurado. Agora siga a **parte 2 do LEIA-ME** (GitHub) para gerar o app e o site.

---

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| "Nenhuma chave de API da Web para este projeto" | Conclua o Passo 3 (Authentication › Vamos começar › E-mail/senha) e recarregue as Configurações do projeto. |
| O console pede cartão de crédito ou o plano **Blaze** | Volte: você provavelmente abriu outro produto (Storage, Functions, Hosting) ou escolheu a edição Enterprise. Authentication e Firestore Standard funcionam no plano gratuito. |
| O console pede "nome do pacote Android", SHA-1 ou `google-services.json` | Você clicou no ícone do Android. Feche essa tela; ela não é necessária (Passo 2). |
| No app: "O login por e-mail e senha ainda não foi ativado" | Refaça o Passo 3 e confira se clicou em **Salvar**. |
| No app: "O banco Firestore ainda não foi criado" | Faça o Passo 4. |
| No app: "O Firestore recusou o acesso" | Refaça o Passo 5 e confira se clicou em **Publicar**. |
| No app: "Chave de API inválida" | Toque em **Sincronização › Sair da conta**, depois em **Alterar configuração do Firebase**, e cole a chave de novo (inteira, começando com `AIza`). |
| No app: "O ID do projeto tem só letras minúsculas…" | Você colou o **nome** do projeto. Use o **ID do projeto** (Passo 6). |
| No app: "E-mail ou senha incorretos" | Na primeira vez, use **Criar conta** em vez de **Entrar**. |
