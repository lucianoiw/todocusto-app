"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSizeGroup } from "@/actions/sizes";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { IconPencil, IconTrash } from "@tabler/icons-react";

interface SizeOption {
  id: string;
  name: string;
  multiplier: string;
  isReference: boolean;
  sortOrder: number;
}

interface SizeGroup {
  id: string;
  name: string;
  description: string | null;
  options: SizeOption[];
}

interface SizeGroupsTableProps {
  workspaceSlug: string;
  sizeGroups: SizeGroup[];
}

export function SizeGroupsTable({
  workspaceSlug,
  sizeGroups,
}: SizeGroupsTableProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    const result = await deleteSizeGroup(workspaceSlug, deleteId);
    setIsDeleting(false);

    if (result.success) {
      setDeleteId(null);
      router.refresh();
    }
  };

  const formatMultiplier = (multiplier: string) => {
    const num = parseFloat(multiplier);
    return `${num.toFixed(2)}x`;
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tamanhos</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sizeGroups.map((group) => (
            <TableRow key={group.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{group.name}</p>
                  {group.description && (
                    <p className="text-sm text-muted-foreground">
                      {group.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {group.options.map((option) => (
                    <Badge
                      key={option.id}
                      variant={option.isReference ? "default" : "secondary"}
                    >
                      {option.name} ({formatMultiplier(option.multiplier)})
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/${workspaceSlug}/sizes/${group.id}/edit`}>
                      <IconPencil className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(group.id)}
                  >
                    <IconTrash className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo de tamanhos?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. Produtos que usam este grupo
              perderao a configuracao de tamanhos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
