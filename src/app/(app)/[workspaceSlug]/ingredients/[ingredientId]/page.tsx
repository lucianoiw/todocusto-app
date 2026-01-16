import Link from "next/link";
import { notFound } from "next/navigation";
import { getIngredient, getVariations, getEntries } from "@/actions/ingredients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconArrowLeft, IconPencil, IconPlus } from "@tabler/icons-react";
import { VariationsSection } from "./variations-section";
import { EntriesSection } from "./entries-section";

interface IngredientDetailPageProps {
  params: Promise<{ workspaceSlug: string; ingredientId: string }>;
}

export default async function IngredientDetailPage({
  params,
}: IngredientDetailPageProps) {
  const { workspaceSlug, ingredientId } = await params;
  const ingredient = await getIngredient(workspaceSlug, ingredientId);

  if (!ingredient) {
    notFound();
  }

  const [variations, entries] = await Promise.all([
    ingredient.hasVariations ? getVariations(ingredientId) : Promise.resolve([]),
    getEntries(ingredientId),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/${workspaceSlug}/ingredients`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Voltar para insumos
        </Link>
        <Button variant="outline" asChild>
          <Link href={`/${workspaceSlug}/ingredients/${ingredientId}/edit`}>
            <IconPencil className="w-4 h-4 mr-2" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{ingredient.name}</h1>
                {ingredient.description && (
                  <p className="text-muted-foreground mt-1">{ingredient.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  {ingredient.categoryName && (
                    <Badge variant="secondary">{ingredient.categoryName}</Badge>
                  )}
                  {ingredient.hasVariations && (
                    <Badge>Com variações</Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Preço médio</div>
                <div className="text-2xl font-bold">
                  R$ {parseFloat(ingredient.averagePrice).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  por {ingredient.priceUnitAbbreviation}
                  {ingredient.averagePriceManual && (
                    <span className="ml-1">(manual)</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Custo base: R$ {parseFloat(ingredient.baseCostPerUnit).toFixed(4)}/
                  {ingredient.measurementType === "weight" ? "g" : ingredient.measurementType === "volume" ? "ml" : "un"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variations */}
        {ingredient.hasVariations && (
          <VariationsSection
            workspaceSlug={workspaceSlug}
            ingredientId={ingredientId}
            variations={variations}
            measurementType={ingredient.measurementType}
          />
        )}

        {/* Entries */}
        <EntriesSection
          workspaceSlug={workspaceSlug}
          ingredientId={ingredientId}
          entries={entries}
          measurementType={ingredient.measurementType}
        />
      </div>
    </div>
  );
}
