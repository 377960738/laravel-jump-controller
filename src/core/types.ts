export interface OffsetRange {
  start: number;
  end: number;
}

export type RouteTargetKind = 'action' | 'invokable' | 'resource';

export interface RouteTarget {
  controller: string;
  method?: string;
  kind: RouteTargetKind;
  controllerRange: OffsetRange;
  methodRange?: OffsetRange;
}

export interface ParseResult {
  targets: RouteTarget[];
  errors: string[];
}
