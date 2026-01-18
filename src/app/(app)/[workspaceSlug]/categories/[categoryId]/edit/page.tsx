import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCategory, updateCategory } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconArrowLeft } from "@tabler/icons-react";

interface EditCategoryPageProps {
  params: Promise<{ workspaceSlug: string; categoryId: string }>;
}

const categoryTypes = [
  { value: "ingredient", label: "Insumo" },
  { value: "recipe", label: "Receita" },
  { value: "product", label: "Produto" },
];

const colors = [
  { value: "#ef4444", label: "Vermelho" },
  { value: "#f97316", label: "Laranja" },
  { value: "#eab308", label: "Amarelo" },
  { value: "#22c55e", label: "Verde" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#6b7280", label: "Cinza" },
];

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { workspaceSlug, categoryId } = await params;
  const category = await getCategory(workspaceSlug, categoryId);

  if (!category) {
    notFound();
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await updateCategory(workspaceSlug, categoryId, formData);
    if (result.success) {
      redirect(`/${workspaceSlug}/categories`);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/${workspaceSlug}/categories`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Voltar para categorias
        </Link>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Editar Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={category.name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select name="type" defaultValue={category.type} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {categoryTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Cor (opcional)</Label>
              <Select name="color" defaultValue={category.color || undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma cor" />
                </SelectTrigger>
                <SelectContent>
                  {colors.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color.value }}
                        />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <SubmitButton loadingText="Salvando...">Salvar Alterações</SubmitButton>
              <Button variant="outline" asChild>
                <Link href={`/${workspaceSlug}/categories`}>Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
