"use client";

import { useState, useMemo } from "react";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { IconPlus, IconTrash } from "@tabler/icons-react";

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

  // Filter units by selected item's measurementType
  const filteredUnits = useMemo(() => {
    if (!selectedItem?.measurementType) return units;
    return units.filter((u) => u.measurementType === selectedItem.measurementType);
  }, [units, selectedItem?.measurementType]);

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

  const allItems = [
    ...availableItems.ingredients,
    ...availableItems.variations,
    ...availableItems.recipes,
  ];

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
          <Button size="sm" onClick={loadData}>
            <IconPlus className="w-4 h-4 mr-1" />
            Adicionar Item
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <form action={handleSubmit} className="space-y-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Selecione o item *</Label>
              <Select
                onValueChange={(value) => {
                  const item = allItems.find((i) => i.id === value);
                  setSelectedItem(item || null);
                  // Reset and set default unit
                  if (item?.unitId) {
                    setUnitId(item.unitId);
                  } else {
                    setUnitId("");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {availableItems.ingredients.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Insumos</SelectLabel>
                      {availableItems.ingredients.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.displayName} (R$ {parseFloat(item.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{item.unitAbbreviation})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {availableItems.variations.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Variações</SelectLabel>
                      {availableItems.variations.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.displayName} (R$ {parseFloat(item.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{item.unitAbbreviation})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {availableItems.recipes.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Receitas</SelectLabel>
                      {availableItems.recipes.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.displayName} (R$ {parseFloat(item.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{item.unitAbbreviation})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
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
              <Button type="submit" size="sm" disabled={loading || !selectedItem || !unitId}>
                {loading ? "Adicionando..." : "Adicionar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setSelectedItem(null);
                  setUnitId("");
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
                      R$ {parseFloat(item.calculatedCost).toFixed(2)}
                    </td>
                    <td className="py-2 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <IconTrash className="w-4 h-4" />
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
                    R$ {items.reduce((sum, i) => sum + parseFloat(i.calculatedCost), 0).toFixed(2)}
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
