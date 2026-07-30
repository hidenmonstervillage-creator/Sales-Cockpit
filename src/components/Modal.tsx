import { useEffect } from "react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "narrow" | "normal" | "wide";
  headExtra?: ReactNode;
  bodyless?: boolean;
}

export function Modal({ title, onClose, children, footer, size = "normal", headExtra, bodyless }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cls = size === "normal" ? "modal" : `modal ${size}`;

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cls} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <div className="spacer" />
          {headExtra}
          <button className="btn ghost sm" onClick={onClose} title="Затвори (Esc)">
            ✕
          </button>
        </div>
        {bodyless ? children : <div className="modal-body">{children}</div>}
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Изтрий",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      title={title}
      size="narrow"
      onClose={onCancel}
      footer={
        <>
          <button className="btn" onClick={onCancel}>
            Отказ
          </button>
          <button className="btn danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ whiteSpace: "pre-wrap" }}>{message}</div>
    </Modal>
  );
}
