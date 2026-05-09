import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (inputValue?: string) => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  requireConfirmText?: string;
  placeholder?: string;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isDestructive = true,
  requireConfirmText,
  placeholder = "Type here..."
}) => {
  const [inputValue, setInputValue] = React.useState('');
  const [error, setError] = React.useState(false);

  const handleConfirm = () => {
    if (requireConfirmText && inputValue !== requireConfirmText) {
      setError(true);
      return;
    }
    onConfirm(inputValue);
    setInputValue('');
    setError(false);
    onClose();
  };

  const handleClose = () => {
    setInputValue('');
    setError(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "relative glass-card p-10 max-w-lg w-full border-white/10 shadow-3xl overflow-hidden",
              isDestructive && "border-negative/30 shadow-[0_0_80px_rgba(239,68,68,0.15)]"
            )}
          >
            {/* Background pattern */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 text-center">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-8 mx-auto",
                isDestructive ? "bg-negative/10 text-negative" : "bg-accent/10 text-accent"
              )}>
                {isDestructive ? <Trash2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
              </div>
              
              <h3 className="text-3xl font-bold mb-4 tracking-tight font-display">{title}</h3>
              <p className="text-white/50 mb-8 text-base leading-relaxed">
                {description}
              </p>

              {requireConfirmText && (
                <div className="mb-8 text-left">
                  <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">
                    Type <span className="text-white">"{requireConfirmText}"</span> to confirm
                  </p>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      if (error) setError(false);
                    }}
                    placeholder={placeholder}
                    className={cn(
                      "w-full bg-white/5 border px-5 py-4 rounded-2xl text-white placeholder:text-white/20 transition-all outline-none",
                      error ? "border-negative shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "border-white/10 focus:border-accent shadow-inner"
                    )}
                  />
                  {error && (
                    <p className="text-negative text-[10px] font-bold mt-2 uppercase tracking-wider">
                      Please enter the correct confirmation command
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex gap-4">
                <button 
                  onClick={handleClose}
                  className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all text-white/60"
                >
                  {cancelLabel}
                </button>
                <button 
                  onClick={handleConfirm}
                  className={cn(
                    "flex-[2] py-4 px-6 rounded-2xl font-bold uppercase tracking-widest transition-all shadow-xl active:scale-95 text-white text-xs",
                    isDestructive 
                      ? "bg-negative hover:bg-negative/80 shadow-negative/20" 
                      : "bg-accent hover:bg-accent/80 shadow-accent/20"
                  )}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
            
            <button 
              onClick={handleClose}
              title="Close modal"
              className="absolute top-6 right-6 p-2 text-white/20 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeleteModal;
