"use client";

import { useRef } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PreviewAction({
  label,
  title = label,
  description,
  variant = "default",
}: {
  label: string;
  title?: string;
  description: string;
  variant?: "default" | "outline";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Button variant={variant} onClick={() => dialog.current?.showModal()}>
        <Plus size={16} aria-hidden="true" />
        {label}
      </Button>
      <dialog
        ref={dialog}
        className="preview-dialog"
        aria-labelledby={`action-${label.replaceAll(" ", "-")}`}
      >
        <div className="dialog-heading">
          <span className="eyebrow">Preview only</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Close dialog"
            onClick={() => dialog.current?.close()}
          >
            <X size={18} />
          </button>
        </div>
        <h2 id={`action-${label.replaceAll(" ", "-")}`}>{title}</h2>
        <p>{description}</p>
        <p className="muted-note">
          This action will be connected in the functional MVP. No records have
          been created or changed.
        </p>
        <Button onClick={() => dialog.current?.close()}>Back to preview</Button>
      </dialog>
    </>
  );
}
