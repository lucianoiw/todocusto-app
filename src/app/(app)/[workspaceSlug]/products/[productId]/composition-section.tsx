"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IconPlus, IconTrash, IconPencil, IconChevronDown, IconSearch, IconLayersSubtract } from "@tabler/icons-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  referenceSizeName?: string;
}

type AvailableItem = {
  id: string;
  type: "ingredient" | "variation" | "recipe" | "product";
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

export function ProductCompositionSection({
  workspaceSlug,
  productId,
  composition,
  referenceSizeName,
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
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedItem, setSelectedItem] = useState<AvailableItem | null>(null);
  const [unitId, setUnitId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<CompositionItem | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
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

  // Sort function for alphabetical order
  const sortByName = (a: AvailableItem, b: AvailableItem) =>
    a.displayName.localeCompare(b.displayName, "pt-BR");

  // Filter and sort items based on search query
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      return {
        ingredients: [...availableItems.ingredients].sort(sortByName),
        variations: [...availableItems.variations].sort(sortByName),
        recipes: [...availableItems.recipes].sort(sortByName),
        products: [...availableItems.products].sort(sortByName),
      };
    }

    return {
      ingredients: availableItems.ingredients
        .filter(item => item.displayName.toLowerCase().includes(query))
        .sort(sortByName),
      variations: availableItems.variations
        .filter(item => item.displayName.toLowerCase().includes(query))
        .sort(sortByName),
      recipes: availableItems.recipes
        .filter(item => item.displayName.toLowerCase().includes(query))
        .sort(sortByName),
      products: availableItems.products
        .filter(item => item.displayName.toLowerCase().includes(query))
        .sort(sortByName),
    };
  }, [availableItems, searchQuery]);

  const hasFilteredResults =
    filteredItems.ingredients.length > 0 ||
    filteredItems.variations.length > 0 ||
    filteredItems.recipes.length > 0 ||
    filteredItems.products.length > 0;

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
        setUnitId("");
        setSearchQuery("");
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
    product: "Produto",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          {referenceSizeName
            ? `Composição do Produto (${referenceSizeName})`
            : "Composição do Produto"}
        </CardTitle>
        {!showForm && composition.length > 0 && (
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
                                  R$ {parseFloat(item.cost).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/{item.unitAbbreviation}
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
                        {filteredItems.products.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 sticky top-0">
                              Produtos
                            </div>
                            {filteredItems.products.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between"
                                onClick={() => handleSelectItem(item)}
                              >
                                <span>{item.displayName}</span>
                                <span className="text-xs text-muted-foreground">
                                  R$ {parseFloat(item.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/un
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
                      placeholder={selectedItem.type === "product" ? "1" : "100"}
                      required
                    />
                  </div>
                  {selectedItem.type !== "product" && (
                    <div className="space-y-2">
                      <Label>Unidade *</Label>
                      <Select value={unitId} onValueChange={setUnitId} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredUnits.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.abbreviation} ({unit.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={loading || !selectedItem}>
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

        {composition.length === 0 && !showForm ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconLayersSubtract className="h-5 w-5" />
              </EmptyMedia>
              <EmptyTitle>Nenhum item na composição</EmptyTitle>
              <EmptyDescription>
                {referenceSizeName
                  ? `Adicione os itens que compõem o tamanho "${referenceSizeName}". Os demais tamanhos terão o custo calculado automaticamente pelo multiplicador.`
                  : "Adicione insumos, receitas ou outros produtos para calcular o custo deste produto."}
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={loadData} className="mt-4">
              <IconPlus />
              Adicionar Item
            </Button>
          </Empty>
        ) : composition.length === 0 ? null : (
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium text-right">Quantidade</th>
                  <th className="pb-2 font-medium text-right">Custo</th>
                  <th className="pb-2 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {composition.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50">
                    <td className="py-2 font-medium">{item.itemName}</td>
                    <td className="py-2">
                      <Badge variant="secondary" className="text-xs">
                        {typeLabels[item.type]}
                      </Badge>
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      {parseFloat(item.quantity).toLocaleString("pt-BR")} {item.unitAbbreviation || "un"}
                    </td>
                    <td className="py-2 text-right font-medium">
                      R$ {parseFloat(item.calculatedCost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(item)}
                      >
                        <IconPencil />
                      </Button>
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
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td colSpan={3} className="py-2 text-right text-muted-foreground">Custo base total</td>
                  <td className="py-2 text-right font-bold">
                    R$ {composition.reduce((sum, i) => sum + parseFloat(i.calculatedCost), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
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
