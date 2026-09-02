"use client";

import type { PointerEvent, ReactNode, RefObject, UIEvent } from "react";
import { getTaskGridColumnGroupSpan, getTaskGridColumnWidth } from "./taskGridColumns";
import type { TaskGridColumn, TaskGridColumnGroup, TaskGridColumnGroupDefinition, TaskGridColumnGroupVisibility } from "./taskGridTypes";
import { TaskGridRow } from "./TaskGridRow";

type TaskGridHeaderProps = {
  visibleColumns: TaskGridColumn[];
  columnGroups: TaskGridColumnGroupDefinition[];
  columnGroupVisibility: TaskGridColumnGroupVisibility;
  onToggleColumnGroup: (group: Exclude<TaskGridColumnGroup, "basic">) => void;
  onShowAllColumnGroups: () => void;
  headerScrollRef: RefObject<HTMLDivElement | null>;
  onHeaderScroll: (event: UIEvent<HTMLDivElement>) => void;
  nameColumnHeader: ReactNode;
};

/** Shared WBS-grid header. Schedule and Estimate keep their domain state outside this component. */
export function TaskGridHeader({
  visibleColumns,
  columnGroups,
  columnGroupVisibility,
  onToggleColumnGroup,
  onShowAllColumnGroups,
  headerScrollRef,
  onHeaderScroll,
  nameColumnHeader,
}: TaskGridHeaderProps) {
  const areAllColumnGroupsVisible = Object.values(columnGroupVisibility).every(Boolean);

  return <>
    <div className="task-grid-column-selector" aria-label="Nhóm cột TaskGrid">
      {columnGroups.filter((group) => !group.alwaysVisible).map((group) => <button
        key={group.id}
        type="button"
        className={columnGroupVisibility[group.id] ? "active" : ""}
        aria-pressed={columnGroupVisibility[group.id]}
        onClick={() => onToggleColumnGroup(group.id as Exclude<TaskGridColumnGroup, "basic">)}
      >{group.label}</button>)}
      <button type="button" className={areAllColumnGroupsVisible ? "active" : ""} aria-pressed={areAllColumnGroupsVisible} onClick={onShowAllColumnGroups}>Tất cả</button>
    </div>

    <div className="schedule-board-header">
      <div ref={headerScrollRef} className="task-grid-header-scroll" onScroll={onHeaderScroll}>
        <div className="task-grid-header-content" style={{ width: getTaskGridColumnWidth(visibleColumns) }}>
          <div className="schedule-table-grid schedule-group-header">
            {columnGroups.filter((group) => columnGroupVisibility[group.id]).map((group) => <div key={group.id} style={{ gridColumn: `span ${getTaskGridColumnGroupSpan(visibleColumns, group.id)}` }}>{group.label}</div>)}
          </div>
          <div className="schedule-table-grid schedule-grid-header">
            {visibleColumns.map((column) => column.id === "name" ? <div key={column.id} className="task-name-column-header">{nameColumnHeader}</div> : <div key={column.id}>{column.label}</div>)}
          </div>
        </div>
      </div>
    </div>
  </>;
}

type TaskGridSurfaceProps = {
  bodyScrollRef: RefObject<HTMLDivElement | null>;
  insertionLineRef: RefObject<HTMLDivElement | null>;
  onBodyPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onBodyScroll: (event: UIEvent<HTMLDivElement>) => void;
  children: ReactNode;
};

/** Shared WBS-grid body and horizontal-scroll dock; item rendering is supplied by the workspace. */
export function TaskGridSurface({ bodyScrollRef, insertionLineRef, onBodyPointerDown, onBodyScroll, children }: TaskGridSurfaceProps) {
  return <>
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the grid is the keyboard focus target for its existing interactions. */}
    <div ref={bodyScrollRef} className="schedule-table-pane" role="application" aria-label="TaskGrid" tabIndex={0} onPointerDown={onBodyPointerDown} onScroll={onBodyScroll}>
      <div ref={insertionLineRef} className="wbs-insertion-line" aria-hidden="true" />
      <div className="schedule-rows">{children}</div>
    </div>
  </>;
}

type TaskGridScrollbarProps = {
  scrollRef: RefObject<HTMLDivElement | null>;
  tableWidth: number;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
};

export function TaskGridScrollbar({ scrollRef, tableWidth, onScroll }: TaskGridScrollbarProps) {
  return <div ref={scrollRef} className="task-grid-scrollbar-dock" aria-hidden="true" onScroll={onScroll}><div className="task-grid-scrollbar-content" style={{ width: tableWidth }} /></div>;
}

type TaskGridProps<TItem> = TaskGridHeaderProps & {
  visibleItems: TItem[];
  rowContext: unknown;
  emptyContent?: ReactNode;
  bodyScrollRef: RefObject<HTMLDivElement | null>;
  insertionLineRef: RefObject<HTMLDivElement | null>;
  onBodyPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onBodyScroll: (event: UIEvent<HTMLDivElement>) => void;
  bottomScrollRef: RefObject<HTMLDivElement | null>;
  tableWidth: number;
  onBottomScroll: (event: UIEvent<HTMLDivElement>) => void;
};

/**
 * Visible shared WBS block. Domain state and interaction handlers are intentionally
 * supplied by the owning workspace during the Step 2A migration.
 */
export function TaskGrid<TItem>({
  visibleItems, rowContext, emptyContent,
  visibleColumns, columnGroups, columnGroupVisibility, onToggleColumnGroup, onShowAllColumnGroups,
  headerScrollRef, onHeaderScroll, nameColumnHeader,
  bodyScrollRef, insertionLineRef, onBodyPointerDown, onBodyScroll,
  bottomScrollRef, tableWidth, onBottomScroll,
}: TaskGridProps<TItem>) {
  return <section className="task-grid-block">
    <TaskGridHeader
      visibleColumns={visibleColumns}
      columnGroups={columnGroups}
      columnGroupVisibility={columnGroupVisibility}
      onToggleColumnGroup={onToggleColumnGroup}
      onShowAllColumnGroups={onShowAllColumnGroups}
      headerScrollRef={headerScrollRef}
      onHeaderScroll={onHeaderScroll}
      nameColumnHeader={nameColumnHeader}
    />
    <TaskGridSurface bodyScrollRef={bodyScrollRef} insertionLineRef={insertionLineRef} onBodyPointerDown={onBodyPointerDown} onBodyScroll={onBodyScroll}>
      {visibleItems.map((item) => <TaskGridRow key={(item as { id: string }).id} item={item} context={rowContext} />)}
      {!visibleItems.length && emptyContent}
    </TaskGridSurface>
    <TaskGridScrollbar scrollRef={bottomScrollRef} tableWidth={tableWidth} onScroll={onBottomScroll} />
  </section>;
}
