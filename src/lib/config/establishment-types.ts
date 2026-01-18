export type EstablishmentType =
  | "pizzeria"
  | "burger_shop"
  | "bar"
  | "bakery"
  | "restaurant"
  | "other";

export interface EstablishmentTypeConfig {
  id: EstablishmentType;
  name: string;
  description: string;
  icon: string;
}

export const ESTABLISHMENT_TYPES: EstablishmentTypeConfig[] = [
  {
    id: "pizzeria",
    name: "Pizzaria",
    description: "Pizzas, calzones, esfihas e massas",
    icon: "pizza",
  },
  {
    id: "burger_shop",
    name: "Hamburgueria / Lanchonete",
    description: "Hambúrgueres, sanduíches, hot dogs e lanches",
    icon: "burger",
  },
  {
    id: "bar",
    name: "Bar / Petiscaria",
    description: "Porções, petiscos, drinks e cervejas",
    icon: "glass",
  },
  {
    id: "bakery",
    name: "Confeitaria / Doceria",
    description: "Bolos, tortas, doces e sobremesas",
    icon: "cake",
  },
  {
    id: "restaurant",
    name: "Restaurante",
    description: "Pratos principais, entradas e refeições completas",
    icon: "tools-kitchen-2",
  },
  {
    id: "other",
    name: "Outros",
    description: "Açaiteria, food truck, cafeteria e other",
    icon: "building-store",
  },
];

// Categories that are active for each establishment type
// Categories not listed here will be disabled by default
// Universal categories (present in most types) are listed in multiple types

type CategoryType = "ingredient" | "recipe" | "product";

interface CategoryConfig {
  name: string;
  type: CategoryType;
  color: string;
  // List of establishment types where this category should be active by default
  // Empty array means it's disabled by default (user can enable manually)
  // ["all"] means it's enabled for all types
  establishments: EstablishmentType[] | ["all"];
}

