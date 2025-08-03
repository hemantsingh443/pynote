import { useState } from 'react';
import { useNotebookStore } from '../store/notebookStore';
import { Check, X } from 'lucide-react';

interface PackageInstallerProps {
  onClose: () => void;
}

export default function PackageInstaller({ onClose }: PackageInstallerProps) {
  const [packageName, setPackageName] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const installPackage = useNotebookStore((state) => state.installPackage);
  const status = useNotebookStore((state) => state.status);

  const handleInstall = async () => {
    if (!packageName.trim() || isInstalling) return;
    
    setIsInstalling(true);
    setIsSuccess(false);
    
    try {
      await installPackage(packageName.trim());
      setIsSuccess(true);
      setPackageName('');
      
      // Auto-close after successful installation
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error installing package:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="space-y-4 bg-background text-foreground p-4">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleInstall()}
          placeholder="Package name (e.g., numpy, pandas)"
          className="flex-grow p-2 bg-surface-secondary border border-border rounded-md text-foreground focus:ring-2 focus:ring-accent focus:border-transparent"
          disabled={isInstalling}
        />
        <button
          onClick={handleInstall}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          disabled={isInstalling || !packageName.trim()}
        >
          {isInstalling ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Installing...
            </>
          ) : isSuccess ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Installed!
            </>
          ) : (
            'Install'
          )}
        </button>
        <button
          onClick={onClose}
          className="p-2 text-secondary hover:text-foreground"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {status && (
        <div className={`text-sm p-2 rounded ${
          status.includes('error') || status.includes('Error') 
            ? 'bg-error/10 text-error' 
            : 'bg-primary/10 text-primary'
        }`}>
          {status}
        </div>
      )}
    
    </div>
  );
}