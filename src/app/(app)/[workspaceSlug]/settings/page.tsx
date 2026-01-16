import { notFound } from "next/navigation";
import { getWorkspaceBySlug } from "@/actions/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconSettings } from "@tabler/icons-react";
import { SettingsForm } from "./settings-form";

interface SettingsPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { workspaceSlug } = await params;
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <IconSettings className="h-6 w-6" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as configurações do seu negócio
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informações do Negócio</CardTitle>
          <CardDescription>
            Atualize o nome e descrição do seu negócio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            workspace={workspace}
            appUrl={process.env.APP_URL || "todocusto.com"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
