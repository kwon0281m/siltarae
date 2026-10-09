import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({ variant = "ghost", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn("btn", variant === "primary" && "btn-primary", className)} {...props} />;
}
