import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe, getRecipeItems, getRecipeSteps } from "@/actions/recipes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconArrowLeft, IconPencil, IconClock, IconPlus, IconAlertCircle } from "@tabler/icons-react";
import { RecipeItemsSection } from "./items-section";
import { RecipeStepsSection } from "./steps-section";

interface RecipeDetailPageProps {
  params: Promise<{ workspaceSlug: string; recipeId: string }>;
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { workspaceSlug, recipeId } = await params;
  const recipe = await getRecipe(workspaceSlug, recipeId);

  if (!recipe) {
    notFound();
  }

  const [items, steps] = await Promise.all([
    getRecipeItems(recipeId),
    getRecipeSteps(recipeId),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/${workspaceSlug}/recipes`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Voltar para receitas
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/${workspaceSlug}/recipes/${recipeId}/edit`}>
              <IconPencil />
              Editar
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/${workspaceSlug}/recipes/new`}>
              <IconPlus />
              Nova Receita
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{recipe.name}</h1>
                {recipe.description && (
                  <p className="text-muted-foreground mt-1">{recipe.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  {recipe.categoryName && (
                    <Badge variant="secondary">{recipe.categoryName}</Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Rende {parseFloat(recipe.yieldQuantity).toLocaleString("pt-BR")}{" "}
                    {recipe.yieldUnitAbbreviation}
                  </span>
                  {recipe.prepTime && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <IconClock className="w-4 h-4" />
                      {recipe.prepTime} min
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-sm text-muted-foreground">Custo de insumos</div>
                <div className="text-lg font-semibold">
                  R$ {parseFloat(recipe.totalCost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {parseFloat(recipe.laborCost) > 0 && (
                  <>
                    <div className="text-sm text-muted-foreground">
                      Mão de obra ({recipe.prepTime || 0} min)
                    </div>
                    <div className="text-lg font-semibold">
                      R$ {parseFloat(recipe.laborCost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </>
                )}
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">Custo total</div>
                  <div className="text-2xl font-bold">
                    R$ {(parseFloat(recipe.totalCost) + parseFloat(recipe.laborCost)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    R$ {parseFloat(recipe.costPerPortion).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por{" "}
                    {recipe.yieldUnitAbbreviation}
                  </div>
                </div>
              </div>
            </div>
            {!recipe.hasLaborCostConfigured && (recipe.prepTime || (recipe.totalTime && recipe.totalTime > 0)) && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <IconAlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                  <p>
                    Configure o{" "}
                    <Link href={`/${workspaceSlug}/settings`} className="text-primary hover:underline">
                      custo de mão de obra
                    </Link>{" "}
                    nas configurações para incluir o tempo de preparo no custo total.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items */}
        <RecipeItemsSection
          workspaceSlug={workspaceSlug}
          recipeId={recipeId}
          items={items}
        />

        {/* Steps */}
        <RecipeStepsSection
          workspaceSlug={workspaceSlug}
          recipeId={recipeId}
          steps={steps}
        />
      </div>
    </div>
  );
}
