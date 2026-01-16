"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteProduct } from "@/actions/products";
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

interface Product {
  id: string;
  name: string;
  categoryName: string | null;
  categoryColor: string | null;
  baseCost: string;
  active: boolean;
}

interface ProductsTableProps {
  workspaceSlug: string;
  products: Product[];
}

export function ProductsTable({ workspaceSlug, products }: ProductsTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");

  async function handleDelete() {
    if (!deletingId) return;

    const result = await deleteProduct(workspaceSlug, deletingId);
    if (result.error) {
      alert(result.error);
    }
    setDeletingId(null);
    router.refresh();
  }

  function openDeleteDialog(prod: Product) {
    setDeletingId(prod.id);
    setDeletingName(prod.name);
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-150">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="px-4 py-3 font-medium">Produto</th>
            <th className="px-4 py-3 font-medium">Categoria</th>
            <th className="px-4 py-3 font-medium text-right">Custo Base</th>
            <th className="px-4 py-3 font-medium text-center">Status</th>
            <th className="px-4 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {products.map((prod) => (
            <tr key={prod.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {prod.categoryColor && (
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: prod.categoryColor }}
                    />
                  )}
                  <span className="font-medium">{prod.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {prod.categoryName || "-"}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                R$ {parseFloat(prod.baseCost).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-center">
                {prod.active ? (
                  <Badge variant="default" className="text-xs">
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs text-muted-foreground">
                    Inativo
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex">
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href={`/${workspaceSlug}/products/${prod.id}`}>
                      <IconEye className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href={`/${workspaceSlug}/products/${prod.id}/edit`}>
                      <IconPencil className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => openDeleteDialog(prod)}
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
            <AlertDialogTitle>Excluir produto</AlertDialogTitle>
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
