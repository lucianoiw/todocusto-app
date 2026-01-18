"use server";

import { db } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import {
  ingredient,
  ingredientVariation,
  recipe,
  recipeItem,
  product,
  productComposition,
  menuProduct,
  menu,
  unit,
  category,
  sizeOption,
} from "@/lib/db/schema";
import { getWorkspaceBySlug } from "./workspace";

export interface SimulationResult {
  ingredient: {
    id: string;
    name: string;
    currentPrice: number;
    newPrice: number;
    priceUnit: string;
    currentBaseCost: number;
    newBaseCost: number;
  };
  affectedVariations: {
    id: string;
    name: string;
    currentCost: number;
    newCost: number;
    difference: number;
    percentageChange: number;
  }[];
  affectedRecipes: {
    id: string;
    name: string;
    categoryName: string | null;
    currentCost: number;
    newCost: number;
    difference: number;
    percentageChange: number;
  }[];
  affectedProducts: {
    id: string;
    name: string;
    categoryName: string | null;
    currentCost: number;
    newCost: number;
    difference: number;
    percentageChange: number;
  }[];
  affectedMenuProducts: {
    id: string;
    productName: string;
    sizeOptionName: string | null;
    categoryName: string | null;
    menuName: string;
    salePrice: number;
    currentCost: number;
    newCost: number;
    currentMargin: number;
    newMargin: number;
    currentMarginPercentage: number;
    newMarginPercentage: number;
    suggestedPrice: number;
    priceIncrease: number;
  }[];
  summary: {
    totalVariationsAffected: number;
    totalRecipesAffected: number;
    totalProductsAffected: number;
    totalMenuProductsAffected: number;
    averageCostIncrease: number;
    productsWithNegativeMargin: number;
  };
}

export async function getIngredientsForSimulation(workspaceSlug: string) {
  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) return [];

  const ingredients = await db
    .select({
      id: ingredient.id,
      name: ingredient.name,
      averagePrice: ingredient.averagePrice,
      baseCostPerUnit: ingredient.baseCostPerUnit,
      priceUnitName: unit.name,
      priceUnitAbbreviation: unit.abbreviation,
    })
    .from(ingredient)
    .leftJoin(unit, eq(ingredient.priceUnitId, unit.id))
    .where(eq(ingredient.workspaceId, workspace.id))
    .orderBy(ingredient.name);

  return ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    averagePrice: parseFloat(i.averagePrice || "0"),
    baseCostPerUnit: parseFloat(i.baseCostPerUnit || "0"),
    priceUnit: i.priceUnitAbbreviation || i.priceUnitName || "",
  }));
}

