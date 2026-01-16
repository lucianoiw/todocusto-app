import Link from "next/link";
import { notFound } from "next/navigation";
import { getIngredient } from "@/actions/ingredients";
import { getUnits } from "@/actions/units";
import { getCategories } from "@/actions/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft } from "@tabler/icons-react";
import { DeleteIngredientButton } from "./delete-button";
import { EditIngredientForm } from "./edit-ingredient-form";

interface EditIngredientPageProps {
  params: Promise<{ workspaceSlug: string; ingredientId: string }>;
}

export default async function EditIngredientPage({ params }: EditIngredientPageProps) {
  const { workspaceSlug, ingredientId } = await params;

  const [ingredient, unitsResult, categories] = await Promise.all([
    getIngredient(workspaceSlug, ingredientId),
    getUnits(workspaceSlug),
    getCategories(workspaceSlug, "ingredient"),
  ]);
  const units = unitsResult.all;

  if (!ingredient) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/${workspaceSlug}/ingredients/${ingredientId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Voltar para {ingredient.name}
        </Link>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Editar Insumo</CardTitle>
        </CardHeader>
        <CardContent>
          <EditIngredientForm
            workspaceSlug={workspaceSlug}
            ingredientId={ingredientId}
            ingredient={ingredient}
            categories={categories}
            units={units}
          />

          <div className="mt-8 pt-6 border-t">
            <h3 className="text-sm font-medium text-red-600 mb-2">Zona de perigo</h3>
            <DeleteIngredientButton
              workspaceSlug={workspaceSlug}
              ingredientId={ingredientId}
              ingredientName={ingredient.name}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
