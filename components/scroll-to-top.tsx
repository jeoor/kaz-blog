"use client";
import React, { useState, useEffect } from "react";
import { UpArrowIcon } from "@/components/icons/up-arrow";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY >= 200);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      className={`fixed bottom-5 right-5 ${visible ? "visible" : "hidden"}`}
    >
      <button
        type="button"
        aria-label="回到顶部"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-[rgba(244,239,231,0.9)] text-current shadow-lg dark:border-white/10 dark:bg-[rgba(20,22,26,0.9)]"
        onClick={scrollToTop}
      >
        <UpArrowIcon />
      </button>
    </div>
  );
}
