import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getUserWorkspaces } from "@/actions/workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconPlus, IconChevronRight } from "@tabler/icons-react";
import { HomeHeader } from "@/components/app/home-header";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const workspaces = await getUserWorkspaces();

  // If user has only one workspace, redirect to it
  if (workspaces.length === 1) {
    redirect(`/${workspaces[0].slug}`);
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <HomeHeader user={session.user} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Seus Negócios</h2>
            <p className="text-muted-foreground">
              Selecione um negócio para continuar ou crie um novo
            </p>
          </div>
          <Button asChild>
            <Link href="/new">
              <IconPlus className="w-4 h-4 mr-2" />
              Novo Negócio
            </Link>
          </Button>
        </div>

        {workspaces.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Você ainda não tem nenhum negócio cadastrado.
              </p>
              <Button asChild>
                <Link href="/new">
                  <IconPlus className="w-4 h-4 mr-2" />
                  Criar meu primeiro negócio
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {workspaces.map((ws) => (
              <Link key={ws.id} href={`/${ws.slug}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{ws.name}</CardTitle>
                      {ws.description && (
                        <CardDescription>{ws.description}</CardDescription>
                      )}
                    </div>
                    <IconChevronRight className="w-5 h-5 text-muted-foreground" />
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
