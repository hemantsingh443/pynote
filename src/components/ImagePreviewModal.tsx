import { X } from 'lucide-react';

interface ImagePreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

export default function ImagePreviewModal({ imageUrl, onClose }: ImagePreviewModalProps) {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="relative" onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose}
          className="absolute -top-2 -right-2 bg-gray-800 rounded-full p-1 text-white hover:bg-gray-700 transition-colors"
          aria-label="Close preview"
        >
          <X className="h-5 w-5" />
        </button>
        <img 
          src={imageUrl} 
          alt="Preview" 
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239ca3af"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z"/></svg>';
          }}
        />
      </div>
    </div>
  );
}
