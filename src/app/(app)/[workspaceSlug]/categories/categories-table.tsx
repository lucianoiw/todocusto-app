"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteCategory, toggleCategoryActive } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { IconPencil, IconTrash } from "@tabler/icons-react";

interface Category {
  id: string;
  name: string;
  color: string | null;
  active: boolean;
}

interface CategoriesTableProps {
  workspaceSlug: string;
  categories: Category[];
}

export function CategoriesTable({ workspaceSlug, categories }: CategoriesTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleDelete() {
    if (!deletingId) return;

    const result = await deleteCategory(workspaceSlug, deletingId);
    if (result.error) {
      alert(result.error);
    }
    setDeletingId(null);
    router.refresh();
  }

  async function handleToggle(cat: Category) {
    setTogglingId(cat.id);
    const result = await toggleCategoryActive(workspaceSlug, cat.id, !cat.active);
    if (result.error) {
      alert(result.error);
    }
    setTogglingId(null);
    router.refresh();
  }

  function openDeleteDialog(cat: Category) {
    setDeletingId(cat.id);
    setDeletingName(cat.name);
  }

  if (categories.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4 px-4">
        Nenhuma categoria cadastrada
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
        <tbody className="divide-y">
          {categories.map((cat) => (
            <tr key={cat.id} className={`hover:bg-muted/50 transition-colors ${!cat.active ? "opacity-50" : ""}`}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {cat.color && (
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                  )}
                  <span className="font-medium">{cat.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 w-20">
                <Switch
                  checked={cat.active}
                  disabled={togglingId === cat.id}
                  onCheckedChange={() => handleToggle(cat)}
                />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex">
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href={`/${workspaceSlug}/categories/${cat.id}/edit`}>
                      <IconPencil className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => openDeleteDialog(cat)}
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
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
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
