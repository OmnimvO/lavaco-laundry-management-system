type ToastProps = {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
};

function Toast({
  message,
  type = "success",
  onClose,
}: ToastProps) {
  return (
    <div
      className={`toast toast-${type}`}
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>

      <button
        type="button"
        className="toast-close"
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}

export default Toast;