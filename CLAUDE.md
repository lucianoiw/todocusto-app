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
│   └── products.ts    # CRUD produtos + composição
├── app/
│   ├── (auth)/        # Rotas públicas (login, register)
│   ├── (app)/         # Rotas protegidas
│   │   └── [workspaceSlug]/
│   │       ├── units/
│   │       ├── categories/
│   │       ├── ingredients/
│   │       ├── recipes/
│   │       └── products/
│   └── api/auth/      # API routes do better-auth
├── components/ui/     # Componentes shadcn/ui
├── lib/
│   ├── auth.ts        # Configuração better-auth
│   ├── auth-client.ts # Cliente auth para React
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
- `product` - produtos vendáveis
- `productComposition` - composição do produto

### Cardápios (Fase 2 - não implementado)
- `menu` - cardápios
- `menuFee` - taxas (cartão, delivery, impostos)
- `fixedCost` - custos fixos (aluguel, energia)
- `menuFixedCost` - custos fixos associados ao cardápio
- `menuProduct` - produtos no cardápio com preço de venda

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
Menu (+ custos fixos + taxas + margem) [Fase 2]
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

### ⏳ Fase 2 - Cardápios
- [ ] CRUD de cardápios
- [ ] Custos fixos (aluguel, energia, salários)
- [ ] Taxas (cartão, delivery, impostos)
- [ ] Produtos no cardápio com preço de venda
- [ ] Cálculo de preço final com margem
- [ ] Rateio de custos fixos

### 🔮 Fase 3 - Relatórios
- [ ] Dashboard com métricas
- [ ] Comparativo de custos
- [ ] Simulações de preço
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
