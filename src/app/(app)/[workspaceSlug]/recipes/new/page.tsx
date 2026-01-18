import Link from "next/link";
import { getUnits } from "@/actions/units";
import { getCategories } from "@/actions/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft } from "@tabler/icons-react";
import { RecipeForm } from "./recipe-form";

interface NewRecipePageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function NewRecipePage({ params }: NewRecipePageProps) {
  const { workspaceSlug } = await params;
  const [unitsResult, categories] = await Promise.all([
    getUnits(workspaceSlug),
    getCategories(workspaceSlug, "recipe"),
  ]);
  const units = unitsResult.all;

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/${workspaceSlug}/recipes`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Voltar para receitas
        </Link>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Nova Receita</CardTitle>
        </CardHeader>
        <CardContent>
          <RecipeForm
            workspaceSlug={workspaceSlug}
            categories={categories}
            units={units}
          />
        </CardContent>
      </Card>
    </div>
  );
}
