"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CommonDialogTone = "info" | "warning" | "danger";

export type CommonDialogOptions = {
  title: string;
  message: string;
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: CommonDialogTone;
};

type CommonDialogRequest = CommonDialogOptions & { resolve: (confirmed: boolean) => void };

export function useCommonDialog() {
  const [request, setRequest] = useState<CommonDialogRequest | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: CommonDialogOptions) => new Promise<boolean>((resolve) => {
    setRequest({ ...options, resolve });
  }), []);

  const close = useCallback((confirmed: boolean) => {
    setRequest((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!request) return;
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close, request]);

  const tone = request?.tone ?? "warning";
  const toneIcon = tone === "danger" ? "!" : tone === "warning" ? "?" : "i";
  const dialog = request ? <div className="common-dialog-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) close(false); }}>
    <section className={`common-dialog common-dialog-${tone}`} role="alertdialog" aria-modal="true" aria-labelledby="common-dialog-title" aria-describedby="common-dialog-message">
      <header className="common-dialog-header">
        <div><span className="common-dialog-caption-icon" aria-hidden="true">{toneIcon}</span><strong id="common-dialog-title">{request.title}</strong></div>
        <button type="button" className="common-dialog-close" aria-label="Đóng hộp thoại" onClick={() => close(false)}>×</button>
      </header>
      <div className="common-dialog-content">
        <span className="common-dialog-symbol" aria-hidden="true">{toneIcon}</span>
        <div><p id="common-dialog-message">{request.message}</p>{request.detail && <small>{request.detail}</small>}</div>
      </div>
      <footer className="common-dialog-actions">
        <button ref={cancelButtonRef} type="button" className="button secondary" onClick={() => close(false)}>{request.cancelText ?? "Hủy bỏ"}</button>
        <button type="button" className={`button ${tone === "danger" ? "danger" : "primary"}`} onClick={() => close(true)}>{request.confirmText ?? "Đồng ý"}</button>
      </footer>
    </section>
  </div> : null;

  return { confirm, dialog };
}
