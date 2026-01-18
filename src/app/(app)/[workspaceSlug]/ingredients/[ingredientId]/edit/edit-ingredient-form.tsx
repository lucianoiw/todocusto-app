"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateIngredient } from "@/actions/ingredients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconLoader2, IconChevronDown, IconSearch, IconX, IconHelpCircle } from "@tabler/icons-react";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  measurementType: "weight" | "volume" | "unit";
  conversionFactor: string;
  isBase: boolean;
}

interface Ingredient {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  measurementType: "weight" | "volume" | "unit";
  priceUnitId: string;
  priceUnitAbbreviation: string | null;
  averagePrice: string;
  baseCostPerUnit: string;
  averagePriceManual: boolean;
  hasVariations: boolean;
  availableForSale: boolean;
}

interface EditIngredientFormProps {
  workspaceSlug: string;
  ingredientId: string;
  ingredient: Ingredient;
  categories: Category[];
  units: Unit[];
}

const measurementTypeLabels = {
  weight: "Peso (g, kg)",
  volume: "Líquido (ml, L)",
  unit: "Unidade (un, dz)",
};

export function EditIngredientForm({
  workspaceSlug,
  ingredientId,
  ingredient,
  categories,
  units,
}: EditIngredientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [measurementType, setMeasurementType] = useState<"weight" | "volume" | "unit">(
    ingredient.measurementType
  );
  const [priceUnitId, setPriceUnitId] = useState(ingredient.priceUnitId);
  const [priceQuantity, setPriceQuantity] = useState("1");
  const [availableForSale, setAvailableForSale] = useState(ingredient.availableForSale);
  const [categoryId, setCategoryId] = useState<string | null>(ingredient.categoryId);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);

  const filteredUnits = units.filter((u) => u.measurementType === measurementType);
  const selectedUnit = units.find((u) => u.id === priceUnitId);
  const selectedCategory = categories.find((c) => c.id === categoryId);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const search = categorySearch.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(search));
  }, [categories, categorySearch]);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result = await updateIngredient(workspaceSlug, ingredientId, formData);
      if (result.success) {
        router.push(`/${workspaceSlug}/ingredients/${ingredientId}`);
      } else if (result.error) {
        alert(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={ingredient.name}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={ingredient.description || ""}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoryId">Categoria (opcional)</Label>
        <input type="hidden" name="categoryId" value={categoryId || ""} />
        <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={categoryPopoverOpen}
              className="w-full justify-between font-normal"
            >
              {selectedCategory ? (
                <div className="flex items-center gap-2">
                  {selectedCategory.color && (
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: selectedCategory.color }}
                    />
                  )}
                  <span className="truncate">{selectedCategory.name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Selecione</span>
              )}
              <div className="flex items-center gap-1 ml-2 shrink-0">
                {selectedCategory && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoryId(null);
                    }}
                    className="hover:bg-accent rounded p-0.5"
                  >
                    <IconX className="h-3 w-3" />
                  </span>
                )}
                <IconChevronDown className="h-4 w-4 opacity-50" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-75 p-0" align="start">
            <div className="p-2 border-b">
              <div className="flex items-center gap-2 px-2">
                <IconSearch className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar categoria..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-50 overflow-y-auto">
              {filteredCategories.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma categoria encontrada
                </div>
              ) : (
                filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                    onClick={() => {
                      setCategoryId(cat.id);
                      setCategorySearch("");
                      setCategoryPopoverOpen(false);
                    }}
                  >
                    {cat.color && (
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                    )}
                    <span>{cat.name}</span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="measurementType">Tipo de medida *</Label>
        <Select
          name="measurementType"
          value={measurementType}
          onValueChange={(value: "weight" | "volume" | "unit") => {
            setMeasurementType(value);
            // Reset price unit if type changes
            const firstUnitOfType = units.find((u) => u.measurementType === value);
            setPriceUnitId(firstUnitOfType?.id || "");
          }}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weight">{measurementTypeLabels.weight}</SelectItem>
            <SelectItem value="volume">{measurementTypeLabels.volume}</SelectItem>
            <SelectItem value="unit">{measurementTypeLabels.unit}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="priceUnitId">Unidade do custo *</Label>
          <Select
            name="priceUnitId"
            value={priceUnitId}
            onValueChange={setPriceUnitId}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {filteredUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.name} ({unit.abbreviation})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Custo</Label>
          <div className="flex items-center gap-2">
            <Input
              id="priceQuantity"
              name="priceQuantity"
              type="number"
              step="0.01"
              min="0.01"
              value={priceQuantity}
              onChange={(e) => setPriceQuantity(e.target.value)}
              className="w-24"
              placeholder="100"
            />
            <span className="text-muted-foreground">{selectedUnit?.abbreviation || "un"} por R$</span>
            <Input
              id="averagePrice"
              name="averagePrice"
              type="number"
              step="0.01"
              min="0"
              className="w-32"
              defaultValue={ingredient.averagePrice}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {ingredient.averagePriceManual
              ? "Custo definido manualmente."
              : "Calculado automaticamente pelas entradas."}
          </p>
        </div>
      </div>

      <TooltipProvider>
        <div className="flex items-center space-x-2 pt-2">
          <Switch
            id="availableForSale"
            checked={availableForSale}
            onCheckedChange={setAvailableForSale}
          />
          <Label htmlFor="availableForSale" className="cursor-pointer">
            Disponível para venda em cardápios
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <IconHelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Permite adicionar este insumo diretamente aos cardápios (ex: refrigerante em lata)</p>
            </TooltipContent>
          </Tooltip>
          <input type="hidden" name="availableForSale" value={availableForSale ? "true" : "false"} />
        </div>
      </TooltipProvider>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Alterações"
          )}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/${workspaceSlug}/ingredients/${ingredientId}`}>
            Cancelar
          </Link>
        </Button>
      </div>
    </form>
  );
}
