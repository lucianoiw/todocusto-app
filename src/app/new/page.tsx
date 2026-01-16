import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { createWorkspace } from "@/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft } from "@tabler/icons-react";
import { HomeHeader } from "@/components/app/home-header";

export default async function NewWorkspacePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    await createWorkspace(formData);
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <HomeHeader user={session.user} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <IconArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Novo Negócio</CardTitle>
            <CardDescription>
              Crie um novo negócio para começar a gerenciar seus custos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do negócio *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: Hamburgueria do João"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Uma breve descrição do seu negócio"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit">Criar Negócio</Button>
                <Button variant="outline" asChild>
                  <Link href="/">Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
