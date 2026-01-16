import Link from "next/link";
import { redirect } from "next/navigation";
import { getUnits } from "@/actions/units";
import { getCategories } from "@/actions/categories";
import { createRecipe } from "@/actions/recipes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconArrowLeft } from "@tabler/icons-react";

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

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await createRecipe(workspaceSlug, formData);
    if (result.success && result.id) {
      redirect(`/${workspaceSlug}/recipes/${result.id}`);
    }
  }

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
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Maionese caseira"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Uma breve descrição da receita"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Categoria (opcional)</Label>
                <Select name="categoryId">
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
                  placeholder="30"
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
                  placeholder="500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="yieldUnitId">Unidade do rendimento *</Label>
                <Select name="yieldUnitId" required>
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
              <Button type="submit">Criar Receita</Button>
              <Button variant="outline" asChild>
                <Link href={`/${workspaceSlug}/recipes`}>Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
