"use client";

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { requestApi } from "../api/requestApi";
import { useUndoRedo } from "../history/useUndoRedo";
import type { ProjectDto, ProjectScheduleDto } from "../projects/types";
import type { TaskDependency } from "../schedule/dependencies";
import { buildProjectSchedulePayload, buildScheduleItems } from "../../components/schedule/ScheduleView";
import type { ScheduleState } from "../../components/schedule/ScheduleView";

const initialState: ScheduleState = { items: [], dependencies: [] };

export type SharedTaskState = {
  history: ReturnType<typeof useUndoRedo<ScheduleState>>;
  selectedTaskItemId: string;
  setSelectedTaskItemId: (id: string) => void;
  loading: boolean;
  persistedProjectFingerprintsRef: MutableRefObject<Map<string, string>>;
};

export function useSharedTaskState(projects: ProjectDto[], onNotice: (message: string) => void): SharedTaskState {
  const history = useUndoRedo(initialState, 100);
  const [selectedTaskItemId, setSelectedTaskItemId] = useState("");
  const [loading, setLoading] = useState(true);
  const projectIdsKey = projects.map((project) => project.id).sort().join("|");
  const fingerprintsRef = useRef(new Map<string, string>());

  useEffect(() => {
    let cancelled = false;
    Promise.all(projects.map((project) => requestApi<ProjectScheduleDto>(`/api/projects/${project.id}/schedule`))).then((groups) => {
      if (cancelled) return;
      const state: ScheduleState = {
        items: buildScheduleItems(projects, groups.flatMap((group) => group.workItems)),
        dependencies: groups.flatMap((group) => group.dependencies.map((dependency) => ({ id: dependency.id, projectId: dependency.projectId, predecessorTaskId: dependency.predecessorTaskId, successorTaskId: dependency.successorTaskId, dependencyType: dependency.dependencyType, lag: dependency.lagDays } satisfies TaskDependency))),
      };
      history.reset(state);
      fingerprintsRef.current = new Map(projects.map((project) => [project.id, JSON.stringify(buildProjectSchedulePayload(project.id, state.items, state.dependencies))]));
      setSelectedTaskItemId(projects[0]?.id ?? "");
      setLoading(false);
    }).catch((error: Error) => { if (!cancelled) { setLoading(false); onNotice(error.message); } });
    return () => { cancelled = true; };
  // Reload shared TaskItem state only when the project collection changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIdsKey]);

  return { history, selectedTaskItemId, setSelectedTaskItemId, loading, persistedProjectFingerprintsRef: fingerprintsRef };
}
