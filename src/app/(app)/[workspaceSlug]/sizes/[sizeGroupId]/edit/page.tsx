import Link from "next/link";
import { notFound } from "next/navigation";
import { getSizeGroup } from "@/actions/sizes";
import { IconArrowLeft } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SizeGroupForm } from "../../size-group-form";

interface EditSizeGroupPageProps {
  params: Promise<{ workspaceSlug: string; sizeGroupId: string }>;
}

export default async function EditSizeGroupPage({ params }: EditSizeGroupPageProps) {
  const { workspaceSlug, sizeGroupId } = await params;
  const sizeGroup = await getSizeGroup(workspaceSlug, sizeGroupId);

  if (!sizeGroup) {
    notFound();
  }

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
          <CardTitle>Editar Grupo de Tamanhos</CardTitle>
        </CardHeader>
        <CardContent>
          <SizeGroupForm workspaceSlug={workspaceSlug} sizeGroup={sizeGroup} />
        </CardContent>
      </Card>
    </div>
  );
}
