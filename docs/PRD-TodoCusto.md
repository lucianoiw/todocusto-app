# TodoCusto — Product Requirements Document

> Sistema de gestão de custos para food service

**Versão:** 1.0  
**Data:** Janeiro/2025  
**Status:** Em planejamento

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Problema](#2-problema)
3. [Solução](#3-solução)
4. [Arquitetura de Entidades](#4-arquitetura-de-entidades)
5. [Especificação das Entidades](#5-especificação-das-entidades)
6. [Regras de Negócio](#6-regras-de-negócio)
7. [Decisões Técnicas](#7-decisões-técnicas)
8. [Roadmap de Desenvolvimento](#8-roadmap-de-desenvolvimento)
9. [Requisitos Não-Funcionais](#9-requisitos-não-funcionais)
10. [Glossário](#10-glossário)

---

## 1. Visão Geral

### 1.1 O que é

TodoCusto é um sistema de gestão de custos para pequenos negócios de food service (hamburguerias, bares, restaurantes, lanchonetes). O sistema permite calcular o custo real de produtos considerando ingredientes, preparo, desperdício e diferentes canais de venda.

### 1.2 Para quem

- Donos de hamburguerias, bares, restaurantes e lanchonetes
- Pequenos empreendedores do setor alimentício
- Negócios que vendem em múltiplos canais (balcão, iFood, delivery próprio)

### 1.3 Proposta de valor

Permitir que o empreendedor saiba exatamente quanto custa cada produto e quanto precisa cobrar em cada canal de venda para ter lucro real, não apenas margem aparente.

---

## 2. Problema

### 2.1 Contexto

Pequenos negócios de food service frequentemente não conhecem o custo real dos seus produtos. Isso acontece porque:

1. **Custos invisíveis:** Aluguel, luz, água, pessoal não são considerados no custo do produto
2. **Desperdício ignorado:** 1kg de tomate não gera 1kg de tomate utilizável
3. **Múltiplos canais:** iFood cobra taxas, mas o preço muitas vezes é o mesmo do balcão
4. **Margem ilusória:** "Coloco 100% de margem" não significa 100% de lucro

### 2.2 Casos reais que motivaram o projeto

**Caso 1 — Hamburgueria:**
> "Eu tinha custos de aluguel, luz, água, materiais, taxas do iFood... mas no iFood era mais caro operar, e eu cobrava o mesmo preço. Não sabia se estava tendo lucro ou prejuízo em cada canal."

**Caso 2 — Bar:**
> "Minha irmã coloca 100% de margem em tudo e acha que tem 100% de lucro. Mas ela não considera aluguel, pessoal, perdas..."

### 2.3 Dor principal

O empreendedor não consegue responder com confiança:
- Quanto custa de verdade meu X-Burguer?
- Quanto preciso cobrar no iFood para ter a mesma margem do balcão?
- Qual produto me dá mais lucro?
- Estou tendo lucro ou prejuízo?

---

## 3. Solução

### 3.1 Abordagem

Um sistema simples e progressivo onde o usuário cadastra:

1. **Unidades** de medida (padrão e customizadas)
2. **Ingredientes** com preço médio de compra
3. **Variações** de ingredientes (com desperdício)
4. **Receitas** que combinam ingredientes
5. **Produtos** finais para venda
6. **Custos fixos** do negócio
7. **Cardápios** por canal de venda

O sistema calcula automaticamente o custo real e a margem em cada canal.

### 3.2 Fluxo principal

```
COMPRA → INGREDIENTE → VARIAÇÃO → RECEITA → PRODUTO → CARDÁPIO
         (preço médio)  (desperdício) (custo)   (custo base) (preço + taxas)
                                                              ↓
                                                         MARGEM REAL
```

### 3.3 Diferenciais

- **Variações de ingredientes:** Mesmo ingrediente, formas diferentes de uso (tomate inteiro vs fatiado)
- **Desperdício calculado:** O sistema sabe que 1kg de tomate não rende 1kg fatiado
- **Múltiplos cardápios:** Preços e margens diferentes por canal de venda
- **Custos fixos rateados:** Aluguel, luz, pessoal entram no cálculo do produto

---

## 4. Arquitetura de Entidades

### 4.1 Hierarquia

```
┌─────────────────────────────────────────────────────────────┐
│                         UNIDADES                            │
│                    (g, kg, ml, l, un...)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       INGREDIENTES                          │
│                  (tomate, queijo, carne...)                 │
│                              │                              │
│                    ┌─────────┴─────────┐                    │
│                    ▼                   ▼                    │
│               ENTRADAS            VARIAÇÕES                 │
│           (estoque virtual)    (fatiado, ralado...)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         RECEITAS                            │
│              (maionese, hambúrguer, molho...)               │
│         usa: ingredientes, variações, outras receitas       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         PRODUTOS                            │
│                (X-Burguer, Combo, Batata...)                │
│    usa: ingredientes, variações, receitas, outros produtos  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         CARDÁPIOS                           │
│                  (Balcão, iFood, Delivery)                  │
│                 + Taxas + Custos Fixos Rateados             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Relacionamentos

| Entidade | Relaciona com |
|----------|---------------|
| Unidade | Ingredientes, Variações, Receitas |
| Ingrediente | Entradas, Variações |
| Variação | Ingrediente (pai), Receitas, Produtos |
| Entrada | Ingrediente, Fornecedor (opcional) |
| Receita | Ingredientes, Variações, outras Receitas |
| Produto | Ingredientes, Variações, Receitas, outros Produtos |
| Custo Fixo | Cardápios |
| Cardápio | Produtos, Custos Fixos, Taxas |

---

## 5. Especificação das Entidades

### 5.1 Unidades

Medidas utilizadas em todo o sistema.

#### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim | Identificador único |
| nome | String | Sim | Nome da unidade (ex: "grama", "quilograma") |
| abreviacao | String | Sim | Abreviação (ex: "g", "kg") |
| tipo | Enum | Sim | `padrao` ou `customizada` |
| unidade_base_id | UUID | Não | Se customizada, qual unidade padrão deriva |
| fator_conversao | Decimal | Não | Multiplicador para converter (ex: 1000 para kg→g) |
| created_at | DateTime | Sim | Data de criação |
| updated_at | DateTime | Sim | Data de atualização |

#### Unidades padrão (seed)

| Nome | Abreviação | Tipo |
|------|------------|------|
| Grama | g | Massa |
| Quilograma | kg | Massa |
| Mililitro | ml | Volume |
| Litro | l | Volume |
| Unidade | un | Contagem |

#### Exemplos de unidades customizadas

| Nome | Abreviação | Base | Fator |
|------|------------|------|-------|
| Caixa 2kg | cx2kg | kg | 2 |
| Pitada | pitada | g | 2 |
| Fatia | fatia | g | 10 |

#### Regras

- Unidades padrão não podem ser editadas ou excluídas
- Unidades customizadas devem derivar de uma unidade padrão
- Não permitir exclusão de unidade em uso

---

### 5.2 Ingredientes

Matéria-prima comprável.

#### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim | Identificador único |
| nome | String | Sim | Nome do ingrediente |
| descricao | String | Não | Descrição opcional |
| categoria_id | UUID | Não | Categoria (Vegetais, Carnes, etc) |
| unidade_base_id | UUID | Sim | Unidade padrão de medida |
| preco_medio | Decimal | Sim | Preço médio calculado das entradas |
| preco_medio_manual | Boolean | Sim | Se usuário ajustou manualmente |
| possui_variacoes | Boolean | Sim | Switch para habilitar variações |
| tags | String[] | Não | Tags para busca/filtro |
| created_at | DateTime | Sim | Data de criação |
| updated_at | DateTime | Sim | Data de atualização |

#### Regras

- Preço médio é calculado automaticamente das entradas
- Usuário pode sobrescrever o preço médio (flag `preco_medio_manual`)
- Ao adicionar nova entrada, perguntar se atualiza o preço médio
- Não permitir exclusão de ingrediente em uso

---

### 5.3 Variações (Ingredientes Processados)

Formas de uso de um ingrediente com desperdício.

#### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim | Identificador único |
| ingrediente_id | UUID | Sim | Ingrediente pai |
| nome | String | Sim | Nome da variação (ex: "Fatiado") |
| aproveitamento | Decimal | Sim | Percentual de aproveitamento (0-100) |
| unidade_id | UUID | Sim | Unidade desta variação |
| equivalencia_quantidade | Decimal | Sim | Quanto da unidade base equivale a 1 desta unidade |
| custo_calculado | Decimal | Calculado | Custo por unidade (automático) |
| created_at | DateTime | Sim | Data de criação |
| updated_at | DateTime | Sim | Data de atualização |

#### Cálculo do custo

```
custo_variacao = (preco_medio_ingrediente × equivalencia_quantidade) ÷ aproveitamento
```

**Exemplo:**
- Tomate: R$8,00/kg
- Variação "Fatiado": aproveitamento 85%, equivalência 10g por fatia
- Custo por fatia: (8,00 × 0,010) ÷ 0,85 = R$0,094

#### Regras

- Só existe se ingrediente pai tem `possui_variacoes = true`
- Aproveitamento deve ser entre 1% e 100%
- Custo é sempre calculado, nunca manual
- Variação é 1:1 com perda. Se combina ou transforma, deve ser Receita

---

### 5.4 Entradas (Estoque Virtual)

Registro de compras para cálculo de preço médio.

#### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim | Identificador único |
| ingrediente_id | UUID | Sim | Ingrediente comprado |
| data | Date | Sim | Data da compra |
| quantidade | Decimal | Sim | Quantidade comprada |
| preco_unitario | Decimal | Sim | Preço por unidade |
| preco_total | Decimal | Calculado | quantidade × preco_unitario |
| fornecedor | String | Não | Nome do fornecedor |
| observacao | String | Não | Observações |
| created_at | DateTime | Sim | Data de criação |

#### Cálculo do preço médio

```
preco_medio = soma(preco_total de todas entradas) ÷ soma(quantidade de todas entradas)
```

#### Regras

- Entradas são apenas para registro, não há controle de saída
- Ao criar entrada, recalcular preço médio do ingrediente
- Se `preco_medio_manual = true`, perguntar se quer atualizar
- Manter histórico para análise futura

---

### 5.5 Receitas (Preparações)

Combinação de ingredientes com passos de preparo.

#### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim | Identificador único |
| nome | String | Sim | Nome da receita |
| descricao | String | Não | Descrição |
| categoria_id | UUID | Não | Categoria (Molhos, Bases, etc) |
| rendimento_quantidade | Decimal | Sim | Quanto a receita rende |
| rendimento_unidade_id | UUID | Sim | Unidade do rendimento |
| tempo_preparo | Integer | Não | Tempo em minutos |
| tags | String[] | Não | Tags para busca/filtro |
| alergenicos | String[] | Não | Lista de alérgenos |
| custo_total | Decimal | Calculado | Soma dos custos dos itens |
| custo_por_porcao | Decimal | Calculado | custo_total ÷ rendimento |
| created_at | DateTime | Sim | Data de criação |
| updated_at | DateTime | Sim | Data de atualização |

#### Itens da Receita

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim | Identificador único |
| receita_id | UUID | Sim | Receita pai |
| tipo | Enum | Sim | `ingrediente`, `variacao`, `receita` |
| item_id | UUID | Sim | ID do ingrediente, variação ou receita |
| quantidade | Decimal | Sim | Quantidade utilizada |
| unidade_id | UUID | Sim | Unidade da quantidade |
| custo_calculado | Decimal | Calculado | Custo deste item |
| ordem | Integer | Sim | Ordem na lista |

#### Passos da Receita

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim | Identificador único |
| receita_id | UUID | Sim | Receita pai |
| ordem | Integer | Sim | Ordem do passo |
| descricao | String | Sim | Descrição do passo |
| tempo | Integer | Não | Tempo estimado em minutos |

#### Regras

- Uma receita pode usar ingredientes, variações ou outras receitas
- Não permitir referência circular (receita A usa B que usa A)
- Custo é sempre calculado, nunca manual
- Passos são opcionais mas recomendados para consistência

---

### 5.6 Produtos

Itens vendáveis ao cliente final.

#### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim | Identificador único |
| nome | String | Sim | Nome do produto |
| descricao | String | Não | Descrição |
| categoria_id | UUID | Não | Categoria (Lanches, Bebidas, etc) |
| tags | String[] | Não | Tags para busca/filtro |
| custo_base | Decimal | Calculado | Soma dos custos da composição |
| ativo | Boolean | Sim | Se está disponível |
| created_at | DateTime | Sim | Data de criação |
| updated_at | DateTime | Sim | Data de atualização |

#### Composição do Produto

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim | Identificador único |
| produto_id | UUID | Sim | Produto pai |
| tipo | Enum | Sim | `ingrediente`, `variacao`, `receita`, `produto` |
| item_id | UUID | Sim | ID do item |
| quantidade | Decimal | Sim | Quantidade utilizada |
| unidade_id | UUID | Não | Unidade (se aplicável) |
| custo_calculado | Decimal | Calculado | Custo deste item |

#### Regras

- Produto pode conter outros produtos (combos)
- Não permitir referência circular
- Custo base é sempre calculado
- Produto pode estar em múltiplos cardápios com preços diferentes

---

### 5.7 Custos Fixos

Despesas operacionais do negócio.

#### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim | Identificador único |
| nome | String | Sim | Nome do custo (Aluguel, Luz, etc) |
| descricao | String | Não | Descrição |
| valor | Decimal | Sim | Valor mensal |
| ativo | Boolean | Sim | Se está ativo |
| created_at | DateTime | Sim | Data de criação |
| updated_at | DateTime | Sim | Data de atualização |

#### Regras

- Custo fixo é apenas o valor, sem regra de rateio
- O rateio é definido no Cardápio
- Manter simples para o MVP

---

### 5.8 Cardápios

Canais de venda com precificação específica.

#### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim | Identificador único |
| nome | String | Sim | Nome do cardápio (Balcão, iFood, etc) |
| descricao | String | Não | Descrição |
| ativo | Boolean | Sim | Se está ativo |
| rateio_tipo | Enum | Sim | Tipo de rateio dos custos fixos |
| rateio_valor | Decimal | Não | Valor ou percentual do rateio |
| created_at | DateTime | Sim | Data de criação |
| updated_at | DateTime | Sim | Data de atualização |

#### Tipos de Rateio (extensível)

| Tipo | Descrição | Uso |
|------|-----------|-----|
| `percentual_venda` | % sobre o preço de venda | MVP |
| `valor_fixo_produto` | Valor fixo por produto | Futuro |
| `proporcional_vendas` | Baseado em histórico | Futuro |

#### Taxas do Cardápio

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim | Identificador único |
| cardapio_id | UUID | Sim | Cardápio pai |
| nome | String | Sim | Nome da taxa (Taxa iFood, Entrega, etc) |
| tipo | Enum | Sim | `fixo` ou `percentual` |
| valor | Decimal | Sim | Valor ou percentual |
| ativo | Boolean | Sim | Se está ativa |

#### Custos Fixos do Cardápio

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim | Identificador único |
| cardapio_id | UUID | Sim | Cardápio |
| custo_fixo_id | UUID | Sim | Custo fixo vinculado |

#### Produtos do Cardápio

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim | Identificador único |
| cardapio_id | UUID | Sim | Cardápio |
| produto_id | UUID | Sim | Produto |
| preco_venda | Decimal | Sim | Preço de venda neste cardápio |
| config_especifica | JSON | Não | Configurações específicas (futuro) |
| custo_total | Decimal | Calculado | Custo base + taxas + rateio |
| margem_valor | Decimal | Calculado | preco_venda - custo_total |
| margem_percentual | Decimal | Calculado | (margem_valor ÷ preco_venda) × 100 |

#### Cálculo de custo no cardápio

```
custo_produto_cardapio = custo_base_produto 
                       + taxas_fixas 
                       + (preco_venda × taxas_percentuais)
                       + rateio_custos_fixos

margem = preco_venda - custo_produto_cardapio
```

---

### 5.9 Categorias (Auxiliar)

Organização de ingredientes, receitas e produtos.

#### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| id | UUID | Sim | Identificador único |
| nome | String | Sim | Nome da categoria |
| tipo | Enum | Sim | `ingrediente`, `receita`, `produto` |
| cor | String | Não | Cor para UI |
| icone | String | Não | Ícone para UI |

---

## 6. Regras de Negócio

### 6.1 Cálculo de custos

#### Ingrediente
```
preco_medio = soma(entradas.preco_total) ÷ soma(entradas.quantidade)
```

#### Variação
```
custo = (ingrediente.preco_medio × equivalencia) ÷ aproveitamento
```

#### Receita
```
custo_total = soma(itens.custo_calculado)
custo_porcao = custo_total ÷ rendimento
```

#### Produto
```
custo_base = soma(composicao.custo_calculado)
```

#### Produto no Cardápio
```
custo_taxas_fixas = soma(taxas onde tipo = 'fixo')
custo_taxas_percentuais = preco_venda × soma(taxas onde tipo = 'percentual')
custo_rateio = calcula_rateio(custos_fixos, rateio_tipo, rateio_valor)

custo_total = custo_base + custo_taxas_fixas + custo_taxas_percentuais + custo_rateio
margem = preco_venda - custo_total
```

### 6.2 Validações

| Regra | Descrição |
|-------|-----------|
| Referência circular | Não permitir receita que usa a si mesma (direta ou indiretamente) |
| Exclusão em uso | Não permitir excluir entidade que está sendo usada |
| Aproveitamento | Deve ser entre 1% e 100% |
| Preços | Devem ser maiores que zero |
| Quantidades | Devem ser maiores que zero |

### 6.3 Recálculo automático

Quando atualizar automaticamente:

| Evento | Recalcular |
|--------|------------|
| Nova entrada | Preço médio do ingrediente |
| Alteração em ingrediente | Variações, Receitas, Produtos que usam |
| Alteração em variação | Receitas, Produtos que usam |
| Alteração em receita | Produtos que usam |
| Alteração em produto | Produtos (combos) que usam |
| Alteração em taxa/custo fixo | Produtos do cardápio |

---

## 7. Decisões Técnicas

### 7.1 Decisões tomadas

| Tema | Decisão | Justificativa |
|------|---------|---------------|
| Desperdício | Na variação do ingrediente | Mesmo ingrediente pode ter desperdícios diferentes por uso |
| Preço do ingrediente | Preço médio das entradas | Reflete custo real ao longo do tempo |
| Histórico de preços | Guardar entradas | Permite análise de evolução |
| Controle de estoque | Apenas entradas | Simplifica MVP, saídas são complexas |
| Integração PDV/iFood | Não no MVP | Input manual inicialmente |
| Custos fixos | Rateio no cardápio | Flexibilidade por canal |
| Rateio | % sobre venda (MVP) | Mais intuitivo, extensível depois |

### 7.2 Extensibilidade planejada

| Área | Preparado para |
|------|----------------|
| Tipos de rateio | Enum extensível, lógica isolada |
| Taxas | Modelo flexível fixo/percentual |
| Config específica por produto/cardápio | Campo JSON para futuro |
| Integrações | Estrutura permite adicionar depois |

---

## 8. Roadmap de Desenvolvimento

### 8.1 Visão geral das fases

```
┌─────────────────────────────────────────────────────────────┐
│ FASE 1 — MVP                                                │
│ Fundação: Unidades, Ingredientes, Variações, Receitas,      │
│ Produtos básicos                                            │
│ Duração estimada: 4-6 semanas                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 2 — Precificação                                       │
│ Cardápios, Taxas, Cálculo de margem por canal               │
│ Duração estimada: 2-3 semanas                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 3 — Custos Reais                                       │
│ Custos fixos, Rateio, Visão completa de lucratividade       │
│ Duração estimada: 2-3 semanas                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 4 — Análise                                            │
│ Histórico de preços, Relatórios, Dashboard                  │
│ Duração estimada: 3-4 semanas                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 5+ — Expansão (futuro)                                 │
│ Integrações, Estoque real, Multi-unidades                   │
└─────────────────────────────────────────────────────────────┘
```

---

### 8.2 Fase 1 — MVP (Fundação)

**Objetivo:** Permitir calcular o custo de produtos a partir de ingredientes e receitas.

#### Entregáveis

| # | Funcionalidade | Prioridade |
|---|----------------|------------|
| 1.1 | CRUD de Unidades (padrão + customizadas) | Alta |
| 1.2 | CRUD de Categorias | Alta |
| 1.3 | CRUD de Ingredientes | Alta |
| 1.4 | Switch "possui variações" no ingrediente | Alta |
| 1.5 | CRUD de Variações (dentro do ingrediente) | Alta |
| 1.6 | CRUD de Entradas | Alta |
| 1.7 | Cálculo de preço médio | Alta |
| 1.8 | CRUD de Receitas | Alta |
| 1.9 | Adicionar itens na receita (ingredientes, variações, receitas) | Alta |
| 1.10 | Passos da receita | Média |
| 1.11 | Cálculo de custo da receita | Alta |
| 1.12 | CRUD de Produtos | Alta |
| 1.13 | Composição do produto | Alta |
| 1.14 | Cálculo de custo base do produto | Alta |
| 1.15 | Combos (produto com outros produtos) | Média |

#### Critérios de aceite da Fase 1

- [ ] Usuário consegue cadastrar ingredientes com preço médio
- [ ] Usuário consegue criar variações com aproveitamento
- [ ] Usuário consegue criar receitas e ver o custo calculado
- [ ] Usuário consegue criar produtos e ver o custo base
- [ ] Sistema recalcula custos automaticamente ao alterar dependências

#### Telas da Fase 1

1. **Lista de Unidades** — Ver, criar, editar unidades
2. **Lista de Ingredientes** — Ver todos, filtrar por categoria
3. **Detalhe do Ingrediente** — Editar, ver variações, ver entradas
4. **Lista de Receitas** — Ver todas, filtrar por categoria
5. **Detalhe da Receita** — Editar, adicionar itens, ver passos, ver custo
6. **Lista de Produtos** — Ver todos, filtrar por categoria
7. **Detalhe do Produto** — Editar, composição, ver custo

---

### 8.3 Fase 2 — Precificação

**Objetivo:** Permitir criar cardápios por canal e calcular margem.

#### Entregáveis

| # | Funcionalidade | Prioridade |
|---|----------------|------------|
| 2.1 | CRUD de Cardápios | Alta |
| 2.2 | CRUD de Taxas por cardápio | Alta |
| 2.3 | Vincular produtos ao cardápio | Alta |
| 2.4 | Definir preço de venda por produto/cardápio | Alta |
| 2.5 | Cálculo de custo com taxas | Alta |
| 2.6 | Cálculo de margem | Alta |
| 2.7 | Comparativo de margem entre cardápios | Média |

#### Critérios de aceite da Fase 2

- [ ] Usuário consegue criar cardápios (Balcão, iFood, etc)
- [ ] Usuário consegue adicionar taxas (fixas e percentuais)
- [ ] Usuário consegue definir preços diferentes por cardápio
- [ ] Sistema mostra margem real por produto/cardápio
- [ ] Usuário consegue comparar o mesmo produto em cardápios diferentes

#### Telas da Fase 2

1. **Lista de Cardápios** — Ver todos os canais
2. **Detalhe do Cardápio** — Taxas, produtos, preços
3. **Visão de Produto no Cardápio** — Custo, preço, margem detalhada

---

### 8.4 Fase 3 — Custos Reais

**Objetivo:** Incluir custos fixos no cálculo para ter lucratividade real.

#### Entregáveis

| # | Funcionalidade | Prioridade |
|---|----------------|------------|
| 3.1 | CRUD de Custos Fixos | Alta |
| 3.2 | Vincular custos fixos ao cardápio | Alta |
| 3.3 | Configurar tipo de rateio no cardápio | Alta |
| 3.4 | Cálculo de rateio (% sobre venda) | Alta |
| 3.5 | Custo total incluindo rateio | Alta |
| 3.6 | Margem real com custos fixos | Alta |

#### Critérios de aceite da Fase 3

- [ ] Usuário consegue cadastrar custos fixos mensais
- [ ] Usuário consegue vincular custos fixos a cardápios
- [ ] Sistema calcula rateio por % sobre venda
- [ ] Margem mostrada inclui custos fixos rateados
- [ ] Usuário entende quanto cada produto contribui para custos fixos

#### Telas da Fase 3

1. **Lista de Custos Fixos** — Ver, criar, editar
2. **Config de Rateio no Cardápio** — Vincular custos, definir %
3. **Visão expandida de margem** — Breakdown completo

---

### 8.5 Fase 4 — Análise

**Objetivo:** Fornecer insights sobre custos e lucratividade.

#### Entregáveis

| # | Funcionalidade | Prioridade |
|---|----------------|------------|
| 4.1 | Histórico de preço médio por ingrediente | Alta |
| 4.2 | Gráfico de evolução de custo | Média |
| 4.3 | Ranking de produtos por margem | Alta |
| 4.4 | Ranking de produtos por lucro absoluto | Alta |
| 4.5 | Comparativo entre cardápios | Média |
| 4.6 | Alertas de margem baixa | Média |
| 4.7 | Dashboard resumo | Alta |

#### Critérios de aceite da Fase 4

- [ ] Usuário consegue ver evolução de preço de ingredientes
- [ ] Usuário consegue ver quais produtos dão mais lucro
- [ ] Usuário recebe alertas quando margem fica abaixo do aceitável
- [ ] Dashboard mostra visão geral do negócio

#### Telas da Fase 4

1. **Dashboard** — Resumo geral, alertas
2. **Relatório de Ingredientes** — Evolução de preços
3. **Relatório de Produtos** — Ranking por margem/lucro
4. **Relatório de Cardápios** — Comparativo de canais

---

### 8.6 Fase 5+ — Expansão (Futuro)

Funcionalidades para considerar após as fases principais:

| Funcionalidade | Descrição |
|----------------|-----------|
| Controle de estoque real | Saídas, saldo, alertas de reposição |
| Integração iFood | Importar vendas, sincronizar cardápio |
| Integração PDV | Baixa automática de estoque |
| Multi-unidades | Várias lojas com custos diferentes |
| Fichas técnicas | Exportar PDF para cozinha |
| Simulador de preço | "Se o queijo subir 20%, quanto impacta?" |
| Metas de margem | Definir margem mínima por categoria |
| App mobile | Consulta rápida de custos |

---

## 9. Requisitos Não-Funcionais

### 9.1 Performance

| Requisito | Meta |
|-----------|------|
| Tempo de carregamento de lista | < 1 segundo |
| Tempo de cálculo de custos | < 500ms |
| Recálculo em cascata | < 2 segundos |

### 9.2 Usabilidade

| Requisito | Descrição |
|-----------|-----------|
| Mobile-first | Interface responsiva, funcional em celular |
| Feedback imediato | Custos calculados mostrados em tempo real |
| Onboarding | Guia inicial para primeiro cadastro |
| Ajuda contextual | Tooltips explicando campos |

### 9.3 Dados

| Requisito | Descrição |
|-----------|-----------|
| Backup | Diário, retenção de 30 dias |
| Exportação | CSV de ingredientes, receitas, produtos |
| Importação | CSV para carga inicial |

### 9.4 Segurança

| Requisito | Descrição |
|-----------|-----------|
| Autenticação | Email/senha ou OAuth |
| Autorização | Dados isolados por usuário/empresa |
| HTTPS | Obrigatório em produção |

---

## 10. Glossário

| Termo | Definição |
|-------|-----------|
| **Ingrediente** | Matéria-prima comprável (tomate, queijo, carne) |
| **Variação** | Forma de uso de um ingrediente com desperdício (tomate fatiado, queijo ralado) |
| **Aproveitamento** | Percentual utilizável de um ingrediente após preparo (85% = 15% de perda) |
| **Entrada** | Registro de compra de ingrediente para cálculo de preço médio |
| **Preço médio** | Média ponderada do custo de um ingrediente baseado nas compras |
| **Receita** | Preparação que combina ingredientes e/ou outras receitas (maionese, hambúrguer) |
| **Rendimento** | Quantidade que uma receita produz (500ml, 10 porções) |
| **Produto** | Item vendável ao cliente final (X-Burguer, Combo) |
| **Custo base** | Soma dos custos de composição de um produto |
| **Cardápio** | Canal de venda com precificação específica (Balcão, iFood) |
| **Taxa** | Custo adicional de um canal (taxa iFood, entrega) |
| **Custo fixo** | Despesa operacional mensal (aluguel, luz, pessoal) |
| **Rateio** | Forma de distribuir custos fixos entre produtos |
| **Margem** | Diferença entre preço de venda e custo total |
| **Combo** | Produto composto por outros produtos |

---

## Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0 | Jan/2025 | Versão inicial do PRD |

---

**Próximos passos:**
1. Validar PRD com stakeholders
2. Definir stack tecnológica
3. Criar wireframes das telas principais
4. Iniciar desenvolvimento da Fase 1
