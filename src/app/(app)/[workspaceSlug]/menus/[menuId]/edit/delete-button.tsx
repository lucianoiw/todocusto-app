"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMenu } from "@/actions/menus";
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

interface DeleteMenuButtonProps {
  workspaceSlug: string;
  menuId: string;
  menuName: string;
}

export function DeleteMenuButton({
  workspaceSlug,
  menuId,
  menuName,
}: DeleteMenuButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const result = await deleteMenu(workspaceSlug, menuId);
      if (result.error) {
        alert(result.error);
      } else {
        router.push(`/${workspaceSlug}/menus`);
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
          Excluir cardápio
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir cardápio</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir &quot;{menuName}&quot;? Os produtos e taxas deste cardápio
            também serão excluídos. Esta ação não pode ser desfeita.
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
