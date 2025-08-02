'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number | ((index: number) => number);
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 5,
  className
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const getItemHeight = useCallback(
    (index: number) => {
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
    },
    [itemHeight]
  );

  // 가상화된 아이템들 계산 (메모화)
  const virtualItems = useMemo((): VirtualItem[] => {
    const virtualItems: VirtualItem[] = [];
    let start = 0;

    for (let i = 0; i < items.length; i++) {
      const size = getItemHeight(i);
      virtualItems.push({
        index: i,
        start,
        size
      });
      start += size;
    }

    return virtualItems;
  }, [items.length, getItemHeight]);

  // 전체 높이 계산 (메모화)
  const totalHeight = useMemo(() => {
    return virtualItems.reduce((total, item) => total + item.size, 0);
  }, [virtualItems]);

  // 보이는 영역의 아이템들만 계산 (메모화)
  const visibleItems = useMemo(() => {
    const visibleStart = scrollTop;
    const visibleEnd = scrollTop + height;

    // 시작 인덱스 찾기 (이진 검색 최적화)
    let startIndex = 0;
    let endIndex = virtualItems.length - 1;

    while (startIndex <= endIndex) {
      const midIndex = Math.floor((startIndex + endIndex) / 2);
      const item = virtualItems[midIndex];

      if (item.start < visibleStart) {
        startIndex = midIndex + 1;
      } else {
        endIndex = midIndex - 1;
      }
    }

    const start = Math.max(0, startIndex - overscan);

    // 끝 인덱스 찾기
    let end = start;
    while (end < virtualItems.length && virtualItems[end].start < visibleEnd) {
      end++;
    }

    end = Math.min(virtualItems.length - 1, end + overscan);

    return virtualItems.slice(start, end + 1);
  }, [virtualItems, scrollTop, height, overscan]);

  // 스크롤 이벤트 핸들러 (쓰로틀링)
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // 렌더링할 아이템들 (메모화)
  const renderedItems = useMemo(() => {
    return visibleItems.map((virtualItem) => {
      const item = items[virtualItem.index];
      return (
        <div
          key={virtualItem.index}
          style={{
            position: 'absolute',
            top: virtualItem.start,
            left: 0,
            right: 0,
            height: virtualItem.size,
          }}
        >
          {renderItem(item, virtualItem.index)}
        </div>
      );
    });
  }, [visibleItems, items, renderItem]);

  return (
    <Box
      ref={scrollElementRef}
      className={className}
      sx={{
        height,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        {renderedItems}
      </div>
    </Box>
  );
}

export default VirtualizedList;