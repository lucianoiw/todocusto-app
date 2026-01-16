"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addProductComposition, removeProductComposition, updateProductComposition, getAvailableItemsForProduct } from "@/actions/products";
import { getUnits } from "@/actions/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconPlus, IconTrash, IconPencil } from "@tabler/icons-react";

interface CompositionItem {
  id: string;
  type: "ingredient" | "variation" | "recipe" | "product";
  itemId: string;
  itemName: string;
  quantity: string;
  unitId: string | null;
  unitAbbreviation: string | null;
  calculatedCost: string;
}

interface ProductCompositionSectionProps {
  workspaceSlug: string;
  productId: string;
  composition: CompositionItem[];
}

type AvailableItem = {
  id: string;
  type: "ingredient" | "variation" | "recipe" | "product";
  displayName: string;
  unitId: string | null;
  unitAbbreviation: string | null;
  cost: string;
};

export function ProductCompositionSection({
  workspaceSlug,
  productId,
  composition,
}: ProductCompositionSectionProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableItems, setAvailableItems] = useState<{
    ingredients: AvailableItem[];
    variations: AvailableItem[];
    recipes: AvailableItem[];
    products: AvailableItem[];
  }>({ ingredients: [], variations: [], recipes: [], products: [] });
  const [units, setUnits] = useState<Array<{ id: string; name: string; abbreviation: string }>>([]);
  const [selectedItem, setSelectedItem] = useState<AvailableItem | null>(null);
  const [editingItem, setEditingItem] = useState<CompositionItem | null>(null);
  const [editQuantity, setEditQuantity] = useState("");

  async function loadData() {
    const [itemsData, unitsResult] = await Promise.all([
      getAvailableItemsForProduct(workspaceSlug, productId),
      getUnits(workspaceSlug),
    ]);
    setAvailableItems(itemsData);
    setUnits(unitsResult.all);
    setShowForm(true);
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result = await addProductComposition(workspaceSlug, productId, formData);
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

  async function handleRemove(compositionId: string) {
    await removeProductComposition(workspaceSlug, productId, compositionId);
    router.refresh();
  }

  function openEditDialog(item: CompositionItem) {
    setEditingItem(item);
    setEditQuantity(item.quantity);
  }

  async function handleEdit() {
    if (!editingItem) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("quantity", editQuantity);

      const result = await updateProductComposition(
        workspaceSlug,
        productId,
        editingItem.id,
        formData
      );

      if (result.success) {
        setEditingItem(null);
        setEditQuantity("");
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  const allItems = [
    ...availableItems.ingredients,
    ...availableItems.variations,
    ...availableItems.recipes,
    ...availableItems.products,
  ];

  const typeLabels = {
    ingredient: "Insumo",
    variation: "Variação",
    recipe: "Receita",
    product: "Produto",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Composição do Produto</CardTitle>
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
              <Label htmlFor="itemSelect">Selecione o item *</Label>
              <select
                id="itemSelect"
                className="w-full h-8 px-2 rounded-md border text-sm"
                onChange={(e) => {
                  const item = allItems.find((i) => i.id === e.target.value);
                  setSelectedItem(item || null);
                }}
              >
                <option value="">Selecione...</option>
                <optgroup label="Insumos">
                  {availableItems.ingredients.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.displayName} (R$ {parseFloat(item.cost).toFixed(2)}/{item.unitAbbreviation})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Variações">
                  {availableItems.variations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.displayName} (R$ {parseFloat(item.cost).toFixed(4)}/{item.unitAbbreviation})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Receitas">
                  {availableItems.recipes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.displayName} (R$ {parseFloat(item.cost).toFixed(2)}/{item.unitAbbreviation})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Produtos (Combos)">
                  {availableItems.products.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.displayName} (R$ {parseFloat(item.cost).toFixed(2)}/un)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {selectedItem && (
              <>
                <input type="hidden" name="type" value={selectedItem.type} />
                <input type="hidden" name="itemId" value={selectedItem.id} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantidade *</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      placeholder={selectedItem.type === "product" ? "1" : "100"}
                      required
                    />
                  </div>
                  {selectedItem.type !== "product" && (
                    <div className="space-y-2">
                      <Label htmlFor="unitId">Unidade</Label>
                      <select
                        id="unitId"
                        name="unitId"
                        defaultValue={selectedItem.unitId || ""}
                        className="w-full h-8 px-2 rounded-md border text-sm"
                      >
                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} ({unit.abbreviation})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading || !selectedItem}>
                {loading ? "Adicionando..." : "Adicionar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setSelectedItem(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {composition.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum item adicionado. Adicione insumos, receitas ou outros produtos.
          </p>
        ) : (
          <div className="divide-y">
            {composition.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.itemName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {typeLabels[item.type]}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {parseFloat(item.quantity).toLocaleString("pt-BR")}{" "}
                    {item.unitAbbreviation || "un"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <div className="font-medium">
                      R$ {parseFloat(item.calculatedCost).toFixed(2)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(item)}
                  >
                    <IconPencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <IconTrash className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover item</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover "{item.itemName}" do produto?
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
                </div>
              </div>
            ))}
            <div className="pt-3 flex justify-end">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Custo base total</div>
                <div className="text-lg font-bold">
                  R$ {composition.reduce((sum, i) => sum + parseFloat(i.calculatedCost), 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar quantidade</DialogTitle>
            </DialogHeader>
            {editingItem && (
              <div className="space-y-4 py-4">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{editingItem.itemName}</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editQuantity">
                    Quantidade ({editingItem.unitAbbreviation || "un"})
                  </Label>
                  <Input
                    id="editQuantity"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancelar
              </Button>
              <Button onClick={handleEdit} disabled={loading || !editQuantity}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