export const STANDARD_CATEGORIES: CategoryConfig[] = [
  // ==================== INGREDIENTES ====================
  // Proteínas - universal
  { name: "Carnes Bovinas", type: "ingredient", color: "#ef4444", establishments: ["all"] },
  { name: "Carnes Suínas", type: "ingredient", color: "#f87171", establishments: ["all"] },
  { name: "Aves", type: "ingredient", color: "#f97316", establishments: ["all"] },
  { name: "Peixes e Frutos do Mar", type: "ingredient", color: "#0ea5e9", establishments: ["restaurant", "bar", "other"] },
  { name: "Embutidos e Frios", type: "ingredient", color: "#fb7185", establishments: ["all"] },
  { name: "Ovos", type: "ingredient", color: "#fcd34d", establishments: ["all"] },

  // Laticínios e Queijos - universal
  { name: "Leite e Derivados", type: "ingredient", color: "#fbbf24", establishments: ["all"] },
  { name: "Queijos", type: "ingredient", color: "#facc15", establishments: ["all"] },
  { name: "Manteigas e Cremes", type: "ingredient", color: "#fde047", establishments: ["all"] },

  // Vegetais e Frutas - universal
  { name: "Vegetais e Legumes", type: "ingredient", color: "#22c55e", establishments: ["all"] },
  { name: "Folhas e Ervas", type: "ingredient", color: "#4ade80", establishments: ["all"] },
  { name: "Frutas", type: "ingredient", color: "#a855f7", establishments: ["bakery", "bar", "other"] },
  { name: "Cogumelos", type: "ingredient", color: "#a1a1aa", establishments: ["pizzeria", "restaurant", "bar"] },

  // Grãos e Farináceos
  { name: "Grãos e Cereais", type: "ingredient", color: "#d97706", establishments: ["restaurant", "other"] },
  { name: "Farinhas e Amidos", type: "ingredient", color: "#eab308", establishments: ["all"] },
  { name: "Massas Secas", type: "ingredient", color: "#ca8a04", establishments: ["pizzeria", "restaurant"] },
  { name: "Pães e Bases Prontas", type: "ingredient", color: "#b45309", establishments: ["burger_shop", "bar"] },

  // Temperos e Condimentos - universal
  { name: "Temperos e Especiarias", type: "ingredient", color: "#84cc16", establishments: ["all"] },
  { name: "Molhos Prontos", type: "ingredient", color: "#dc2626", establishments: ["all"] },
  { name: "Conservas e Enlatados", type: "ingredient", color: "#78716c", establishments: ["pizzeria", "burger_shop", "bar"] },

  // Doces e Confeitaria
  { name: "Açúcares e Adoçantes", type: "ingredient", color: "#fca5a1", establishments: ["all"] },
  { name: "Chocolates e Cacau", type: "ingredient", color: "#78350f", establishments: ["bakery", "other"] },
  { name: "Confeitaria e Decoração", type: "ingredient", color: "#ec4899", establishments: ["bakery"] },
  { name: "Fermentos e Leveduras", type: "ingredient", color: "#d4d4d4", establishments: ["pizzeria", "bakery"] },

  // Óleos e Gorduras - universal
  { name: "Óleos e Azeites", type: "ingredient", color: "#a3e635", establishments: ["all"] },
  { name: "Gorduras", type: "ingredient", color: "#fef08a", establishments: ["all"] },

  // Bebidas
  { name: "Bebidas", type: "ingredient", color: "#60a5fa", establishments: ["all"] },
  { name: "Bebidas Alcoólicas", type: "ingredient", color: "#7c3aed", establishments: ["bar", "restaurant"] },

  // Outros - universal
  { name: "Embalagens", type: "ingredient", color: "#9ca3af", establishments: ["all"] },
  { name: "Descartáveis", type: "ingredient", color: "#6b7280", establishments: ["all"] },

  // ==================== RECEITAS ====================
  // Massas e Bases
  { name: "Massas de Pizza", type: "recipe", color: "#fbbf24", establishments: ["pizzeria"] },
  { name: "Massas de Pão", type: "recipe", color: "#f59e0b", establishments: ["burger_shop", "bakery"] },
  { name: "Massas Folhadas", type: "recipe", color: "#d97706", establishments: ["bakery", "restaurant"] },
  { name: "Massas de Salgados", type: "recipe", color: "#b45309", establishments: ["bar", "bakery"] },
  { name: "Massas de Bolo", type: "recipe", color: "#fcd34d", establishments: ["bakery"] },
  { name: "Massas de Torta", type: "recipe", color: "#eab308", establishments: ["bakery", "restaurant"] },

  // Molhos e Caldos
  { name: "Molhos", type: "recipe", color: "#ef4444", establishments: ["all"] },
  { name: "Caldos e Fundos", type: "recipe", color: "#92400e", establishments: ["restaurant", "bar"] },
  { name: "Marinadas e Temperos", type: "recipe", color: "#84cc16", establishments: ["all"] },

  // Recheios e Cremes
  { name: "Recheios Salgados", type: "recipe", color: "#f472b6", establishments: ["pizzeria", "bar", "bakery"] },
  { name: "Recheios Doces", type: "recipe", color: "#f9a8d4", establishments: ["bakery", "pizzeria"] },
  { name: "Cremes e Mousses", type: "recipe", color: "#fbcfe8", establishments: ["bakery", "other"] },
  { name: "Ganaches", type: "recipe", color: "#7c2d12", establishments: ["bakery"] },

  // Coberturas e Finalizações
  { name: "Coberturas", type: "recipe", color: "#a78bfa", establishments: ["bakery", "other"] },
  { name: "Caldas e Xaropes", type: "recipe", color: "#c084fc", establishments: ["bakery", "bar", "other"] },
  { name: "Glacês e Fondant", type: "recipe", color: "#e9d5ff", establishments: ["bakery"] },

  // Preparações Prontas
  { name: "Carnes Preparadas", type: "recipe", color: "#dc2626", establishments: ["burger_shop", "restaurant", "bar"] },
  { name: "Vegetais Preparados", type: "recipe", color: "#22c55e", establishments: ["restaurant", "bar"] },
  { name: "Montagens", type: "recipe", color: "#64748b", establishments: ["burger_shop", "pizzeria"] },

  // ==================== PRODUTOS ====================
  // Pizzas e Massas
  { name: "Pizzas Tradicionais", type: "product", color: "#ef4444", establishments: ["pizzeria"] },
  { name: "Pizzas Especiais", type: "product", color: "#dc2626", establishments: ["pizzeria"] },
  { name: "Pizzas Doces", type: "product", color: "#f472b6", establishments: ["pizzeria"] },
  { name: "Calzones", type: "product", color: "#ea580c", establishments: ["pizzeria"] },
  { name: "Esfihas", type: "product", color: "#c2410c", establishments: ["pizzeria"] },
  { name: "Massas e Pastas", type: "product", color: "#fbbf24", establishments: ["pizzeria", "restaurant"] },

  // Lanches
  { name: "Hambúrgueres", type: "product", color: "#b45309", establishments: ["burger_shop"] },
  { name: "Sanduíches", type: "product", color: "#d97706", establishments: ["burger_shop", "bar"] },
  { name: "Hot Dogs", type: "product", color: "#f97316", establishments: ["burger_shop"] },
  { name: "Wraps e Burritos", type: "product", color: "#fb923c", establishments: ["burger_shop"] },

  // Salgados
  { name: "Salgados Fritos", type: "product", color: "#ca8a04", establishments: ["bar", "bakery"] },
  { name: "Salgados Assados", type: "product", color: "#eab308", establishments: ["bar", "bakery"] },
  { name: "Empanados", type: "product", color: "#fcd34d", establishments: ["burger_shop", "bar"] },

  // Pratos
  { name: "Pratos Principais", type: "product", color: "#b91c1c", establishments: ["restaurant"] },
  { name: "Entradas", type: "product", color: "#22c55e", establishments: ["restaurant", "bar"] },
  { name: "Acompanhamentos", type: "product", color: "#84cc16", establishments: ["burger_shop", "restaurant"] },
  { name: "Porções", type: "product", color: "#65a30d", establishments: ["bar", "burger_shop"] },
  { name: "Saladas", type: "product", color: "#4ade80", establishments: ["restaurant", "burger_shop"] },

  // Padaria
  { name: "Pães", type: "product", color: "#92400e", establishments: ["bakery"] },
  { name: "Pães Recheados", type: "product", color: "#a16207", establishments: ["bakery"] },

  // Confeitaria
  { name: "Bolos", type: "product", color: "#f9a8d4", establishments: ["bakery"] },
  { name: "Tortas", type: "product", color: "#ec4899", establishments: ["bakery"] },
  { name: "Doces e Brigadeiros", type: "product", color: "#db2777", establishments: ["bakery"] },
  { name: "Sobremesas", type: "product", color: "#be185d", establishments: ["all"] },
  { name: "Sorvetes e Açaí", type: "product", color: "#a855f7", establishments: ["other", "bar"] },

  // Bebidas
  { name: "Bebidas Quentes", type: "product", color: "#78350f", establishments: ["bakery", "restaurant", "other"] },
  { name: "Bebidas Geladas", type: "product", color: "#0ea5e9", establishments: ["all"] },
  { name: "Sucos e Vitaminas", type: "product", color: "#f97316", establishments: ["burger_shop", "restaurant", "other"] },
  { name: "Drinks e Coquetéis", type: "product", color: "#7c3aed", establishments: ["bar"] },

  // Outros
  { name: "Menu Kids", type: "product", color: "#fde047", establishments: ["burger_shop", "pizzeria", "restaurant"] },
  { name: "Combos", type: "product", color: "#8b5cf6", establishments: ["burger_shop", "pizzeria"] },
  { name: "Promoções", type: "product", color: "#10b981", establishments: ["all"] },
];

// Helper to check if category should be active for a given establishment type
export function isCategoryActiveForEstablishment(
  categoryEstablishments: EstablishmentType[] | ["all"],
  establishmentType: EstablishmentType
): boolean {
  if (categoryEstablishments[0] === "all") {
    return true;
  }
  return (categoryEstablishments as EstablishmentType[]).includes(establishmentType);
}
