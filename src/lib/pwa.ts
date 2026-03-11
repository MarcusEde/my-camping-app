// src/lib/pwa.ts

export function applyPWAMeta(brand: string): () => void {
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement("meta");
    metaTheme.setAttribute("name", "theme-color");
    document.head.appendChild(metaTheme);
  }
  metaTheme.setAttribute("content", brand);

  let metaCapable = document.querySelector(
    'meta[name="apple-mobile-web-app-capable"]',
  );
  if (!metaCapable) {
    metaCapable = document.createElement("meta");
    metaCapable.setAttribute("name", "apple-mobile-web-app-capable");
    metaCapable.setAttribute("content", "yes");
    document.head.appendChild(metaCapable);
  }

  let metaStatus = document.querySelector(
    'meta[name="apple-mobile-web-app-status-bar-style"]',
  );
  if (!metaStatus) {
    metaStatus = document.createElement("meta");
    metaStatus.setAttribute("name", "apple-mobile-web-app-status-bar-style");
    metaStatus.setAttribute("content", "black-translucent");
    document.head.appendChild(metaStatus);
  }

  document.body.style.overscrollBehavior = "none";
  document.documentElement.style.overscrollBehavior = "none";

  return () => {
    document.body.style.overscrollBehavior = "";
    document.documentElement.style.overscrollBehavior = "";
  };
}
