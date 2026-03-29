import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildDxfString, isShapeClosed, downloadDxf, generateDxfFilename } from './dxfExport';
import type { LineSegment, ArcSegment, Segment } from '../types';

// ============================================================
// Test fixtures
// ============================================================

function makeLine(
  id: string,
  x1: number, y1: number,
  x2: number, y2: number
): LineSegment {
  return { id, type: 'line', start: { x: x1, y: y1 }, end: { x: x2, y: y2 } };
}

function makeArc(
  id: string,
  cx: number, cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  anticlockwise: boolean,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): ArcSegment {
  return { id, type: 'arc', center: { x: cx, y: cy }, radius, startAngle, endAngle, anticlockwise, p1, p2, p3 };
}

// ============================================================
// isShapeClosed
// ============================================================

describe('isShapeClosed', () => {
  it('returns false for empty segments', () => {
    expect(isShapeClosed([])).toBe(false);
  });

  it('returns false for a single line segment (start != end)', () => {
    const seg = makeLine('a', 0, 0, 100, 0);
    expect(isShapeClosed([seg])).toBe(false);
  });

  it('returns true when first start matches last end within default 0.5px tolerance', () => {
    // Two lines forming a closed triangle
    const l1 = makeLine('a', 0, 0, 100, 0);
    const l2 = makeLine('b', 100, 0, 50, 100);
    const l3 = makeLine('c', 50, 100, 0, 0); // end = first start exactly
    expect(isShapeClosed([l1, l2, l3])).toBe(true);
  });

  it('returns false when gap exceeds tolerance', () => {
    const l1 = makeLine('a', 0, 0, 100, 0);
    const l2 = makeLine('b', 100, 0, 1, 0); // ends at (1,0), starts at (0,0) — gap = 1px
    expect(isShapeClosed([l1, l2])).toBe(false);
  });

  it('returns true when gap is within tolerance (0.3px < 0.5px)', () => {
    const l1 = makeLine('a', 0, 0, 100, 0);
    const l2 = makeLine('b', 100, 0, 0.3, 0); // ends at (0.3,0), starts at (0,0) — gap = 0.3px
    expect(isShapeClosed([l1, l2])).toBe(true);
  });

  it('uses custom tolerance when provided', () => {
    const l1 = makeLine('a', 0, 0, 100, 0);
    const l2 = makeLine('b', 100, 0, 2.0, 0); // gap = 2px
    expect(isShapeClosed([l1, l2], 1.0)).toBe(false);
    expect(isShapeClosed([l1, l2], 3.0)).toBe(true);
  });

  it('works with arc segments using p1 and p2 endpoints', () => {
    // Arc from p1=(0,0) to p2=(100,0), line from (100,0) back to (0,0.2)
    const arc = makeArc('a', 50, 50, 50, Math.PI, 0, false, { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: -50 });
    const line = makeLine('b', 100, 0, 0, 0.2); // ends at (0, 0.2), first seg starts at (0,0)
    // Gap = 0.2 < 0.5 => closed
    expect(isShapeClosed([arc, line])).toBe(true);
  });
});

// ============================================================
// buildDxfString — structure
// ============================================================

describe('buildDxfString - DXF structure', () => {
  const singleLine = makeLine('a', 0, 100, 200, 100);

  it('starts with HEADER section', () => {
    const dxf = buildDxfString([singleLine], 1, 'mm');
    expect(dxf).toMatch(/^0\nSECTION\n2\nHEADER/);
  });

  it('ends with EOF', () => {
    const dxf = buildDxfString([singleLine], 1, 'mm');
    expect(dxf).toMatch(/0\nEOF\n$/);
  });

  it('contains $ACADVER AC1009', () => {
    const dxf = buildDxfString([singleLine], 1, 'mm');
    expect(dxf).toContain('$ACADVER');
    expect(dxf).toContain('AC1009');
  });

  it('contains ENTITIES section', () => {
    const dxf = buildDxfString([singleLine], 1, 'mm');
    expect(dxf).toContain('ENTITIES');
  });

  it('sets $INSUNITS to 4 for mm', () => {
    const dxf = buildDxfString([singleLine], 1, 'mm');
    expect(dxf).toContain('$INSUNITS');
    // group code 70 then value 4 (format: $INSUNITS\n70\n4)
    expect(dxf).toMatch(/\$INSUNITS\n70\n4/);
  });

  it('sets $INSUNITS to 1 for inches', () => {
    const dxf = buildDxfString([singleLine], 1, 'in');
    expect(dxf).toContain('$INSUNITS');
    expect(dxf).toMatch(/\$INSUNITS\n70\n1/);
  });
});

