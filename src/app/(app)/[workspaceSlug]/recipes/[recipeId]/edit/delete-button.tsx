"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteRecipe } from "@/actions/recipes";
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

interface DeleteRecipeButtonProps {
  workspaceSlug: string;
  recipeId: string;
  recipeName: string;
}

export function DeleteRecipeButton({
  workspaceSlug,
  recipeId,
  recipeName,
}: DeleteRecipeButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const result = await deleteRecipe(workspaceSlug, recipeId);
      if (result.error) {
        alert(result.error);
      } else {
        router.push(`/${workspaceSlug}/recipes`);
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
          Excluir receita
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir receita</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir "{recipeName}"? Todos os itens e passos
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
