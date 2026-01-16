"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteIngredient } from "@/actions/ingredients";
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
import { IconEye, IconPencil, IconTrash, IconLoader2 } from "@tabler/icons-react";

interface Ingredient {
  id: string;
  name: string;
  categoryName: string | null;
  categoryColor: string | null;
  averagePrice: string;
  priceUnitAbbreviation: string | null;
  hasVariations: boolean;
  variationNames: string[];
}

interface IngredientsTableProps {
  workspaceSlug: string;
  ingredients: Ingredient[];
}

export function IngredientsTable({ workspaceSlug, ingredients }: IngredientsTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!deletingId) return;

    setIsDeleting(true);
    const result = await deleteIngredient(workspaceSlug, deletingId);
    if (result.error) {
      alert(result.error);
    }
    setIsDeleting(false);
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
            <th className="px-4 py-3 font-medium text-right">Custo</th>
            <th className="px-4 py-3 font-medium">Variações</th>
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
                  <Link
                    href={`/${workspaceSlug}/ingredients/${ing.id}`}
                    className="font-medium hover:underline"
                  >
                    {ing.name}
                  </Link>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {ing.categoryName || "-"}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                R$ {formatCurrency(ing.averagePrice)}/{ing.priceUnitAbbreviation || "un"}
              </td>
              <td className="px-4 py-3">
                {ing.variationNames.length > 0 ? (
                  <span className="text-sm text-muted-foreground">
                    {ing.variationNames.join(", ")}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground/50">-</span>
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
