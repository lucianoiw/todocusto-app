"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMenuProduct,
  removeMenuProduct,
  updateMenuProduct,
  getAvailableProductsForMenu,
} from "@/actions/menus";
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

interface MenuProduct {
  id: string;
  productId: string;
  productName: string;
  productBaseCost: string;
  salePrice: string;
  totalCost: string;
  marginValue: string;
  marginPercentage: string;
}

interface AvailableProduct {
  id: string;
  name: string;
  baseCost: string;
}

interface MenuFee {
  id: string;
  name: string;
  type: "fixed" | "percentage";
  value: string;
  active: boolean;
}

interface MenuProductsSectionProps {
  workspaceSlug: string;
  menuId: string;
  products: MenuProduct[];
  fees: MenuFee[];
  apportionmentType: "percentage_of_sale" | "fixed_per_product" | "proportional_to_sales";
  apportionmentValue: string | null;
  totalMonthlyFixedCost: number;
}

export function MenuProductsSection({
  workspaceSlug,
  menuId,
  products,
  fees,
  apportionmentType,
  apportionmentValue,
  totalMonthlyFixedCost,
}: MenuProductsSectionProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<AvailableProduct | null>(null);
  const [salePrice, setSalePrice] = useState("");
  const [targetMargin, setTargetMargin] = useState(30);
  const [editingProduct, setEditingProduct] = useState<MenuProduct | null>(null);
  const [editPrice, setEditPrice] = useState("");

  // Get total fixed fees
  function getTotalFixedFees(): number {
    return fees
      .filter((f) => f.active && f.type === "fixed")
      .reduce((sum, f) => sum + parseFloat(f.value), 0);
  }

  // Get total percentage fees
  function getTotalPercentageFees(): number {
    return fees
      .filter((f) => f.active && f.type === "percentage")
      .reduce((sum, f) => sum + parseFloat(f.value), 0);
  }

  // Calculate fees cost for a given sale price
  function calculateFeesCost(salePrice: number): number {
    const fixedFees = getTotalFixedFees();
    const percentageFees = getTotalPercentageFees() / 100;
    return fixedFees + (salePrice * percentageFees);
  }

  // Get total percentage costs (fees + fixed cost if percentage_of_sale)
  function getTotalPercentageCosts(): number {
    let total = getTotalPercentageFees();
    if (apportionmentType === "percentage_of_sale" && apportionmentValue) {
      total += parseFloat(apportionmentValue);
    }
    return total;
  }

  // Calculate fixed cost apportionment per product (for fixed types)
  function getFixedCostApportionment(salePrice: number): number {
    const appValue = parseFloat(apportionmentValue || "0");
    if (totalMonthlyFixedCost <= 0 || appValue <= 0) return 0;

    switch (apportionmentType) {
      case "percentage_of_sale":
        return salePrice * (appValue / 100);
      case "fixed_per_product":
        return appValue;
      case "proportional_to_sales":
        return totalMonthlyFixedCost / appValue;
      default:
        return 0;
    }
  }

  // Calculate max possible margin given percentage fees and fixed cost percentage
  function getMaxMargin(): number {
    const percentageCosts = getTotalPercentageCosts();
    return Math.floor((1 - percentageCosts / 100) * 100) - 1; // Leave at least 1% for rounding
  }

  // Calculate suggested price based on fees, fixed costs, and target margin
  function calculateSuggestedPrice(baseCost: number, marginPct: number): number | null {
    // Get active fees
    const activeFees = fees.filter((f) => f.active);
    const fixedFees = activeFees
      .filter((f) => f.type === "fixed")
      .reduce((sum, f) => sum + parseFloat(f.value), 0);
    const percentageFees = activeFees
      .filter((f) => f.type === "percentage")
      .reduce((sum, f) => sum + parseFloat(f.value), 0) / 100;

    // Add fixed cost percentage if applicable
    let percentageFixedCost = 0;
    if (apportionmentType === "percentage_of_sale" && apportionmentValue) {
      percentageFixedCost = parseFloat(apportionmentValue) / 100;
    }

    // For fixed apportionment types, add to base cost
    let additionalFixedCost = 0;
    const appValue = parseFloat(apportionmentValue || "0");
    if (totalMonthlyFixedCost > 0 && appValue > 0) {
      if (apportionmentType === "fixed_per_product") {
        additionalFixedCost = appValue;
      } else if (apportionmentType === "proportional_to_sales") {
        additionalFixedCost = totalMonthlyFixedCost / appValue;
      }
    }

    // Formula: sale_price = (base_cost + fixed_fees + fixed_cost_apportionment) / (1 - margin_pct - percentage_fees - percentage_fixed_cost)
    const denominator = 1 - (marginPct / 100) - percentageFees - percentageFixedCost;
    if (denominator <= 0) return null; // Invalid margin (too high)

    return (baseCost + fixedFees + additionalFixedCost) / denominator;
  }

  // Calculate preview margin for current price
  function calculatePreviewMargin(baseCost: number, price: number): { value: number; percentage: number } {
    if (price <= 0) return { value: 0, percentage: 0 };

    const activeFees = fees.filter((f) => f.active);
    const fixedFees = activeFees
      .filter((f) => f.type === "fixed")
      .reduce((sum, f) => sum + parseFloat(f.value), 0);
    const percentageFees = activeFees
      .filter((f) => f.type === "percentage")
      .reduce((sum, f) => sum + parseFloat(f.value), 0) / 100;

    // Calculate fixed cost apportionment
    const fixedCostApp = getFixedCostApportionment(price);

    const totalCost = baseCost + fixedFees + (price * percentageFees) + fixedCostApp;
    const marginValue = price - totalCost;
    const marginPercentage = (marginValue / price) * 100;

    return { value: marginValue, percentage: marginPercentage };
  }

  async function loadAvailableProducts() {
    const prods = await getAvailableProductsForMenu(workspaceSlug, menuId);
    setAvailableProducts(prods);
    setSalePrice("");
    setShowForm(true);
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result = await addMenuProduct(workspaceSlug, menuId, formData);
      if (result.success) {
        setShowForm(false);
        setSelectedProduct(null);
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(menuProductId: string) {
    await removeMenuProduct(workspaceSlug, menuId, menuProductId);
    router.refresh();
  }

  function openEditDialog(item: MenuProduct) {
    setEditingProduct(item);
    setEditPrice(parseFloat(item.salePrice).toFixed(2));
  }

  async function handleEdit() {
    if (!editingProduct) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("salePrice", editPrice);

      const result = await updateMenuProduct(
        workspaceSlug,
        menuId,
        editingProduct.id,
        formData
      );

      if (result.success) {
        setEditingProduct(null);
        setEditPrice("");
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Produtos no Cardápio</CardTitle>
        {!showForm && (
          <Button size="sm" onClick={loadAvailableProducts}>
            <IconPlus className="w-4 h-4 mr-1" />
            Adicionar Produto
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <form action={handleSubmit} className="space-y-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="productSelect">Selecione o produto *</Label>
              <select
                id="productSelect"
                name="productId"
                className="w-full h-10 px-3 rounded-md border text-sm"
                onChange={(e) => {
                  const prod = availableProducts.find((p) => p.id === e.target.value);
                  setSelectedProduct(prod || null);
                }}
                required
              >
                <option value="">Selecione...</option>
                {availableProducts.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name} (Custo: R$ {parseFloat(prod.baseCost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </option>
                ))}
              </select>
              {availableProducts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Todos os produtos ativos já estão no cardápio.
                </p>
              )}
            </div>

            {selectedProduct && (
              <div className="space-y-4">
                {/* Suggested Price */}
                {(() => {
                  const suggestedPrice = calculateSuggestedPrice(parseFloat(selectedProduct.baseCost), targetMargin);
                  const maxMargin = getMaxMargin();
                  const totalPctCosts = getTotalPercentageCosts();
                  const isInvalidMargin = suggestedPrice === null;

                  return (
                    <div className={`p-3 rounded-lg border ${isInvalidMargin ? "bg-red-500/10 border-red-500/20" : "bg-blue-500/10 border-blue-500/20"}`}>
                      <div className="flex items-center gap-4">
                        <div>
                          <span className={`text-sm ${isInvalidMargin ? "text-red-700 dark:text-red-400" : "text-blue-700 dark:text-blue-400"}`}>Margem desejada:</span>
                          <div className="flex items-center gap-1 mt-1">
                            <Input
                              type="number"
                              value={targetMargin}
                              onChange={(e) => setTargetMargin(Number(e.target.value))}
                              className="w-16 h-8 text-sm"
                              min="0"
                              max={maxMargin}
                            />
                            <span className={isInvalidMargin ? "text-red-700 dark:text-red-400" : "text-blue-700 dark:text-blue-400"}>%</span>
                          </div>
                        </div>
                        <div className="text-right flex-1">
                          {isInvalidMargin ? (
                            <>
                              <span className="text-sm text-red-700 dark:text-red-400">Margem muito alta!</span>
                              <div className="text-sm text-red-600">
                                Máximo: {maxMargin}% (custos %: {totalPctCosts.toFixed(1)}%)
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="text-sm text-blue-700 dark:text-blue-400">Preço sugerido:</span>
                              <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
                                R$ {suggestedPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isInvalidMargin}
                          onClick={() => {
                            if (suggestedPrice !== null) {
                              setSalePrice(suggestedPrice.toFixed(2));
                            }
                          }}
                        >
                          Usar
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  <Label htmlFor="salePrice">Preço de venda *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">R$</span>
                    <Input
                      id="salePrice"
                      name="salePrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      placeholder="0,00"
                      required
                      className="w-32"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Custo base: R$ {parseFloat(selectedProduct.baseCost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Preview margin */}
                {salePrice && parseFloat(salePrice) > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    {(() => {
                      const preview = calculatePreviewMargin(parseFloat(selectedProduct.baseCost), parseFloat(salePrice));
                      return (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Margem resultante:</span>
                          <div className="text-right">
                            <span className={`font-bold ${preview.percentage >= 0 ? "text-green-600" : "text-red-600"}`}>
                              R$ {preview.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({preview.percentage.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading || !selectedProduct}>
                {loading ? "Adicionando..." : "Adicionar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setSelectedProduct(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {products.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum produto no cardápio. Adicione produtos para definir preços de venda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Produto</th>
                  <th className="pb-3 font-medium text-right">Base</th>
                  <th className="pb-3 font-medium text-right">Taxas</th>
                  <th className="pb-3 font-medium text-right">CF</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                  <th className="pb-3 font-medium text-right">Preço</th>
                  <th className="pb-3 font-medium text-right">Lucro</th>
                  <th className="pb-3 font-medium text-right">%</th>
                  <th className="pb-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((item) => {
                  const salePrice = parseFloat(item.salePrice);
                  const baseCost = parseFloat(item.productBaseCost);
                  const feesCost = calculateFeesCost(salePrice);
                  const fixedCostContrib = getFixedCostApportionment(salePrice);
                  const marginPercentage = parseFloat(item.marginPercentage);

                  return (
                    <tr key={item.id}>
                      <td className="py-3 font-medium">{item.productName}</td>
                      <td className="py-3 text-right text-muted-foreground">
                        {baseCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {feesCost > 0 ? feesCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {fixedCostContrib > 0 ? fixedCostContrib.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                      </td>
                      <td className="py-3 text-right text-foreground font-medium">
                        {parseFloat(item.totalCost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right font-medium">
                        {salePrice.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 text-right font-medium ${marginPercentage >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {parseFloat(item.marginValue).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right">
                        <Badge
                          variant={marginPercentage >= 30 ? "default" : marginPercentage >= 0 ? "secondary" : "destructive"}
                          className="font-mono"
                        >
                          {marginPercentage.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
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
                                <AlertDialogTitle>Remover produto</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover &quot;{item.productName}&quot; do cardápio?
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Legend */}
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex gap-4">
              <span><strong>Base:</strong> Custo do produto</span>
              <span><strong>Taxas:</strong> Taxas e comissões</span>
              <span><strong>CF:</strong> Custos fixos</span>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar preço de venda</DialogTitle>
            </DialogHeader>
            {editingProduct && (
              <div className="space-y-4 py-4">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{editingProduct.productName}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Custo total: R$ {parseFloat(editingProduct.totalCost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPrice">Preço de venda</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">R$</span>
                    <Input
                      id="editPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-32"
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProduct(null)}>
                Cancelar
              </Button>
              <Button onClick={handleEdit} disabled={loading || !editPrice}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
