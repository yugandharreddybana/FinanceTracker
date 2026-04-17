import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isDestructive = true
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "relative glass-card p-8 max-w-md w-full border-white/10 shadow-2xl overflow-hidden",
              isDestructive && "border-negative/30 shadow-[0_0_50px_rgba(239,68,68,0.1)]"
            )}
          >
            {/* Background pattern */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-negative/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 text-center">
              <div className={cn(
                "w-20 h-20 rounded-3xl flex items-center justify-center mb-8 mx-auto rotate-12 transition-transform hover:rotate-0",
                isDestructive ? "bg-negative/10 text-negative" : "bg-accent/10 text-accent"
              )}>
                {isDestructive ? <Trash2 className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
              </div>
              
              <h3 className="text-3xl font-bold mb-4 tracking-tight">{title}</h3>
              <p className="text-white/40 mb-10 text-sm leading-relaxed font-medium">
                {description}
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 px-6 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold uppercase tracking-widest hover:bg-white/10 transition-all text-white/60"
                >
                  {cancelLabel}
                </button>
                <button 
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={cn(
                    "flex-[2] py-4 px-6 rounded-2xl font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95 text-white text-sm",
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
              onClick={onClose}
              title="Close modal"
              className="absolute top-4 right-4 p-2 text-white/20 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeleteModal;
