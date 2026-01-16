"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createVariation, deleteVariation } from "@/actions/ingredients";
import { getUnits } from "@/actions/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { IconPlus, IconTrash, IconArrowRight, IconLoader2 } from "@tabler/icons-react";

interface Variation {
  id: string;
  name: string;
  yieldPercentage: string;
  unitId: string;
  unitAbbreviation: string | null;
  equivalenceQuantity: string;
  calculatedCost: string;
}

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  measurementType: "weight" | "volume" | "unit";
  conversionFactor: string;
}

interface VariationsSectionProps {
  workspaceSlug: string;
  ingredientId: string;
  variations: Variation[];
  measurementType: "weight" | "volume" | "unit";
  priceUnitAbbreviation: string | null;
  priceUnitConversionFactor: string | null;
}


export function VariationsSection({
  workspaceSlug,
  ingredientId,
  variations,
  measurementType,
  priceUnitAbbreviation,
  priceUnitConversionFactor,
}: VariationsSectionProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);

  // Form state for calculating yield preview
  const [inputQty, setInputQty] = useState("");
  const [inputUnitId, setInputUnitId] = useState("");
  const [outputQty, setOutputQty] = useState("");
  const [outputUnitId, setOutputUnitId] = useState("");

  // Filter units by ingredient's measurementType
  const filteredUnits = useMemo(() =>
    units.filter(u => u.measurementType === measurementType),
    [units, measurementType]
  );

  // Calculate yield percentage preview
  const yieldPreview = useMemo(() => {
    const inputUnit = units.find(u => u.id === inputUnitId);
    const outputUnit = units.find(u => u.id === outputUnitId);

    if (!inputQty || !outputQty || !inputUnit || !outputUnit) return null;

    const inputInBase = parseFloat(inputQty) * parseFloat(inputUnit.conversionFactor);
    const outputInBase = parseFloat(outputQty) * parseFloat(outputUnit.conversionFactor);

    if (inputInBase <= 0) return null;

    const yieldPct = (outputInBase / inputInBase) * 100;
    return yieldPct;
  }, [inputQty, inputUnitId, outputQty, outputUnitId, units]);

  async function loadUnits() {
    if (units.length === 0) {
      const unitsResult = await getUnits(workspaceSlug);
      setUnits(unitsResult.all);
    }
    // Reset form state
    setInputQty("");
    setInputUnitId("");
    setOutputQty("");
    setOutputUnitId("");
    setShowForm(true);
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result = await createVariation(workspaceSlug, ingredientId, formData);
      if (result.success) {
        setShowForm(false);
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(variationId: string) {
    const result = await deleteVariation(workspaceSlug, ingredientId, variationId);
    if (result.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Variações</CardTitle>
        {!showForm && (
          <Button size="sm" onClick={loadUnits}>
            <IconPlus className="w-4 h-4 mr-1" />
            Nova Variação
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <form action={handleSubmit} className="space-y-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da variação *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Moída, Fatiado, Descascado"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Rendimento</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Informe quanto entra e quanto sai após o processamento
              </p>

              <div className="flex items-center gap-2">
                {/* Input */}
                <div className="flex-1">
                  <div className="flex gap-2">
                    <Input
                      name="inputQuantity"
                      type="number"
                      step="0.001"
                      min="0.001"
                      placeholder="1"
                      value={inputQty}
                      onChange={(e) => setInputQty(e.target.value)}
                      required
                      className="w-24"
                    />
                    <input type="hidden" name="inputUnitId" value={inputUnitId} />
                    <Select value={inputUnitId} onValueChange={setInputUnitId} required>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.abbreviation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-xs text-muted-foreground">Entrada</span>
                </div>

                <IconArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />

                {/* Output */}
                <div className="flex-1">
                  <div className="flex gap-2">
                    <Input
                      name="outputQuantity"
                      type="number"
                      step="0.001"
                      min="0.001"
                      placeholder="0.95"
                      value={outputQty}
                      onChange={(e) => setOutputQty(e.target.value)}
                      required
                      className="w-24"
                    />
                    <input type="hidden" name="outputUnitId" value={outputUnitId} />
                    <Select value={outputUnitId} onValueChange={setOutputUnitId} required>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.abbreviation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-xs text-muted-foreground">Saída</span>
                </div>
              </div>

              {/* Yield preview */}
              {yieldPreview !== null && (
                <div className="mt-2 p-2 bg-background rounded border">
                  <span className="text-sm">
                    Aproveitamento: <strong className={yieldPreview > 100 ? "text-amber-600" : "text-green-600"}>
                      {yieldPreview.toFixed(1)}%
                    </strong>
                  </span>
                  {yieldPreview > 100 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Rendimento acima de 100% (ex: hidratação de grãos)
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? (
                  <>
                    <IconLoader2 className="w-4 h-4 mr-1 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowForm(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {!showForm && (
          <p className="text-sm text-muted-foreground mb-4">
            Variações calculam o aproveitamento/desperdício de um insumo (ex: carne desossada, fruta descascada).
            Para preparações completas, use <strong>Receitas</strong>.
          </p>
        )}

        {variations.length === 0 && !showForm ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma variação cadastrada.
          </p>
        ) : variations.length === 0 ? null : (
          <div className="divide-y">
            {variations.map((v) => {
              const yieldPct = parseFloat(v.yieldPercentage);
              return (
                <div key={v.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className={yieldPct > 100 ? "text-amber-600" : yieldPct < 100 ? "text-orange-500" : "text-green-600"}>
                        {yieldPct.toFixed(1)}% aproveitamento
                      </span>
                      {yieldPct > 100 && (
                        <span className="text-xs text-amber-600">(ganho)</span>
                      )}
                      {yieldPct < 100 && (
                        <span className="text-xs text-orange-500">({(100 - yieldPct).toFixed(1)}% perda)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Custo</div>
                      <div className="font-medium">
                        R$ {(parseFloat(v.calculatedCost) * parseFloat(priceUnitConversionFactor || "1")).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{priceUnitAbbreviation || "un"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Base: R$ {parseFloat(v.calculatedCost).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/{measurementType === "weight" ? "g" : measurementType === "volume" ? "ml" : "un"}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <IconTrash className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir variação</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir &quot;{v.name}&quot;?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(v.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
