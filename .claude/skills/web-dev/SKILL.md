---
name: web-dev
description: >
  Especialista em desenvolvimento da interface web do projeto llm-gateway (apps/web).
  Use este skill SEMPRE que o usuário pedir qualquer mudança visual, novo componente,
  nova página, ajuste de layout, estilo, UX ou qualquer coisa em apps/web — mesmo que
  o pedido não mencione "web" explicitamente. Triggers: "adicionar coluna", "mudar botão",
  "nova tela", "ajustar layout", "componente", "interface", "UI", "tela de", "página de",
  "mostrar X na tabela", "formulário", "modal", "dropdown", qualquer referência a
  UsersClient, RulesClient, ModelsClient, Sidebar, ou arquivos em apps/web/src/.
---

# Web Dev — LLM Gateway

Você é o especialista em `apps/web` do llm-gateway. Seu trabalho é implementar mudanças
na interface de forma consistente com as convenções do projeto.

## Stack

- **Next.js 16** com App Router (`apps/web/src/app/`)
- **shadcn/ui** como biblioteca de componentes principal — `apps/web/src/components/ui/`
- **Tailwind CSS** para estilização
- **TypeScript** estrito
- **SWR** para data fetching (`apps/web/src/hooks/`)
- **sonner** para toasts
- **lucide-react** para ícones

## Estrutura do projeto

```
apps/web/src/
├── app/
│   ├── layout.tsx          # ThemeProvider + Sidebar + Toaster
│   ├── page.tsx            # Home — usa Card/CardContent
│   ├── users/page.tsx      # → UsersClient
│   ├── rules/page.tsx      # → RulesClient
│   └── models/page.tsx     # → ModelsClient
├── components/
│   ├── ui/                 # shadcn components (nunca editar diretamente)
│   ├── layout/
│   │   ├── Sidebar.tsx     # nav + Separator + ThemeToggle
│   │   └── NavItem.tsx
│   ├── users/
│   │   ├── UsersClient.tsx
│   │   ├── UserActionsMenu.tsx
│   │   ├── CreateUserDialog.tsx
│   │   └── UserFormFields.tsx
│   ├── rules/
│   │   └── RulesClient.tsx
│   └── models/
│       └── ModelsClient.tsx
├── hooks/
│   ├── useUsers.ts
│   ├── useRules.ts
│   └── useModels.ts
└── lib/
    ├── api-client.ts       # chamadas REST para /admin/*
    └── utils.ts            # cn()
```

## Regra principal: sempre usar shadcn MCP

**Antes de qualquer mudança visual**, use `mcp__shadcn` para:

1. **Descobrir** o componente correto para o que precisa fazer
2. **Verificar** se já está instalado em `apps/web/src/components/ui/`
3. **Instalar** se não estiver: `npx shadcn@latest add <component>`
4. **Consultar** a API/props corretas antes de usar

Componentes já instalados: `badge`, `button`, `card`, `checkbox`, `dialog`,
`dropdown-menu`, `input`, `label`, `select`, `separator`, `skeleton`, `switch`,
`table`, `tooltip`

**Nunca reimplemente** o que shadcn já oferece. Se precisar de um componente novo,
adicione via shadcn antes de escrever código.

## Convenções obrigatórias

### Imports
```tsx
// ✅ correto
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableRow } from '@/components/ui/table'

// ❌ nunca importar radix-ui diretamente no código da aplicação
import * as DialogPrimitive from '@radix-ui/react-dialog'
```

### Estilização
```tsx
// ✅ use cn() para classes condicionais
import { cn } from '@/lib/utils'
<div className={cn('base-class', condition && 'conditional-class')} />

// ✅ use variantes do shadcn
<Badge variant="destructive" />
<Button variant="outline" size="sm" />
```

### Padrão de loading
```tsx
// ✅ sempre Skeleton, nunca texto "Carregando..."
{isLoading ? (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
) : (
  // conteúdo real
)}
```

### Padrão de tabela
```tsx
// ✅ sempre shadcn Table dentro de div com borda
<div className="rounded-lg border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Coluna</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {items?.map((item) => (
        <TableRow key={item.id}>
          <TableCell>{item.value}</TableCell>
        </TableRow>
      ))}
      {items?.length === 0 && (
        <TableRow>
          <TableCell colSpan={N} className="py-8 text-center text-muted-foreground">
            Nenhum item cadastrado
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
</div>
```

### Padrão de página client
```tsx
'use client'

import { TooltipProvider } from '@/components/ui/tooltip'

export function XClient() {
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* header com título + botão ação */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Título</h1>
            <p className="text-sm text-muted-foreground">Subtítulo</p>
          </div>
          <Button size="sm">Ação</Button>
        </div>
        {/* conteúdo */}
      </div>
    </TooltipProvider>
  )
}
```

### Toasts
```tsx
import { toast } from 'sonner'
toast.success('Operação realizada')
toast.error((err as Error).message)
```

### Ícones
```tsx
// sempre lucide-react
import { Plus, Trash2, MoreHorizontal } from 'lucide-react'
<Plus className="mr-1 h-4 w-4" />
```

## Workflow para mudanças de UI

1. **Consultar shadcn MCP** — identificar componente adequado
2. **Verificar instalação** — checar se existe em `components/ui/`
3. **Instalar se necessário** — `npx shadcn@latest add <component>`
4. **Implementar** — seguindo as convenções acima
5. **Verificar TypeScript** — `node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit`

## Tema e design tokens

O projeto usa dark mode por padrão (`defaultTheme="dark"`). Use sempre as variáveis
CSS do shadcn ao invés de cores fixas:

- `text-muted-foreground` para textos secundários
- `bg-card` para superfícies de card
- `text-primary` / `bg-primary` para destaque
- `text-destructive` para ações destrutivas
- `border` para bordas padrão
