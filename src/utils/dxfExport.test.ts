import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildDxfString, isShapeClosed, downloadDxf, generateDxfFilename, analyzeGaps } from './dxfExport';
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

/** Parse all LWPOLYLINE vertices from DXF string */
function parseVertices(dxf: string): { x: number; y: number; bulge: number }[] {
  const lines = dxf.split('\n');
  const vertices: { x: number; y: number; bulge: number }[] = [];
  let inLWPOLYLINE = false;
  let currentX: number | null = null;
  let currentY: number | null = null;
  let currentBulge = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === 'LWPOLYLINE') {
      inLWPOLYLINE = true;
      continue;
    }
    if (!inLWPOLYLINE) continue;
    if (lines[i] === 'ENDSEC' || lines[i] === '0') {
      if (lines[i] === '0' && lines[i + 1] !== 'ENDSEC' && lines[i + 1] !== 'EOF') continue;
      // Flush last vertex
      if (currentX !== null && currentY !== null) {
        vertices.push({ x: currentX, y: currentY, bulge: currentBulge });
      }
      break;
    }
    if (lines[i] === '10' && i + 1 < lines.length) {
      // Flush previous vertex if we have one
      if (currentX !== null && currentY !== null) {
        vertices.push({ x: currentX, y: currentY, bulge: currentBulge });
        currentBulge = 0;
      }
      currentX = parseFloat(lines[i + 1]);
    }
    if (lines[i] === '20' && i + 1 < lines.length) {
      currentY = parseFloat(lines[i + 1]);
    }
    if (lines[i] === '42' && i + 1 < lines.length) {
      currentBulge = parseFloat(lines[i + 1]);
    }
  }
  return vertices;
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
    const l1 = makeLine('a', 0, 0, 100, 0);
    const l2 = makeLine('b', 100, 0, 50, 100);
    const l3 = makeLine('c', 50, 100, 0, 0);
    expect(isShapeClosed([l1, l2, l3])).toBe(true);
  });

  it('returns false when gap exceeds tolerance', () => {
    const l1 = makeLine('a', 0, 0, 100, 0);
    const l2 = makeLine('b', 100, 0, 1, 0);
    expect(isShapeClosed([l1, l2])).toBe(false);
  });

  it('returns true when gap is within tolerance (0.3px < 0.5px)', () => {
    const l1 = makeLine('a', 0, 0, 100, 0);
    const l2 = makeLine('b', 100, 0, 0.3, 0);
    expect(isShapeClosed([l1, l2])).toBe(true);
  });

  it('uses custom tolerance when provided', () => {
    const l1 = makeLine('a', 0, 0, 100, 0);
    const l2 = makeLine('b', 100, 0, 2.0, 0);
    expect(isShapeClosed([l1, l2], 1.0)).toBe(false);
    expect(isShapeClosed([l1, l2], 3.0)).toBe(true);
  });

  it('works with arc segments using p1 and p2 endpoints', () => {
    const arc = makeArc('a', 50, 50, 50, Math.PI, 0, false, { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: -50 });
    const line = makeLine('b', 100, 0, 0, 0.2);
    expect(isShapeClosed([arc, line])).toBe(true);
  });
});

// ============================================================
// buildDxfString — LWPOLYLINE structure
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

  it('contains $ACADVER AC1015 for LWPOLYLINE support', () => {
    const dxf = buildDxfString([singleLine], 1, 'mm');
    expect(dxf).toContain('$ACADVER');
    expect(dxf).toContain('AC1015');
  });

  it('contains a single LWPOLYLINE entity', () => {
    const dxf = buildDxfString([singleLine], 1, 'mm');
    expect(dxf).toContain('LWPOLYLINE');
    const count = (dxf.match(/LWPOLYLINE/g) ?? []).length;
    expect(count).toBe(1);
  });

  it('sets $INSUNITS to 4 for mm', () => {
    const dxf = buildDxfString([singleLine], 1, 'mm');
    expect(dxf).toMatch(/\$INSUNITS\n70\n4/);
  });

  it('sets $INSUNITS to 1 for inches', () => {
    const dxf = buildDxfString([singleLine], 1, 'in');
    expect(dxf).toMatch(/\$INSUNITS\n70\n1/);
  });

  it('sets closed flag (70=1) when shape is closed', () => {
    const l1 = makeLine('a', 0, 0, 100, 0);
    const l2 = makeLine('b', 100, 0, 0, 0);
    const dxf = buildDxfString([l1, l2], 1, 'mm');
    expect(dxf).toMatch(/70\n1/);
  });

  it('sets open flag (70=0) when shape is not closed', () => {
    const l1 = makeLine('a', 0, 0, 100, 0);
    const l2 = makeLine('b', 100, 0, 50, 50);
    const dxf = buildDxfString([l1, l2], 1, 'mm');
    expect(dxf).toMatch(/70\n0/);
  });
});

