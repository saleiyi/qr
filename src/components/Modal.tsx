import React, { useLayoutEffect, useRef } from 'react';

interface FocusReturnTarget {
  element: HTMLElement | null;
  parent?: FocusReturnTarget;
}

const focusReturnTargets = new WeakMap<HTMLDialogElement, FocusReturnTarget>();

interface ModalProps extends Omit<
  React.DialogHTMLAttributes<HTMLDialogElement>,
  'open' | 'onClose' | 'onCancel'
> {
  open?: boolean;
  onClose: () => void;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  printable?: boolean;
}

/** Native modality contains focus and makes everything outside the dialog inert. */
export function Modal({
  open = true,
  onClose,
  initialFocusRef,
  printable = false,
  className,
  children,
  onKeyDown,
  ...dialogProps
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const parentDialog = previousFocus?.closest('dialog');
    const returnTarget: FocusReturnTarget = {
      element: previousFocus,
      parent: parentDialog ? focusReturnTargets.get(parentDialog) : undefined,
    };
    focusReturnTargets.set(dialog, returnTarget);
    dialog.showModal();
    initialFocusRef?.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      // The parent may close with its confirmation; walk back to a live opener.
      let target: FocusReturnTarget | undefined = returnTarget;
      while (target) {
        const element = target.element;
        const containingDialog = element?.closest('dialog');
        if (element?.isConnected && (!containingDialog || containingDialog.open)) {
          element.focus({ preventScroll: true });
          if (document.activeElement === element) break;
        }
        target = target.parent;
      }
      focusReturnTargets.delete(dialog);
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  return (
    <dialog
      {...dialogProps}
      ref={dialogRef}
      className={`app-modal ${printable ? '' : 'no-print'}`}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.key === 'Tab' && !event.defaultPrevented) {
          const dialog = event.currentTarget;
          const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
            'button, a[href], input, select, textarea, [tabindex]',
          )).filter((element) =>
            element.tabIndex >= 0 && !element.matches(':disabled') &&
            element.getClientRects().length > 0,
          );
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (!first) {
            event.preventDefault();
            dialog.focus();
          } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
            event.preventDefault();
            first.focus();
          }
          event.stopPropagation();
        }
        // A nested confirmation must not trigger its parent's Escape listener.
        if (event.key === 'Escape') event.stopPropagation();
      }}
    >
      <div className={className}>{children}</div>
    </dialog>
  );
}
