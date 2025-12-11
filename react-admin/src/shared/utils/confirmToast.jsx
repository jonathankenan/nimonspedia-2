import { toast } from 'react-toastify';

export const confirmToast = (message, onConfirm) => {
  const ToastContent = () => (
    <div>
      <div className="mb-2">{message}</div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => toast.dismiss(toastId)}
          className="px-3 py-1 bg-gray-300 rounded"
        >
          Batal
        </button>
        <button
          onClick={() => {
            onConfirm();
            toast.dismiss(toastId);
          }}
          className="px-3 py-1 bg-blue-500 text-white rounded"
        >
          Ya
        </button>
      </div>
    </div>
  );

  const toastId = toast.info(<ToastContent />, {
    autoClose: false,
    closeOnClick: false,
    closeButton: false,
  });
};