// ============================================================
// buildDxfString — vertex coordinate math
// ============================================================

describe('buildDxfString - vertex coordinates', () => {
  it('produces correct vertex for line at (0,100)-(200,100) with pxPerMm=1', () => {
    // Y-flip: start (0,-100), end (200,-100)
    // minX=0, minY=-100
    // Normalized start: (0, 0)
    const line = makeLine('a', 0, 100, 200, 100);
    const dxf = buildDxfString([line], 1, 'mm');
    const verts = parseVertices(dxf);
    expect(verts.length).toBe(1); // single segment = 1 vertex
    expect(verts[0].x).toBeCloseTo(0, 5);
    expect(verts[0].y).toBeCloseTo(0, 5);
    expect(verts[0].bulge).toBe(0); // line = no bulge
  });

  it('scales correctly with pxPerMm=10, unit=mm', () => {
    const line = makeLine('a', 0, 0, 100, 0);
    const dxf = buildDxfString([line], 10, 'mm');
    const verts = parseVertices(dxf);
    // Start at (0,0), scale by 1/10 => 0mm
    expect(verts[0].x).toBeCloseTo(0, 5);
  });

  it('converts mm to inches correctly', () => {
    const line = makeLine('a', 0, 0, 100, 0);
    const dxf = buildDxfString([line], 10, 'in');
    const verts = parseVertices(dxf);
    // 0px / 10 pxPerMm / 25.4 = 0 inches (start point)
    expect(verts[0].x).toBeCloseTo(0, 5);
  });

  it('applies origin normalization', () => {
    // Line from (100,100) to (200,200)
    // Y-flip: (100,-100) to (200,-200)
    // minX=100, minY=-200
    // Normalized start: (0, 100)
    const line = makeLine('a', 100, 100, 200, 200);
    const dxf = buildDxfString([line], 1, 'mm');
    const verts = parseVertices(dxf);
    expect(verts[0].x).toBeCloseTo(0, 5);
    expect(verts[0].y).toBeCloseTo(100, 5);
  });

  it('emits correct vertex count for multiple segments', () => {
    const segments: Segment[] = [
      makeLine('a', 0, 0, 100, 0),
      makeLine('b', 100, 0, 100, 100),
    ];
    const dxf = buildDxfString(segments, 1, 'mm');
    // vertex count group code 90
    expect(dxf).toMatch(/90\n2/);
  });
});

// ============================================================
// buildDxfString — arc bulge values
// ============================================================

