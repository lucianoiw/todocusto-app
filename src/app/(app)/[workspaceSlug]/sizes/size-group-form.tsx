"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSizeGroup, updateSizeGroup } from "@/actions/sizes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { IconPlus, IconTrash, IconGripVertical, IconLoader2 } from "@tabler/icons-react";

interface SizeOption {
  id?: string;
  name: string;
  multiplier: string;
  isReference: boolean;
}

interface SizeGroup {
  id: string;
  name: string;
  description: string | null;
  options: SizeOption[];
}

interface SizeGroupFormProps {
  workspaceSlug: string;
  sizeGroup?: SizeGroup;
}

export function SizeGroupForm({ workspaceSlug, sizeGroup }: SizeGroupFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(sizeGroup?.name || "");
  const [description, setDescription] = useState(sizeGroup?.description || "");
  const [options, setOptions] = useState<SizeOption[]>(
    sizeGroup?.options || [
      { name: "", multiplier: "1", isReference: true },
    ]
  );

  const handleAddOption = () => {
    setOptions([...options, { name: "", multiplier: "1", isReference: false }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 1) return;
    const newOptions = options.filter((_, i) => i !== index);
    // If we removed the reference option, make the first one reference
    if (options[index].isReference && newOptions.length > 0) {
      newOptions[0].isReference = true;
    }
    setOptions(newOptions);
  };

  const handleOptionChange = (
    index: number,
    field: keyof SizeOption,
    value: string | boolean
  ) => {
    const newOptions = [...options];
    if (field === "isReference" && value === true) {
      // Only one option can be reference
      newOptions.forEach((opt, i) => {
        opt.isReference = i === index;
      });
    } else if (field === "name") {
      newOptions[index].name = value as string;
    } else if (field === "multiplier") {
      newOptions[index].multiplier = value as string;
    } else if (field === "isReference") {
      newOptions[index].isReference = value as boolean;
    }
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validate
    if (!name.trim()) {
      setError("Nome e obrigatorio");
      setIsSubmitting(false);
      return;
    }

    const validOptions = options.filter((opt) => opt.name.trim());
    if (validOptions.length === 0) {
      setError("Adicione pelo menos um tamanho");
      setIsSubmitting(false);
      return;
    }

    const hasReference = validOptions.some((opt) => opt.isReference);
    if (!hasReference) {
      setError("Selecione um tamanho como referencia");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("options", JSON.stringify(validOptions));

    const result = sizeGroup
      ? await updateSizeGroup(workspaceSlug, sizeGroup.id, formData)
      : await createSizeGroup(workspaceSlug, formData);

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push(`/${workspaceSlug}/sizes`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nome do Grupo *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Tamanhos de Pizza, Tamanhos de Acai..."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descricao (opcional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva este grupo de tamanhos..."
          rows={2}
        />
      </div>

      <div className="space-y-4">
        <div>
          <Label>Tamanhos *</Label>
        </div>

        <div className="text-sm text-muted-foreground">
          O tamanho de referência é a base para calcular os outros. Por exemplo: se a pizza Grande
          (referência) usa 300g de queijo, a Média com multiplicador 0.7x usará 210g automaticamente.
        </div>

        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3 px-3">
            <div className="w-4" /> {/* Spacer for grip icon */}
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="text-xs font-medium text-muted-foreground">Nome</div>
              <div className="text-xs font-medium text-muted-foreground">Multiplicador</div>
            </div>
            <div className="w-18" /> {/* Spacer for checkbox + delete */}
          </div>

          {options.map((option, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
            >
              <IconGripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />

              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <Input
                    value={option.name}
                    onChange={(e) =>
                      handleOptionChange(index, "name", e.target.value)
                    }
                    placeholder="Ex: Grande, Média..."
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={option.multiplier}
                    onChange={(e) =>
                      handleOptionChange(index, "multiplier", e.target.value)
                    }
                    placeholder="Ex: 1.0, 0.7..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id={`ref-${index}`}
                  checked={option.isReference}
                  onCheckedChange={(checked) =>
                    handleOptionChange(index, "isReference", !!checked)
                  }
                />
                <Label htmlFor={`ref-${index}`} className="text-sm cursor-pointer">
                  Ref.
                </Label>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveOption(index)}
                disabled={options.length <= 1}
              >
                <IconTrash className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={handleAddOption}>
            <IconPlus />
            Adicionar
          </Button>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : sizeGroup ? (
            "Salvar Alteracoes"
          ) : (
            "Criar Grupo"
          )}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/${workspaceSlug}/sizes`}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
