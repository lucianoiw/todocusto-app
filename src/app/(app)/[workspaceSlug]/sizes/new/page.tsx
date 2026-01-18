import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SizeGroupForm } from "../size-group-form";

interface NewSizeGroupPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function NewSizeGroupPage({ params }: NewSizeGroupPageProps) {
  const { workspaceSlug } = await params;

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/${workspaceSlug}/sizes`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Voltar para tamanhos
        </Link>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Novo Grupo de Tamanhos</CardTitle>
        </CardHeader>
        <CardContent>
          <SizeGroupForm workspaceSlug={workspaceSlug} />
        </CardContent>
      </Card>
    </div>
  );
}
