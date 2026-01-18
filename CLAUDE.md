# TodoCusto

Sistema de gestão de custos para negócios de alimentação (restaurantes, confeitarias, food trucks, etc).

## Stack

- **Framework**: Next.js 16 (App Router, Server Components, Server Actions)
- **React**: 19
- **Estilização**: Tailwind CSS 4
- **Banco de dados**: Neon (PostgreSQL serverless)
- **ORM**: Drizzle ORM
- **Autenticação**: better-auth
- **Componentes UI**: shadcn/ui (já instalados em `/src/components/ui`)
- **Ícones**: Tabler Icons (`@tabler/icons-react`)

## Estrutura do Projeto

```
src/
├── actions/           # Server Actions
│   ├── workspace.ts   # CRUD workspace + seed units
│   ├── units.ts       # CRUD unidades
│   ├── categories.ts  # CRUD categorias
│   ├── ingredients.ts # CRUD ingredientes + variações + entradas
│   ├── recipes.ts     # CRUD receitas + itens + passos
│   ├── products.ts    # CRUD produtos + composição
│   ├── menus.ts       # CRUD cardápios + produtos + taxas
│   ├── fixed-costs.ts # CRUD custos fixos
│   ├── suppliers.ts   # CRUD fornecedores
│   └── dashboard.ts   # Dados do dashboard
├── app/
│   ├── (auth)/        # Rotas públicas (login, register)
│   ├── (app)/         # Rotas protegidas
│   │   └── [workspaceSlug]/
│   │       ├── units/
│   │       ├── categories/
│   │       ├── ingredients/
│   │       ├── recipes/
│   │       ├── products/
│   │       ├── menus/
│   │       ├── fixed-costs/
│   │       ├── suppliers/
│   │       └── settings/
│   └── api/auth/      # API routes do better-auth
├── components/
│   ├── ui/            # Componentes shadcn/ui
│   ├── theme-provider.tsx  # Provider para dark mode
│   └── mode-toggle.tsx     # Toggle dark/light mode
├── lib/
│   ├── auth.ts        # Configuração better-auth
│   ├── auth-client.ts # Cliente auth para React
│   ├── utils.ts       # Funções utilitárias (formatCurrency, formatNumber, etc)
│   └── db/
│       ├── index.ts   # Conexão Drizzle + Neon
│       └── schema/    # Schemas do banco
└── middleware.ts      # Proteção de rotas
```

## Schema do Banco de Dados

### Autenticação (better-auth)

- `user` - usuários
- `session` - sessões ativas
- `account` - contas OAuth (futuro)
- `verification` - tokens de verificação

### Multi-tenant

- `workspace` - espaços de trabalho (negócios)
- `workspaceMember` - membros do workspace (roles: owner, admin, member)

### Domínio

- `unit` - unidades de medida com:
  - `measurementType`: weight | volume | unit
  - `conversionFactor`: fator para unidade base (g, ml, un)
  - `isBase`: true para unidades base (g, ml, un)
- `category` - categorias (tipo: ingredient, recipe, product)
- `ingredient` - ingredientes com:
  - `measurementType`: tipo de medida (peso/líquido/unidade)
  - `priceUnitId`: unidade do preço (kg, L, un)
  - `averagePrice`: preço por priceUnit
  - `baseCostPerUnit`: custo calculado por unidade base (g, ml, un)
- `ingredientVariation` - variações com rendimento/desperdício
- `entry` - entradas de compra (histórico de preços)
- `recipe` - receitas
- `recipeItem` - itens da receita (ingrediente, variação, ou outra receita)
- `recipeStep` - passos da receita
- `product` - produtos vendáveis com:
  - `sizeGroupId`: grupo de tamanhos opcional (para pizzas, açaí, etc)
- `productComposition` - composição do produto (ingredientes, variações, receitas, outros produtos)

### Tamanhos (para pizzarias, açaiterias, etc)

- `sizeGroup` - grupos de tamanhos do workspace (ex: "Tamanhos de Pizza", "Tamanhos de Açaí")
- `sizeOption` - opções de tamanho dentro do grupo com:
  - `multiplier`: multiplicador de custo (ex: 0.5 para P, 1.0 para G)
  - `isReference`: marca qual tamanho é a referência (multiplicador 1.0)

### Cardápios

- `menu` - cardápios com margem de lucro alvo
- `menuFee` - taxas (cartão, delivery, impostos) em percentual
- `fixedCost` - custos fixos globais (aluguel, energia, salários)
- `menuFixedCost` - custos fixos associados ao cardápio com rateio
- `menuProduct` - produtos no cardápio com:
  - `sizeOptionId`: tamanho opcional (se produto tem tamanhos)
  - `sellingPrice`: preço de venda
  - `calculatedCost`: custo base do produto (com multiplicador de tamanho)
  - `marginPercent`: margem calculada
  - Simulador de preço sugerido

## Sistema de Custos

### Tipos de Medida

- **weight** (Peso): base em gramas (g), suporta kg, mg, etc.
- **volume** (Líquido): base em mililitros (ml), suporta L, etc.
- **unit** (Unidade): base em unidades (un), suporta dúzia, etc.

### Fluxo de cálculo

