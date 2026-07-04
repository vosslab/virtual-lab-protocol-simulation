export interface Bbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export declare function bboxContains(outer: Bbox, inner: Bbox): boolean;
export declare function bboxsOverlap(bbox1: Bbox, bbox2: Bbox, tolerance?: number): boolean;
export declare function extractViewBoxDimensions(viewBoxStr: string | null): Bbox | null;
