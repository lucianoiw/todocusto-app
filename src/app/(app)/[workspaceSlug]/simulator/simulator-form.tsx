"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { simulatePriceChange, SimulationResult } from "@/actions/simulator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Used for "Tipo de Alteração"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBox,
  IconChefHat,
  IconChevronDown,
  IconLoader2,
  IconPackage,
  IconReceipt,
  IconSearch,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";

interface Ingredient {
  id: string;
  name: string;
  averagePrice: number;
  baseCostPerUnit: number;
  priceUnit: string;
}

interface SimulatorFormProps {
  workspaceSlug: string;
  ingredients: Ingredient[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function SimulatorForm({ workspaceSlug, ingredients }: SimulatorFormProps) {
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>("");
  const [priceChangeType, setPriceChangeType] = useState<"absolute" | "percentage">("percentage");
  const [priceChangeValue, setPriceChangeValue] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedIngredient = ingredients.find((i) => i.id === selectedIngredientId);

  // Filter ingredients based on search
  const filteredIngredients = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(query));
  }, [ingredients, searchQuery]);

  // Focus search input when popover opens
  useEffect(() => {
    if (popoverOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [popoverOpen]);

  const calculateNewPrice = (): number => {
    if (!selectedIngredient || !priceChangeValue) return 0;
    const changeValue = parseFloat(priceChangeValue);
    if (isNaN(changeValue)) return selectedIngredient.averagePrice;

    if (priceChangeType === "percentage") {
      return selectedIngredient.averagePrice * (1 + changeValue / 100);
    } else {
      return changeValue;
    }
  };

  const newPrice = calculateNewPrice();
  const priceChange = selectedIngredient
    ? ((newPrice - selectedIngredient.averagePrice) / selectedIngredient.averagePrice) * 100
    : 0;

  async function handleSimulate() {
    if (!selectedIngredientId || !priceChangeValue) return;

    setLoading(true);
    setError(null);

    const result = await simulatePriceChange(workspaceSlug, selectedIngredientId, newPrice);

    if ("error" in result) {
      setError(result.error);
      setResult(null);
    } else {
      setResult(result);
    }

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Configurar Simulação</CardTitle>
          <CardDescription>
            Selecione um ingrediente e defina a variação de preço
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            {/* Ingrediente - full width */}
            <div className="space-y-2">
              <Label>Ingrediente</Label>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className={selectedIngredient ? "" : "text-muted-foreground"}>
                      {selectedIngredient ? selectedIngredient.name : "Selecione um ingrediente"}
                    </span>
                    <IconChevronDown className="h-4 w-4 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <div className="flex items-center border-b px-3">
                    <IconSearch className="h-4 w-4 shrink-0 opacity-50" />
                    <input
                      ref={searchInputRef}
                      className="flex h-10 w-full bg-transparent py-3 px-2 text-sm outline-none placeholder:text-muted-foreground"
                      placeholder="Buscar ingrediente..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredIngredients.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum ingrediente encontrado
                      </div>
                    ) : (
                      filteredIngredients.map((ingredient) => (
                        <button
                          key={ingredient.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between"
                          onClick={() => {
                            setSelectedIngredientId(ingredient.id);
                            setSearchQuery("");
                            setPopoverOpen(false);
                            // Reset form when changing ingredient
                            setPriceChangeValue("");
                            setResult(null);
                            setError(null);
                          }}
                        >
                          <span>{ingredient.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(ingredient.averagePrice)}/{ingredient.priceUnit}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Segunda linha: Tipo + Variação + Botão */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Alteração</Label>
                <Select
                  value={priceChangeType}
                  onValueChange={(v) => setPriceChangeType(v as "absolute" | "percentage")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="absolute">Valor Absoluto (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {priceChangeType === "percentage" ? "Variação (%)" : "Novo Preço (R$)"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={priceChangeType === "percentage" ? "Ex: 20" : "Ex: 60.00"}
                  value={priceChangeValue}
                  onChange={(e) => setPriceChangeValue(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleSimulate}
                  disabled={!selectedIngredientId || !priceChangeValue || loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                      Simulando...
                    </>
                  ) : (
                    "Simular Impacto"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Current price info - shows when ingredient is selected */}
          {selectedIngredient && !priceChangeValue && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Preço atual do ingrediente</p>
              <p className="text-xl font-semibold">
                {formatCurrency(selectedIngredient.averagePrice)}/{selectedIngredient.priceUnit}
              </p>
            </div>
          )}

          {/* Preview - shows when ingredient and change value are set */}
          {selectedIngredient && priceChangeValue && (
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Preço Atual</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(selectedIngredient.averagePrice)}/{selectedIngredient.priceUnit}
                </p>
              </div>
              <IconArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Novo Preço</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(newPrice)}/{selectedIngredient.priceUnit}
                </p>
              </div>
              <div
                className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${
                  priceChange > 0
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : priceChange < 0
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {formatPercentage(priceChange)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Impacto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <IconBox className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{result.summary.totalVariationsAffected}</p>
                  <p className="text-sm text-muted-foreground">Variações</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <IconChefHat className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                  <p className="text-2xl font-bold">{result.summary.totalRecipesAffected}</p>
                  <p className="text-sm text-muted-foreground">Receitas</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <IconPackage className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                  <p className="text-2xl font-bold">{result.summary.totalProductsAffected}</p>
                  <p className="text-sm text-muted-foreground">Produtos</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <IconReceipt className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{result.summary.totalMenuProductsAffected}</p>
                  <p className="text-sm text-muted-foreground">Itens em Cardápios</p>
                </div>
                <div
                  className={`p-4 rounded-lg text-center ${
                    result.summary.productsWithNegativeMargin > 0
                      ? "bg-red-500/10"
                      : "bg-muted/50"
                  }`}
                >
                  <IconAlertTriangle
                    className={`h-6 w-6 mx-auto mb-2 ${
                      result.summary.productsWithNegativeMargin > 0
                        ? "text-red-500"
                        : "text-muted-foreground"
                    }`}
                  />
                  <p className="text-2xl font-bold">{result.summary.productsWithNegativeMargin}</p>
                  <p className="text-sm text-muted-foreground">Margem Negativa</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Affected Recipes */}
          {result.affectedRecipes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconChefHat className="h-5 w-5" />
                  Receitas Afetadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.affectedRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{recipe.name}</span>
                        {recipe.categoryName && (
                          <span className="text-xs text-muted-foreground">({recipe.categoryName})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-muted-foreground">
                            {formatCurrency(recipe.currentCost)}
                          </span>
                          <IconArrowRight className="inline h-4 w-4 mx-2 text-muted-foreground" />
                          <span className="font-medium">{formatCurrency(recipe.newCost)}</span>
                        </div>
                        <span
                          className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                            recipe.percentageChange > 0
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : "bg-green-500/10 text-green-600 dark:text-green-400"
                          }`}
                        >
                          {recipe.percentageChange > 0 ? (
                            <IconTrendingUp className="h-4 w-4" />
                          ) : (
                            <IconTrendingDown className="h-4 w-4" />
                          )}
                          {formatPercentage(recipe.percentageChange)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Affected Products */}
          {result.affectedProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconPackage className="h-5 w-5" />
                  Produtos Afetados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.affectedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.name}</span>
                        {product.categoryName && (
                          <span className="text-xs text-muted-foreground">({product.categoryName})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-muted-foreground">
                            {formatCurrency(product.currentCost)}
                          </span>
                          <IconArrowRight className="inline h-4 w-4 mx-2 text-muted-foreground" />
                          <span className="font-medium">{formatCurrency(product.newCost)}</span>
                        </div>
                        <span
                          className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                            product.percentageChange > 0
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : "bg-green-500/10 text-green-600 dark:text-green-400"
                          }`}
                        >
                          {product.percentageChange > 0 ? (
                            <IconTrendingUp className="h-4 w-4" />
                          ) : (
                            <IconTrendingDown className="h-4 w-4" />
                          )}
                          {formatPercentage(product.percentageChange)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Affected Menu Products */}
          {result.affectedMenuProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconReceipt className="h-5 w-5" />
                  Impacto nos Cardápios
                </CardTitle>
                <CardDescription>
                  Veja como a margem dos produtos será afetada e o preço sugerido para manter a margem
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Produto</th>
                        <th className="pb-2 font-medium">Cardápio</th>
                        <th className="pb-2 font-medium text-right">Preço Atual</th>
                        <th className="pb-2 font-medium text-right">Novo Custo</th>
                        <th className="pb-2 font-medium text-right">Nova Margem</th>
                        <th className="pb-2 font-medium text-right">Preço Sugerido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.affectedMenuProducts.map((mp) => (
                        <tr key={mp.id} className="border-b last:border-0">
                          <td className="py-3">
                            <div className="font-medium">
                              {mp.productName}
                              {mp.sizeOptionName && ` - ${mp.sizeOptionName}`}
                            </div>
                            {mp.categoryName && (
                              <div className="text-xs text-muted-foreground">{mp.categoryName}</div>
                            )}
                          </td>
                          <td className="py-3 text-muted-foreground">{mp.menuName}</td>
                          <td className="py-3 text-right">{formatCurrency(mp.salePrice)}</td>
                          <td className="py-3 text-right">
                            <span className="text-muted-foreground">{formatCurrency(mp.currentCost)}</span>
                            <IconArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                            <span>{formatCurrency(mp.newCost)}</span>
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className={
                                mp.newMargin < 0
                                  ? "text-red-600 dark:text-red-400 font-medium"
                                  : mp.newMarginPercentage < mp.currentMarginPercentage
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-green-600 dark:text-green-400"
                              }
                            >
                              {formatCurrency(mp.newMargin)} ({mp.newMarginPercentage.toFixed(1)}%)
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-semibold text-primary">
                                {formatCurrency(mp.suggestedPrice)}
                              </span>
                              {mp.priceIncrease > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  +{formatCurrency(mp.priceIncrease)}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Impact */}
          {result.affectedVariations.length === 0 &&
            result.affectedRecipes.length === 0 &&
            result.affectedProducts.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Este ingrediente não está sendo usado em nenhuma receita ou produto.
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}
