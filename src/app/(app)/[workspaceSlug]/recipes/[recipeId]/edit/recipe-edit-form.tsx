"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateRecipe } from "@/actions/recipes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CategorySelect } from "@/components/category-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconLoader2, IconHelpCircle } from "@tabler/icons-react";

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
}

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  prepTime: number | null;
  yieldQuantity: string;
  yieldUnitId: string;
  availableForSale: boolean;
}

interface RecipeEditFormProps {
  workspaceSlug: string;
  recipeId: string;
  recipe: Recipe;
  categories: Category[];
  units: Unit[];
}

export function RecipeEditForm({
  workspaceSlug,
  recipeId,
  recipe,
  categories,
  units,
}: RecipeEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(recipe.categoryId);
  const [availableForSale, setAvailableForSale] = useState(recipe.availableForSale);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result = await updateRecipe(workspaceSlug, recipeId, formData);
      if (result.success) {
        router.push(`/${workspaceSlug}/recipes/${recipeId}`);
      } else if (result.error) {
        alert(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
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
          <Label>Categoria (opcional)</Label>
          <CategorySelect
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
          />
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

      <TooltipProvider>
        <div className="flex items-center space-x-2 pt-2">
          <Switch
            id="availableForSale"
            checked={availableForSale}
            onCheckedChange={setAvailableForSale}
          />
          <input type="hidden" name="availableForSale" value={availableForSale ? "true" : "false"} />
          <Label htmlFor="availableForSale" className="cursor-pointer">
            Disponível para venda no cardápio
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <IconHelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Permite adicionar esta receita diretamente aos cardápios</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Alterações"
          )}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/${workspaceSlug}/recipes/${recipeId}`}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