export async function simulatePriceChange(
  workspaceSlug: string,
  ingredientId: string,
  newPrice: number
): Promise<SimulationResult | { error: string }> {
  const workspace = await getWorkspaceBySlug(workspaceSlug);
  if (!workspace) return { error: "Workspace não encontrado" };

  // Get ingredient with unit info
  const [ingredientData] = await db
    .select({
      id: ingredient.id,
      name: ingredient.name,
      averagePrice: ingredient.averagePrice,
      baseCostPerUnit: ingredient.baseCostPerUnit,
      priceUnitId: ingredient.priceUnitId,
      priceUnitName: unit.name,
      priceUnitAbbreviation: unit.abbreviation,
      conversionFactor: unit.conversionFactor,
      categoryName: category.name,
    })
    .from(ingredient)
    .leftJoin(unit, eq(ingredient.priceUnitId, unit.id))
    .leftJoin(category, eq(ingredient.categoryId, category.id))
    .where(
      and(eq(ingredient.id, ingredientId), eq(ingredient.workspaceId, workspace.id))
    );

  if (!ingredientData) return { error: "Ingrediente não encontrado" };

  const currentPrice = parseFloat(ingredientData.averagePrice || "0");
  const currentBaseCost = parseFloat(ingredientData.baseCostPerUnit || "0");
  const conversionFactor = parseFloat(ingredientData.conversionFactor || "1");

  // Calculate new base cost
  const newBaseCost = newPrice / conversionFactor;
  const priceRatio = currentBaseCost > 0 ? newBaseCost / currentBaseCost : 1;

  // 1. Get affected variations
  const variations = await db
    .select({
      id: ingredientVariation.id,
      name: ingredientVariation.name,
      calculatedCost: ingredientVariation.calculatedCost,
    })
    .from(ingredientVariation)
    .where(eq(ingredientVariation.ingredientId, ingredientId));

  const affectedVariations = variations.map((v) => {
    const currentCost = parseFloat(v.calculatedCost || "0");
    const newCost = currentCost * priceRatio;
    return {
      id: v.id,
      name: v.name,
      currentCost,
      newCost,
      difference: newCost - currentCost,
      percentageChange: currentCost > 0 ? ((newCost - currentCost) / currentCost) * 100 : 0,
    };
  });

  // 2. Get affected recipes (that use this ingredient or its variations)
  const variationIds = variations.map((v) => v.id);
  const itemIds = [ingredientId, ...variationIds];

  const recipeItems = await db
    .select({
      recipeId: recipeItem.recipeId,
      type: recipeItem.type,
      itemId: recipeItem.itemId,
      calculatedCost: recipeItem.calculatedCost,
    })
    .from(recipeItem)
    .where(inArray(recipeItem.itemId, itemIds));

  const affectedRecipeIds = [...new Set(recipeItems.map((ri) => ri.recipeId))];

  let affectedRecipes: SimulationResult["affectedRecipes"] = [];
  if (affectedRecipeIds.length > 0) {
    const recipes = await db
      .select({
        id: recipe.id,
        name: recipe.name,
        totalCost: recipe.totalCost,
        categoryName: category.name,
      })
      .from(recipe)
      .leftJoin(category, eq(recipe.categoryId, category.id))
      .where(inArray(recipe.id, affectedRecipeIds));

    // Calculate new recipe costs
    for (const r of recipes) {
      const currentCost = parseFloat(r.totalCost || "0");

      // Get all items for this recipe that are affected
      const affectedItems = recipeItems.filter((ri) => ri.recipeId === r.id);
      let costDifference = 0;

      for (const item of affectedItems) {
        const itemCurrentCost = parseFloat(item.calculatedCost || "0");
        const itemNewCost = itemCurrentCost * priceRatio;
        costDifference += itemNewCost - itemCurrentCost;
      }

      const newCost = currentCost + costDifference;

      affectedRecipes.push({
        id: r.id,
        name: r.name,
        categoryName: r.categoryName,
        currentCost,
        newCost,
        difference: costDifference,
        percentageChange: currentCost > 0 ? (costDifference / currentCost) * 100 : 0,
      });
    }
  }

  // 3. Get affected products (that use ingredient, variations, or affected recipes)
  const allItemIds = [...itemIds, ...affectedRecipeIds];

  const productItems = await db
    .select({
      productId: productComposition.productId,
      type: productComposition.type,
      itemId: productComposition.itemId,
      calculatedCost: productComposition.calculatedCost,
    })
    .from(productComposition)
    .where(inArray(productComposition.itemId, allItemIds));

  const affectedProductIds = [...new Set(productItems.map((pi) => pi.productId))];

  let affectedProducts: SimulationResult["affectedProducts"] = [];
  if (affectedProductIds.length > 0) {
    const products = await db
      .select({
        id: product.id,
        name: product.name,
        baseCost: product.baseCost,
        categoryName: category.name,
      })
      .from(product)
      .leftJoin(category, eq(product.categoryId, category.id))
      .where(inArray(product.id, affectedProductIds));

    for (const p of products) {
      const currentCost = parseFloat(p.baseCost || "0");

      const affectedItems = productItems.filter((pi) => pi.productId === p.id);
      let costDifference = 0;

      for (const item of affectedItems) {
        const itemCurrentCost = parseFloat(item.calculatedCost || "0");
        // For recipes, use the recipe's percentage change
        if (item.type === "recipe") {
          const affectedRecipe = affectedRecipes.find((r) => r.id === item.itemId);
          if (affectedRecipe && affectedRecipe.currentCost > 0) {
            const recipeRatio = affectedRecipe.newCost / affectedRecipe.currentCost;
            costDifference += itemCurrentCost * (recipeRatio - 1);
          }
        } else {
          costDifference += itemCurrentCost * (priceRatio - 1);
        }
      }

      const newCost = currentCost + costDifference;

      affectedProducts.push({
        id: p.id,
        name: p.name,
        categoryName: p.categoryName,
        currentCost,
        newCost,
        difference: costDifference,
        percentageChange: currentCost > 0 ? (costDifference / currentCost) * 100 : 0,
      });
    }
  }

  // 4. Get affected menu products
  let affectedMenuProducts: SimulationResult["affectedMenuProducts"] = [];

  // 4a. Check for direct ingredient usage in menus
  const directIngredientMenuItems = await db
    .select({
      id: menuProduct.id,
      itemId: menuProduct.itemId,
      salePrice: menuProduct.salePrice,
      totalCost: menuProduct.totalCost,
      marginValue: menuProduct.marginValue,
      marginPercentage: menuProduct.marginPercentage,
      menuId: menuProduct.menuId,
      menuName: menu.name,
    })
    .from(menuProduct)
    .innerJoin(menu, eq(menuProduct.menuId, menu.id))
    .where(
      and(
        eq(menuProduct.itemType, "ingredient"),
        eq(menuProduct.itemId, ingredientId)
      )
    );

  for (const mp of directIngredientMenuItems) {
    const salePrice = parseFloat(mp.salePrice || "0");
    const currentCost = parseFloat(mp.totalCost || "0");
    const newCost = currentCost * priceRatio;

    const currentMargin = salePrice - currentCost;
    const newMargin = salePrice - newCost;
    const currentMarginPercentage = salePrice > 0 ? (currentMargin / salePrice) * 100 : 0;
    const newMarginPercentage = salePrice > 0 ? (newMargin / salePrice) * 100 : 0;

    const marginDecimal = currentMarginPercentage / 100;
    const suggestedPrice = marginDecimal > 0 && marginDecimal < 1
      ? newCost / (1 - marginDecimal)
      : newCost * 1.3;
    const priceIncrease = Math.max(0, suggestedPrice - salePrice);

    affectedMenuProducts.push({
      id: mp.id,
      productName: ingredientData.name,
      sizeOptionName: null,
      categoryName: ingredientData.categoryName,
      menuName: mp.menuName,
      salePrice,
      currentCost,
      newCost,
      currentMargin,
      newMargin,
      currentMarginPercentage,
      newMarginPercentage,
      suggestedPrice,
      priceIncrease,
    });
  }

  // 4b. Check for direct recipe usage in menus
  if (affectedRecipeIds.length > 0) {
    const directRecipeMenuItems = await db
      .select({
        id: menuProduct.id,
        itemId: menuProduct.itemId,
        salePrice: menuProduct.salePrice,
        totalCost: menuProduct.totalCost,
        marginValue: menuProduct.marginValue,
        marginPercentage: menuProduct.marginPercentage,
        menuId: menuProduct.menuId,
        menuName: menu.name,
        recipeName: recipe.name,
      })
      .from(menuProduct)
      .innerJoin(menu, eq(menuProduct.menuId, menu.id))
      .innerJoin(recipe, eq(menuProduct.itemId, recipe.id))
      .where(
        and(
          eq(menuProduct.itemType, "recipe"),
          inArray(menuProduct.itemId, affectedRecipeIds)
        )
      );

    for (const mp of directRecipeMenuItems) {
      const affectedRecipe = affectedRecipes.find((r) => r.id === mp.itemId);
      if (!affectedRecipe) continue;

      const salePrice = parseFloat(mp.salePrice || "0");
      const currentCost = parseFloat(mp.totalCost || "0");

      const costRatio = affectedRecipe.currentCost > 0
        ? affectedRecipe.newCost / affectedRecipe.currentCost
        : 1;
      const newCost = currentCost * costRatio;

      const currentMargin = salePrice - currentCost;
      const newMargin = salePrice - newCost;
      const currentMarginPercentage = salePrice > 0 ? (currentMargin / salePrice) * 100 : 0;
      const newMarginPercentage = salePrice > 0 ? (newMargin / salePrice) * 100 : 0;

      const marginDecimal = currentMarginPercentage / 100;
      const suggestedPrice = marginDecimal > 0 && marginDecimal < 1
        ? newCost / (1 - marginDecimal)
        : newCost * 1.3;
      const priceIncrease = Math.max(0, suggestedPrice - salePrice);

      affectedMenuProducts.push({
        id: mp.id,
        productName: mp.recipeName,
        sizeOptionName: null,
        categoryName: affectedRecipe.categoryName,
        menuName: mp.menuName,
        salePrice,
        currentCost,
        newCost,
        currentMargin,
        newMargin,
        currentMarginPercentage,
        newMarginPercentage,
        suggestedPrice,
        priceIncrease,
      });
    }
  }

  // 4c. Check for product-based menu items
  if (affectedProductIds.length > 0) {
    const menuProducts = await db
      .select({
        id: menuProduct.id,
        itemId: menuProduct.itemId,
        salePrice: menuProduct.salePrice,
        totalCost: menuProduct.totalCost,
        marginValue: menuProduct.marginValue,
        marginPercentage: menuProduct.marginPercentage,
        productName: product.name,
        menuId: menuProduct.menuId,
        menuName: menu.name,
        sizeOptionName: sizeOption.name,
      })
      .from(menuProduct)
      .innerJoin(product, eq(menuProduct.itemId, product.id))
      .innerJoin(menu, eq(menuProduct.menuId, menu.id))
      .leftJoin(sizeOption, eq(menuProduct.sizeOptionId, sizeOption.id))
      .where(and(
        eq(menuProduct.itemType, "product"),
        inArray(menuProduct.itemId, affectedProductIds)
      ));

    for (const mp of menuProducts) {
      const affectedProduct = affectedProducts.find((p) => p.id === mp.itemId);
      if (!affectedProduct) continue;

      const salePrice = parseFloat(mp.salePrice || "0");
      const currentCost = parseFloat(mp.totalCost || "0");

      // Calculate new cost proportionally
      const costRatio = affectedProduct.currentCost > 0
        ? affectedProduct.newCost / affectedProduct.currentCost
        : 1;
      const newCost = currentCost * costRatio;

      const currentMargin = salePrice - currentCost;
      const newMargin = salePrice - newCost;
      const currentMarginPercentage = salePrice > 0 ? (currentMargin / salePrice) * 100 : 0;
      const newMarginPercentage = salePrice > 0 ? (newMargin / salePrice) * 100 : 0;

      // Calculate suggested price to maintain current margin percentage
      // If margin% = (price - cost) / price, then price = cost / (1 - margin%)
      const marginDecimal = currentMarginPercentage / 100;
      const suggestedPrice = marginDecimal > 0 && marginDecimal < 1
        ? newCost / (1 - marginDecimal)
        : newCost * 1.3; // Default 30% margin if no valid margin
      const priceIncrease = Math.max(0, suggestedPrice - salePrice);

      affectedMenuProducts.push({
        id: mp.id,
        productName: mp.productName,
        sizeOptionName: mp.sizeOptionName,
        categoryName: affectedProduct.categoryName,
        menuName: mp.menuName,
        salePrice,
        currentCost,
        newCost,
        currentMargin,
        newMargin,
        currentMarginPercentage,
        newMarginPercentage,
        suggestedPrice,
        priceIncrease,
      });
    }
  }

  // Calculate summary
  const allCostChanges = [
    ...affectedVariations.map((v) => v.percentageChange),
    ...affectedRecipes.map((r) => r.percentageChange),
    ...affectedProducts.map((p) => p.percentageChange),
  ];

  const averageCostIncrease =
    allCostChanges.length > 0
      ? allCostChanges.reduce((a, b) => a + b, 0) / allCostChanges.length
      : 0;

  const productsWithNegativeMargin = affectedMenuProducts.filter(
    (mp) => mp.newMargin < 0
  ).length;

  return {
    ingredient: {
      id: ingredientData.id,
      name: ingredientData.name,
      currentPrice,
      newPrice,
      priceUnit: ingredientData.priceUnitAbbreviation || ingredientData.priceUnitName || "",
      currentBaseCost,
      newBaseCost,
    },
    affectedVariations,
    affectedRecipes,
    affectedProducts,
    affectedMenuProducts,
    summary: {
      totalVariationsAffected: affectedVariations.length,
      totalRecipesAffected: affectedRecipes.length,
      totalProductsAffected: affectedProducts.length,
      totalMenuProductsAffected: affectedMenuProducts.length,
      averageCostIncrease,
      productsWithNegativeMargin,
    },
  };
}
