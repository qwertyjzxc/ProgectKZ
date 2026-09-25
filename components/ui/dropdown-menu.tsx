"use client"

// Лёгкое выпадающее меню вместо @base-ui/react/menu + floating-ui:
// потребители (таблицы клиентов/собственников) используют только
// Menu/Trigger/Content/Item — API сохранён 1-в-1, остальные экспорты —
// минимальные заглушки той же формы. Позиционирование — fixed-панель
// у триггера (align start/end), закрытие по Escape/скроллу/клику мимо.
import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

const MenuContext = React.createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
} | null>(null);

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLElement | null>(null);
  const value = React.useMemo(() => ({ open, setOpen, anchorRef }), [open]);
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

function DropdownMenuPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function DropdownMenuTrigger({
  className,
  children,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(MenuContext);
  return (
    <button
      type="button"
      ref={el => {
        if (ctx) ctx.anchorRef.current = el;
      }}
      data-slot="dropdown-menu-trigger"
      className={className}
      aria-haspopup="menu"
      aria-expanded={ctx?.open ?? false}
      onClick={e => {
        e.stopPropagation();
        onClick?.(e);
        ctx?.setOpen(!ctx.open);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function DropdownMenuContent({
  align = "start",
  className,
  children,
  style,
  ...props
}: {
  align?: "start" | "end" | "center";
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  [key: string]: unknown;
}) {
  const ctx = React.useContext(MenuContext);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  React.useLayoutEffect(() => {
    if (!ctx?.open) {
      setPos(null);
      return;
    }
    const anchor = ctx.anchorRef.current;
    if (!anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const w = panelRef.current?.offsetWidth ?? 176;
      const h = panelRef.current?.offsetHeight ?? 0;
      let left = align === "end" ? r.right - w : align === "center" ? r.left + r.width / 2 - w / 2 : r.left;
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
      let top = r.bottom + 4;
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 4);
      setPos({ top, left });
    };
    place();
  }, [ctx, ctx?.open, align, children]);

  React.useEffect(() => {
    if (!ctx?.open) return;
    const close = () => ctx.setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [ctx, ctx?.open]);

  if (!ctx?.open) return null;
  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50"
        onClick={() => ctx.setOpen(false)}
        onContextMenu={e => {
          e.preventDefault();
          ctx.setOpen(false);
        }}
      />
      <div
        ref={panelRef}
        role="menu"
        data-slot="dropdown-menu-content"
        className={cn(
          "fixed z-50 max-h-96 min-w-32 overflow-x-hidden overflow-y-auto rounded-lg bg-white p-1 text-gray-900 shadow-xl ring-1 ring-black/10 outline-none",
          className
        )}
        style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, visibility: pos ? "visible" : "hidden", ...style }}
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

function DropdownMenuGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="dropdown-menu-group" className={className} {...props} />;
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return (
    <div
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn("px-1.5 py-1 text-xs font-medium text-gray-500 data-inset:pl-7", className)}
      {...props}
    />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  onClick,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  const ctx = React.useContext(MenuContext);
  return (
    <div
      role="menuitem"
      tabIndex={0}
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "relative flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none select-none hover:bg-gray-100 data-inset:pl-7 data-[variant=destructive]:text-red-600 data-[variant=destructive]:hover:bg-red-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      onClick={e => {
        e.stopPropagation();
        ctx?.setOpen(false);
        (onClick as unknown as (e: React.MouseEvent) => void)?.(e as unknown as React.MouseEvent);
      }}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          (e.target as HTMLElement).click();
        }
      }}
      {...props}
    />
  );
}

function DropdownMenuSub({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return (
    <div data-slot="dropdown-menu-sub-trigger" className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm", className)} {...props}>
      {children}
    </div>
  );
}

function DropdownMenuSubContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="dropdown-menu-sub-content" className={cn("rounded-lg bg-white p-1 shadow-lg ring-1 ring-black/10", className)} {...props}>
      {children}
    </div>
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  onCheckedChange,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  inset?: boolean;
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
}) {
  const ctx = React.useContext(MenuContext);
  return (
    <div
      role="menuitemcheckbox"
      aria-checked={checked}
      tabIndex={0}
      data-slot="dropdown-menu-checkbox-item"
      className={cn("relative flex cursor-pointer items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-none select-none hover:bg-gray-100", className)}
      onClick={e => {
        e.stopPropagation();
        onCheckedChange?.(!checked);
        ctx?.setOpen(false);
      }}
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex items-center justify-center">
        {checked ? "✓" : null}
      </span>
      {children}
    </div>
  );
}

function DropdownMenuRadioGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  const ctx = React.useContext(MenuContext);
  return (
    <div
      role="menuitemradio"
      tabIndex={0}
      data-slot="dropdown-menu-radio-item"
      className={cn("relative flex cursor-pointer items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-none select-none hover:bg-gray-100", className)}
      onClick={e => {
        e.stopPropagation();
        ctx?.setOpen(false);
      }}
      {...props}
    >
      {children}
    </div>
  );
}

function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="dropdown-menu-separator" className={cn("-mx-1 my-1 h-px bg-gray-200", className)} {...props} />;
}

function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("ml-auto text-xs tracking-widest text-gray-400", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
