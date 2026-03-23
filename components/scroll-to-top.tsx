"use client";
import React, { useState, useEffect } from "react";
import { UpArrowIcon } from "@/components/icons/up-arrow";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  function resolveScroller(): HTMLElement | Window {
    const el = document.querySelector<HTMLElement>(".desktop-main-scroll");
    if (!el) return window;
    if (el.scrollHeight <= el.clientHeight) return window;
    return el;
  }

  function getScrollTop(scroller: HTMLElement | Window) {
    return scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop;
  }

  function scrollToTopOf(scroller: HTMLElement | Window) {
    if (scroller === window) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    (scroller as HTMLElement).scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    let scroller: HTMLElement | Window = resolveScroller();

    const onScroll = () => {
      setVisible(getScrollTop(scroller) >= 200);
    };

    const attach = () => {
      if (scroller === window) {
        window.addEventListener("scroll", onScroll, { passive: true });
      } else {
        (scroller as HTMLElement).addEventListener("scroll", onScroll, { passive: true });
      }
      onScroll();
    };

    const detach = () => {
      if (scroller === window) {
        window.removeEventListener("scroll", onScroll);
      } else {
        (scroller as HTMLElement).removeEventListener("scroll", onScroll);
      }
    };

    const rebindIfNeeded = () => {
      const next = resolveScroller();
      if (next === scroller) return;
      detach();
      scroller = next;
      attach();
    };

    const onResize = () => rebindIfNeeded();
    window.addEventListener("resize", onResize);

    const observer = new MutationObserver(() => {
      rebindIfNeeded();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    attach();

    return () => {
      detach();
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className={[
        "fixed bottom-5 right-5 z-[110] transition-opacity duration-200",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
    >
      <button
        type="button"
        aria-label="回到顶部"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-[var(--page-bg)] text-current dark:border-white/10 dark:bg-[var(--page-bg)]"
        onClick={() => scrollToTopOf(resolveScroller())}
      >
        <UpArrowIcon />
      </button>
    </div>
  );
}
