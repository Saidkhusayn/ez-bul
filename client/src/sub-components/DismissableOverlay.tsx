import { forwardRef } from 'react';

type DismissableOverlayProps = {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void; //this is not used, fix this
  className?: string;
};

const DismissableOverlay = forwardRef<HTMLDivElement, DismissableOverlayProps>(
  ({ children, isOpen, className }, ref) => {
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