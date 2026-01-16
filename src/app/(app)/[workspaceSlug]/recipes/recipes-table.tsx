"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteRecipe } from "@/actions/recipes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
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
import { IconEye, IconPencil, IconTrash, IconClock, IconLoader2 } from "@tabler/icons-react";

interface Recipe {
  id: string;
  name: string;
  categoryName: string | null;
  categoryColor: string | null;
  yieldQuantity: string;
  yieldUnitAbbreviation: string | null;
  prepTime: number | null;
  costPerPortion: string;
}

interface RecipesTableProps {
  workspaceSlug: string;
  recipes: Recipe[];
}

export function RecipesTable({ workspaceSlug, recipes }: RecipesTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!deletingId) return;

    setIsDeleting(true);
    try {
      const result = await deleteRecipe(workspaceSlug, deletingId);
      if (result.error) {
        alert(result.error);
      }
      setDeletingId(null);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  function openDeleteDialog(rec: Recipe) {
    setDeletingId(rec.id);
    setDeletingName(rec.name);
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-150">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="px-4 py-3 font-medium">Receita</th>
            <th className="px-4 py-3 font-medium">Categoria</th>
            <th className="px-4 py-3 font-medium text-right">Rendimento</th>
            <th className="px-4 py-3 font-medium text-center">Tempo</th>
            <th className="px-4 py-3 font-medium text-right">Custo/porção</th>
            <th className="px-4 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {recipes.map((rec) => (
            <tr key={rec.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {rec.categoryColor && (
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: rec.categoryColor }}
                    />
                  )}
                  <Link
                    href={`/${workspaceSlug}/recipes/${rec.id}`}
                    className="font-medium hover:underline"
                  >
                    {rec.name}
                  </Link>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {rec.categoryName || "-"}
              </td>
              <td className="px-4 py-3 text-right">
                {parseFloat(rec.yieldQuantity).toLocaleString("pt-BR")} {rec.yieldUnitAbbreviation}
              </td>
              <td className="px-4 py-3 text-center">
                {rec.prepTime ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <IconClock className="w-3.5 h-3.5" />
                    {rec.prepTime} min
                  </span>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                R$ {formatCurrency(rec.costPerPortion, 4)}/{rec.yieldUnitAbbreviation}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex">
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href={`/${workspaceSlug}/recipes/${rec.id}`}>
                      <IconEye className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href={`/${workspaceSlug}/recipes/${rec.id}/edit`}>
                      <IconPencil className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => openDeleteDialog(rec)}
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
            <AlertDialogTitle>Excluir receita</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{deletingName}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
