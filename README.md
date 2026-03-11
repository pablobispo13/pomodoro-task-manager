# Pomodoro Task Manager App

Aplicação desktop de **produtividade baseada em Pomodoro**, construída com **Electron + React + Vite + Tailwind + shadcn/ui**.

O objetivo do projeto é fornecer um ambiente simples de foco com timer Pomodoro, gerenciamento de tarefas e um HUD minimalista para acompanhamento da sessão de trabalho.

---

## Tecnologias

* **Electron** — aplicação desktop
* **React 19** — interface
* **Vite** — bundler e dev server
* **TypeScript** — tipagem
* **TailwindCSS v4** — estilização
* **shadcn/ui** — componentes UI
* **Framer Motion** — animações
* **Radix UI** — primitives acessíveis
* **Lucide Icons** — ícones

---

# Requisitos

Antes de iniciar, certifique-se de possuir instalado:

* **Node.js 20+**
* **npm** ou **pnpm**
* **Git**

Verificar versão do node:

```
node -v
```

---

# Instalação

Clone o repositório:

```
git clone https://github.com/pablobispo13/pomodoro-task-manager.git
```

Entre na pasta:

```
cd pomodoro-task-manager-app
```

Instale as dependências:

```
npm install
```

---

# Rodando o projeto em desenvolvimento

Execute:

```
npm run dev
```

Esse comando inicia dois processos:

1. **Vite dev server**
2. **Electron**

Fluxo de inicialização:

```
Vite inicia → http://localhost:5173
↓
Electron aguarda servidor
↓
Janela desktop abre carregando a aplicação
```

---

# Scripts disponíveis

### Desenvolvimento

```
npm run dev
```

Inicia Vite + Electron simultaneamente.

---

# Estrutura do projeto (simplificada)

```
src
 ├── electron
 │   └── main.js        # processo principal do Electron
 │
 ├── components         # componentes React
 │
 ├── hooks              # hooks customizados
 │
 ├── pages              # telas da aplicação
 │
 ├── styles             # estilos globais
 │
 └── main.tsx           # entrada React
```

---

# Fluxo de desenvolvimento

```
React UI
↓
Vite Dev Server
↓
Electron Window
↓
Aplicação Desktop
```

Isso permite **hot reload instantâneo** enquanto o Electron roda.

---

# UI

A interface utiliza **shadcn/ui + Tailwind**, permitindo:

* componentes reutilizáveis
* design consistente
* fácil customização

# Ideia do projeto

A aplicação pretende evoluir para incluir:

* Timer Pomodoro
* Gerenciamento de tarefas
* Histórico de foco diário
* Métricas de produtividade