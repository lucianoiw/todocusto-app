"use client";

import { useState, useMemo } from "react";
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
import { IconPlus, IconTrash } from "@tabler/icons-react";

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
}

export function EntriesSection({
  workspaceSlug,
  ingredientId,
  entries,
  measurementType,
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
                <Label htmlFor="unitPrice">Preço (R$) *</Label>
                <Input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  required
                />
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

            <div className="flex items-center space-x-2 p-3 bg-background rounded border">
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
                Usar este preço como novo preço médio (substitui o cálculo
                automático)
              </label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
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
            Nenhuma entrada cadastrada. Adicione compras para calcular o preço
            médio automaticamente.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Data</th>
                  <th className="text-right py-2 font-medium">Qtd</th>
                  <th className="text-right py-2 font-medium">Preço Unit.</th>
                  <th className="text-right py-2 font-medium">Total</th>
                  <th className="text-left py-2 font-medium">Fornecedor</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b">
                    <td className="py-2">
                      {new Date(entry.date + "T00:00:00").toLocaleDateString(
                        "pt-BR"
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {parseFloat(entry.quantity).toLocaleString("pt-BR")}{" "}
                      {entry.unitAbbreviation}
                    </td>
                    <td className="py-2 text-right">
                      R$ {parseFloat(entry.unitPrice).toFixed(2)}/
                      {entry.unitAbbreviation}
                    </td>
                    <td className="py-2 text-right font-medium">
                      R$ {parseFloat(entry.totalPrice).toFixed(2)}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {entry.supplierName || "-"}
                    </td>
                    <td className="py-2 text-right">
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
                              preço médio será recalculado.
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
