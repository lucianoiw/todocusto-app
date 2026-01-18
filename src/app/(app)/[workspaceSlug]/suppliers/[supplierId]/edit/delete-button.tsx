"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { IconTrash } from "@tabler/icons-react";

interface DeleteSupplierButtonProps {
  workspaceSlug: string;
  supplierId: string;
  supplierName: string;
}

export function DeleteSupplierButton({
  workspaceSlug,
  supplierId,
  supplierName,
}: DeleteSupplierButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const result = await deleteSupplier(workspaceSlug, supplierId);
      if (result.error) {
        alert(result.error);
      } else {
        router.push(`/${workspaceSlug}/suppliers`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <IconTrash />
          Excluir fornecedor
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir fornecedor</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir &quot;{supplierName}&quot;? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
