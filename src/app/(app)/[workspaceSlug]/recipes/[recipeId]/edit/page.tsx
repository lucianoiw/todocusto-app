import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe } from "@/actions/recipes";
import { getUnits } from "@/actions/units";
import { getCategories } from "@/actions/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft } from "@tabler/icons-react";
import { DeleteRecipeButton } from "./delete-button";
import { RecipeEditForm } from "./recipe-edit-form";

interface EditRecipePageProps {
  params: Promise<{ workspaceSlug: string; recipeId: string }>;
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const { workspaceSlug, recipeId } = await params;

  const [recipe, unitsResult, categories] = await Promise.all([
    getRecipe(workspaceSlug, recipeId),
    getUnits(workspaceSlug),
    getCategories(workspaceSlug, "recipe"),
  ]);
  const units = unitsResult.all;

  if (!recipe) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/${workspaceSlug}/recipes/${recipeId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Voltar para {recipe.name}
        </Link>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Editar Receita</CardTitle>
        </CardHeader>
        <CardContent>
          <RecipeEditForm
            workspaceSlug={workspaceSlug}
            recipeId={recipeId}
            recipe={recipe}
            categories={categories}
            units={units}
          />

          <div className="mt-8 pt-6 border-t">
            <h3 className="text-sm font-medium text-red-600 mb-2">Zona de perigo</h3>
            <DeleteRecipeButton
              workspaceSlug={workspaceSlug}
              recipeId={recipeId}
              recipeName={recipe.name}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
