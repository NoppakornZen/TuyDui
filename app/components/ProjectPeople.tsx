'use client';

import { useEffect, useRef, useState } from 'react';
import { loadProfiles, profileInitial, profileLabel, type Profile } from '../../src/lib/profile';

type Person = {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  label: string;
};

const ROLE_LABEL = { owner: 'เจ้าของ', editor: 'แก้ไขได้', viewer: 'ดูอย่างเดียว' };

export default function ProjectPeople({ projectId }: { projectId: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    load(projectId).then((rows) => {
      if (!cancelled) setPeople(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = people.slice(0, 4);
  const extra = people.length - visible.length;

  return (
    <div className="project-people" ref={rootRef}>
      <button
        type="button"
        className="people-stack"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        title="คนในโปรเจกต์"
      >
        {visible.length === 0 ? (
          <span className="people-bubble">·</span>
        ) : visible.map((person) => (
          <span className={`people-bubble role-${person.role}`} key={person.userId}>
            {profileInitial(person.label)}
          </span>
        ))}
        {extra > 0 && <span className="people-more">+{extra}</span>}
      </button>

      {open && (
        <div className="people-panel">
          <p className="people-panel-title">คนในโปรเจกต์</p>
          {people.length === 0 ? (
            <p className="people-empty">ยังโหลดรายชื่อไม่ได้</p>
          ) : people.map((person) => (
            <div className="people-row" key={person.userId}>
              <span className={`people-bubble role-${person.role}`}>{profileInitial(person.label)}</span>
              <strong>{person.label}</strong>
              <em>{ROLE_LABEL[person.role]}</em>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function load(projectId: string): Promise<Person[]> {
  const { supabase } = await import('../../src/lib/supabase');

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .maybeSingle();

  const { data: members } = await supabase
    .from('project_members')
    .select('user_id, role, accepted_at')
    .eq('project_id', projectId)
    .not('accepted_at', 'is', null);

  const rows = (members ?? []) as Array<{ user_id: string; role: Person['role'] }>;
  const ownerId = project?.owner_id as string | undefined;
  if (ownerId && !rows.some((row) => row.user_id === ownerId)) {
    rows.unshift({ user_id: ownerId, role: 'owner' });
  }

  const profiles = await loadProfiles(rows.map((row) => row.user_id));
  const order = { owner: 0, editor: 1, viewer: 2 };

  return rows
    .map((row) => ({
      userId: row.user_id,
      role: row.role,
      label: labelFor(row.user_id, profiles.get(row.user_id)),
    }))
    .sort((a, b) => order[a.role] - order[b.role]);
}

function labelFor(userId: string, profile: Profile | undefined) {
  return profileLabel(profile ?? null) || `สมาชิก ${userId.slice(0, 4)}`;
}
