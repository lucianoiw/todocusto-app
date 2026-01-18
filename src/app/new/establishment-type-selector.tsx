"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  IconPizza,
  IconMeat,
  IconGlass,
  IconCake,
  IconToolsKitchen2,
  IconBuildingStore,
} from "@tabler/icons-react";

const ESTABLISHMENT_TYPES = [
  {
    id: "pizzeria",
    name: "Pizzaria",
    description: "Pizzas, calzones, esfihas e massas",
    Icon: IconPizza,
  },
  {
    id: "burger_shop",
    name: "Hamburgueria / Lanchonete",
    description: "Hambúrgueres, sanduíches, hot dogs e lanches",
    Icon: IconMeat,
  },
  {
    id: "bar",
    name: "Bar / Petiscaria",
    description: "Porções, petiscos, drinks e cervejas",
    Icon: IconGlass,
  },
  {
    id: "bakery",
    name: "Confeitaria / Doceria",
    description: "Bolos, tortas, doces e sobremesas",
    Icon: IconCake,
  },
  {
    id: "restaurant",
    name: "Restaurante",
    description: "Pratos principais, entradas e refeições completas",
    Icon: IconToolsKitchen2,
  },
  {
    id: "other",
    name: "Outros",
    description: "Açaiteria, food truck, cafeteria e outros",
    Icon: IconBuildingStore,
  },
];

export function EstablishmentTypeSelector() {
  const [selected, setSelected] = useState("other");

  return (
    <div className="space-y-3">
      <Label>Tipo de estabelecimento *</Label>
      <p className="text-sm text-muted-foreground">
        Isso ajuda a organizar as categorias mais relevantes para o seu negócio
      </p>
      <input type="hidden" name="establishmentType" value={selected} />
      <div className="grid grid-cols-2 gap-3">
        {ESTABLISHMENT_TYPES.map(({ id, name, description, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSelected(id)}
            className={cn(
              "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
              selected === id
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <div
              className={cn(
                "rounded-lg p-2",
                selected === id ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{name}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">
                {description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
