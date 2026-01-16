"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createEntry, deleteEntry } from "@/actions/ingredients";
import { getUnits } from "@/actions/units";
import { getSuppliersList, quickCreateSupplier } from "@/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { IconPlus, IconTrash, IconLoader2 } from "@tabler/icons-react";

interface Entry {
  id: string;
  date: string;
  quantity: string;
  unitId: string;
  unitAbbreviation: string | null;
  unitConversionFactor: string | null;
  unitPrice: string;
  totalPrice: string;
  supplierId: string | null;
  supplierName: string | null;
  observation: string | null;
}

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  measurementType: "weight" | "volume" | "unit";
  conversionFactor: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface EntriesSectionProps {
  workspaceSlug: string;
  ingredientId: string;
  entries: Entry[];
  measurementType: "weight" | "volume" | "unit";
  currentAveragePrice: string;
  priceUnitAbbreviation: string | null;
  priceUnitConversionFactor: string | null;
}

export function EntriesSection({
  workspaceSlug,
  ingredientId,
  entries,
  measurementType,
  currentAveragePrice,
  priceUnitAbbreviation,
  priceUnitConversionFactor,
}: EntriesSectionProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Form state
  const [unitId, setUnitId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [updateAveragePrice, setUpdateAveragePrice] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [showNewSupplierInput, setShowNewSupplierInput] = useState(false);
  const supplierInputRef = useRef<HTMLInputElement>(null);

  // Form values for price preview
  const [formQuantity, setFormQuantity] = useState("");
  const [formPrice, setFormPrice] = useState("");

  // Auto-focus on new supplier input
  useEffect(() => {
    if (showNewSupplierInput) {
      supplierInputRef.current?.focus();
    }
  }, [showNewSupplierInput]);

  // Calculate new average price preview
  const pricePreview = useMemo(() => {
    const selectedUnit = units.find((u) => u.id === unitId);
    const qty = parseFloat(formQuantity);
    const price = parseFloat(formPrice);
    const priceUnitFactor = parseFloat(priceUnitConversionFactor || "1");

    if (!selectedUnit || !qty || !price || qty <= 0 || price <= 0) {
      return null;
    }

    // Calculate total cost and quantity in base units from existing entries
    let existingTotalCost = 0;
    let existingTotalQtyInBase = 0;

    for (const entry of entries) {
      existingTotalCost += parseFloat(entry.totalPrice);
      const entryConversion = parseFloat(entry.unitConversionFactor || "1");
      existingTotalQtyInBase += parseFloat(entry.quantity) * entryConversion;
    }

    // Calculate new entry in base units
    const selectedUnitFactor = parseFloat(selectedUnit.conversionFactor);
    const newQtyInBase = qty * selectedUnitFactor;
    const newTotalCost = price; // price is already the total paid

    // Total values with new entry
    const totalCost = existingTotalCost + newTotalCost;
    const totalQtyInBase = existingTotalQtyInBase + newQtyInBase;

    // Calculate average price per price unit
    const totalQtyInPriceUnit = totalQtyInBase / priceUnitFactor;
    const newAveragePrice = totalQtyInPriceUnit > 0 ? totalCost / totalQtyInPriceUnit : 0;

    const currentPrice = parseFloat(currentAveragePrice);
    const diff = newAveragePrice - currentPrice;
    const percentChange = currentPrice > 0 ? (diff / currentPrice) * 100 : 0;

    return {
      newAveragePrice,
      diff,
      percentChange,
    };
  }, [entries, unitId, formQuantity, formPrice, units, priceUnitConversionFactor, currentAveragePrice]);

  // Filter units by ingredient's measurementType
  const filteredUnits = useMemo(
    () => units.filter((u) => u.measurementType === measurementType),
    [units, measurementType]
  );

  async function loadData() {
    const [unitsResult, loadedSuppliers] = await Promise.all([
      getUnits(workspaceSlug),
      getSuppliersList(workspaceSlug),
    ]);
    setUnits(unitsResult.all);
    setSuppliers(loadedSuppliers);

    // Reset form state
    setUnitId("");
    setSupplierId("");
    setUpdateAveragePrice(false);
    setNewSupplierName("");
    setShowNewSupplierInput(false);
    setFormQuantity("");
    setFormPrice("");
    setShowForm(true);
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      // If creating new supplier
      if (showNewSupplierInput && newSupplierName.trim()) {
        const result = await quickCreateSupplier(workspaceSlug, newSupplierName);
        if (result.success && result.id) {
          formData.set("supplierId", result.id);
        }
      }

      const result = await createEntry(workspaceSlug, ingredientId, formData);
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

  async function handleDelete(entryId: string) {
    const result = await deleteEntry(workspaceSlug, ingredientId, entryId);
    if (result.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Entradas (Compras)</CardTitle>
        {!showForm && (
          <Button size="sm" onClick={loadData}>
            <IconPlus className="w-4 h-4 mr-1" />
            Nova Entrada
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <form
            action={handleSubmit}
            className="space-y-4 mb-6 p-4 bg-muted/50 rounded-lg"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={today}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Fornecedor (opcional)</Label>
                {!showNewSupplierInput ? (
                  <div className="flex gap-2">
                    <input type="hidden" name="supplierId" value={supplierId} />
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowNewSupplierInput(true)}
                      title="Novo fornecedor"
                    >
                      <IconPlus className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      ref={supplierInputRef}
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      placeholder="Nome do fornecedor"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNewSupplierInput(false);
                        setNewSupplierName("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  placeholder="1"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade *</Label>
                <input type="hidden" name="unitId" value={unitId} />
                <Select value={unitId} onValueChange={setUnitId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredUnits.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.abbreviation} ({u.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Custo Total (R$) *</Label>
                <Input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Valor total pago pela quantidade informada
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observation">Observação (opcional)</Label>
              <Input
                id="observation"
                name="observation"
                placeholder="Alguma observação"
              />
            </div>

            {/* Price Preview & Average Price Option */}
            <div className="p-3 bg-background rounded border space-y-3">
              {pricePreview && (
                <div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Novo custo médio: </span>
                    <span className="font-medium">
                      R$ {pricePreview.newAveragePrice.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{priceUnitAbbreviation}
                    </span>
                    {pricePreview.diff !== 0 && (
                      <span
                        className={`ml-2 ${
                          pricePreview.diff > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        ({pricePreview.diff > 0 ? "+" : ""}
                        {pricePreview.percentChange.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Custo atual: R$ {parseFloat(currentAveragePrice).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{priceUnitAbbreviation}
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <input
                  type="hidden"
                  name="updateAveragePrice"
                  value={updateAveragePrice ? "true" : "false"}
                />
                <Checkbox
                  id="updateAveragePrice"
                  checked={updateAveragePrice}
                  onCheckedChange={(checked) =>
                    setUpdateAveragePrice(checked === true)
                  }
                />
                <label
                  htmlFor="updateAveragePrice"
                  className="text-sm cursor-pointer"
                >
                  Usar este custo como novo custo médio (substitui o cálculo automático)
                </label>
              </div>
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
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma entrada cadastrada. Adicione compras para calcular o custo
            médio automaticamente.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Data</th>
                  <th className="text-right py-2 px-4 font-medium">Qtd</th>
                  <th className="text-right py-2 px-4 font-medium">Custo Unit.</th>
                  <th className="text-right py-2 px-4 font-medium">Total</th>
                  <th className="text-left py-2 px-4 font-medium">Fornecedor</th>
                  <th className="py-2 pl-4"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b">
                    <td className="py-2 pr-4">
                      {new Date(entry.date + "T00:00:00").toLocaleDateString(
                        "pt-BR"
                      )}
                    </td>
                    <td className="py-2 px-4 text-right">
                      {parseFloat(entry.quantity).toLocaleString("pt-BR")}{" "}
                      {entry.unitAbbreviation}
                    </td>
                    <td className="py-2 px-4 text-right">
                      R$ {parseFloat(entry.unitPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/
                      {entry.unitAbbreviation}
                    </td>
                    <td className="py-2 px-4 text-right font-medium">
                      R$ {parseFloat(entry.totalPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-4 text-muted-foreground">
                      {entry.supplierName || "-"}
                    </td>
                    <td className="py-2 pl-4 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                          >
                            <IconTrash className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir entrada</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir esta entrada? O
                              custo médio será recalculado.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(entry.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