// ============================================================
// buildDxfString — LINE entity coordinate math
// ============================================================

describe('buildDxfString - LINE entity coordinates', () => {
  it('produces correct coords for horizontal line at (0,100)-(200,100) with pxPerMm=1, unit=mm', () => {
    // Y-flip: y -> -y  => (0,-100) and (200,-100)
    // MinY = -100, minX = 0
    // Origin normalize: (0,-100-(-100)) = (0,0) and (200,0)
    // Scale: 1px/mm => coords in mm: (0,0) and (200,0)
    const line = makeLine('a', 0, 100, 200, 100);
    const dxf = buildDxfString([line], 1, 'mm');

    // Should contain LINE entity
    expect(dxf).toContain('LINE');
    // Start point x=0, y=0
    expect(dxf).toContain('10\n0.000000');
    expect(dxf).toContain('20\n0.000000');
    // End point x=200, y=0
    expect(dxf).toContain('11\n200.000000');
    expect(dxf).toContain('21\n0.000000');
  });

  it('scales correctly with pxPerMm=10, unit=mm', () => {
    // line from (0,0) to (100,0), Y-flip -> (0,0) to (100,0) (no flip change for y=0)
    // origin: already at 0,0
    // scale 1/10 => 10mm length
    const line = makeLine('a', 0, 0, 100, 0);
    const dxf = buildDxfString([line], 10, 'mm');
    expect(dxf).toContain('10\n0.000000');
    expect(dxf).toContain('11\n10.000000');
  });

  it('converts mm to inches correctly (pxPerMm=10, unit=in)', () => {
    // 100px / 10 pxPerMm = 10mm / 25.4 = ~0.393701 inches
    const line = makeLine('a', 0, 0, 100, 0);
    const dxf = buildDxfString([line], 10, 'in');
    expect(dxf).toContain('11\n' + (100 / 10 / 25.4).toFixed(6));
  });

  it('applies origin normalization so minimum coordinate is 0,0', () => {
    // Line from (100,100) to (200,200)
    // Y-flip: (100,-100) to (200,-200)
    // minX=100, minY=-200
    // Normalized: (0, 100) to (100, 200)  ... wait
    // (100-100, -100-(-200)) = (0, 100) and (200-100, -200-(-200)) = (100, 0)
    // scale 1px/mm => 0,100 and 100,0
    const line = makeLine('a', 100, 100, 200, 200);
    const dxf = buildDxfString([line], 1, 'mm');
    // Start: x=0, y=100
    expect(dxf).toContain('10\n0.000000');
    expect(dxf).toContain('20\n100.000000');
    // End: x=100, y=0
    expect(dxf).toContain('11\n100.000000');
    expect(dxf).toContain('21\n0.000000');
  });

  it('uses Z=0 for all line coordinates', () => {
    const line = makeLine('a', 0, 0, 100, 0);
    const dxf = buildDxfString([line], 1, 'mm');
    // Should have 30 and 31 group codes with 0.0
    expect(dxf).toContain('30\n0.000000');
    expect(dxf).toContain('31\n0.000000');
  });

  it('emits layer 0 for line entity', () => {
    const line = makeLine('a', 0, 0, 100, 0);
    const dxf = buildDxfString([line], 1, 'mm');
    // LINE entity followed by layer 0
    const lineIdx = dxf.indexOf('LINE');
    const afterLine = dxf.slice(lineIdx);
    expect(afterLine).toMatch(/8\n0\n/);
  });
});

// ============================================================
// buildDxfString — ARC entity coordinate math
// ============================================================

