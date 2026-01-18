"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { IconLoader2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface SubmitButtonProps extends React.ComponentProps<typeof Button> {
  children: React.ReactNode;
  loadingText?: string;
}

export function SubmitButton({
  children,
  loadingText,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className={cn(className)}
      {...props}
    >
      {pending ? (
        <>
          <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
