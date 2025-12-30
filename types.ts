
export type StringIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface TabNote {
  fret: string; // "0", "12", "h", "p", "b", "s", etc.
}

export type TabColumn = (TabNote | null)[];

export interface TabBlock {
  id: string;
  columns: TabColumn[];
  cursorPosition: number;
  title?: string;
}
