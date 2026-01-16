import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getRecipe, updateRecipe, deleteRecipe } from "@/actions/recipes";
import { getUnits } from "@/actions/units";
import { getCategories } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconArrowLeft } from "@tabler/icons-react";
import { DeleteRecipeButton } from "./delete-button";

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

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await updateRecipe(workspaceSlug, recipeId, formData);
    if (result.success) {
      redirect(`/${workspaceSlug}/recipes/${recipeId}`);
    }
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
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={recipe.name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={recipe.description || ""}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Categoria (opcional)</Label>
                <Select name="categoryId" defaultValue={recipe.categoryId || undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prepTime">Tempo de preparo (min)</Label>
                <Input
                  id="prepTime"
                  name="prepTime"
                  type="number"
                  min="1"
                  defaultValue={recipe.prepTime || ""}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yieldQuantity">Rendimento *</Label>
                <Input
                  id="yieldQuantity"
                  name="yieldQuantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={recipe.yieldQuantity}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="yieldUnitId">Unidade do rendimento *</Label>
                <Select name="yieldUnitId" defaultValue={recipe.yieldUnitId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name} ({unit.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit">Salvar Alterações</Button>
              <Button variant="outline" asChild>
                <Link href={`/${workspaceSlug}/recipes/${recipeId}`}>Cancelar</Link>
              </Button>
            </div>
          </form>

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
