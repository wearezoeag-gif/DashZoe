declare module 'react-responsive-masonry' {
  import type { ComponentType, CSSProperties, ReactNode } from 'react';

  export interface MasonryProps {
    children: ReactNode;
    columnsCount?: number;
    gutter?: string;
    className?: string | null;
    style?: CSSProperties;
    containerTag?: string;
    itemTag?: string;
    itemStyle?: CSSProperties;
    sequential?: boolean;
  }

  const Masonry: ComponentType<MasonryProps>;
  export default Masonry;

  export interface ResponsiveMasonryProps {
    children: ReactNode;
    columnsCountBreakPoints?: Record<number, number>;
    gutterBreakPoints?: Record<number, string>;
    className?: string | null;
    style?: CSSProperties | null;
  }

  export const ResponsiveMasonry: ComponentType<ResponsiveMasonryProps>;
}
