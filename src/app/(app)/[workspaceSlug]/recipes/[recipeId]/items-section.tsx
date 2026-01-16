"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addRecipeItem, removeRecipeItem, getAvailableItemsForRecipe } from "@/actions/recipes";
import { getUnits } from "@/actions/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IconPlus, IconTrash, IconChevronDown, IconSearch } from "@tabler/icons-react";

interface RecipeItem {
  id: string;
  type: "ingredient" | "variation" | "recipe";
  itemId: string;
  itemName: string;
  quantity: string;
  unitId: string;
  unitAbbreviation: string | null;
  calculatedCost: string;
  order: number;
}

interface RecipeItemsSectionProps {
  workspaceSlug: string;
  recipeId: string;
  items: RecipeItem[];
}

type AvailableItem = {
  id: string;
  type: "ingredient" | "variation" | "recipe";
  displayName: string;
  unitId: string | null;
  unitAbbreviation: string | null;
  cost: string;
  measurementType: "weight" | "volume" | "unit" | null;
};

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  measurementType: "weight" | "volume" | "unit";
}

export function RecipeItemsSection({
  workspaceSlug,
  recipeId,
  items,
}: RecipeItemsSectionProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableItems, setAvailableItems] = useState<{
    ingredients: AvailableItem[];
    variations: AvailableItem[];
    recipes: AvailableItem[];
  }>({ ingredients: [], variations: [], recipes: [] });
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedItem, setSelectedItem] = useState<AvailableItem | null>(null);
  const [unitId, setUnitId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when popover opens
  useEffect(() => {
    if (popoverOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [popoverOpen]);

  // Filter units by selected item's measurementType
  const filteredUnits = useMemo(() => {
    if (!selectedItem?.measurementType) return units;
    return units.filter((u) => u.measurementType === selectedItem.measurementType);
  }, [units, selectedItem?.measurementType]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return availableItems;

    return {
      ingredients: availableItems.ingredients.filter(item =>
        item.displayName.toLowerCase().includes(query)
      ),
      variations: availableItems.variations.filter(item =>
        item.displayName.toLowerCase().includes(query)
      ),
      recipes: availableItems.recipes.filter(item =>
        item.displayName.toLowerCase().includes(query)
      ),
    };
  }, [availableItems, searchQuery]);

  const hasFilteredResults =
    filteredItems.ingredients.length > 0 ||
    filteredItems.variations.length > 0 ||
    filteredItems.recipes.length > 0;

  async function loadData() {
    const [itemsData, unitsResult] = await Promise.all([
      getAvailableItemsForRecipe(workspaceSlug, recipeId),
      getUnits(workspaceSlug),
    ]);
    setAvailableItems(itemsData);
    setUnits(unitsResult.all);
    setSelectedItem(null);
    setUnitId("");
    setShowForm(true);
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result = await addRecipeItem(workspaceSlug, recipeId, formData);
      if (result.success) {
        setShowForm(false);
        setSelectedItem(null);
        setSearchQuery("");
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(itemId: string) {
    await removeRecipeItem(workspaceSlug, recipeId, itemId);
    router.refresh();
  }

  function handleSelectItem(item: AvailableItem) {
    setSelectedItem(item);
    if (item.unitId) setUnitId(item.unitId);
    setSearchQuery("");
    setPopoverOpen(false);
  }

  const typeLabels = {
    ingredient: "Insumo",
    variation: "Variação",
    recipe: "Receita",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Itens da Receita</CardTitle>
        {!showForm && (
          <Button onClick={loadData}>
            <IconPlus />
            Adicionar Item
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <form action={handleSubmit} className="space-y-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Selecione o item *</Label>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className={selectedItem ? "" : "text-muted-foreground"}>
                      {selectedItem ? selectedItem.displayName : "Selecione um item"}
                    </span>
                    <IconChevronDown className="h-4 w-4 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                  <div className="flex items-center border-b px-3">
                    <IconSearch className="h-4 w-4 shrink-0 opacity-50" />
                    <input
                      ref={searchInputRef}
                      className="flex h-10 w-full bg-transparent py-3 px-2 text-sm outline-none placeholder:text-muted-foreground"
                      placeholder="Buscar item..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {!hasFilteredResults ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum item encontrado
                      </div>
                    ) : (
                      <>
                        {filteredItems.ingredients.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 sticky top-0">
                              Insumos
                            </div>
                            {filteredItems.ingredients.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between"
                                onClick={() => handleSelectItem(item)}
                              >
                                <span>{item.displayName}</span>
                                <span className="text-xs text-muted-foreground">
                                  R$ {parseFloat(item.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{item.unitAbbreviation}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        {filteredItems.variations.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 sticky top-0">
                              Variações
                            </div>
                            {filteredItems.variations.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between"
                                onClick={() => handleSelectItem(item)}
                              >
                                <span>{item.displayName}</span>
                                <span className="text-xs text-muted-foreground">
                                  R$ {parseFloat(item.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{item.unitAbbreviation}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        {filteredItems.recipes.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 sticky top-0">
                              Receitas
                            </div>
                            {filteredItems.recipes.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between"
                                onClick={() => handleSelectItem(item)}
                              >
                                <span>{item.displayName}</span>
                                <span className="text-xs text-muted-foreground">
                                  R$ {parseFloat(item.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{item.unitAbbreviation}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {selectedItem && (
              <>
                <input type="hidden" name="type" value={selectedItem.type} />
                <input type="hidden" name="itemId" value={selectedItem.id} />
                <input type="hidden" name="unitId" value={unitId} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantidade *</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      placeholder="100"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidade *</Label>
                    <Select value={unitId} onValueChange={setUnitId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredUnits.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.abbreviation} ({u.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={loading || !selectedItem || !unitId}>
                {loading ? "Adicionando..." : "Adicionar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setSelectedItem(null);
                  setUnitId("");
                  setSearchQuery("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum item adicionado. Adicione insumos, variações ou outras receitas.
          </p>
        ) : (
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium text-right">Quantidade</th>
                  <th className="pb-2 font-medium text-right">Custo</th>
                  <th className="pb-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50">
                    <td className="py-2 font-medium">{item.itemName}</td>
                    <td className="py-2">
                      <Badge variant="secondary" className="text-xs">
                        {typeLabels[item.type]}
                      </Badge>
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      {parseFloat(item.quantity).toLocaleString("pt-BR")} {item.unitAbbreviation}
                    </td>
                    <td className="py-2 text-right font-medium">
                      R$ {parseFloat(item.calculatedCost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <IconTrash />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover item</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover "{item.itemName}" da receita?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemove(item.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td colSpan={3} className="py-2 text-right text-muted-foreground">Custo total</td>
                  <td className="py-2 text-right font-bold">
                    R$ {items.reduce((sum, i) => sum + parseFloat(i.calculatedCost), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
