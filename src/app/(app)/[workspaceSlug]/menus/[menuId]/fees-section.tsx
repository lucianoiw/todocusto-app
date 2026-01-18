"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addMenuFee, removeMenuFee, updateMenuFee } from "@/actions/menus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconPlus, IconTrash, IconPencil } from "@tabler/icons-react";

interface MenuFee {
  id: string;
  name: string;
  type: "fixed" | "percentage";
  value: string;
  active: boolean;
}

interface MenuFeesSectionProps {
  workspaceSlug: string;
  menuId: string;
  fees: MenuFee[];
}

export function MenuFeesSection({
  workspaceSlug,
  menuId,
  fees,
}: MenuFeesSectionProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feeType, setFeeType] = useState<"fixed" | "percentage">("percentage");
  const [editingFee, setEditingFee] = useState<MenuFee | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"fixed" | "percentage">("percentage");
  const [editValue, setEditValue] = useState("");
  const [editActive, setEditActive] = useState(true);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result = await addMenuFee(workspaceSlug, menuId, formData);
      if (result.success) {
        setShowForm(false);
        setFeeType("percentage");
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(feeId: string) {
    await removeMenuFee(workspaceSlug, menuId, feeId);
    router.refresh();
  }

  function openEditDialog(fee: MenuFee) {
    setEditingFee(fee);
    setEditName(fee.name);
    setEditType(fee.type);
    setEditValue(fee.value);
    setEditActive(fee.active);
  }

  async function handleEdit() {
    if (!editingFee) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("name", editName);
      formData.set("type", editType);
      formData.set("value", editValue);
      formData.set("active", editActive ? "true" : "false");

      const result = await updateMenuFee(
        workspaceSlug,
        menuId,
        editingFee.id,
        formData
      );

      if (result.success) {
        setEditingFee(null);
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  const typeLabels = {
    fixed: "Fixo",
    percentage: "Percentual",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Taxas e Comissões</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Comissões de marketplace, taxas de cartão, embalagens, etc.
          </p>
        </div>
        {!showForm && (
          <Button variant="outline" onClick={() => setShowForm(true)}>
            <IconPlus />
            Adicionar Taxa
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <form action={handleSubmit} className="space-y-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="feeName">Nome da taxa *</Label>
              <Input
                id="feeName"
                name="name"
                placeholder="Ex: Taxa iFood, Embalagem"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feeType">Tipo *</Label>
                <select
                  id="feeType"
                  name="type"
                  value={feeType}
                  onChange={(e) => setFeeType(e.target.value as "fixed" | "percentage")}
                  className="w-full h-10 px-3 rounded-md border text-sm"
                  required
                >
                  <option value="percentage">Percentual (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feeValue">Valor *</Label>
                <div className="flex items-center gap-2">
                  {feeType === "fixed" && <span className="text-muted-foreground">R$</span>}
                  <Input
                    id="feeValue"
                    name="value"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={feeType === "percentage" ? "12" : "2,50"}
                    required
                  />
                  {feeType === "percentage" && <span className="text-muted-foreground">%</span>}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Adicionando..." : "Adicionar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {fees.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma taxa configurada. Adicione taxas como comissões de marketplace ou embalagem.
          </p>
        ) : (
          <div className="divide-y">
            {fees.map((fee) => (
              <div key={fee.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${!fee.active ? "text-muted-foreground" : ""}`}>
                        {fee.name}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {typeLabels[fee.type]}
                      </Badge>
                      {!fee.active && (
                        <Badge variant="outline" className="text-xs">
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <div className="font-medium">
                      {fee.type === "fixed" ? "R$ " : ""}
                      {parseFloat(fee.value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {fee.type === "percentage" ? "%" : ""}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(fee)}
                  >
                    <IconPencil />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-red-600">
                        <IconTrash />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover taxa</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover &quot;{fee.name}&quot;? Os custos dos produtos serão recalculados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemove(fee.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            {/* Total */}
            {fees.filter(f => f.active).length > 0 && (
              <div className="pt-3 flex justify-between items-center">
                <span className="font-medium text-foreground">Total de taxas</span>
                <div className="text-right">
                  {(() => {
                    const activeFees = fees.filter(f => f.active);
                    const totalFixed = activeFees
                      .filter(f => f.type === "fixed")
                      .reduce((sum, f) => sum + parseFloat(f.value), 0);
                    const totalPercentage = activeFees
                      .filter(f => f.type === "percentage")
                      .reduce((sum, f) => sum + parseFloat(f.value), 0);

                    return (
                      <div className="flex items-center gap-2">
                        {totalFixed > 0 && (
                          <span className="font-medium">R$ {totalFixed.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} +</span>
                        )}
                        {totalPercentage > 0 && (
                          <span className="font-medium">{totalPercentage.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingFee} onOpenChange={(open) => !open && setEditingFee(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar taxa</DialogTitle>
            </DialogHeader>
            {editingFee && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editName">Nome</Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editType">Tipo</Label>
                    <select
                      id="editType"
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as "fixed" | "percentage")}
                      className="w-full h-10 px-3 rounded-md border text-sm"
                    >
                      <option value="percentage">Percentual (%)</option>
                      <option value="fixed">Valor fixo (R$)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editValue">Valor</Label>
                    <div className="flex items-center gap-2">
                      {editType === "fixed" && <span className="text-muted-foreground">R$</span>}
                      <Input
                        id="editValue"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                      {editType === "percentage" && <span className="text-muted-foreground">%</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editActive"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="editActive" className="cursor-pointer">
                    Taxa ativa
                  </Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingFee(null)}>
                Cancelar
              </Button>
              <Button onClick={handleEdit} disabled={loading || !editName || !editValue}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
