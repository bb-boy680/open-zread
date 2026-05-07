import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import mermaid from 'mermaid';
import { X } from 'lucide-react';

interface MermaidPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
}

interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 3;

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function parseSvgSize(svg: string): Size {
  const viewBox = svg.match(/viewBox="([^"]+)"/i)?.[1]?.split(/\s+/).map(Number);
  if (viewBox && viewBox.length === 4) {
    return { width: viewBox[2], height: viewBox[3] };
  }

  const width = Number(svg.match(/width="([^"]+)"/i)?.[1]?.replace(/px$/, ''));
  const height = Number(svg.match(/height="([^"]+)"/i)?.[1]?.replace(/px$/, ''));

  return {
    width: Number.isFinite(width) && width > 0 ? width : 1200,
    height: Number.isFinite(height) && height > 0 ? height : 800
  };
}

export function MermaidPreviewModal({ open, onOpenChange, content }: MermaidPreviewModalProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [svg, setSvg] = useState('');
  const [svgSize, setSvgSize] = useState<Size>({ width: 1200, height: 800 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartRef = useRef<Point>({ x: 0, y: 0 });
  const offsetStartRef = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) return;
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
    dragPointerIdRef.current = null;
  }, [open]);

  const renderPreview = useCallback(async () => {
    const uniqueId = `mermaid-preview-${crypto.randomUUID()}`;
    const { svg: renderedSvg } = await mermaid.render(uniqueId, content);
    setSvg(renderedSvg);
    setSvgSize(parseSvgSize(renderedSvg));
  }, [content]);

  useEffect(() => {
    if (!open) return;
    void renderPreview();
  }, [open, renderPreview]);

  useEffect(() => {
    if (!open || !viewportRef.current) return;

    const viewport = viewportRef.current;
    const fit = () => {
      const padding = 120;
      const availableWidth = Math.max(0, viewport.clientWidth - padding * 2);
      const availableHeight = Math.max(0, viewport.clientHeight - padding * 2);
      const fitScale = Math.min(availableWidth / svgSize.width, availableHeight / svgSize.height);
      setScale(clampScale(Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 1));
      setOffset({ x: 0, y: 0 });
    };

    fit();

    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(viewport);
    return () => resizeObserver.disconnect();
  }, [open, svgSize]);

  const transform = useMemo(
    () => `translate(${offset.x}px, ${offset.y}px)`,
    [offset.x, offset.y]
  );

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setScale((current) => clampScale(current - event.deltaY * 0.0015));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragPointerIdRef.current = event.pointerId;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    offsetStartRef.current = offset;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || dragPointerIdRef.current !== event.pointerId) return;

    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;

    setOffset({
      x: offsetStartRef.current.x + deltaX,
      y: offsetStartRef.current.y + deltaY
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    dragPointerIdRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="mermaid-preview-overlay" />
        <Dialog.Content className="mermaid-preview-content">
          <div className="mermaid-preview-shell">
            <div className="mermaid-preview-toolbar">
              <div className="mermaid-preview-zoom">{Math.round(scale * 100)}%</div>
              <Dialog.Close asChild>
                <button type="button" className="mermaid-preview-close" aria-label="关闭 Mermaid 预览">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>

            <div
              ref={viewportRef}
              className={`mermaid-preview-viewport ${dragging ? 'is-dragging' : ''}`}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <div
                className="mermaid-preview-transform"
                style={{ transform }}
              >
                <div
                  className="mermaid mermaid-preview-diagram"
                  style={{
                    width: `${svgSize.width * scale}px`,
                    height: 'auto'
                  }}
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
