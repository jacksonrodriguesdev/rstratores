import { Link } from "@tanstack/react-router";
import { Menu, Phone, Tractor, X, MessageCircle } from "lucide-react";
import { useState } from "react";
import { whatsappContactUrl, PHONE_DISPLAY } from "@/lib/whatsapp";

const NAV: Array<{ to: "/" | "/loja" | "/admin"; label: string; exact?: boolean }> = [
  { to: "/", label: "Início", exact: true },
  { to: "/loja", label: "Loja" },
  { to: "/admin", label: "Admin" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold text-primary"
          onClick={() => setOpen(false)}
        >
          <div className="rounded-lg bg-primary p-2 text-primary-foreground">
            <Tractor className="h-5 w-5" />
          </div>
          <span className="tracking-tight">
            RS <span className="text-accent">Trator Peças</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              activeOptions={n.exact ? { exact: true } : undefined}
              activeProps={{ className: "bg-muted text-primary" }}
            >
              {n.label}
            </Link>
          ))}
          <a
            href={whatsappContactUrl()}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-2 inline-flex items-center gap-2 rounded-md bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1EBE57]"
          >
            <Phone className="h-4 w-4" />
            {PHONE_DISPLAY}
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          className="inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-muted md:hidden"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                activeOptions={n.exact ? { exact: true } : undefined}
                activeProps={{ className: "bg-muted text-primary" }}
              >
                {n.label}
              </Link>
            ))}
            <a
              href={whatsappContactUrl()}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => setOpen(false)}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-md bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1EBE57]"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp {PHONE_DISPLAY}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
