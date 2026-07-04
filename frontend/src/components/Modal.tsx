import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

export default Modal;