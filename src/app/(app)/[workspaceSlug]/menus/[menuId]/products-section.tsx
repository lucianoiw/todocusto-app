"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  addMenuProduct,
  removeMenuProduct,
  updateMenuProduct,
  getAvailableItemsForMenu,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IconPlus, IconTrash, IconPencil, IconChevronDown, IconChevronRight, IconSearch } from "@tabler/icons-react";

// Constantes
const MARGIN_MISMATCH_THRESHOLD = 1; // 1% de tolerância para aviso de margem não alcançável

// Helper para arredondar margem consistentemente (1 casa decimal)
function roundMargin(value: number): number {
  return Math.round(value * 10) / 10;
}

// Helper para clampar valor de margem entre 0 e 99
function clampMargin(value: number): number {
  return Math.max(0, Math.min(99, value));
}

interface MenuProduct {
  id: string;
  itemType?: "product" | "ingredient" | "recipe";
  productId: string;
  productName: string;
  productBaseCost: string;
  productSizeGroupId: string | null;
  sizeOptionId: string | null;
  sizeOptionName: string | null;
  sizeOptionMultiplier: string | null;
  salePrice: string;
  totalCost: string;
  marginValue: string;
  marginPercentage: string;
}

interface SizeOptionWithCost {
  id: string;
  name: string;
  multiplier: string;
  isReference: boolean;
  calculatedCost: string;
  isInMenu: boolean;
}

interface AvailableProduct {
  id: string;
  name: string;
  baseCost: string;
  sizeGroupId: string | null;
  sizeGroupName: string | null;
  sizeOptions: SizeOptionWithCost[];
  isInMenu: boolean;
}

interface AvailableIngredient {
  id: string;
  name: string;
  baseCost: string;
  averagePrice: string;
  unitAbbreviation: string | null;
  isInMenu: boolean;
}

interface AvailableRecipe {
  id: string;
  name: string;
  baseCost: string;
  totalCost: string;
  yieldQuantity: string;
  unitAbbreviation: string | null;
  isInMenu: boolean;
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
  defaultTargetMargin: number;
  pricingMode: "margin" | "markup";
}

