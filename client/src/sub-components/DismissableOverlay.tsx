import { forwardRef } from 'react';

type DismissableOverlayProps = {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
};

const DismissableOverlay = forwardRef<HTMLDivElement, DismissableOverlayProps>(
  ({ children, isOpen, onClose, className }, ref) => {
    if (!isOpen) return null;

    return (
      <div 
        ref={ref}
        className={`${className}`}
        role="menu"
        aria-hidden={!isOpen}
      >
        {children}
      </div>
    );
  }
);

export default DismissableOverlay;