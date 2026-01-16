# Plano de Implementação: Sistema de Variações e Modificadores

## Sumário Executivo

Este documento detalha a implementação de um sistema flexível de variações para o TodoCusto, permitindo que qualquer tipo de estabelecimento (pizzaria, hamburgueria, açaiteria, etc.) configure seus produtos com tamanhos, categorias de preço e modificadores de forma dinâmica.

### Princípios de Design

1. **Flexibilidade Total**: O usuário define os grupos de variação que fazem sentido para seu negócio
2. **Custo na Ponta do Lápis**: Cada variação tem composição própria com custo calculado
3. **Separação Clara**: Produto = Custo | Cardápio = Preço
4. **Retrocompatibilidade**: Produtos simples continuam funcionando sem variações
5. **Simplicidade na UI**: Não confundir quem tem negócio simples

---

## Parte 1: Modelo de Dados

### 1.1 Novas Tabelas

#### `variation_group` (Grupo de Variação)
Define um tipo de variação que pode ser aplicado a produtos (ex: "Tamanhos de Pizza", "Tipo de Massa", "Categoria de Sabor").

```typescript
// src/lib/db/schema/variations.ts

export const variationGroup = pgTable("variation_group", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Tamanhos de Pizza"
  description: text("description"), // "Define os tamanhos disponíveis para pizzas"
  // Tipo do grupo: afeta como é exibido e processado
  // "size" = tamanhos (P, M, G) - afeta quantidade de composição
  // "category" = categorias de preço (Básico, Premium) - pode ter markup
  // "base" = base/tipo (Massa fina, Massa grossa) - composição alternativa
  type: text("type").notNull().default("size"), // "size" | "category" | "base"
  // Se true, é obrigatório selecionar uma opção deste grupo
  required: boolean("required").notNull().default(true),
  // Ordem de exibição
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

**Descrição**: Um grupo de variação é uma categoria de opções que o cliente pode escolher. Por exemplo, "Tamanho" é um grupo com opções P, M, G, GG.

---

#### `variation_option` (Opção de Variação)
Define uma opção específica dentro de um grupo (ex: "Grande" dentro do grupo "Tamanhos").

```typescript
export const variationOption = pgTable("variation_option", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => variationGroup.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Grande", "Premium", "Massa Fina"
  abbreviation: text("abbreviation"), // "G", "P", "MF"
  description: text("description"), // "Pizza com 8 fatias, 35cm de diâmetro"
  // Fator multiplicador para composição (usado em grupos tipo "size")
  // Ex: se P=1.0, M=1.5, G=2.0, a composição é multiplicada por esse fator
  multiplier: decimal("multiplier", { precision: 10, scale: 4 }).default("1"),
  // Markup percentual (usado em grupos tipo "category")
  // Ex: Premium = 20% a mais sobre o custo base
  markupPercentage: decimal("markup_percentage", { precision: 10, scale: 4 }).default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

**Descrição**: Cada opção tem um `multiplier` (para tamanhos) ou `markupPercentage` (para categorias premium). O multiplier afeta a quantidade de ingredientes; o markup afeta o preço.

---

#### `product_variation_group` (Grupos de Variação do Produto)
Associa grupos de variação a um produto específico.

```typescript
export const productVariationGroup = pgTable("product_variation_group", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
  groupId: text("group_id")
    .notNull()
    .references(() => variationGroup.id, { onDelete: "cascade" }),
  // Permite override de obrigatoriedade para este produto específico
  required: boolean("required"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**Descrição**: Define quais grupos de variação se aplicam a cada produto. Uma pizza pode ter os grupos "Tamanho" e "Categoria", enquanto um hambúrguer pode ter apenas "Tamanho".

---

#### `product_variant` (Variante de Produto)
Representa uma combinação específica de opções com seu custo calculado.

```typescript
export const productVariant = pgTable("product_variant", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
  // Nome gerado automaticamente: "Pizza Calabresa - G - Premium"
  name: text("name").notNull(),
  // SKU opcional para integração com PDV
  sku: text("sku"),
  // Custo base calculado (soma da composição × multiplier)
  baseCost: decimal("base_cost", { precision: 15, scale: 4 }).notNull().default("0"),
  // Markup total (soma dos markups das categorias)
  markupPercentage: decimal("markup_percentage", { precision: 10, scale: 4 }).default("0"),
  // Custo final = baseCost × (1 + markupPercentage/100)
  finalCost: decimal("final_cost", { precision: 15, scale: 4 }).notNull().default("0"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

**Descrição**: Uma variante é uma combinação específica. Ex: "Pizza Calabresa Grande Premium" é uma variante. Cada variante tem seu custo calculado automaticamente.

---

#### `product_variant_option` (Opções da Variante)
Junction table entre variante e as opções selecionadas.

```typescript
export const productVariantOption = pgTable("product_variant_option", {
  id: text("id").primaryKey(),
  variantId: text("variant_id")
    .notNull()
    .references(() => productVariant.id, { onDelete: "cascade" }),
  optionId: text("option_id")
    .notNull()
    .references(() => variationOption.id, { onDelete: "cascade" }),
});
```

**Descrição**: Conecta uma variante às suas opções. A variante "Pizza Calabresa G Premium" terá duas entradas: uma para "G" e outra para "Premium".

---

#### `modifier_group` (Grupo de Modificadores)
Define um grupo de adicionais/modificadores (ex: "Bordas Recheadas", "Extras").

```typescript
export const modifierGroup = pgTable("modifier_group", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Bordas Recheadas"
  description: text("description"), // "Bordas especiais para pizzas"
  // Quantidade mínima de seleções (0 = opcional)
  minSelections: integer("min_selections").notNull().default(0),
  // Quantidade máxima de seleções (null = ilimitado)
  maxSelections: integer("max_selections"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

**Descrição**: Um grupo de modificadores organiza adicionais relacionados. "Bordas Recheadas" é um grupo; "Catupiry", "Cheddar" são as opções dentro dele.

---

#### `modifier_option` (Opção de Modificador)
Define uma opção específica de modificador com sua composição.

```typescript
export const modifierOption = pgTable("modifier_option", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => modifierGroup.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Borda Catupiry"
  description: text("description"), // "Borda recheada com catupiry"
  // Custo calculado da composição deste modificador
  baseCost: decimal("base_cost", { precision: 15, scale: 4 }).notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

**Descrição**: Cada opção de modificador tem seu próprio custo, calculado a partir de sua composição.

---

#### `modifier_option_composition` (Composição do Modificador)
Define os ingredientes que compõem um modificador.

```typescript
export const modifierOptionComposition = pgTable("modifier_option_composition", {
  id: text("id").primaryKey(),
  modifierOptionId: text("modifier_option_id")
    .notNull()
    .references(() => modifierOption.id, { onDelete: "cascade" }),
  type: productItemTypeEnum("type").notNull(), // "ingredient" | "variation" | "recipe"
  itemId: text("item_id").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
  unitId: text("unit_id").references(() => unit.id),
  calculatedCost: decimal("calculated_cost", { precision: 15, scale: 4 })
    .notNull()
    .default("0"),
});
```

**Descrição**: Similar ao `productComposition`, define o que compõe o modificador. Ex: Borda Catupiry usa 50g de catupiry.

---

#### `modifier_option_size` (Modificador por Tamanho)
Permite que modificadores tenham custos diferentes por tamanho.

```typescript
export const modifierOptionSize = pgTable("modifier_option_size", {
  id: text("id").primaryKey(),
  modifierOptionId: text("modifier_option_id")
    .notNull()
    .references(() => modifierOption.id, { onDelete: "cascade" }),
  // Referência à opção de tamanho (ex: "G", "M", "P")
  sizeOptionId: text("size_option_id")
    .notNull()
    .references(() => variationOption.id, { onDelete: "cascade" }),
  // Override da quantidade base para este tamanho
  quantityMultiplier: decimal("quantity_multiplier", { precision: 10, scale: 4 })
    .notNull()
    .default("1"),
  // Custo calculado para este tamanho
  calculatedCost: decimal("calculated_cost", { precision: 15, scale: 4 })
    .notNull()
    .default("0"),
});
```

**Descrição**: Permite que a borda recheada custe mais em uma pizza G do que em uma P. A quantidade de catupiry é multiplicada pelo `quantityMultiplier` do tamanho.

---

#### `product_modifier_group` (Grupos de Modificadores do Produto)
Associa grupos de modificadores a um produto.

```typescript
export const productModifierGroup = pgTable("product_modifier_group", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
  groupId: text("group_id")
    .notNull()
    .references(() => modifierGroup.id, { onDelete: "cascade" }),
  // Override para este produto
  minSelections: integer("min_selections"),
  maxSelections: integer("max_selections"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**Descrição**: Define quais grupos de modificadores se aplicam a cada produto.

---

### 1.2 Alterações em Tabelas Existentes

#### Tabela `product`
Adicionar campo para indicar se o produto usa variações:

```typescript
// Adicionar ao schema existente
hasVariations: boolean("has_variations").notNull().default(false),
// Custo base permanece como referência para produtos sem variações
// Para produtos com variações, baseCost pode ser 0 ou custo médio
```

---

#### Tabela `menuProduct`
Atualizar para suportar variantes:

```typescript
// Adicionar campos
productVariantId: text("product_variant_id")
  .references(() => productVariant.id, { onDelete: "cascade" }),
// productId continua existindo para produtos sem variações
// Se productVariantId != null, usar custo da variante
// Se productVariantId == null, usar custo do produto base
```

---

#### Nova Tabela: `menu_promotion` (Promoções do Cardápio)
Promoções são definidas no nível do cardápio, não do produto.

```typescript
export const promotionTypeEnum = pgEnum("promotion_type", [
  "percentage_discount",    // % de desconto
  "fixed_discount",         // R$ de desconto
  "fixed_price",            // Preço fixo
  "buy_x_get_y",           // Compre X leve Y
]);

export const promotionScopeEnum = pgEnum("promotion_scope", [
  "product",       // Produto específico
  "variant",       // Variante específica
  "category",      // Categoria inteira
  "all",           // Todo o cardápio
]);

export const menuPromotion = pgTable("menu_promotion", {
  id: text("id").primaryKey(),
  menuId: text("menu_id")
    .notNull()
    .references(() => menu.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Terça da Pizza"
  description: text("description"), // "Todas as pizzas com 30% de desconto"
  type: promotionTypeEnum("type").notNull(),
  scope: promotionScopeEnum("scope").notNull(),
  // Valor do desconto (% ou R$, dependendo do type)
  value: decimal("value", { precision: 15, scale: 4 }).notNull(),
  // Para buy_x_get_y: quantidade que precisa comprar
  buyQuantity: integer("buy_quantity"),
  // Para buy_x_get_y: quantidade que ganha
  getQuantity: integer("get_quantity"),
  // Dias da semana (0=domingo, 6=sábado), null = todos os dias
  weekdays: integer("weekdays").array(),
  // Horário de início e fim (null = dia todo)
  startTime: text("start_time"), // "18:00"
  endTime: text("end_time"), // "22:00"
  // Período de validade
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

---

#### `menu_promotion_item` (Itens da Promoção)
Define quais produtos/variantes/categorias são afetados pela promoção.

```typescript
export const menuPromotionItem = pgTable("menu_promotion_item", {
  id: text("id").primaryKey(),
  promotionId: text("promotion_id")
    .notNull()
    .references(() => menuPromotion.id, { onDelete: "cascade" }),
  // Tipo do item afetado
  itemType: text("item_type").notNull(), // "product" | "variant" | "category"
  // ID do item (productId, variantId, ou categoryId)
  itemId: text("item_id").notNull(),
});
```

---

### 1.3 Diagrama do Modelo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            GRUPOS DE VARIAÇÃO                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  variation_group                    variation_option                         │
│  ┌──────────────────┐              ┌──────────────────┐                     │
│  │ id               │              │ id               │                     │
│  │ workspaceId      │──────┐       │ groupId          │◄────────────────┐   │
│  │ name             │      │       │ name             │                 │   │
│  │ type (size/      │      │       │ abbreviation     │                 │   │
│  │   category/base) │      │       │ multiplier       │ (para tamanhos) │   │
│  │ required         │      │       │ markupPercentage │ (para categorias│   │
│  │ sortOrder        │      │       │ sortOrder        │                 │   │
│  └──────────────────┘      │       └──────────────────┘                 │   │
│           │                │                │                           │   │
│           │                │                │                           │   │
│           ▼                │                ▼                           │   │
│  product_variation_group   │       product_variant_option               │   │
│  ┌──────────────────┐      │       ┌──────────────────┐                 │   │
│  │ productId        │◄─────┼───────│ variantId        │                 │   │
│  │ groupId          │──────┘       │ optionId         │─────────────────┘   │
│  │ required         │              └──────────────────┘                     │
│  │ sortOrder        │                      │                                │
│  └──────────────────┘                      │                                │
│           │                                │                                │
│           │                                ▼                                │
│           │                       product_variant                           │
│           │                       ┌──────────────────┐                     │
│           │                       │ id               │                     │
│           └──────────────────────►│ productId        │                     │
│                                   │ name             │                     │
│                                   │ sku              │                     │
│                                   │ baseCost         │ (calculado)         │
│                                   │ markupPercentage │                     │
│                                   │ finalCost        │ (calculado)         │
│                                   └──────────────────┘                     │
│                                            │                                │
└────────────────────────────────────────────┼────────────────────────────────┘
                                             │
┌────────────────────────────────────────────┼────────────────────────────────┐
│                                            │                                │
│                           PRODUTO          │                                │
│                                            ▼                                │
│                                   product                                   │
│                                   ┌──────────────────┐                     │
│                                   │ id               │                     │
│                                   │ name             │                     │
│                                   │ hasVariations    │ (novo)              │
│                                   │ baseCost         │                     │
│                                   └──────────────────┘                     │
│                                            │                                │
│                                            │                                │
│                            ┌───────────────┼───────────────┐               │
│                            │               │               │               │
│                            ▼               ▼               ▼               │
│               product_composition  product_variation  product_modifier     │
│                                       _group             _group            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                            MODIFICADORES                                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  modifier_group                     modifier_option                         │
│  ┌──────────────────┐              ┌──────────────────┐                    │
│  │ id               │              │ id               │                    │
│  │ workspaceId      │              │ groupId          │◄───────────────┐   │
│  │ name             │              │ name             │                │   │
│  │ minSelections    │              │ baseCost         │                │   │
│  │ maxSelections    │              └──────────────────┘                │   │
│  └──────────────────┘                      │                           │   │
│           │                                │                           │   │
│           │                    ┌───────────┴───────────┐               │   │
│           │                    │                       │               │   │
│           │                    ▼                       ▼               │   │
│           │    modifier_option_composition   modifier_option_size      │   │
│           │    ┌──────────────────┐         ┌──────────────────┐      │   │
│           │    │ modifierOptionId │         │ modifierOptionId │      │   │
│           │    │ type             │         │ sizeOptionId     │──────┘   │
│           │    │ itemId           │         │ quantityMultiplier│         │
│           │    │ quantity         │         │ calculatedCost   │         │
│           │    │ unitId           │         └──────────────────┘         │
│           │    │ calculatedCost   │                                      │
│           │    └──────────────────┘                                      │
│           │                                                              │
│           ▼                                                              │
│  product_modifier_group                                                   │
│  ┌──────────────────┐                                                    │
│  │ productId        │                                                    │
│  │ groupId          │                                                    │
│  │ minSelections    │ (override)                                         │
│  │ maxSelections    │ (override)                                         │
│  └──────────────────┘                                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                              CARDÁPIO                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  menu                          menu_product                               │
│  ┌──────────────────┐         ┌──────────────────┐                       │
│  │ id               │         │ menuId           │◄──────────────────┐   │
│  │ name             │         │ productId        │ (ou null)         │   │
│  │ apportionmentType│         │ productVariantId │ (ou null) [NOVO]  │   │
│  │ apportionmentVal │         │ salePrice        │                   │   │
│  └──────────────────┘         │ totalCost        │                   │   │
│           │                   │ marginValue      │                   │   │
│           │                   │ marginPercentage │                   │   │
│           │                   └──────────────────┘                   │   │
│           │                                                          │   │
│           ▼                                                          │   │
│  menu_promotion                menu_promotion_item                    │   │
│  ┌──────────────────┐         ┌──────────────────┐                   │   │
│  │ menuId           │─────────│ promotionId      │                   │   │
│  │ name             │         │ itemType         │                   │   │
│  │ type             │         │ itemId           │───────────────────┘   │
│  │ scope            │         └──────────────────┘                       │
│  │ value            │                                                    │
│  │ weekdays[]       │                                                    │
│  │ startTime/endTime│                                                    │
│  │ startDate/endDate│                                                    │
│  └──────────────────┘                                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Parte 2: Fluxo de Cálculo de Custos

### 2.1 Fluxo para Produto SEM Variações (atual)

```
Ingrediente.baseCostPerUnit (R$/g)
        │
        ▼
ProductComposition (quantidade × unidade)
        │
        ▼
calculatedCost = baseCostPerUnit × quantidade × conversionFactor
        │
        ▼
Product.baseCost = Σ(calculatedCost de cada composição)
        │
        ▼
MenuProduct.totalCost = baseCost + taxas + custos fixos
        │
        ▼
MenuProduct.marginValue = salePrice - totalCost
```

### 2.2 Fluxo para Produto COM Variações (novo)

```
Ingrediente.baseCostPerUnit (R$/g)
        │
        ▼
ProductComposition (quantidade × unidade)
        │
        ├─────────────────────────────────────────────────────────┐
        │                                                         │
        ▼                                                         │
VariationOption.multiplier                                        │
(ex: G=2.0, M=1.5, P=1.0)                                        │
        │                                                         │
        ▼                                                         │
ProductVariant.baseCost = Σ(composition.calculatedCost × multiplier)
        │                                                         │
        │                    ┌────────────────────────────────────┘
        ▼                    ▼
VariationOption.markupPercentage
(ex: Premium=20%, Básico=0%)
        │
        ▼
ProductVariant.finalCost = baseCost × (1 + markupPercentage/100)
        │
        ▼
MenuProduct.totalCost = finalCost + taxas + custos fixos
        │
        ▼
MenuProduct.marginValue = salePrice - totalCost
```

### 2.3 Exemplo Prático: Pizza Calabresa

#### Dados de Entrada

**Ingredientes:**
- Massa de pizza: R$ 0.003/g (baseCostPerUnit)
- Molho de tomate: R$ 0.008/g
- Mussarela: R$ 0.045/g
- Calabresa: R$ 0.035/g

**Composição Base (para tamanho referência P):**
- Massa: 150g → R$ 0.45
- Molho: 50g → R$ 0.40
- Mussarela: 100g → R$ 4.50
- Calabresa: 80g → R$ 2.80
- **Total Base: R$ 8.15**

**Grupos de Variação:**

1. **Tamanhos** (type: "size")
   - P: multiplier = 1.0
   - M: multiplier = 1.5
   - G: multiplier = 2.0
   - GG: multiplier = 2.5

2. **Categorias** (type: "category")
   - Básico: markupPercentage = 0%
   - Premium: markupPercentage = 15%
   - Especial: markupPercentage = 25%

#### Cálculo de Variantes

| Variante | Base × Mult | Markup | Custo Final |
|----------|-------------|--------|-------------|
| Calabresa P Básico | 8.15 × 1.0 = 8.15 | 0% | R$ 8.15 |
| Calabresa M Básico | 8.15 × 1.5 = 12.23 | 0% | R$ 12.23 |
| Calabresa G Básico | 8.15 × 2.0 = 16.30 | 0% | R$ 16.30 |
| Calabresa P Premium | 8.15 × 1.0 = 8.15 | 15% | R$ 9.37 |
| Calabresa G Premium | 8.15 × 2.0 = 16.30 | 15% | R$ 18.75 |

#### Modificadores

**Borda Catupiry:**
- Composição: 30g de catupiry (R$ 0.06/g)
- Custo base: 30 × 0.06 = R$ 1.80

**Por tamanho:**
| Tamanho | Multiplicador | Custo Borda |
|---------|---------------|-------------|
| P | 1.0 | R$ 1.80 |
| M | 1.3 | R$ 2.34 |
| G | 1.6 | R$ 2.88 |
| GG | 2.0 | R$ 3.60 |

---

## Parte 3: Server Actions

### 3.1 Arquivo: `src/actions/variations.ts`

```typescript
// ============================================
// GRUPOS DE VARIAÇÃO
// ============================================

/**
 * Lista todos os grupos de variação do workspace
 */
export async function getVariationGroups(workspaceId: string) {
  // Retorna grupos com suas opções
  // Ordenado por sortOrder
}

/**
 * Cria um novo grupo de variação
 *
 * @param data.name - Nome do grupo (ex: "Tamanhos de Pizza")
 * @param data.description - Descrição explicativa
 * @param data.type - "size" | "category" | "base"
 * @param data.required - Se é obrigatório selecionar uma opção
 */
export async function createVariationGroup(formData: FormData) {
  // Validar dados
  // Criar grupo
  // Retornar { success: true, id: groupId }
}

/**
 * Atualiza um grupo de variação
 */
export async function updateVariationGroup(formData: FormData) {
  // Validar dados
  // Atualizar grupo
  // Retornar { success: true }
}

/**
 * Remove um grupo de variação
 * IMPORTANTE: Recalcular custos de produtos afetados
 */
export async function deleteVariationGroup(groupId: string) {
  // Verificar se há produtos usando este grupo
  // Se houver, retornar erro ou pedir confirmação
  // Remover grupo (cascade remove opções)
  // Recalcular produtos afetados
}

// ============================================
// OPÇÕES DE VARIAÇÃO
// ============================================

/**
 * Adiciona uma opção a um grupo
 *
 * @param data.groupId - ID do grupo
 * @param data.name - Nome da opção (ex: "Grande")
 * @param data.abbreviation - Abreviação (ex: "G")
 * @param data.multiplier - Fator multiplicador (para type="size")
 * @param data.markupPercentage - Markup percentual (para type="category")
 */
export async function createVariationOption(formData: FormData) {
  // Validar dados
  // Criar opção
  // Recalcular variantes de produtos que usam este grupo
}

/**
 * Atualiza uma opção
 * IMPORTANTE: Recalcular todas as variantes que usam esta opção
 */
export async function updateVariationOption(formData: FormData) {
  // Validar dados
  // Atualizar opção
  // Recalcular variantes afetadas
}

/**
 * Remove uma opção
 * IMPORTANTE: Remove variantes que usam esta opção
 */
export async function deleteVariationOption(optionId: string) {
  // Verificar variantes afetadas
  // Remover variantes que usam esta opção
  // Remover opção
}

// ============================================
// VARIAÇÕES DE PRODUTO
// ============================================

/**
 * Associa um grupo de variação a um produto
 *
 * Ao associar, gera automaticamente todas as variantes possíveis
 * Ex: Se produto já tem "Tamanhos" e adiciona "Categorias",
 * gera P-Básico, P-Premium, M-Básico, M-Premium, etc.
 */
export async function addVariationGroupToProduct(
  productId: string,
  groupId: string
) {
  // Marcar produto como hasVariations = true
  // Criar associação
  // Gerar todas as combinações de variantes
  // Calcular custo de cada variante
}

/**
 * Remove um grupo de variação de um produto
 *
 * Remove todas as variantes que usavam opções deste grupo
 */
export async function removeVariationGroupFromProduct(
  productId: string,
  groupId: string
) {
  // Remover variantes que usam opções deste grupo
  // Remover associação
  // Se não houver mais grupos, marcar hasVariations = false
}

/**
 * Gera/regenera todas as variantes de um produto
 *
 * Chamado quando:
 * - Adiciona novo grupo de variação
 * - Adiciona nova opção a um grupo
 * - Composição do produto muda
 */
export async function generateProductVariants(productId: string) {
  // Buscar todos os grupos associados ao produto
  // Buscar todas as opções de cada grupo
  // Gerar produto cartesiano de todas as combinações
  // Para cada combinação:
  //   - Criar ou atualizar variante
  //   - Calcular nome (ex: "Pizza Calabresa - G - Premium")
  //   - Calcular custo base (composição × multipliers)
  //   - Calcular markup total (soma dos markups)
  //   - Calcular custo final
}

/**
 * Calcula o custo de uma variante específica
 *
 * baseCost = Σ(composição) × Π(multipliers de tamanho)
 * markup = Σ(markups de categoria)
 * finalCost = baseCost × (1 + markup/100)
 */
export async function calculateVariantCost(variantId: string) {
  // Buscar variante com suas opções
  // Buscar composição do produto base
  // Calcular multiplier total (produto dos multipliers de tipo "size")
  // Calcular markup total (soma dos markups de tipo "category")
  // baseCost = Σ(item.calculatedCost × multiplierTotal)
  // finalCost = baseCost × (1 + markupTotal/100)
  // Atualizar variante
}

/**
 * Recalcula todas as variantes de um produto
 *
 * Chamado quando a composição do produto muda
 */
export async function recalculateProductVariants(productId: string) {
  // Buscar todas as variantes do produto
  // Para cada variante, chamar calculateVariantCost
}
```

### 3.2 Arquivo: `src/actions/modifiers.ts`

```typescript
// ============================================
// GRUPOS DE MODIFICADORES
// ============================================

/**
 * Lista todos os grupos de modificadores do workspace
 */
export async function getModifierGroups(workspaceId: string) {
  // Retorna grupos com suas opções e composições
}

/**
 * Cria um novo grupo de modificadores
 *
 * @param data.name - Nome do grupo (ex: "Bordas Recheadas")
 * @param data.description - Descrição
 * @param data.minSelections - Mínimo de seleções (0 = opcional)
 * @param data.maxSelections - Máximo de seleções (null = ilimitado)
 */
export async function createModifierGroup(formData: FormData) {
  // Validar dados
  // Criar grupo
}

/**
 * Atualiza um grupo de modificadores
 */
export async function updateModifierGroup(formData: FormData) {
  // Validar dados
  // Atualizar grupo
}

/**
 * Remove um grupo de modificadores
 */
export async function deleteModifierGroup(groupId: string) {
  // Remover associações com produtos
  // Remover grupo (cascade remove opções)
}

// ============================================
// OPÇÕES DE MODIFICADORES
// ============================================

/**
 * Cria uma opção de modificador
 *
 * @param data.groupId - ID do grupo
 * @param data.name - Nome (ex: "Borda Catupiry")
 * @param data.description - Descrição
 */
export async function createModifierOption(formData: FormData) {
  // Validar dados
  // Criar opção com baseCost = 0
}

/**
 * Atualiza uma opção de modificador
 */
export async function updateModifierOption(formData: FormData) {
  // Validar dados
  // Atualizar opção
}

/**
 * Remove uma opção de modificador
 */
export async function deleteModifierOption(optionId: string) {
  // Remover composições
  // Remover opção
}

// ============================================
// COMPOSIÇÃO DE MODIFICADORES
// ============================================

/**
 * Adiciona um item à composição do modificador
 * Similar a addProductComposition
 */
export async function addModifierComposition(formData: FormData) {
  // Validar tipo e item
  // Calcular custo do item
  // Criar composição
  // Recalcular baseCost do modificador
}

/**
 * Remove um item da composição
 */
export async function removeModifierComposition(compositionId: string) {
  // Remover composição
  // Recalcular baseCost do modificador
}

/**
 * Recalcula o custo base de um modificador
 *
 * baseCost = Σ(composição.calculatedCost)
 */
export async function recalculateModifierCost(modifierOptionId: string) {
  // Buscar composições
  // Somar custos
  // Atualizar baseCost
  // Atualizar custos por tamanho
}

// ============================================
// MODIFICADORES POR TAMANHO
// ============================================

/**
 * Configura o custo de um modificador para um tamanho específico
 *
 * @param modifierOptionId - ID da opção de modificador
 * @param sizeOptionId - ID da opção de tamanho
 * @param quantityMultiplier - Multiplicador da quantidade
 */
export async function setModifierSizeCost(formData: FormData) {
  // Criar ou atualizar modifier_option_size
  // Calcular custo para este tamanho
}

/**
 * Gera custos por tamanho automaticamente
 *
 * Usa os multipliers das opções de tamanho do grupo especificado
 */
export async function generateModifierSizeCosts(
  modifierOptionId: string,
  sizeGroupId: string
) {
  // Buscar opções do grupo de tamanho
  // Para cada opção de tamanho:
  //   - Criar modifier_option_size
  //   - quantityMultiplier = opção.multiplier
  //   - calculatedCost = baseCost × quantityMultiplier
}

// ============================================
// MODIFICADORES DE PRODUTO
// ============================================

/**
 * Associa um grupo de modificadores a um produto
 */
export async function addModifierGroupToProduct(formData: FormData) {
  // Criar associação
}

/**
 * Remove um grupo de modificadores de um produto
 */
export async function removeModifierGroupFromProduct(
  productId: string,
  groupId: string
) {
  // Remover associação
}
```

### 3.3 Atualização: `src/actions/products.ts`

```typescript
// Adicionar às funções existentes

/**
 * Atualiza addProductComposition para recalcular variantes
 */
export async function addProductComposition(formData: FormData) {
  // ... código existente ...

  // NOVO: Se produto tem variações, recalcular variantes
  if (product.hasVariations) {
    await recalculateProductVariants(productId);
  }
}

/**
 * Atualiza removeProductComposition para recalcular variantes
 */
export async function removeProductComposition(compositionId: string) {
  // ... código existente ...

  // NOVO: Se produto tem variações, recalcular variantes
  if (product.hasVariations) {
    await recalculateProductVariants(productId);
  }
}

/**
 * Nova função: Obtém produto com todas as variações para exibição
 */
export async function getProductWithVariations(productId: string) {
  // Buscar produto
  // Buscar composições
  // Buscar grupos de variação associados
  // Buscar variantes com suas opções
  // Buscar grupos de modificadores associados
  // Retornar estrutura completa
}
```

### 3.4 Atualização: `src/actions/menus.ts`

```typescript
/**
 * Atualiza addMenuProduct para suportar variantes
 *
 * Se productVariantId é fornecido, usa custo da variante
 * Se não, usa custo do produto base
 */
export async function addMenuProduct(formData: FormData) {
  const productId = formData.get("productId") as string;
  const productVariantId = formData.get("productVariantId") as string | null;

  let baseCost: number;

  if (productVariantId) {
    // Buscar custo da variante
    const variant = await db.query.productVariant.findFirst({
      where: eq(productVariant.id, productVariantId)
    });
    baseCost = parseFloat(variant.finalCost);
  } else {
    // Buscar custo do produto
    const product = await db.query.product.findFirst({
      where: eq(product.id, productId)
    });
    baseCost = parseFloat(product.baseCost);
  }

  // ... resto do cálculo de taxas e margem ...
}

/**
 * Nova função: Adiciona todas as variantes de um produto ao menu
 *
 * Útil para adicionar rapidamente todas as pizzas de um sabor
 */
export async function addAllProductVariantsToMenu(
  menuId: string,
  productId: string,
  baseSalePrice: number,
  priceMultiplier: boolean = true // Se true, multiplica preço pelo multiplier do tamanho
) {
  // Buscar todas as variantes do produto
  // Para cada variante:
  //   - Se priceMultiplier, calcular preço = baseSalePrice × multiplierTotal
  //   - Se não, usar baseSalePrice para todas
  //   - Chamar addMenuProduct
}
```

### 3.5 Arquivo: `src/actions/promotions.ts`

```typescript
// ============================================
// PROMOÇÕES
// ============================================

/**
 * Lista promoções de um cardápio
 */
export async function getMenuPromotions(menuId: string) {
  // Retorna promoções com seus itens
}

/**
 * Cria uma promoção
 *
 * @param data.menuId - ID do cardápio
 * @param data.name - Nome da promoção
 * @param data.description - Descrição
 * @param data.type - "percentage_discount" | "fixed_discount" | "fixed_price" | "buy_x_get_y"
 * @param data.scope - "product" | "variant" | "category" | "all"
 * @param data.value - Valor do desconto
 * @param data.weekdays - Dias da semana (0-6)
 * @param data.startTime - Horário início
 * @param data.endTime - Horário fim
 * @param data.startDate - Data início
 * @param data.endDate - Data fim
 */
export async function createPromotion(formData: FormData) {
  // Validar dados
  // Criar promoção
}

/**
 * Atualiza uma promoção
 */
export async function updatePromotion(formData: FormData) {
  // Validar dados
  // Atualizar promoção
}

/**
 * Remove uma promoção
 */
export async function deletePromotion(promotionId: string) {
  // Remover itens
  // Remover promoção
}

/**
 * Adiciona um item à promoção
 *
 * @param data.promotionId - ID da promoção
 * @param data.itemType - "product" | "variant" | "category"
 * @param data.itemId - ID do item
 */
export async function addPromotionItem(formData: FormData) {
  // Validar que o item existe
  // Criar associação
}

/**
 * Remove um item da promoção
 */
export async function removePromotionItem(itemId: string) {
  // Remover associação
}

/**
 * Calcula o preço promocional de um item
 *
 * Considera:
 * - Tipo de promoção
 * - Se está dentro do período de validade
 * - Se é o dia da semana correto
 * - Se está dentro do horário
 */
export async function calculatePromotionalPrice(
  menuProductId: string,
  date: Date = new Date()
) {
  // Buscar menuProduct com produto/variante
  // Buscar promoções ativas do menu
  // Verificar se alguma promoção se aplica
  // Calcular preço promocional
  // Retornar { originalPrice, promotionalPrice, promotion }
}
```

---

## Parte 4: Componentes de UI

### 4.1 Nova Página: Grupos de Variação

**Rota**: `/[workspaceSlug]/variations`

**Arquivo**: `src/app/(app)/[workspaceSlug]/variations/page.tsx`

```tsx
// Página principal de grupos de variação
// Lista todos os grupos com suas opções
// Permite criar, editar e excluir grupos
// Permite adicionar, editar e excluir opções
```

**Componentes**:
- `variations-table.tsx` - Tabela de grupos
- `variation-group-form.tsx` - Form de criação/edição de grupo
- `variation-options-section.tsx` - Seção de opções dentro do grupo
- `variation-option-form.tsx` - Form de criação/edição de opção

### 4.2 Nova Página: Modificadores

**Rota**: `/[workspaceSlug]/modifiers`

**Arquivo**: `src/app/(app)/[workspaceSlug]/modifiers/page.tsx`

```tsx
// Página principal de grupos de modificadores
// Lista todos os grupos com suas opções
// Permite gerenciar composição de cada modificador
// Permite configurar custos por tamanho
```

**Componentes**:
- `modifiers-table.tsx` - Tabela de grupos
- `modifier-group-form.tsx` - Form de criação/edição de grupo
- `modifier-options-section.tsx` - Seção de opções
- `modifier-option-form.tsx` - Form de criação/edição de opção
- `modifier-composition-section.tsx` - Composição do modificador
- `modifier-sizes-section.tsx` - Custos por tamanho

### 4.3 Atualização: Página de Produto

**Rota**: `/[workspaceSlug]/products/[productId]`

**Novas Seções**:

1. **variations-section.tsx** - Gerencia grupos de variação do produto
   - Lista grupos associados
   - Botão para adicionar novo grupo
   - Lista variantes geradas com custos

2. **modifiers-section.tsx** - Gerencia modificadores do produto
   - Lista grupos de modificadores associados
   - Botão para adicionar novo grupo

3. **variants-table.tsx** - Exibe todas as variantes com custos
   - Colunas: Nome, Opções, Custo Base, Markup, Custo Final, SKU
   - Permite editar SKU
   - Permite ativar/desativar variante

### 4.4 Atualização: Página de Cardápio

**Rota**: `/[workspaceSlug]/menus/[menuId]`

**Alterações em products-section.tsx**:
- Se produto tem variações, mostrar dropdown para selecionar variante
- Ou botão "Adicionar todas as variantes"
- Exibir nome da variante na tabela

**Nova Seção: promotions-section.tsx**
- Lista promoções do cardápio
- Botão para criar promoção
- Exibe: Nome, Tipo, Valor, Dias, Horário, Status

### 4.5 Componentes Compartilhados

**variation-group-select.tsx**
```tsx
// Combobox para selecionar um grupo de variação
// Props: workspaceId, value, onChange, filter?
```

**modifier-group-select.tsx**
```tsx
// Combobox para selecionar um grupo de modificador
// Props: workspaceId, value, onChange
```

**variant-select.tsx**
```tsx
// Combobox para selecionar uma variante de produto
// Props: productId, value, onChange
```

---

## Parte 5: Fluxo de Usuário

### 5.1 Configuração Inicial (Pizzaria)

1. **Criar Grupos de Variação**
   - Ir em Variações → Novo Grupo
   - Criar "Tamanhos de Pizza" (type: size)
     - Opções: P (mult: 1.0), M (mult: 1.5), G (mult: 2.0), GG (mult: 2.5)
   - Criar "Categorias" (type: category)
     - Opções: Básico (markup: 0%), Premium (markup: 15%), Especial (markup: 25%)
   - Criar "Tipo de Massa" (type: base, required: false)
     - Opções: Tradicional (mult: 1.0), Fina (mult: 0.8), Integral (mult: 1.1)

2. **Criar Grupos de Modificadores**
   - Ir em Modificadores → Novo Grupo
   - Criar "Bordas Recheadas" (min: 0, max: 1)
     - Adicionar opção "Borda Catupiry"
       - Composição: 30g de catupiry
       - Configurar por tamanho (usando grupo "Tamanhos de Pizza")
     - Adicionar opção "Borda Cheddar"
       - Composição: 25g de cheddar

3. **Criar Produto (Pizza Calabresa)**
   - Criar produto com composição base (tamanho referência)
   - Ir na aba "Variações"
     - Adicionar grupo "Tamanhos de Pizza"
     - Adicionar grupo "Categorias"
     - Sistema gera automaticamente: P-Básico, P-Premium, M-Básico, M-Premium, etc.
   - Ir na aba "Modificadores"
     - Adicionar grupo "Bordas Recheadas"

4. **Adicionar ao Cardápio**
   - Ir no cardápio
   - Adicionar produto "Pizza Calabresa"
     - Selecionar variante específica (ex: G-Básico) OU
     - Clicar "Adicionar todas as variantes"
   - Definir preço de venda para cada variante
   - Sistema calcula margem automaticamente

### 5.2 Configuração (Hamburgueria Simples)

1. **Criar Grupos de Variação**
   - "Tamanhos de Hambúrguer" (type: size)
     - Simples (mult: 1.0), Duplo (mult: 1.8)

2. **Criar Grupos de Modificadores**
   - "Adicionais" (min: 0, max: null)
     - Bacon extra (composição: 30g bacon)
     - Queijo extra (composição: 20g queijo)
     - Ovo (composição: 1 ovo)

3. **Criar Produto**
   - X-Burguer com composição
   - Adicionar grupo "Tamanhos"
   - Adicionar grupo "Adicionais"

### 5.3 Negócio sem Variações

Se o usuário não cria grupos de variação nem modificadores, o sistema funciona exatamente como hoje:
- Produto tem composição e custo
- Adiciona produto ao cardápio
- Define preço
- Calcula margem

---

## Parte 6: Migrations

### 6.1 Ordem de Execução

1. Criar enum types (variation_group_type, promotion_type, promotion_scope)
2. Criar tabela variation_group
3. Criar tabela variation_option
4. Criar tabela product_variation_group
5. Criar tabela product_variant
6. Criar tabela product_variant_option
7. Criar tabela modifier_group
8. Criar tabela modifier_option
9. Criar tabela modifier_option_composition
10. Criar tabela modifier_option_size
11. Criar tabela product_modifier_group
12. Alterar tabela product (adicionar has_variations)
13. Alterar tabela menu_product (adicionar product_variant_id)
14. Criar tabela menu_promotion
15. Criar tabela menu_promotion_item

### 6.2 Script de Migration

```sql
-- Arquivo: drizzle/0001_variations.sql

-- Enums
CREATE TYPE variation_group_type AS ENUM ('size', 'category', 'base');
CREATE TYPE promotion_type AS ENUM ('percentage_discount', 'fixed_discount', 'fixed_price', 'buy_x_get_y');
CREATE TYPE promotion_scope AS ENUM ('product', 'variant', 'category', 'all');

-- Grupos de Variação
CREATE TABLE variation_group (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type variation_group_type NOT NULL DEFAULT 'size',
  required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Opções de Variação
CREATE TABLE variation_option (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES variation_group(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  abbreviation TEXT,
  description TEXT,
  multiplier DECIMAL(10, 4) DEFAULT 1,
  markup_percentage DECIMAL(10, 4) DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Grupos de Variação do Produto
CREATE TABLE product_variation_group (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES variation_group(id) ON DELETE CASCADE,
  required BOOLEAN,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, group_id)
);

-- Variantes de Produto
CREATE TABLE product_variant (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  base_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
  markup_percentage DECIMAL(10, 4) DEFAULT 0,
  final_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Opções da Variante
CREATE TABLE product_variant_option (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL REFERENCES product_variant(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL REFERENCES variation_option(id) ON DELETE CASCADE,
  UNIQUE(variant_id, option_id)
);

-- Grupos de Modificadores
CREATE TABLE modifier_group (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  min_selections INTEGER NOT NULL DEFAULT 0,
  max_selections INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Opções de Modificadores
CREATE TABLE modifier_option (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES modifier_group(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Composição de Modificadores
CREATE TABLE modifier_option_composition (
  id TEXT PRIMARY KEY,
  modifier_option_id TEXT NOT NULL REFERENCES modifier_option(id) ON DELETE CASCADE,
  type product_item_type NOT NULL,
  item_id TEXT NOT NULL,
  quantity DECIMAL(15, 4) NOT NULL,
  unit_id TEXT REFERENCES unit(id),
  calculated_cost DECIMAL(15, 4) NOT NULL DEFAULT 0
);

-- Custo de Modificador por Tamanho
CREATE TABLE modifier_option_size (
  id TEXT PRIMARY KEY,
  modifier_option_id TEXT NOT NULL REFERENCES modifier_option(id) ON DELETE CASCADE,
  size_option_id TEXT NOT NULL REFERENCES variation_option(id) ON DELETE CASCADE,
  quantity_multiplier DECIMAL(10, 4) NOT NULL DEFAULT 1,
  calculated_cost DECIMAL(15, 4) NOT NULL DEFAULT 0,
  UNIQUE(modifier_option_id, size_option_id)
);

-- Grupos de Modificadores do Produto
CREATE TABLE product_modifier_group (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES modifier_group(id) ON DELETE CASCADE,
  min_selections INTEGER,
  max_selections INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, group_id)
);

-- Alteração na tabela product
ALTER TABLE product ADD COLUMN has_variations BOOLEAN NOT NULL DEFAULT false;

-- Alteração na tabela menu_product
ALTER TABLE menu_product ADD COLUMN product_variant_id TEXT REFERENCES product_variant(id) ON DELETE CASCADE;

-- Promoções
CREATE TABLE menu_promotion (
  id TEXT PRIMARY KEY,
  menu_id TEXT NOT NULL REFERENCES menu(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type promotion_type NOT NULL,
  scope promotion_scope NOT NULL,
  value DECIMAL(15, 4) NOT NULL,
  buy_quantity INTEGER,
  get_quantity INTEGER,
  weekdays INTEGER[],
  start_time TEXT,
  end_time TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Itens da Promoção
CREATE TABLE menu_promotion_item (
  id TEXT PRIMARY KEY,
  promotion_id TEXT NOT NULL REFERENCES menu_promotion(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL
);

-- Índices
CREATE INDEX idx_variation_group_workspace ON variation_group(workspace_id);
CREATE INDEX idx_variation_option_group ON variation_option(group_id);
CREATE INDEX idx_product_variation_group_product ON product_variation_group(product_id);
CREATE INDEX idx_product_variant_product ON product_variant(product_id);
CREATE INDEX idx_product_variant_option_variant ON product_variant_option(variant_id);
CREATE INDEX idx_modifier_group_workspace ON modifier_group(workspace_id);
CREATE INDEX idx_modifier_option_group ON modifier_option(group_id);
CREATE INDEX idx_modifier_option_composition_option ON modifier_option_composition(modifier_option_id);
CREATE INDEX idx_product_modifier_group_product ON product_modifier_group(product_id);
CREATE INDEX idx_menu_promotion_menu ON menu_promotion(menu_id);
CREATE INDEX idx_menu_promotion_item_promotion ON menu_promotion_item(promotion_id);
```

---

## Parte 7: Ordem de Implementação

### Fase 1: Infraestrutura (Prioridade Alta)
1. [ ] Criar schemas em `src/lib/db/schema/variations.ts`
2. [ ] Criar schemas em `src/lib/db/schema/modifiers.ts`
3. [ ] Atualizar `src/lib/db/schema/products.ts` (has_variations)
4. [ ] Atualizar `src/lib/db/schema/menus.ts` (product_variant_id, promotions)
5. [ ] Atualizar `src/lib/db/schema/index.ts` (exports)
6. [ ] Gerar e aplicar migrations: `npm run db:generate && npm run db:push`

### Fase 2: Server Actions - Variações (Prioridade Alta)
7. [ ] Criar `src/actions/variations.ts`
   - [ ] CRUD de grupos de variação
   - [ ] CRUD de opções de variação
   - [ ] Associação grupo ↔ produto
   - [ ] Geração automática de variantes
   - [ ] Cálculo de custo de variantes

### Fase 3: Server Actions - Modificadores (Prioridade Média)
8. [ ] Criar `src/actions/modifiers.ts`
   - [ ] CRUD de grupos de modificadores
   - [ ] CRUD de opções de modificadores
   - [ ] Composição de modificadores
   - [ ] Custos por tamanho
   - [ ] Associação grupo ↔ produto

### Fase 4: Atualização de Actions Existentes (Prioridade Alta)
9. [ ] Atualizar `src/actions/products.ts`
   - [ ] Recalcular variantes quando composição muda
   - [ ] Nova função getProductWithVariations
10. [ ] Atualizar `src/actions/menus.ts`
    - [ ] Suportar variantes em addMenuProduct
    - [ ] Nova função addAllProductVariantsToMenu

### Fase 5: UI - Variações (Prioridade Alta)
11. [ ] Criar página `/variations`
    - [ ] variations-table.tsx
    - [ ] variation-group-form.tsx
    - [ ] variation-options-section.tsx
12. [ ] Atualizar página de produto
    - [ ] variations-section.tsx
    - [ ] variants-table.tsx

### Fase 6: UI - Modificadores (Prioridade Média)
13. [ ] Criar página `/modifiers`
    - [ ] modifiers-table.tsx
    - [ ] modifier-group-form.tsx
    - [ ] modifier-options-section.tsx
    - [ ] modifier-composition-section.tsx
14. [ ] Atualizar página de produto
    - [ ] modifiers-section.tsx

### Fase 7: UI - Cardápio (Prioridade Alta)
15. [ ] Atualizar products-section.tsx
    - [ ] Dropdown de variantes
    - [ ] Botão "Adicionar todas variantes"
16. [ ] Criar promotions-section.tsx
    - [ ] promotion-form.tsx
    - [ ] promotion-items-section.tsx

### Fase 8: Promoções (Prioridade Baixa)
17. [ ] Criar `src/actions/promotions.ts`
    - [ ] CRUD de promoções
    - [ ] Itens de promoção
    - [ ] Cálculo de preço promocional

---

## Parte 8: Glossário

| Termo | Descrição |
|-------|-----------|
| **Grupo de Variação** | Categoria de opções (ex: Tamanhos, Categorias de Preço) |
| **Opção de Variação** | Item dentro de um grupo (ex: P, M, G dentro de Tamanhos) |
| **Variante** | Combinação específica de opções (ex: Pizza G Premium) |
| **Multiplier** | Fator que multiplica a quantidade de ingredientes |
| **Markup** | Percentual adicionado ao custo (para categorias premium) |
| **Modificador** | Adicional que pode ser aplicado ao produto (ex: Borda) |
| **Composição** | Lista de ingredientes/receitas que formam um item |
| **Promoção** | Desconto aplicado no nível do cardápio |

---

## Parte 9: Validações e Regras de Negócio

### 9.1 Grupos de Variação
- Nome único por workspace
- Pelo menos uma opção por grupo
- Não pode excluir grupo se há produtos usando

### 9.2 Opções de Variação
- Nome único dentro do grupo
- Multiplier > 0 (para type="size")
- Markup >= 0 (para type="category")
- Não pode excluir se há variantes usando

### 9.3 Variantes
- Geradas automaticamente quando grupos são associados
- Recalculadas quando composição do produto muda
- Recalculadas quando opção de variação muda
- SKU opcional, mas único se preenchido

### 9.4 Modificadores
- Composição deve ter pelo menos um item
- Custo por tamanho é opcional (usa baseCost se não definido)
- minSelections <= maxSelections (se maxSelections definido)

### 9.5 Promoções
- Valor > 0
- startDate <= endDate (se definidos)
- startTime < endTime (se definidos)
- buyQuantity >= 1 para buy_x_get_y
- getQuantity >= 1 para buy_x_get_y

---

*Documento gerado em: Janeiro 2026*
*Versão: 1.0*