describe('buildDxfString - ARC entity', () => {
  it('negates arc center Y (Y-flip)', () => {
    // Arc centered at (50, 100), radius 50
    // Y-flip center: (50, -100)
    // All coords: for bounding box, x from 0 to 100, y from -150 to -50
    // minX = 0, minY = -150
    // normalized center: (50-0, -100-(-150)) = (50, 50)
    const arc = makeArc('a', 50, 100, 50, 0, Math.PI, false,
      { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 50, y: 50 });
    const dxf = buildDxfString([arc], 1, 'mm');
    expect(dxf).toContain('ARC');
    // Center x = 50
    expect(dxf).toContain('10\n50.000000');
    // Center y = 50 (after flip and normalization)
    expect(dxf).toContain('20\n50.000000');
  });

  it('scales arc radius by pxPerMm', () => {
    // radius 50px, pxPerMm=10 => 5mm
    const arc = makeArc('a', 0, 0, 50, 0, Math.PI, false,
      { x: 50, y: 0 }, { x: -50, y: 0 }, { x: 0, y: -50 });
    const dxf = buildDxfString([arc], 10, 'mm');
    expect(dxf).toContain('40\n5.000000');
  });

  it('converts arc angles from radians to degrees', () => {
    // Arc with startAngle=0, endAngle=PI/2 (canvas convention, CW in screen)
    // anticlockwise=false (CW in screen) => CCW after Y-flip => no swap
    // Negate angles: start=0, end=-90
    // Normalize: start=0, end=270
    const arc = makeArc('a', 0, 0, 50, 0, Math.PI / 2, false,
      { x: 50, y: 0 }, { x: 0, y: 50 }, { x: 35, y: 35 });
    const dxf = buildDxfString([arc], 1, 'mm');
    expect(dxf).toContain('50\n0.000000');
    expect(dxf).toContain('51\n270.000000');
  });

  it('swaps start/end angles when anticlockwise=true', () => {
    // Arc with startAngle=0, endAngle=PI/2 (canvas convention)
    // anticlockwise=true (CCW in screen) => CW after Y-flip => swap
    // Before swap: start=normDeg(-0 * 180/PI)=0, end=normDeg(-90)=270
    // After swap: start=270, end=0
    const arc = makeArc('a', 0, 0, 50, 0, Math.PI / 2, true,
      { x: 50, y: 0 }, { x: 0, y: 50 }, { x: 35, y: -35 });
    const dxf = buildDxfString([arc], 1, 'mm');
    expect(dxf).toContain('50\n270.000000');
    expect(dxf).toContain('51\n0.000000');
  });

  it('normalizes angles to [0, 360) range', () => {
    // startAngle = PI (canvas), anticlockwise=false
    // negate: -PI => degrees: -180
    // normalize: 180
    const arc = makeArc('a', 0, 0, 50, Math.PI, 2 * Math.PI, false,
      { x: -50, y: 0 }, { x: 50, y: 0 }, { x: 0, y: 50 });
    const dxf = buildDxfString([arc], 1, 'mm');
    // startAngle=PI => dxf start=180 (normalized)
    expect(dxf).toContain('50\n180.000000');
    // endAngle=2PI => dxf end=0 (normalized)
    expect(dxf).toContain('51\n0.000000');
  });

  it('includes arc bounding box in origin normalization (not just center)', () => {
    // Arc centered at (10,10), radius=15
    // Arc extends to x from -5 to 25, y from -5 to 25
    // Y-flip: center (10,-10), bounds x:-5 to 25, y: -25 to -5
    // Wait, we need to recalculate:
    // center.y flipped = -10
    // arc y bounds: -10 - 15 = -25 to -10 + 15 = 5
    // But only arc y flipped coords: -center.y +/- radius = -(-10) = no...
    // Let me think: with center at (10,10), after Y-flip: center=(10,-10)
    // Arc extends: x from 10-15=-5 to 10+15=25, y from -10-15=-25 to -10+15=5
    // minX=-5, minY=-25
    // normalized center: (10-(-5), -10-(-25)) = (15, 15)
    const arc = makeArc('a', 10, 10, 15, 0, 2 * Math.PI, false,
      { x: 25, y: 10 }, { x: 25, y: 10 }, { x: 10, y: -5 });
    const dxf = buildDxfString([arc], 1, 'mm');
    // Center should be at (15, 15) after normalization
    expect(dxf).toContain('10\n15.000000');
    expect(dxf).toContain('20\n15.000000');
  });
});

// ============================================================
// generateDxfFilename
// ============================================================

