"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteFixedCost } from "@/actions/fixed-costs";
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

interface DeleteFixedCostButtonProps {
  workspaceSlug: string;
  fixedCostId: string;
  fixedCostName: string;
}

export function DeleteFixedCostButton({
  workspaceSlug,
  fixedCostId,
  fixedCostName,
}: DeleteFixedCostButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const result = await deleteFixedCost(workspaceSlug, fixedCostId);
      if (result.error) {
        alert(result.error);
      } else {
        router.push(`/${workspaceSlug}/fixed-costs`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <IconTrash className="w-4 h-4 mr-2" />
          Excluir custo fixo
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir custo fixo</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir &quot;{fixedCostName}&quot;? Esta ação não pode ser desfeita.
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
