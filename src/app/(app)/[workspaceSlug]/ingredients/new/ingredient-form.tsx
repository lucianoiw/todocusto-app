"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createIngredient } from "@/actions/ingredients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  measurementType: "weight" | "volume" | "unit";
  conversionFactor: string;
  isBase: boolean;
}

interface IngredientFormProps {
  workspaceSlug: string;
  categories: Category[];
  units: Unit[];
}

const measurementTypeLabels = {
  weight: "Peso (g, kg)",
  volume: "Líquido (ml, L)",
  unit: "Unidade (un, dz)",
};

export function IngredientForm({ workspaceSlug, categories, units }: IngredientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [measurementType, setMeasurementType] = useState<"weight" | "volume" | "unit" | "">("");
  const [priceUnitId, setPriceUnitId] = useState("");
  const [priceQuantity, setPriceQuantity] = useState("1");

  const filteredUnits = units.filter((u) => u.measurementType === measurementType);
  const selectedUnit = units.find((u) => u.id === priceUnitId);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result = await createIngredient(workspaceSlug, formData);
      if (result.success && result.id) {
        router.push(`/${workspaceSlug}/ingredients/${result.id}`);
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
          placeholder="Ex: Carne Bovina"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Uma breve descrição do insumo"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoryId">Categoria (opcional)</Label>
        <Select name="categoryId">
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  {cat.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                  )}
                  {cat.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="measurementType">Tipo de medida *</Label>
        <Select
          name="measurementType"
          value={measurementType}
          onValueChange={(value: "weight" | "volume" | "unit") => {
            setMeasurementType(value);
            setPriceUnitId("");
          }}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weight">{measurementTypeLabels.weight}</SelectItem>
            <SelectItem value="volume">{measurementTypeLabels.volume}</SelectItem>
            <SelectItem value="unit">{measurementTypeLabels.unit}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {measurementType && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="priceUnitId">Unidade do preço *</Label>
            <Select
              name="priceUnitId"
              value={priceUnitId}
              onValueChange={setPriceUnitId}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {filteredUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name} ({unit.abbreviation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Preço (opcional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="priceQuantity"
                name="priceQuantity"
                type="number"
                step="0.01"
                min="0.01"
                value={priceQuantity}
                onChange={(e) => setPriceQuantity(e.target.value)}
                className="w-24"
                placeholder="100"
              />
              <span className="text-muted-foreground">{selectedUnit?.abbreviation || "un"} por R$</span>
              <Input
                id="averagePrice"
                name="averagePrice"
                type="number"
                step="0.01"
                min="0"
                className="w-32"
                placeholder="0,00"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Ex: 100g por R$ 5,00. Será calculado automaticamente ao adicionar entradas.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="hasVariations"
          name="hasVariations"
          value="true"
          className="rounded"
        />
        <Label htmlFor="hasVariations" className="cursor-pointer">
          Este insumo possui variações (ex: fatiado, ralado)
        </Label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Criando..." : "Criar Insumo"}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/${workspaceSlug}/ingredients`}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
