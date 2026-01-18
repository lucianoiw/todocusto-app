import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getMenu, updateMenu } from "@/actions/menus";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft } from "@tabler/icons-react";
import { DeleteMenuButton } from "./delete-button";

interface EditMenuPageProps {
  params: Promise<{ workspaceSlug: string; menuId: string }>;
}

export default async function EditMenuPage({ params }: EditMenuPageProps) {
  const { workspaceSlug, menuId } = await params;
  const menu = await getMenu(workspaceSlug, menuId);

  if (!menu) {
    notFound();
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await updateMenu(workspaceSlug, menuId, formData);
    if (result.success) {
      redirect(`/${workspaceSlug}/menus/${menuId}`);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/${workspaceSlug}/menus/${menuId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Voltar para {menu.name}
        </Link>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Editar Cardápio</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={menu.name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={menu.description || ""}
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <Label>Modo de precificação</Label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="pricingMode"
                    value="margin"
                    defaultChecked={menu.pricingMode === "margin"}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium">Margem</span>
                    <p className="text-sm text-muted-foreground">
                      Percentual sobre o preço de venda. Ex: 30% de margem em R$100 = R$30 de lucro.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="pricingMode"
                    value="markup"
                    defaultChecked={menu.pricingMode === "markup"}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium">Markup</span>
                    <p className="text-sm text-muted-foreground">
                      Percentual sobre o custo. Ex: 50% de markup em R$100 de custo = preço de R$150.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                name="active"
                value="true"
                defaultChecked={menu.active}
                className="rounded"
              />
              <Label htmlFor="active" className="cursor-pointer">
                Cardápio ativo
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <SubmitButton loadingText="Salvando...">Salvar Alterações</SubmitButton>
              <Button variant="outline" asChild>
                <Link href={`/${workspaceSlug}/menus/${menuId}`}>Cancelar</Link>
              </Button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t">
            <h3 className="text-sm font-medium text-red-600 mb-2">Zona de perigo</h3>
            <DeleteMenuButton
              workspaceSlug={workspaceSlug}
              menuId={menuId}
              menuName={menu.name}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
