"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateWorkspace } from "@/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IconLoader2 } from "@tabler/icons-react";

interface SettingsFormProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
  appUrl: string;
}

export function SettingsForm({ workspace, appUrl }: SettingsFormProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateWorkspace(workspace.id, formData);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Configurações salvas com sucesso!" });
      router.refresh();
    }

    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Negócio *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={workspace.name}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={workspace.description || ""}
          placeholder="Uma breve descrição do seu negócio"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>URL do Negócio</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm shrink-0">{appUrl}/</span>
          <Input
            value={workspace.slug}
            disabled
            className="bg-muted flex-1"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          O slug não pode ser alterado após a criação
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-md text-sm ${
            message.type === "success"
              ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Alterações"
          )}
        </Button>
      </div>
    </form>
  );
}
