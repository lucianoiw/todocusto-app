"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteIngredient } from "@/actions/ingredients";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IconEye, IconPencil, IconTrash } from "@tabler/icons-react";

interface Ingredient {
  id: string;
  name: string;
  categoryName: string | null;
  categoryColor: string | null;
  averagePrice: string;
  priceUnitAbbreviation: string | null;
  hasVariations: boolean;
}

interface IngredientsTableProps {
  workspaceSlug: string;
  ingredients: Ingredient[];
}

export function IngredientsTable({ workspaceSlug, ingredients }: IngredientsTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");

  async function handleDelete() {
    if (!deletingId) return;

    const result = await deleteIngredient(workspaceSlug, deletingId);
    if (result.error) {
      alert(result.error);
    }
    setDeletingId(null);
    router.refresh();
  }

  function openDeleteDialog(ing: Ingredient) {
    setDeletingId(ing.id);
    setDeletingName(ing.name);
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-150">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="px-4 py-3 font-medium">Insumo</th>
            <th className="px-4 py-3 font-medium">Categoria</th>
            <th className="px-4 py-3 font-medium text-right">Preço</th>
            <th className="px-4 py-3 font-medium text-center">Tipo</th>
            <th className="px-4 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {ingredients.map((ing) => (
            <tr key={ing.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {ing.categoryColor && (
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: ing.categoryColor }}
                    />
                  )}
                  <span className="font-medium">{ing.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {ing.categoryName || "-"}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                R$ {parseFloat(ing.averagePrice).toFixed(2)}/{ing.priceUnitAbbreviation || "un"}
              </td>
              <td className="px-4 py-3 text-center">
                {ing.hasVariations ? (
                  <Badge variant="secondary" className="text-xs">
                    Variações
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Único
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex">
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href={`/${workspaceSlug}/ingredients/${ing.id}`}>
                      <IconEye className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href={`/${workspaceSlug}/ingredients/${ing.id}/edit`}>
                      <IconPencil className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => openDeleteDialog(ing)}
                  >
                    <IconTrash className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir insumo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{deletingName}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
