import React, { useState, useEffect, useRef } from 'react';
import { Move, Maximize2 } from 'lucide-react';
import { Region } from '../types';

interface Props {
  label: string;
  color: string;
  region: Region;
  containerRef: React.RefObject<HTMLDivElement>;
  onUpdate: (newRegion: Region) => void;
  isLocked: boolean;
  minWidth?: number;
  minHeight?: number;
}

const ResizableBox: React.FC<Props> = ({ 
  label, color, region, containerRef, onUpdate, isLocked, minWidth = 100, minHeight = 50 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startDims = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startDims.current = { ...region, w: region.width, h: region.height };
  };

  // Handle Resizing
  const handleResizeDown = (e: React.MouseEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    setIsResizing(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startDims.current = { ...region, w: region.width, h: region.height };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();

      if (isDragging) {
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;
        
        let newX = startDims.current.x + dx;
        let newY = startDims.current.y + dy;

        // Boundary Checks
        newX = Math.max(0, Math.min(newX, containerRect.width - region.width));
        newY = Math.max(0, Math.min(newY, containerRect.height - region.height));

        onUpdate({ ...region, x: newX, y: newY });
      }

      if (isResizing) {
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;

        let newW = Math.max(minWidth, startDims.current.w + dx);
        let newH = Math.max(minHeight, startDims.current.h + dy);

        // Boundary Checks (Right/Bottom)
        if (region.x + newW > containerRect.width) newW = containerRect.width - region.x;
        if (region.y + newH > containerRect.height) newH = containerRect.height - region.y;

        onUpdate({ ...region, width: newW, height: newH });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, region, containerRef, onUpdate, minWidth, minHeight]);

  // Color mappings for Tailwind classes
  const borderColor = color === 'emerald' ? 'border-emerald-500' : 'border-indigo-500';
  const bgColor = color === 'emerald' ? 'bg-emerald-500/10' : 'bg-indigo-500/10';
  const textColor = color === 'emerald' ? 'text-emerald-400' : 'text-indigo-400';
  const handleColor = color === 'emerald' ? 'bg-emerald-500' : 'bg-indigo-500';

  return (
    <div
      style={{
        left: region.x,
        top: region.y,
        width: region.width,
        height: region.height,
      }}
      className={`absolute border-2 ${borderColor} ${bgColor} group transition-colors duration-200 z-20 ${isLocked ? 'cursor-default border-opacity-50' : 'cursor-move hover:bg-opacity-20'}`}
      onMouseDown={handleMouseDown}
    >
      {/* Header / Label */}
      <div className={`absolute -top-6 left-0 flex items-center gap-1.5 ${isLocked ? 'opacity-50' : 'opacity-100'}`}>
         <div className={`px-2 py-0.5 rounded-t-lg ${handleColor} text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1`}>
            {isLocked ? <span className="w-1.5 h-1.5 bg-black/50 rounded-full"/> : <Move className="w-2.5 h-2.5" />}
            {label}
         </div>
      </div>

      {/* Resize Handle (Bottom Right) */}
      {!isLocked && (
        <div 
            className={`absolute -bottom-2 -right-2 w-6 h-6 ${handleColor} rounded-full flex items-center justify-center cursor-se-resize shadow-lg border-2 border-white z-30 group-hover:scale-110 transition-transform`}
            onMouseDown={handleResizeDown}
        >
            <Maximize2 className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Grid Lines for Visual Tech Feel */}
      {!isLocked && (
        <>
            <div className={`absolute top-0 left-1/3 w-px h-full ${borderColor} opacity-20 pointer-events-none border-dashed border-l`}></div>
            <div className={`absolute top-0 right-1/3 w-px h-full ${borderColor} opacity-20 pointer-events-none border-dashed border-l`}></div>
            <div className={`absolute top-1/3 left-0 w-full h-px ${borderColor} opacity-20 pointer-events-none border-dashed border-t`}></div>
            <div className={`absolute bottom-1/3 left-0 w-full h-px ${borderColor} opacity-20 pointer-events-none border-dashed border-t`}></div>
        </>
      )}
    </div>
  );
};

export default ResizableBox;