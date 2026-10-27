
import { useState } from "react";

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { label: "Discover", href: "#discover" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Plan a trip", href: "#start-planning" },
  ];

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#e9eae2] bg-[#f8f8f2]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
        <a
          href="#home"
          aria-label="Triply home"
          onClick={closeMenu}
          className="flex items-center gap-2.5"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#203e32] text-lg text-white">
            ✈
          </span>

          <span className="text-[27px] font-semibold tracking-tight text-[#203e32]">
            triply<span className="text-[#16816e]">.</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#647168] transition hover:text-[#176f60]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="#start-planning"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#203e32] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#176f60]"
          >
            Start planning <span aria-hidden="true">↗</span>
          </a>
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e0e5db] bg-white text-xl text-[#203e32] md:hidden"
        >
          {menuOpen ? "×" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-[#e9eae2] bg-[#f8f8f2] px-5 py-4 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-xl px-4 py-3 text-sm font-medium text-[#435a4a] transition hover:bg-[#eaf2e7]"
              >
                {link.label}
              </a>
            ))}

            <a
              href="#start-planning"
              onClick={closeMenu}
              className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#203e32] px-5 py-3 text-sm font-semibold text-white"
            >
              Start planning ↗
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
