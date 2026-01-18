"use client";

import { useState } from "react";
import { deleteWorkspace } from "@/actions/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IconAlertTriangle, IconTrash, IconCopy, IconCheck } from "@tabler/icons-react";

interface DangerZoneProps {
  workspaceId: string;
  workspaceName: string;
}

export function DangerZone({ workspaceId, workspaceName }: DangerZoneProps) {
  const [open, setOpen] = useState(false);
  const [confirmationName, setConfirmationName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyName() {
    await navigator.clipboard.writeText(workspaceName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canDelete = confirmationName === workspaceName;

  async function handleDelete() {
    if (!canDelete) return;

    setLoading(true);
    setError(null);

    const result = await deleteWorkspace(workspaceId, confirmationName);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // If successful, redirect happens in the action
  }

  return (
    <Card className="max-w-2xl border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <IconAlertTriangle className="h-5 w-5" />
          Zona de Perigo
        </CardTitle>
        <CardDescription>
          Ações irreversíveis. Tenha cuidado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Excluir este negócio</p>
            <p className="text-sm text-muted-foreground">
              Remove permanentemente o negócio e todos os dados associados.
            </p>
          </div>
          <Dialog open={open} onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setConfirmationName("");
              setError(null);
              setCopied(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <IconTrash className="h-4 w-4" />
                Excluir
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <IconAlertTriangle className="h-5 w-5" />
                  Excluir negócio
                </DialogTitle>
                <DialogDescription>
                  Esta ação é <strong>irreversível</strong>. Todos os dados serão permanentemente excluídos:
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Ingredientes e variações</li>
                  <li>Receitas e seus itens</li>
                  <li>Produtos e composições</li>
                  <li>Cardápios, taxas e produtos</li>
                  <li>Custos fixos</li>
                  <li>Fornecedores</li>
                  <li>Categorias e unidades</li>
                </ul>

                <div className="space-y-2">
                  <Label htmlFor="confirmName" className="flex items-center gap-1">
                    Digite{" "}
                    <strong className="inline-flex items-center gap-1">
                      {workspaceName}
                      <button
                        type="button"
                        onClick={copyName}
                        className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-accent transition-colors"
                        title="Copiar nome"
                      >
                        {copied ? (
                          <IconCheck className="h-3 w-3 text-green-500" />
                        ) : (
                          <IconCopy className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    </strong>{" "}
                    para confirmar:
                  </Label>
                  <Input
                    id="confirmName"
                    value={confirmationName}
                    onChange={(e) => setConfirmationName(e.target.value)}
                    placeholder={workspaceName}
                    autoComplete="off"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={!canDelete || loading}
                >
                  {loading ? "Excluindo..." : "Excluir permanentemente"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
