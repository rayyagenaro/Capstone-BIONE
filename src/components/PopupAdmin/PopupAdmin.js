import { useEffect } from "react";

export default function PopupAdmin({ message, type = "success", onClose }) {
  // Auto-close dalam 3 detik (optional)
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 relative w-[350px] text-center">
        {/* Tombol close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        {/* Icon status */}
        <div className="flex justify-center mb-4">
          {type === "success" ? (
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-green-100">
              <span className="text-green-500 text-3xl">✔</span>
            </div>
          ) : (
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-100">
              <span className="text-red-500 text-3xl">✖</span>
            </div>
          )}
        </div>

        {/* Pesan */}
        <p className="text-lg font-semibold text-gray-800">{message}</p>
      </div>
    </div>
  );
}