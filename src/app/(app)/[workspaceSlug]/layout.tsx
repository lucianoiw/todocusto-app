import { redirect, notFound } from "next/navigation";
import { PropsWithChildren } from "react";
import { getSession } from "@/lib/session";
import { getWorkspaceBySlug, getUserWorkspaces } from "@/actions/workspace";
import { AppSidebar } from "@/components/app/sidebar";
import { Header } from "@/components/app/header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

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
  const [workspace, workspaces] = await Promise.all([
    getWorkspaceBySlug(workspaceSlug),
    getUserWorkspaces(),
  ]);

  if (!workspace) {
    notFound();
  }

  return (
    <SidebarProvider>
      <AppSidebar
        workspaceSlug={workspaceSlug}
        workspaces={workspaces}
        currentWorkspace={workspace}
        user={session.user}
      />
      <SidebarInset>
        <Header workspace={workspace} user={session.user} />
        <main className="flex-1 p-4 md:p-6 min-w-0 bg-muted/40">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
