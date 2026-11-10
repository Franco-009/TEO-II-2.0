"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { ContentStatus } from "@/domain/models/studyplay";
import { updateSubjectStatusAction } from "@/features/subjects/subjects.actions";

export interface SubjectStatusControlProps {
  subjectId: string;
  currentStatus: ContentStatus;
}

export function SubjectStatusControl({
  subjectId,
  currentStatus,
}: SubjectStatusControlProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState<ContentStatus>(currentStatus);
  const [saving, setSaving] = React.useState(false);

  async function handleChangeStatus(nextStatus: ContentStatus) {
    setStatus(nextStatus);
    setSaving(true);
    try {
      const res = await updateSubjectStatusAction({
        subjectId,
        status: nextStatus,
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-[#111827] px-3 py-2 text-xs">
      <label htmlFor="subject-status-select" className="text-slate-400 font-medium">
        Estado de la materia:
      </label>
      <select
        id="subject-status-select"
        value={status}
        disabled={saving}
        onChange={(e) => handleChangeStatus(e.target.value as ContentStatus)}
        className="rounded-md border border-slate-700 bg-[#0B0F19] px-2.5 py-1 text-xs text-slate-100"
      >
        <option value="draft">Borrador (draft)</option>
        <option value="published">Publicada (published)</option>
        <option value="archived">Archivada (archived)</option>
      </select>
      {saving && (
        <span className="text-blue-400 font-medium">Actualizando...</span>
      )}
    </div>
  );
}
