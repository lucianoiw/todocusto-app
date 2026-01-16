"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteUnit } from "@/actions/units";
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
import { IconPencil, IconTrash } from "@tabler/icons-react";

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  conversionFactor: string;
  isBase: boolean;
  measurementType: "weight" | "volume" | "unit";
}

interface UnitsTableProps {
  workspaceSlug: string;
  units: Unit[];
  baseUnitLabel: string;
}

export function UnitsTable({ workspaceSlug, units, baseUnitLabel }: UnitsTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");

  async function handleDelete() {
    if (!deletingId) return;

    const result = await deleteUnit(workspaceSlug, deletingId);
    if (result.error) {
      alert(result.error);
    }
    setDeletingId(null);
    router.refresh();
  }

  function openDeleteDialog(unit: Unit) {
    setDeletingId(unit.id);
    setDeletingName(unit.name);
  }

  if (units.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4 px-4">
        Nenhuma unidade cadastrada
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-125">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="px-4 py-2 font-medium">Abreviação</th>
            <th className="px-4 py-2 font-medium">Nome</th>
            <th className="px-4 py-2 font-medium">Conversão</th>
            <th className="px-4 py-2 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {units.map((u) => (
            <tr key={u.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3">
                <Badge variant={u.isBase ? "default" : "secondary"}>
                  {u.abbreviation}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{u.name}</span>
                  {u.isBase && (
                    <span className="text-xs text-muted-foreground">base</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {u.isBase ? (
                  "-"
                ) : (
                  <span className="font-mono text-sm">
                    1 {u.abbreviation} = {u.conversionFactor} {baseUnitLabel}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {u.isBase ? (
                  <span className="text-sm text-muted-foreground pr-2">
                    Não editável
                  </span>
                ) : (
                  <div className="inline-flex">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/${workspaceSlug}/units/${u.id}/edit`}>
                        <IconPencil className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => openDeleteDialog(u)}
                    >
                      <IconTrash className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir unidade</AlertDialogTitle>
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
