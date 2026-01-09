import { redirect, notFound } from "next/navigation";
import { PropsWithChildren } from "react";
import { getSession } from "@/lib/session";
import { getWorkspaceBySlug } from "@/actions/workspace";
import { Sidebar } from "@/components/app/sidebar";
import { Header } from "@/components/app/header";

interface WorkspaceLayoutProps extends PropsWithChildren {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { workspaceSlug } = await params;
  const workspace = await getWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header workspace={workspace} user={session.user} />
      <div className="flex">
        <Sidebar workspaceSlug={workspaceSlug} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
