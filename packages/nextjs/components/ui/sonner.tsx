"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#111111] group-[.toaster]:text-neutral-200 group-[.toaster]:border group-[.toaster]:border-[#2A2A2A]",
          description: "group-[.toast]:text-neutral-400",
          actionButton: "group-[.toast]:bg-[#A0153E] group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-[#1A1A1A] group-[.toast]:text-neutral-300",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
