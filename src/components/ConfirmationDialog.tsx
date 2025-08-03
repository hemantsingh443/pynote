
interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <h3 className="text-lg font-medium text-foreground mb-2">
          {title}
        </h3>
        <p className="text-secondary mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-secondary bg-surface-secondary rounded-md hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-error rounded-md hover:bg-error/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