describe('buildDxfString - arc bulge', () => {
  it('produces non-zero bulge for arc segments', () => {
    const arc = makeArc('a', 50, 0, 50, 0, Math.PI, false,
      { x: 100, y: 0 }, { x: 0, y: 0 }, { x: 50, y: -50 });
    const dxf = buildDxfString([arc], 1, 'mm');
    const verts = parseVertices(dxf);
    expect(verts[0].bulge).not.toBe(0);
  });

  it('produces zero bulge for line segments', () => {
    const line = makeLine('a', 0, 0, 100, 0);
    const dxf = buildDxfString([line], 1, 'mm');
    const verts = parseVertices(dxf);
    expect(verts[0].bulge).toBe(0);
  });

  it('produces positive bulge for CCW arcs in DXF space (canvas CW)', () => {
    // anticlockwise=false in canvas (CW in screen) => CCW after Y-flip => positive bulge
    const arc = makeArc('a', 50, 0, 50, 0, Math.PI, false,
      { x: 100, y: 0 }, { x: 0, y: 0 }, { x: 50, y: -50 });
    const dxf = buildDxfString([arc], 1, 'mm');
    const verts = parseVertices(dxf);
    expect(verts[0].bulge).toBeGreaterThan(0);
  });

  it('produces negative bulge for CW arcs in DXF space (canvas CCW)', () => {
    // anticlockwise=true in canvas (CCW in screen) => CW after Y-flip => negative bulge
    const arc = makeArc('a', 50, 0, 50, 0, Math.PI, true,
      { x: 100, y: 0 }, { x: 0, y: 0 }, { x: 50, y: 50 });
    const dxf = buildDxfString([arc], 1, 'mm');
    const verts = parseVertices(dxf);
    expect(verts[0].bulge).toBeLessThan(0);
  });

  it('handles mixed line and arc segments', () => {
    const line = makeLine('a', 0, 0, 100, 0);
    const arc = makeArc('b', 50, 50, 50, 0, Math.PI, false,
      { x: 100, y: 50 }, { x: 0, y: 50 }, { x: 50, y: 0 });
    const dxf = buildDxfString([line, arc], 1, 'mm');
    const verts = parseVertices(dxf);
    expect(verts.length).toBe(2);
    expect(verts[0].bulge).toBe(0); // line
    expect(verts[1].bulge).not.toBe(0); // arc
  });
});

// ============================================================
// analyzeGaps
// ============================================================

describe('analyzeGaps', () => {
  it('returns empty gaps for empty segments', () => {
    const result = analyzeGaps([], 1, 'mm');
    expect(result.gaps).toHaveLength(0);
    expect(result.maxGap).toBe(0);
  });

  it('detects closure gap between last end and first start', () => {
    const l1 = makeLine('a', 0, 0, 100, 0);
    const l2 = makeLine('b', 100, 0, 50, 50);
    // Gap from (50,50) back to (0,0) = ~70.7px
    const result = analyzeGaps([l1, l2], 1, 'mm');
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.maxGap).toBeGreaterThan(50);
  });

  it('detects consecutive segment gaps', () => {
    const l1 = makeLine('a', 0, 0, 100, 0);
    const l2 = makeLine('b', 105, 0, 200, 0); // 5px gap between l1.end and l2.start
    const result = analyzeGaps([l1, l2], 1, 'mm');
    const consecutiveGap = result.gaps.find(g => g.fromSegmentIndex === 0 && g.toSegmentIndex === 1);
    expect(consecutiveGap).toBeDefined();
    expect(consecutiveGap!.distance).toBeCloseTo(5, 1);
  });

  it('converts maxGap to real-world units', () => {
    const l1 = makeLine('a', 0, 0, 100, 0);
    const l2 = makeLine('b', 100, 0, 50, 50);
    const result = analyzeGaps([l1, l2], 10, 'mm');
    // maxGap in world px / 10 pxPerMm = mm
    expect(result.maxGapReal).toBeCloseTo(result.maxGap / 10, 3);
  });

  it('sets canAutoClose=true for small gaps', () => {
    const l1 = makeLine('a', 0, 0, 100, 0);
    const l2 = makeLine('b', 100, 0, 5, 0); // small closure gap
    const result = analyzeGaps([l1, l2], 1, 'mm');
    expect(result.canAutoClose).toBe(true);
  });

  it('returns no gaps for perfectly closed shape', () => {
    const l1 = makeLine('a', 0, 0, 100, 0);
    const l2 = makeLine('b', 100, 0, 0, 0);
    const result = analyzeGaps([l1, l2], 1, 'mm');
    expect(result.gaps).toHaveLength(0);
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
    const month = parts[3];
    expect(month).toMatch(/^\d{2}$/);
  });

  it('uses zero-padded day', () => {
    const filename = generateDxfFilename();
    const parts = filename.replace('.dxf', '').split('-');
    const day = parts[4];
    expect(day).toMatch(/^\d{2}$/);
  });
});

// ============================================================
// downloadDxf
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

    globalThis.URL = {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    } as unknown as typeof URL;

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