export function MenuProductsSection({
  workspaceSlug,
  menuId,
  products,
  fees,
  apportionmentType,
  apportionmentValue,
  totalMonthlyFixedCost,
  defaultTargetMargin,
  pricingMode,
}: MenuProductsSectionProps) {
  const router = useRouter();
  const isMarkup = pricingMode === "markup";
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableItems, setAvailableItems] = useState<{
    products: AvailableProduct[];
    ingredients: AvailableIngredient[];
    recipes: AvailableRecipe[];
  }>({ products: [], ingredients: [], recipes: [] });
  const [selectedItemType, setSelectedItemType] = useState<"product" | "ingredient" | "recipe" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<AvailableProduct | null>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<AvailableIngredient | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<AvailableRecipe | null>(null);
  const [selectedSizeOption, setSelectedSizeOption] = useState<SizeOptionWithCost | null>(null);
  const [salePrice, setSalePrice] = useState("");
  const [targetMargin, setTargetMargin] = useState(defaultTargetMargin);
  const [editingProduct, setEditingProduct] = useState<MenuProduct | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editTargetMargin, setEditTargetMargin] = useState(defaultTargetMargin);
  const [searchQuery, setSearchQuery] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [hasAvailableItems, setHasAvailableItems] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check if there are available items on mount
  useEffect(() => {
    async function checkAvailableItems() {
      const items = await getAvailableItemsForMenu(workspaceSlug, menuId);
      const availableProducts = items.products.filter((p: AvailableProduct) => {
        if (p.sizeOptions.length === 0) {
          return !p.isInMenu;
        } else {
          return p.sizeOptions.some((opt: SizeOptionWithCost) => !opt.isInMenu);
        }
      });
      const availableIngredients = items.ingredients.filter((i: AvailableIngredient) => !i.isInMenu);
      const availableRecipes = items.recipes.filter((r: AvailableRecipe) => !r.isInMenu);
      setHasAvailableItems(availableProducts.length > 0 || availableIngredients.length > 0 || availableRecipes.length > 0);
    }
    checkAvailableItems();
  }, [workspaceSlug, menuId, products]);

  // Group products by productId for collapse functionality
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, MenuProduct[]>();
    products.forEach((item) => {
      const existing = groups.get(item.productId) || [];
      existing.push(item);
      groups.set(item.productId, existing);
    });
    return groups;
  }, [products]);

  function toggleProductExpanded(productId: string) {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  // Focus search input when popover opens
  useEffect(() => {
    if (popoverOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [popoverOpen]);

  // Sort function for alphabetical order
  const sortByName = <T extends { name: string }>(a: T, b: T) =>
    a.name.localeCompare(b.name, "pt-BR");

  // Filter and sort items based on search query
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    // Filter products
    const availableProductsToAdd = availableItems.products.filter((p) => {
      if (p.sizeOptions.length === 0) {
        return !p.isInMenu;
      } else {
        return p.sizeOptions.some((opt) => !opt.isInMenu);
      }
    });

    // Filter ingredients and recipes
    const availableIngredientsToAdd = availableItems.ingredients.filter((i) => !i.isInMenu);
    const availableRecipesToAdd = availableItems.recipes.filter((r) => !r.isInMenu);

    if (!query) {
      return {
        products: [...availableProductsToAdd].sort(sortByName),
        ingredients: [...availableIngredientsToAdd].sort(sortByName),
        recipes: [...availableRecipesToAdd].sort(sortByName),
      };
    }

    return {
      products: availableProductsToAdd
        .filter((p) => p.name.toLowerCase().includes(query))
        .sort(sortByName),
      ingredients: availableIngredientsToAdd
        .filter((i) => i.name.toLowerCase().includes(query))
        .sort(sortByName),
      recipes: availableRecipesToAdd
        .filter((r) => r.name.toLowerCase().includes(query))
        .sort(sortByName),
    };
  }, [availableItems, searchQuery]);

  const hasFilteredResults =
    filteredItems.products.length > 0 ||
    filteredItems.ingredients.length > 0 ||
    filteredItems.recipes.length > 0;

  function handleSelectProduct(prod: AvailableProduct) {
    setSelectedItemType("product");
    setSelectedProduct(prod);
    setSelectedIngredient(null);
    setSelectedRecipe(null);
    setSelectedSizeOption(null);
    // Auto-calculate price for products without sizes
    if (prod.sizeOptions.length === 0) {
      const baseCost = parseFloat(prod.baseCost);
      const suggestedPrice = calculateSuggestedPrice(baseCost, targetMargin);
      setSalePrice(suggestedPrice !== null ? suggestedPrice.toFixed(2) : "");
    } else {
      setSalePrice("");
    }
    setSearchQuery("");
    setPopoverOpen(false);
  }

  function handleSelectIngredient(ing: AvailableIngredient) {
    setSelectedItemType("ingredient");
    setSelectedProduct(null);
    setSelectedIngredient(ing);
    setSelectedRecipe(null);
    setSelectedSizeOption(null);
    // Auto-calculate price
    const baseCost = parseFloat(ing.baseCost);
    const suggestedPrice = calculateSuggestedPrice(baseCost, targetMargin);
    setSalePrice(suggestedPrice !== null ? suggestedPrice.toFixed(2) : "");
    setSearchQuery("");
    setPopoverOpen(false);
  }

  function handleSelectRecipe(rec: AvailableRecipe) {
    setSelectedItemType("recipe");
    setSelectedProduct(null);
    setSelectedIngredient(null);
    setSelectedRecipe(rec);
    setSelectedSizeOption(null);
    // Auto-calculate price
    const baseCost = parseFloat(rec.baseCost);
    const suggestedPrice = calculateSuggestedPrice(baseCost, targetMargin);
    setSalePrice(suggestedPrice !== null ? suggestedPrice.toFixed(2) : "");
    setSearchQuery("");
    setPopoverOpen(false);
  }

  // Get selected item name for display
  function getSelectedItemName(): string {
    if (selectedItemType === "product" && selectedProduct) return selectedProduct.name;
    if (selectedItemType === "ingredient" && selectedIngredient) return selectedIngredient.name;
    if (selectedItemType === "recipe" && selectedRecipe) return selectedRecipe.name;
    return "";
  }

  // Check if an item is selected
  function hasSelectedItem(): boolean {
    return selectedItemType !== null && (
      (selectedItemType === "product" && selectedProduct !== null) ||
      (selectedItemType === "ingredient" && selectedIngredient !== null) ||
      (selectedItemType === "recipe" && selectedRecipe !== null)
    );
  }

  // Get effective base cost (considering size multiplier)
  function getEffectiveBaseCost(): number {
    if (selectedItemType === "product" && selectedProduct) {
      if (selectedSizeOption) {
        return parseFloat(selectedSizeOption.calculatedCost);
      }
      return parseFloat(selectedProduct.baseCost);
    }
    if (selectedItemType === "ingredient" && selectedIngredient) {
      return parseFloat(selectedIngredient.baseCost);
    }
    if (selectedItemType === "recipe" && selectedRecipe) {
      return parseFloat(selectedRecipe.baseCost);
    }
    return 0;
  }

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

  // Helper para calcular componentes de taxas (evita duplicação)
  interface FeeComponents {
    fixedFees: number;
    percentageFees: number;
    percentageFixedCost: number;
    additionalFixedCost: number;
  }

  function calculateFeeComponents(): FeeComponents {
    const activeFees = fees.filter((f) => f.active);
    const fixedFees = activeFees
      .filter((f) => f.type === "fixed")
      .reduce((sum, f) => sum + parseFloat(f.value), 0);
    const percentageFees = activeFees
      .filter((f) => f.type === "percentage")
      .reduce((sum, f) => sum + parseFloat(f.value), 0) / 100;

    let percentageFixedCost = 0;
    if (apportionmentType === "percentage_of_sale" && apportionmentValue) {
      percentageFixedCost = parseFloat(apportionmentValue) / 100;
    }

    let additionalFixedCost = 0;
    const appValue = parseFloat(apportionmentValue || "0");
    if (totalMonthlyFixedCost > 0 && appValue > 0) {
      if (apportionmentType === "fixed_per_product") {
        additionalFixedCost = appValue;
      } else if (apportionmentType === "proportional_to_sales") {
        additionalFixedCost = totalMonthlyFixedCost / appValue;
      }
    }

    return { fixedFees, percentageFees, percentageFixedCost, additionalFixedCost };
  }

  // Calculate margin/markup percentage from price (reverse of calculateSuggestedPrice)
  function calculateMarginFromPrice(baseCost: number, price: number): number | null {
    if (price <= 0) return null;

    const { fixedFees, percentageFees, percentageFixedCost, additionalFixedCost } = calculateFeeComponents();
    const totalFixedCosts = baseCost + fixedFees + additionalFixedCost;

    if (isMarkup) {
      // Reverse markup formula: markup% = (price × (1 - percentageFees - percentageFixedCost) / totalFixedCosts - 1) × 100
      const effectivePrice = price * (1 - percentageFees - percentageFixedCost);
      if (totalFixedCosts <= 0) return null;
      return (effectivePrice / totalFixedCosts - 1) * 100;
    } else {
      // Reverse margin formula: margin = (1 - totalFixedCosts / price - percentageFees - percentageFixedCost) × 100
      const marginPct = (1 - totalFixedCosts / price - percentageFees - percentageFixedCost) * 100;
      return marginPct;
    }
  }

  // Calculate suggested price based on fees, fixed costs, and target margin/markup
  function calculateSuggestedPrice(baseCost: number, targetPct: number): number | null {
    const { fixedFees, percentageFees, percentageFixedCost, additionalFixedCost } = calculateFeeComponents();
    const totalFixedCosts = baseCost + fixedFees + additionalFixedCost;

    if (isMarkup) {
      // Markup formula: price = totalFixedCosts × (1 + markup%) / (1 - percentageFees - percentageFixedCost)
      const denominator = 1 - percentageFees - percentageFixedCost;
      if (denominator <= 0) return null;
      return totalFixedCosts * (1 + targetPct / 100) / denominator;
    } else {
      // Margin formula: price = totalFixedCosts / (1 - margin% - percentageFees - percentageFixedCost)
      const denominator = 1 - (targetPct / 100) - percentageFees - percentageFixedCost;
      if (denominator <= 0) return null; // Invalid margin (too high)
      return totalFixedCosts / denominator;
    }
  }

  // Calculate preview margin for current price
  function calculatePreviewMargin(baseCost: number, price: number): { value: number; percentage: number } {
    if (price <= 0) return { value: 0, percentage: 0 };

    const { fixedFees, percentageFees } = calculateFeeComponents();

    // Calculate fixed cost apportionment
    const fixedCostApp = getFixedCostApportionment(price);

    const totalCost = baseCost + fixedFees + (price * percentageFees) + fixedCostApp;
    const marginValue = price - totalCost;
    const marginPercentage = (marginValue / price) * 100;

    return { value: marginValue, percentage: marginPercentage };
  }

  // Calculate detailed breakdown of price components
  interface PriceBreakdown {
    baseCost: number;
    fixedFees: number;
    fixedFeesList: { name: string; value: number }[];
    percentageFees: number;
    percentageFeesList: { name: string; percentage: number; value: number }[];
    fixedCostApportionment: number;
    fixedCostPercentage: number;
    totalCost: number;
    profit: number;
    profitPercentage: number;
  }

  function calculatePriceBreakdown(baseCost: number, price: number): PriceBreakdown {
    const activeFees = fees.filter((f) => f.active);

    // Fixed fees breakdown
    const fixedFeesList = activeFees
      .filter((f) => f.type === "fixed")
      .map((f) => ({ name: f.name, value: parseFloat(f.value) }));
    const fixedFeesTotal = fixedFeesList.reduce((sum, f) => sum + f.value, 0);

    // Percentage fees breakdown
    const percentageFeesList = activeFees
      .filter((f) => f.type === "percentage")
      .map((f) => ({
        name: f.name,
        percentage: parseFloat(f.value),
        value: price * (parseFloat(f.value) / 100),
      }));
    const percentageFeesTotal = percentageFeesList.reduce((sum, f) => sum + f.value, 0);

    // Fixed cost apportionment
    let fixedCostApportionment = 0;
    let fixedCostPercentage = 0;
    const appValue = parseFloat(apportionmentValue || "0");

    if (apportionmentType === "percentage_of_sale" && appValue > 0) {
      fixedCostPercentage = appValue;
      fixedCostApportionment = price * (appValue / 100);
    } else if (apportionmentType === "fixed_per_product" && appValue > 0) {
      fixedCostApportionment = appValue;
    } else if (apportionmentType === "proportional_to_sales" && totalMonthlyFixedCost > 0 && appValue > 0) {
      fixedCostApportionment = totalMonthlyFixedCost / appValue;
    }

    const totalCost = baseCost + fixedFeesTotal + percentageFeesTotal + fixedCostApportionment;
    const profit = price - totalCost;
    const profitPercentage = price > 0 ? (profit / price) * 100 : 0;

    return {
      baseCost,
      fixedFees: fixedFeesTotal,
      fixedFeesList,
      percentageFees: percentageFeesTotal,
      percentageFeesList,
      fixedCostApportionment,
      fixedCostPercentage,
      totalCost,
      profit,
      profitPercentage,
    };
  }

  async function loadAvailableItems() {
    const items = await getAvailableItemsForMenu(workspaceSlug, menuId);
    setAvailableItems(items);
    setSalePrice("");
    setSelectedItemType(null);
    setSelectedProduct(null);
    setSelectedIngredient(null);
    setSelectedRecipe(null);
    setSelectedSizeOption(null);
    setSearchQuery("");
    setShowForm(true);
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      // Set itemType and itemId based on selection
      if (selectedItemType && formData.get("itemType") === null) {
        formData.set("itemType", selectedItemType);
      }
      if (selectedItemType === "product" && selectedProduct) {
        formData.set("itemId", selectedProduct.id);
      } else if (selectedItemType === "ingredient" && selectedIngredient) {
        formData.set("itemId", selectedIngredient.id);
      } else if (selectedItemType === "recipe" && selectedRecipe) {
        formData.set("itemId", selectedRecipe.id);
      }
      // Add sizeOptionId if selected
      if (selectedSizeOption) {
        formData.set("sizeOptionId", selectedSizeOption.id);
      }
      const result = await addMenuProduct(workspaceSlug, menuId, formData);
      if (result.success) {
        setShowForm(false);
        setSelectedItemType(null);
        setSelectedProduct(null);
        setSelectedIngredient(null);
        setSelectedRecipe(null);
        setSelectedSizeOption(null);
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAllSizes() {
    if (!selectedProduct) return;

    const sizesToAdd = selectedProduct.sizeOptions.filter(o => !o.isInMenu);
    if (sizesToAdd.length === 0) return;

    setLoading(true);
    try {
      for (const sizeOpt of sizesToAdd) {
        const baseCost = parseFloat(sizeOpt.calculatedCost);
        const suggestedPrice = calculateSuggestedPrice(baseCost, targetMargin);

        if (suggestedPrice === null) {
          alert(`Não foi possível calcular o preço para ${sizeOpt.name}. Margem muito alta.`);
          continue;
        }

        const formData = new FormData();
        formData.set("productId", selectedProduct.id);
        formData.set("sizeOptionId", sizeOpt.id);
        formData.set("salePrice", suggestedPrice.toFixed(2));

        const result = await addMenuProduct(workspaceSlug, menuId, formData);
        if (!result.success) {
          alert(`Erro ao adicionar ${sizeOpt.name}: ${result.error}`);
        }
      }
      setShowForm(false);
      setSelectedProduct(null);
      setSelectedSizeOption(null);
      router.refresh();
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
    setEditTargetMargin(parseFloat(item.marginPercentage));
  }

  // Get base cost for the product being edited
  function getEditBaseCost(): number {
    if (!editingProduct) return 0;
    let baseCost = parseFloat(editingProduct.productBaseCost);
    if (editingProduct.sizeOptionMultiplier) {
      baseCost = baseCost * parseFloat(editingProduct.sizeOptionMultiplier);
    }
    return baseCost;
  }

  // Check if the current price matches the target margin (within threshold)
  function isMarginAchievable(baseCost: number, price: number, targetMargin: number): boolean {
    if (price <= 0) return false;
    const breakdown = calculatePriceBreakdown(baseCost, price);
    const roundedProfit = roundMargin(breakdown.profitPercentage);
    const roundedTarget = roundMargin(targetMargin);
    return Math.abs(roundedProfit - roundedTarget) <= MARGIN_MISMATCH_THRESHOLD;
  }

  // Calculate the maximum achievable margin given current fees
  function getMaxAchievableMargin(): number {
    const { percentageFees, percentageFixedCost } = calculateFeeComponents();
    // For margin mode: max margin = 100% - percentage fees - percentage fixed cost
    // We subtract a small epsilon to ensure the price calculation doesn't fail
    const maxMargin = (1 - percentageFees - percentageFixedCost) * 100 - 0.1;
    return Math.max(0, roundMargin(maxMargin));
  }

  // Clamp margin to maximum achievable value
  function clampToMaxMargin(value: number): number {
    if (isMarkup) {
      // For markup, there's no theoretical maximum (can be any positive number)
      return clampMargin(value);
    }
    const maxMargin = getMaxAchievableMargin();
    return Math.min(clampMargin(value), maxMargin);
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
        <CardTitle className="text-lg">Itens no Cardápio</CardTitle>
        {!showForm && (
          <Button onClick={loadAvailableItems} disabled={!hasAvailableItems}>
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
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className={hasSelectedItem() ? "" : "text-muted-foreground"}>
                      {hasSelectedItem() ? getSelectedItemName() : "Selecione um item"}
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
                            {filteredItems.ingredients.map((ing) => (
                              <button
                                key={ing.id}
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between"
                                onClick={() => handleSelectIngredient(ing)}
                              >
                                <span>{ing.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  R$ {parseFloat(ing.baseCost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{ing.unitAbbreviation}
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
                            {filteredItems.recipes.map((rec) => (
                              <button
                                key={rec.id}
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between"
                                onClick={() => handleSelectRecipe(rec)}
                              >
                                <span>{rec.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  R$ {parseFloat(rec.baseCost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                            {filteredItems.products.map((prod) => (
                              <button
                                key={prod.id}
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => handleSelectProduct(prod)}
                                disabled={prod.isInMenu && prod.sizeOptions.length === 0}
                              >
                                <span className="truncate">{prod.name}</span>
                                {prod.sizeOptions.length === 0 && (
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    R$ {parseFloat(prod.baseCost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                )}
                                {prod.sizeOptions.length > 0 && (
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {prod.sizeOptions.filter((o) => !o.isInMenu).length}/{prod.sizeOptions.length} tamanhos
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {/* Hidden inputs for form submission */}
              <input type="hidden" name="itemType" value={selectedItemType || ""} />
              <input type="hidden" name="itemId" value={
                selectedItemType === "product" ? (selectedProduct?.id || "") :
                selectedItemType === "ingredient" ? (selectedIngredient?.id || "") :
                selectedItemType === "recipe" ? (selectedRecipe?.id || "") : ""
              } />
            </div>

            {/* Size option selector for products with sizes */}
            {selectedProduct && selectedProduct.sizeOptions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sizeSelect">Selecione o tamanho *</Label>
                  {selectedProduct.sizeOptions.filter(o => !o.isInMenu).length > 1 && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => handleAddAllSizes()}
                    >
                      Adicionar todos os tamanhos
                    </Button>
                  )}
                </div>
                <select
                  id="sizeSelect"
                  className="w-full h-10 px-3 rounded-md border text-sm"
                  value={selectedSizeOption?.id || ""}
                  onChange={(e) => {
                    const sizeOpt = selectedProduct.sizeOptions.find((s) => s.id === e.target.value);
                    setSelectedSizeOption(sizeOpt || null);
                    // Auto-calculate price based on selected size
                    if (sizeOpt) {
                      const baseCost = parseFloat(sizeOpt.calculatedCost);
                      const suggestedPrice = calculateSuggestedPrice(baseCost, targetMargin);
                      setSalePrice(suggestedPrice !== null ? suggestedPrice.toFixed(2) : "");
                    } else {
                      setSalePrice("");
                    }
                  }}
                  required
                >
                  <option value="">Selecione o tamanho...</option>
                  {selectedProduct.sizeOptions.map((opt) => (
                    <option key={opt.id} value={opt.id} disabled={opt.isInMenu}>
                      {opt.name} ({parseFloat(opt.multiplier).toFixed(2)}x) - Custo: R$ {parseFloat(opt.calculatedCost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {opt.isReference && " (Ref.)"}
                      {opt.isInMenu && " (já no cardápio)"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {((selectedItemType === "product" && selectedProduct && (selectedProduct.sizeOptions.length === 0 || selectedSizeOption)) ||
              (selectedItemType === "ingredient" && selectedIngredient) ||
              (selectedItemType === "recipe" && selectedRecipe)) && (
              <div className="space-y-4">
                {/* Price and Margin */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetMargin">
                      {isMarkup ? "Markup desejado" : "Margem desejada"}
                      {!isMarkup && (
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                          (máx: {getMaxAchievableMargin()}%)
                        </span>
                      )}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="targetMargin"
                        type="number"
                        value={targetMargin}
                        onChange={(e) => {
                          const newMargin = clampToMaxMargin(Number(e.target.value));
                          setTargetMargin(newMargin);
                          // Auto-update sale price based on margin
                          const effectiveCost = getEffectiveBaseCost();
                          const newPrice = calculateSuggestedPrice(effectiveCost, newMargin);
                          if (newPrice !== null) {
                            setSalePrice(newPrice.toFixed(2));
                          }
                        }}
                        className="w-20"
                        min="0"
                        max={isMarkup ? 99 : getMaxAchievableMargin()}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
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
                        onChange={(e) => {
                          const newPrice = e.target.value;
                          setSalePrice(newPrice);
                          // Auto-update margin based on price
                          const priceNum = parseFloat(newPrice);
                          if (priceNum > 0) {
                            const effectiveCost = getEffectiveBaseCost();
                            const newMargin = calculateMarginFromPrice(effectiveCost, priceNum);
                            if (newMargin !== null) {
                              setTargetMargin(clampToMaxMargin(Math.round(newMargin)));
                            }
                          }
                        }}
                        placeholder="0,00"
                        required
                        className="w-28"
                      />
                    </div>
                  </div>
                  <div />
                </div>

                <p className="text-xs text-muted-foreground">
                  Custo base{selectedSizeOption ? ` (${selectedSizeOption.name})` : ""}: R$ {getEffectiveBaseCost().toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>

                {/* Preview margin */}
                {salePrice && parseFloat(salePrice) > 0 && (
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    {(() => {
                      const preview = calculatePreviewMargin(getEffectiveBaseCost(), parseFloat(salePrice));
                      const roundedPreview = roundMargin(preview.percentage);
                      const roundedTarget = roundMargin(targetMargin);
                      const isMismatch = Math.abs(roundedPreview - roundedTarget) > MARGIN_MISMATCH_THRESHOLD;
                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">{isMarkup ? "Markup resultante:" : "Margem resultante:"}</span>
                            <span className={`font-bold ${preview.percentage >= 0 ? "text-green-600" : "text-red-600"}`}>
                              R$ {preview.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({roundedPreview.toFixed(1)}%)
                            </span>
                          </div>
                          {isMismatch && (
                            <p className="text-xs text-amber-600">
                              ⚠️ {isMarkup ? "Markup desejado" : "Margem desejada"} ({roundedTarget}%) não é possível com as taxas atuais. Ajuste o preço manualmente.
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={loading || !hasSelectedItem() || !!(selectedItemType === "product" && selectedProduct && selectedProduct.sizeOptions.length > 0 && !selectedSizeOption)}
              >
                {loading ? "Adicionando..." : "Adicionar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setSelectedItemType(null);
                  setSelectedProduct(null);
                  setSelectedIngredient(null);
                  setSelectedRecipe(null);
                  setSelectedSizeOption(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {products.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum item no cardápio. Adicione insumos, receitas ou produtos para definir preços de venda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Produto</th>
                  <th className="pb-3 font-medium text-right">Base</th>
                  <th className="pb-3 font-medium text-right">Taxas</th>
                  <th className="pb-3 font-medium text-right">Rateio</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                  <th className="pb-3 font-medium text-right">{isMarkup ? "Markup" : "Margem"}</th>
                  <th className="pb-3 font-medium text-right">Preço</th>
                  <th className="pb-3 font-medium text-right">Lucro</th>
                  <th className="pb-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Array.from(groupedProducts.entries()).map(([productId, items]) => {
                  const isMultiSize = items.length > 1;
                  const isExpanded = expandedProducts.has(productId);
                  const productName = items[0].productName;

                  // For multi-size products, calculate summary
                  const summaryData = isMultiSize ? {
                    minPrice: Math.min(...items.map(i => parseFloat(i.salePrice))),
                    maxPrice: Math.max(...items.map(i => parseFloat(i.salePrice))),
                    avgMargin: items.reduce((sum, i) => sum + parseFloat(i.marginPercentage), 0) / items.length,
                  } : null;

                  // Render single product row
                  const renderProductRow = (item: MenuProduct, isChild = false) => {
                    const salePrice = parseFloat(item.salePrice);
                    let baseCost = parseFloat(item.productBaseCost);
                    if (item.sizeOptionMultiplier) {
                      baseCost = baseCost * parseFloat(item.sizeOptionMultiplier);
                    }
                    const feesCost = calculateFeesCost(salePrice);
                    const fixedCostContrib = getFixedCostApportionment(salePrice);
                    const marginPercentage = parseFloat(item.marginPercentage);

                    return (
                      <tr key={item.id} className={isChild ? "bg-muted/30" : ""}>
                        <td className={`py-3 font-medium ${isChild ? "pl-8" : ""}`}>
                          {!isMultiSize && item.productName}
                          {isChild && (
                            <Badge variant="outline">
                              {item.sizeOptionName}
                            </Badge>
                          )}
                          {!isMultiSize && item.sizeOptionName && (
                            <Badge variant="outline" className="ml-2">
                              {item.sizeOptionName}
                            </Badge>
                          )}
                        </td>
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
                        <td className="py-3 text-right">
                          {(() => {
                            const roundedMargin = Math.round(marginPercentage * 10) / 10;
                            return (
                              <Badge
                                variant={roundedMargin >= defaultTargetMargin ? "default" : roundedMargin >= 0 ? "secondary" : "destructive"}
                                className="font-mono cursor-pointer hover:opacity-80"
                                onClick={() => openEditDialog(item)}
                              >
                                {roundedMargin.toFixed(1)}%
                              </Badge>
                            );
                          })()}
                        </td>
                        <td className="py-3 text-right font-medium">
                          {salePrice.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`py-3 text-right font-medium ${marginPercentage >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {parseFloat(item.marginValue).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                <Button variant="ghost" size="icon" className="text-red-600">
                                  <IconTrash />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover produto</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover &quot;{item.productName}{item.sizeOptionName ? ` (${item.sizeOptionName})` : ""}&quot; do cardápio?
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
                  };

                  // For single products (no sizes or only one size)
                  if (!isMultiSize) {
                    return renderProductRow(items[0]);
                  }

                  // For multi-size products, render collapsible group
                  return (
                    <React.Fragment key={productId}>
                      {/* Parent row - clickable header */}
                      <tr
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleProductExpanded(productId)}
                      >
                        <td className="py-3 font-medium">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <IconChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <IconChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            {productName}
                            <Badge variant="secondary" className="text-xs">
                              {items.length} tamanhos
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 text-right text-muted-foreground" colSpan={7}>
                          {/* Empty - collapsed row doesn't show details */}
                        </td>
                        <td className="py-3 text-right">
                          {(() => {
                            const roundedAvg = Math.round(summaryData!.avgMargin * 10) / 10;
                            return (
                              <Badge
                                variant={roundedAvg >= defaultTargetMargin ? "default" : roundedAvg >= 0 ? "secondary" : "destructive"}
                                className="font-mono"
                              >
                                ~{roundedAvg.toFixed(1)}%
                              </Badge>
                            );
                          })()}
                        </td>
                        <td className="py-3 text-right">
                          {/* No actions on parent row */}
                        </td>
                      </tr>
                      {/* Child rows - only shown when expanded */}
                      {isExpanded && items.map((item) => renderProductRow(item, true))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {/* Legend */}
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex gap-4">
              <span><strong>Base:</strong> Custo do produto</span>
              <span><strong>Taxas:</strong> Taxas e comissões</span>
              <span><strong>Rateio:</strong> Custos fixos rateados</span>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar preço de venda</DialogTitle>
            </DialogHeader>
            {editingProduct && (
              <div className="space-y-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{editingProduct.productName}</span>
                    {editingProduct.sizeOptionName && (
                      <Badge variant="outline">
                        {editingProduct.sizeOptionName}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Custo base: R$ {getEditBaseCost().toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Side by side inputs */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm">
                      {isMarkup ? "Markup" : "Margem"}
                      {!isMarkup && (
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                          (máx: {getMaxAchievableMargin()}%)
                        </span>
                      )}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={editTargetMargin}
                        onChange={(e) => {
                          const newMargin = clampToMaxMargin(Number(e.target.value));
                          setEditTargetMargin(newMargin);
                          const baseCost = getEditBaseCost();
                          const suggestedPrice = calculateSuggestedPrice(baseCost, newMargin);
                          if (suggestedPrice !== null) {
                            setEditPrice(suggestedPrice.toFixed(2));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleEdit();
                          }
                        }}
                        className="w-24"
                        min="0"
                        max={isMarkup ? 999 : getMaxAchievableMargin()}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Preço de venda</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editPrice}
                        onChange={(e) => {
                          const newPrice = e.target.value;
                          setEditPrice(newPrice);
                          if (newPrice && parseFloat(newPrice) > 0) {
                            const baseCost = getEditBaseCost();
                            const newMargin = calculateMarginFromPrice(baseCost, parseFloat(newPrice));
                            if (newMargin !== null) {
                              setEditTargetMargin(clampToMaxMargin(Math.round(newMargin)));
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleEdit();
                          }
                        }}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Price breakdown */}
                {editPrice && parseFloat(editPrice) > 0 && (
                  <div className="p-3 bg-muted rounded-lg space-y-3">
                    {(() => {
                      const price = parseFloat(editPrice);
                      const breakdown = calculatePriceBreakdown(getEditBaseCost(), price);
                      const roundedProfit = roundMargin(breakdown.profitPercentage);
                      const roundedTarget = roundMargin(editTargetMargin);
                      const isMismatch = Math.abs(roundedProfit - roundedTarget) > MARGIN_MISMATCH_THRESHOLD;

                      return (
                        <>
                          <div className="text-xs font-medium text-muted-foreground mb-2">Composição do preço</div>

                          {/* Base cost */}
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Custo base</span>
                            <span>{breakdown.baseCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>

                          {/* Fixed fees */}
                          {breakdown.fixedFeesList.map((fee, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">+ {fee.name} (fixo)</span>
                              <span>{fee.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          ))}

                          {/* Percentage fees */}
                          {breakdown.percentageFeesList.map((fee, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">+ {fee.name} ({fee.percentage}%)</span>
                              <span>{fee.value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          ))}

                          {/* Fixed cost apportionment */}
                          {breakdown.fixedCostApportionment > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                + Rateio custos fixos {breakdown.fixedCostPercentage > 0 ? `(${breakdown.fixedCostPercentage}%)` : ""}
                              </span>
                              <span>{breakdown.fixedCostApportionment.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}

                          {/* Divider */}
                          <div className="border-t border-border my-2" />

                          {/* Total cost */}
                          <div className="flex justify-between text-sm font-medium">
                            <span>= Custo total</span>
                            <span>{breakdown.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>

                          {/* Profit */}
                          <div className="flex justify-between text-sm font-medium">
                            <span className={breakdown.profit >= 0 ? "text-green-600" : "text-red-600"}>
                              {isMarkup ? "Markup resultante:" : "Margem resultante:"}
                            </span>
                            <span className={breakdown.profit >= 0 ? "text-green-600" : "text-red-600"}>
                              {breakdown.profit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({roundedProfit.toFixed(1)}%)
                            </span>
                          </div>

                          {/* Sale price */}
                          <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-2">
                            <span>Preço de venda</span>
                            <span>R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>

                          {isMismatch && (
                            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded mt-2">
                              <p className="text-xs text-amber-600 font-medium">
                                ⚠️ {isMarkup ? "Markup" : "Margem"} desejado ({roundedTarget}%) não corresponde ao preço atual ({roundedProfit.toFixed(1)}%).
                              </p>
                              <p className="text-xs text-amber-600 mt-1">
                                Ajuste a {isMarkup ? "o markup" : "a margem"} para {roundedProfit.toFixed(1)}% ou altere o preço de venda.
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProduct(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleEdit}
                disabled={
                  loading ||
                  !editPrice ||
                  !isMarginAchievable(getEditBaseCost(), parseFloat(editPrice || "0"), editTargetMargin)
                }
              >
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
