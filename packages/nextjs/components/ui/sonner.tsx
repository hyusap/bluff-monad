"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      expand={false}
      visibleToasts={3}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "group toast w-[min(90vw,340px)] max-w-[90vw] rounded-xl border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-neutral-200 shadow-[0_14px_28px_rgba(0,0,0,0.35)]",
          title: "text-sm font-semibold leading-tight",
          description: "mt-1 text-xs leading-snug text-neutral-400",
          actionButton: "bg-[#A0153E] text-white",
          cancelButton: "bg-[#1A1A1A] text-neutral-300",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
