"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteMenu } from "@/actions/menus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IconDotsVertical,
  IconEye,
  IconPencil,
  IconTrash,
  IconPackage,
  IconPercentage,
} from "@tabler/icons-react";

interface Menu {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  productCount: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  avgMarginPercentage: number;
  feesCount: number;
}

interface MenusTableProps {
  workspaceSlug: string;
  menus: Menu[];
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getMarginColor(margin: number, active: boolean = true) {
  if (!active) return "text-muted-foreground";
  if (margin >= 30) return "text-green-600 dark:text-green-400";
  if (margin >= 15) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getProgressColor(margin: number, active: boolean = true) {
  if (!active) return "bg-muted-foreground/50";
  if (margin >= 30) return "bg-green-500";
  if (margin >= 15) return "bg-amber-500";
  return "bg-red-500";
}

export function MenusTable({ workspaceSlug, menus }: MenusTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");

  async function handleDelete() {
    if (!deletingId) return;

    const result = await deleteMenu(workspaceSlug, deletingId);
    if (result.error) {
      alert(result.error);
    }
    setDeletingId(null);
    router.refresh();
  }

  function openDeleteDialog(menu: Menu) {
    setDeletingId(menu.id);
    setDeletingName(menu.name);
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {menus.map((menu) => (
          <Card
            key={menu.id}
            className="group relative overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="p-4 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/${workspaceSlug}/menus/${menu.id}`}
                    className="font-semibold text-lg hover:text-primary transition-colors line-clamp-1"
                  >
                    {menu.name}
                  </Link>
                  {menu.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                      {menu.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {menu.active ? (
                    <Badge variant="default" className="text-xs">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Inativo</Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <IconDotsVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/${workspaceSlug}/menus/${menu.id}`}>
                          <IconEye className="w-4 h-4 mr-2" />
                          Visualizar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/${workspaceSlug}/menus/${menu.id}/edit`}>
                          <IconPencil className="w-4 h-4 mr-2" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(menu)}
                        className="text-destructive focus:text-destructive"
                      >
                        <IconTrash className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Stats */}
            {menu.productCount > 0 ? (
              <div className="px-4 pb-4">
                {/* Margin bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <IconPercentage className="w-3.5 h-3.5" />
                      Margem média
                    </span>
                    <span className={`font-bold ${getMarginColor(menu.avgMarginPercentage, menu.active)}`}>
                      {menu.avgMarginPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getProgressColor(menu.avgMarginPercentage, menu.active)}`}
                      style={{ width: `${Math.min(Math.max(menu.avgMarginPercentage, 0), 100)}%` }}
                    />
                  </div>
                </div>

                {/* Numbers */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-muted/50 rounded-lg p-2">
                    <div className="text-xs text-muted-foreground mb-0.5">Produtos</div>
                    <div className="font-semibold">{menu.productCount}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <div className="text-xs text-muted-foreground mb-0.5">Receita</div>
                    <div className="font-semibold text-sm">{formatCurrency(menu.totalRevenue)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <div className="text-xs text-muted-foreground mb-0.5">Lucro</div>
                    <div className={`font-semibold text-sm ${getMarginColor(menu.avgMarginPercentage, menu.active)}`}>
                      {formatCurrency(menu.totalMargin)}
                    </div>
                  </div>
                </div>

                {menu.feesCount > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    {menu.feesCount} {menu.feesCount === 1 ? 'taxa configurada' : 'taxas configuradas'}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground bg-muted/30 rounded-lg">
                  <IconPackage className="w-5 h-5" />
                  <span className="text-sm">Nenhum produto</span>
                </div>
                <Button variant="outline" className="w-full mt-3" asChild>
                  <Link href={`/${workspaceSlug}/menus/${menu.id}`}>
                    Adicionar produtos
                  </Link>
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cardápio</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{deletingName}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