```
Ingrediente
├── preço: R$50/kg
├── conversionFactor: 1000 (1kg = 1000g)
└── baseCostPerUnit: R$0.05/g (50 ÷ 1000)
    ↓
Variação (aplica rendimento/desperdício)
    ↓
Receita (soma custos dos itens ÷ rendimento)
    ↓
Produto (soma custos da composição)
    ↓
Menu (+ custos fixos + taxas + margem)
```

### Cálculo do Custo Base do Ingrediente

```
baseCostPerUnit = averagePrice ÷ conversionFactor
Ex: R$50/kg ÷ 1000 = R$0.05/g
```

### Cálculo de Variação

```
custoVariação = (baseCostPerUnit × quantidade × conversionFactor) ÷ rendimento
Ex: 100g de carne a R$0.05/g com 80% rendimento
    (0.05 × 100 × 1) ÷ 0.8 = R$6.25
```

### Cálculo de Receita

```
custoReceita = Σ(custoItem × quantidade × conversionFactor) ÷ rendimentoReceita
```

### Cálculo de Produto

```
custoBase = Σ(custoItem × quantidade × conversionFactor)
```

### Cálculo de Produto com Tamanhos

```
custoTamanho = custoBase × multiplicador

Exemplo: Pizza de Frango (custoBase = R$14,40)
├── Pequena (0.5x) = R$14,40 × 0.5 = R$ 7,20
├── Média (0.75x) = R$14,40 × 0.75 = R$10,80
├── Grande (1.0x) = R$14,40 × 1.0 = R$14,40 ← Referência
└── Gigante (1.3x) = R$14,40 × 1.3 = R$18,72
```

## Status de Implementação

### ✅ Fase 1 (MVP) - Concluída

- [x] Autenticação (login/registro)
- [x] Multi-workspace (criar/selecionar espaços)
- [x] Unidades de medida (CRUD + seed de unidades padrão)
- [x] Categorias (CRUD com tipos)
- [x] Ingredientes (CRUD)
- [x] Variações de ingrediente (com rendimento/desperdício)
- [x] Entradas de compra (histórico de preços)
- [x] Receitas (CRUD)
- [x] Itens de receita (ingredientes, variações, outras receitas)
- [x] Passos de receita
- [x] Produtos (CRUD)
- [x] Composição de produto (ingredientes, variações, receitas, outros produtos)

### ✅ Fase 2 - Cardápios - Concluída

- [x] CRUD de cardápios
- [x] Custos fixos globais (aluguel, energia, salários)
- [x] Taxas percentuais (cartão, delivery, impostos)
- [x] Produtos no cardápio com preço de venda
- [x] Cálculo de margem por produto
- [x] Rateio de custos fixos por cardápio
- [x] Simulador de preço sugerido (calcula preço para manter margem alvo)

### ✅ Fase 2.1 - Tamanhos (Pizzarias, Açaiterias) - Concluída

- [x] Grupos de tamanhos por workspace (ex: "Tamanhos de Pizza")
- [x] Opções de tamanho com multiplicador (P=0.5x, M=0.75x, G=1.0x)
- [x] Marcação de tamanho referência para composição
- [x] Vinculação opcional de produto a grupo de tamanhos
- [x] Cálculo automático de custo por tamanho (base × multiplicador)
- [x] Produtos com tamanhos no cardápio (cada tamanho = linha separada)
- [x] Prévia de custos por tamanho na página do produto

### ✅ UX/UI - Concluída

- [x] Dark mode (toggle light/dark)
- [x] Formatação brasileira de moeda (vírgula como decimal)
- [x] Select com busca para itens (combobox)
- [x] Filtro de unidades por tipo de medida
- [x] Links clicáveis em nomes de produtos/receitas
- [x] Layout consistente entre tabelas

### ⏳ Fase 3 - Relatórios

- [ ] Dashboard com métricas
- [ ] Comparativo de custos
- [ ] Exportação PDF/Excel

### 🔧 Melhorias Pendentes

- [ ] Recálculo em cascata (ingrediente → variações → receitas → produtos)
- [ ] Convidar membros para workspace
- [ ] Verificação de email
- [ ] Login social (Google, etc)

## Comandos

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Banco de dados
npm run db:generate  # Gerar migrations
npm run db:push      # Aplicar schema no banco
npm run db:studio    # Abrir Drizzle Studio
```

## Variáveis de Ambiente

```env
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
BETTER_AUTH_SECRET="chave-secreta-segura"
BETTER_AUTH_URL="http://localhost:3000"
```

## Convenções

- **Idioma do código**: Inglês (variáveis, funções, schemas)
- **Idioma da UI**: Português brasileiro
- **IDs**: nanoid (21 caracteres)
- **Decimais**: Armazenados como `numeric` no banco, manipulados como string
- **Server Actions**: Retornam `{ success: true }` ou `{ error: "mensagem" }`
- **Formulários**: Usam `action={serverAction}` com FormData
- **Componentes cliente**: Marcados com `"use client"` no topo
- **Formatação de moeda**:
  - Usar `toLocaleString("pt-BR")` ou funções de `@/lib/utils`
  - Preços normais: 2 casas decimais (R$ 10,50)
  - Custos por porção/unidade: 4 casas decimais (R$ 0,0525)
  - Sempre vírgula como separador decimal