describe('generateDxfFilename', () => {
  it('returns panel-trace-YYYY-MM-DD.dxf format', () => {
    const filename = generateDxfFilename();
    expect(filename).toMatch(/^panel-trace-\d{4}-\d{2}-\d{2}\.dxf$/);
  });

  it('uses 4-digit year', () => {
    const filename = generateDxfFilename();
    const year = parseInt(filename.split('-')[2], 10);
    expect(year).toBeGreaterThanOrEqual(2024);
  });

  it('uses zero-padded month', () => {
    const filename = generateDxfFilename();
    const parts = filename.replace('.dxf', '').split('-');
    const month = parts[3]; // panel-trace-2026-03-28 => index 3
    expect(month).toMatch(/^\d{2}$/);
    expect(parseInt(month, 10)).toBeGreaterThanOrEqual(1);
    expect(parseInt(month, 10)).toBeLessThanOrEqual(12);
  });

  it('uses zero-padded day', () => {
    const filename = generateDxfFilename();
    const parts = filename.replace('.dxf', '').split('-');
    const day = parts[4]; // panel-trace-2026-03-28 => index 4
    expect(day).toMatch(/^\d{2}$/);
    expect(parseInt(day, 10)).toBeGreaterThanOrEqual(1);
    expect(parseInt(day, 10)).toBeLessThanOrEqual(31);
  });
});

// ============================================================
// downloadDxf (structural/mock tests — no DOM needed)
// ============================================================

describe('downloadDxf', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let mockClick: ReturnType<typeof vi.fn>;
  let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    mockRevokeObjectURL = vi.fn();
    mockClick = vi.fn();
    mockAnchor = { href: '', download: '', click: mockClick };

    // Set up URL mock
    globalThis.URL = {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    } as unknown as typeof URL;

    // Set up document mock in node environment
    globalThis.document = {
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === 'a') return mockAnchor;
        return { href: '', download: '', click: vi.fn() };
      }),
    } as unknown as Document;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a Blob with type application/dxf', () => {
    const BlobSpy = vi.spyOn(globalThis, 'Blob').mockImplementation(function(this: Blob, _content: BlobPart[], options?: BlobPropertyBag) {
      return new (class MockBlob { type = options?.type ?? ''; })() as unknown as Blob;
    } as unknown as typeof Blob);

    downloadDxf('0\nEOF\n', 'test.dxf');

    expect(BlobSpy).toHaveBeenCalledWith(
      expect.arrayContaining(['0\nEOF\n']),
      expect.objectContaining({ type: 'application/dxf' })
    );
    BlobSpy.mockRestore();
  });

  it('calls URL.createObjectURL with the blob', () => {
    downloadDxf('0\nEOF\n', 'test.dxf');
    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
  });

  it('sets download attribute to filename', () => {
    downloadDxf('0\nEOF\n', 'panel-trace-2026-03-28.dxf');
    expect(mockAnchor.download).toBe('panel-trace-2026-03-28.dxf');
  });

  it('clicks the anchor element', () => {
    downloadDxf('0\nEOF\n', 'test.dxf');
    expect(mockClick).toHaveBeenCalledOnce();
  });

  it('revokes the object URL after click', () => {
    downloadDxf('0\nEOF\n', 'test.dxf');
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});

// ============================================================
// buildDxfString — multiple segments
// ============================================================

describe('buildDxfString - multiple segments', () => {
  it('emits one entity per segment', () => {
    const segments: Segment[] = [
      makeLine('a', 0, 0, 100, 0),
      makeLine('b', 100, 0, 100, 100),
    ];
    const dxf = buildDxfString(segments, 1, 'mm');
    const lineCount = (dxf.match(/^LINE$/gm) ?? []).length;
    expect(lineCount).toBe(2);
  });

  it('handles mixed line and arc segments', () => {
    const line = makeLine('a', 0, 0, 100, 0);
    const arc = makeArc('b', 50, 50, 50, 0, Math.PI, false,
      { x: 100, y: 50 }, { x: 0, y: 50 }, { x: 50, y: 0 });
    const segments: Segment[] = [line, arc];
    const dxf = buildDxfString(segments, 1, 'mm');
    expect(dxf).toContain('LINE');
    expect(dxf).toContain('ARC');
  });
});
