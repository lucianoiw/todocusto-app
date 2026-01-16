import Link from "next/link";
import { redirect } from "next/navigation";
import { createMenu } from "@/actions/menus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft } from "@tabler/icons-react";

interface NewMenuPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function NewMenuPage({ params }: NewMenuPageProps) {
  const { workspaceSlug } = await params;

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await createMenu(workspaceSlug, formData);
    if (result.success && result.id) {
      redirect(`/${workspaceSlug}/menus/${result.id}`);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/${workspaceSlug}/menus`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Voltar para cardápios
        </Link>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Novo Cardápio</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Delivery, Balcão, iFood"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Uma breve descrição do cardápio"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                name="active"
                value="true"
                defaultChecked
                className="rounded"
              />
              <Label htmlFor="active" className="cursor-pointer">
                Cardápio ativo
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit">Criar Cardápio</Button>
              <Button variant="outline" asChild>
                <Link href={`/${workspaceSlug}/menus`}>Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
