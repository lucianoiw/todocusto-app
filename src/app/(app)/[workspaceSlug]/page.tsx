import { getWorkspaceBySlug } from "@/actions/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IconRuler,
  IconCarrot,
  IconToolsKitchen2,
  IconPackage,
} from "@tabler/icons-react";
import Link from "next/link";

interface WorkspacePageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspaceSlug } = await params;
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  const quickLinks = [
    {
      title: "Unidades",
      description: "Gerencie as unidades de medida",
      href: `/${workspaceSlug}/units`,
      icon: IconRuler,
    },
    {
      title: "Ingredientes",
      description: "Cadastre e gerencie ingredientes",
      href: `/${workspaceSlug}/ingredients`,
      icon: IconCarrot,
    },
    {
      title: "Receitas",
      description: "Crie receitas e calcule custos",
      href: `/${workspaceSlug}/recipes`,
      icon: IconToolsKitchen2,
    },
    {
      title: "Produtos",
      description: "Gerencie seus produtos",
      href: `/${workspaceSlug}/products`,
      icon: IconPackage,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{workspace?.name}</h1>
        {workspace?.description && (
          <p className="text-gray-600 mt-1">{workspace.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:border-gray-400 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-md">
                    <link.icon className="w-5 h-5 text-gray-700" />
                  </div>
                  <CardTitle className="text-lg">{link.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{link.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
