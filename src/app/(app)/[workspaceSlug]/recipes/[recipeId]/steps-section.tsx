"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addRecipeStep, updateRecipeStep, removeRecipeStep } from "@/actions/recipes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconPlus, IconTrash, IconPencil, IconLoader2 } from "@tabler/icons-react";

interface RecipeStep {
  id: string;
  order: number;
  description: string;
  time: number | null;
}

interface RecipeStepsSectionProps {
  workspaceSlug: string;
  recipeId: string;
  steps: RecipeStep[];
}

export function RecipeStepsSection({
  workspaceSlug,
  recipeId,
  steps,
}: RecipeStepsSectionProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit state
  const [editingStep, setEditingStep] = useState<RecipeStep | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result = await addRecipeStep(workspaceSlug, recipeId, formData);
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

  async function handleRemove(stepId: string) {
    await removeRecipeStep(workspaceSlug, recipeId, stepId);
    router.refresh();
  }

  function openEditDialog(step: RecipeStep) {
    setEditingStep(step);
    setEditDescription(step.description);
    setEditTime(step.time?.toString() || "");
  }

  async function handleEditSubmit() {
    if (!editingStep) return;

    setEditLoading(true);
    try {
      const formData = new FormData();
      formData.append("description", editDescription);
      if (editTime) {
        formData.append("time", editTime);
      }

      const result = await updateRecipeStep(workspaceSlug, recipeId, editingStep.id, formData);
      if (result.success) {
        setEditingStep(null);
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setEditLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Modo de Preparo</CardTitle>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <IconPlus />
            Adicionar Passo
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <form action={handleSubmit} className="space-y-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição do passo *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Ex: Misture todos os ingredientes em um bowl"
                rows={2}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Tempo estimado (min)</Label>
              <Input
                id="time"
                name="time"
                type="number"
                min="1"
                placeholder="5"
                className="w-32"
              />
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

        {steps.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum passo cadastrado. Adicione o modo de preparo da receita.
          </p>
        ) : (
          <ol className="space-y-4">
            {steps.map((step) => (
              <li key={step.id} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center font-medium text-sm">
                  {step.order}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{step.description}</p>
                  {step.time && (
                    <span className="text-xs text-muted-foreground">{step.time} min</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(step)}
                >
                  <IconPencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-red-600">
                      <IconTrash />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover passo</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja remover este passo?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemove(step.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ol>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingStep} onOpenChange={(open) => !open && setEditingStep(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Passo {editingStep?.order}</DialogTitle>
              <DialogDescription>
                Atualize a descrição e o tempo do passo
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editDescription">Descrição</Label>
                <Textarea
                  id="editDescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editTime">Tempo (minutos)</Label>
                <Input
                  id="editTime"
                  type="number"
                  min="1"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStep(null)}>
                Cancelar
              </Button>
              <Button onClick={handleEditSubmit} disabled={editLoading || !editDescription.trim()}>
                {editLoading ? (
                  <>
                    <IconLoader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
