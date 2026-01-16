"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteSupplier } from "@/actions/suppliers";
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
import { IconPencil, IconTrash } from "@tabler/icons-react";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface SuppliersTableProps {
  workspaceSlug: string;
  suppliers: Supplier[];
}

export function SuppliersTable({ workspaceSlug, suppliers }: SuppliersTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");

  async function handleDelete() {
    if (!deletingId) return;

    const result = await deleteSupplier(workspaceSlug, deletingId);
    if (result.error) {
      alert(result.error);
    }
    setDeletingId(null);
    router.refresh();
  }

  function openDeleteDialog(sup: Supplier) {
    setDeletingId(sup.id);
    setDeletingName(sup.name);
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-150">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="px-4 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">Telefone</th>
            <th className="px-4 py-3 font-medium">E-mail</th>
            <th className="px-4 py-3 font-medium">Endereço</th>
            <th className="px-4 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {suppliers.map((sup) => (
            <tr key={sup.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3 font-medium">{sup.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{sup.phone || "-"}</td>
              <td className="px-4 py-3 text-muted-foreground">{sup.email || "-"}</td>
              <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                {sup.address || "-"}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex">
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href={`/${workspaceSlug}/suppliers/${sup.id}/edit`}>
                      <IconPencil className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => openDeleteDialog(sup)}
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
            <AlertDialogTitle>Excluir fornecedor</AlertDialogTitle>
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
