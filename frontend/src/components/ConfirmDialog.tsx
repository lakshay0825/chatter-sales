import { useLoadingStore } from '../store/loadingStore';
import { create } from 'zustand';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>(() => ({
  isOpen: false,
  message: '',
}));

export function openConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.setState({
      isOpen: true,
      resolve,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      variant: options.variant ?? 'default',
    });
  });
}

export default function ConfirmDialog() {
  const { isOpen, title, message, confirmLabel, cancelLabel, variant, resolve } =
    useConfirmStore();
  const { startLoading, stopLoading } = useLoadingStore();

  if (!isOpen) return null;

  const handleClose = (value: boolean) => {
    if (resolve) {
      resolve(value);
    }
    useConfirmStore.setState({ isOpen: false, resolve: undefined });
  };

  const handleConfirm = () => {
    // Brief loading pulse for better UX (optional)
    startLoading();
    setTimeout(() => {
      stopLoading();
      handleClose(true);
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        {title && <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>}
        <p className="text-sm text-gray-700 mb-6 whitespace-pre-line">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleClose(false)}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}


