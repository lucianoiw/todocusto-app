"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createRecipe } from "@/actions/recipes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CategorySelect } from "@/components/category-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconLoader2, IconHelpCircle } from "@tabler/icons-react";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface RecipeFormProps {
  workspaceSlug: string;
  categories: Category[];
  units: Unit[];
}

export function RecipeForm({ workspaceSlug, categories, units }: RecipeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [availableForSale, setAvailableForSale] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result = await createRecipe(workspaceSlug, formData);
      if (result.success && result.id) {
        router.push(`/${workspaceSlug}/recipes/${result.id}`);
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

      <TooltipProvider>
        <div className="flex items-center space-x-2">
          <Switch
            id="availableForSale"
            checked={availableForSale}
            onCheckedChange={setAvailableForSale}
          />
          <Label htmlFor="availableForSale" className="cursor-pointer">
            Disponível para venda em cardápios
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <IconHelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Permite adicionar esta receita diretamente aos cardápios (ex: molho especial vendido separadamente)</p>
            </TooltipContent>
          </Tooltip>
          <input type="hidden" name="availableForSale" value={availableForSale ? "true" : "false"} />
        </div>
      </TooltipProvider>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
              Criando...
            </>
          ) : (
            "Criar Receita"
          )}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/${workspaceSlug}/recipes`}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
