import { useState } from "react";
import type {
  CadenceChannel,
  CadenceStep,
  Campaign,
  LeadField,
  LeadFieldType,
  Status,
} from "../types";
import { Modal, ConfirmDialog } from "./Modal";
import { useStore } from "../store";
import { PALETTE, PALETTE_NAMES, colorHex } from "../lib/palette";
import { slugKey, uid } from "../lib/id";
import { BUILTIN_TOKENS } from "../lib/placeholders";
import { BUILD_LABEL, IS_DEV } from "../lib/build";

type Tab = "general" | "statuses" | "cadence" | "fields" | "prep";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "Общи" },
  { id: "statuses", label: "Статуси" },
  { id: "cadence", label: "Каденция" },
  { id: "fields", label: "Полета на лийда" },
  { id: "prep", label: "Подготовка" },
];

const FIELD_TYPES: { value: LeadFieldType; label: string }[] = [
  { value: "text", label: "текст" },
  { value: "tel", label: "телефон" },
  { value: "url", label: "линк" },
  { value: "number", label: "число" },
  { value: "longtext", label: "дълъг текст" },
];

function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item);
  return copy;
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { campaign, updateCampaign, deleteCampaign, state } = useStore();
  const [tab, setTab] = useState<Tab>("general");
  const [confirm, setConfirm] = useState<{ title: string; message: string; run: () => void } | null>(
    null,
  );

  const patch = (p: Partial<Campaign>) => updateCampaign((c) => ({ ...c, ...p }));

  return (
    <Modal
      title={`Настройки — ${campaign.name}`}
      size="wide"
      onClose={onClose}
      bodyless
      footer={
        <>
          <button
            className="btn danger"
            style={{ marginRight: "auto" }}
            disabled={state.campaigns.length <= 1}
            onClick={() =>
              setConfirm({
                title: "Изтриване на кампания",
                message: `„${campaign.name}" и всичките ѝ лийдове изчезват. Сигурен ли си?`,
                run: () => {
                  deleteCampaign(campaign.id);
                  onClose();
                },
              })
            }
          >
            Изтрий кампанията
          </button>
          <button className="btn primary" onClick={onClose}>
            Готово
          </button>
        </>
      }
    >
      <div className="subtabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`subtab ${tab === t.id ? "on" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="modal-body">
        {tab === "general" ? <GeneralTab campaign={campaign} patch={patch} /> : null}
        {tab === "statuses" ? (
          <StatusesTab campaign={campaign} patch={patch} setConfirm={setConfirm} />
        ) : null}
        {tab === "cadence" ? <CadenceTab campaign={campaign} patch={patch} /> : null}
        {tab === "fields" ? (
          <FieldsTab campaign={campaign} setConfirm={setConfirm} />
        ) : null}
        {tab === "prep" ? <PrepTab campaign={campaign} setConfirm={setConfirm} /> : null}
      </div>

      {confirm ? (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            confirm.run();
            setConfirm(null);
          }}
        />
      ) : null}
    </Modal>
  );
}

// ── Общи ─────────────────────────────────────────────────────────────────────

function GeneralTab({
  campaign,
  patch,
}: {
  campaign: Campaign;
  patch: (p: Partial<Campaign>) => void;
}) {
  return (
    <div className="field-grid">
      <label className="label" style={{ margin: 0 }}>
        Име на кампанията
      </label>
      <input className="input" value={campaign.name} onChange={(e) => patch({ name: e.target.value })} />

      <label className="label" style={{ margin: 0 }}>
        Краен срок
      </label>
      <div className="row">
        <input
          className="input"
          style={{ width: 180 }}
          type="date"
          value={campaign.deadline ?? ""}
          onChange={(e) => patch({ deadline: e.target.value })}
        />
        {campaign.deadline ? (
          <button className="btn sm" onClick={() => patch({ deadline: "" })}>
            Махни срока
          </button>
        ) : (
          <span className="dim">без срок — каденцията няма горна граница</span>
        )}
      </div>

      <label className="label" style={{ margin: 0 }}>
        Моят номер <span className="mono">[номер]</span>
      </label>
      <input
        className="input"
        style={{ width: 220 }}
        value={campaign.myPhone ?? ""}
        onChange={(e) => patch({ myPhone: e.target.value })}
        placeholder="0888 123 456"
      />

      <label className="label" style={{ margin: 0 }}>
        Калкулатор — инвестиция
      </label>
      <div className="row">
        <input
          className="input narrow"
          type="number"
          min={0}
          value={campaign.calc.investment}
          onChange={(e) =>
            patch({ calc: { ...campaign.calc, investment: Number(e.target.value) || 0 } })
          }
        />
        <input
          className="input"
          style={{ width: 80 }}
          value={campaign.calc.label}
          onChange={(e) => patch({ calc: { ...campaign.calc, label: e.target.value } })}
        />
        <span className="dim">
          <span className="mono">[breakeven]</span> = ceil(инвестиция / средна услуга)
        </span>
      </div>

      <label className="label" style={{ margin: 0 }}>
        Правила в опашката
      </label>
      <textarea
        className="textarea"
        rows={3}
        value={campaign.cadenceRules ?? ""}
        onChange={(e) => patch({ cadenceRules: e.target.value })}
      />

      <label className="label" style={{ margin: 0 }}>
        Версия
      </label>
      <div className="row">
        <span className={IS_DEV ? "build-stamp dev" : "build-stamp"}>{BUILD_LABEL}</span>
        <span className="dim">
          {IS_DEV ? "локален dev сървър" : "статичен билд"} · данните живеят само в този браузър
        </span>
      </div>
    </div>
  );
}

// ── Статуси ──────────────────────────────────────────────────────────────────

function StatusesTab({
  campaign,
  patch,
  setConfirm,
}: {
  campaign: Campaign;
  patch: (p: Partial<Campaign>) => void;
  setConfirm: (c: { title: string; message: string; run: () => void }) => void;
}) {
  const { updateCampaign } = useStore();

  const setStatus = (index: number, p: Partial<Status>) =>
    patch({ statuses: campaign.statuses.map((s, i) => (i === index ? { ...s, ...p } : s)) });

  return (
    <div>
      <p className="section-title">
        Редът тук е редът на чиповете навсякъде. Флагове: каденция стартира стълбицата · затворен
        изпада от опашката · победа слага ★.
      </p>
      <div className="col" style={{ gap: 8 }}>
        {campaign.statuses.map((s, i) => (
          <div key={s.id} className="row card" style={{ padding: 8, gap: 8 }}>
            <div className="col" style={{ gap: 2 }}>
              <button className="btn icon sm" onClick={() => patch({ statuses: move(campaign.statuses, i, -1) })}>
                ▲
              </button>
              <button className="btn icon sm" onClick={() => patch({ statuses: move(campaign.statuses, i, 1) })}>
                ▼
              </button>
            </div>
            <input
              className="input"
              style={{ width: 180 }}
              value={s.label}
              onChange={(e) => setStatus(i, { label: e.target.value })}
            />
            <div className="swatches" style={{ width: 150 }}>
              {PALETTE_NAMES.map((name) => (
                <div
                  key={name}
                  className={`swatch ${s.color === name ? "on" : ""}`}
                  style={{ background: colorHex(name), width: 16, height: 16 }}
                  title={PALETTE[name].label}
                  onClick={() => setStatus(i, { color: name })}
                />
              ))}
            </div>
            <label className="row" style={{ gap: 4, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={Boolean(s.triggersCadence)}
                onChange={(e) => setStatus(i, { triggersCadence: e.target.checked })}
              />
              каденция
            </label>
            <label className="row" style={{ gap: 4, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={Boolean(s.closed)}
                onChange={(e) => setStatus(i, { closed: e.target.checked })}
              />
              затворен
            </label>
            <label className="row" style={{ gap: 4, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={Boolean(s.win)}
                onChange={(e) => setStatus(i, { win: e.target.checked })}
              />
              победа
            </label>
            <label className="row" style={{ gap: 4, fontSize: 12 }}>
              +дни
              <input
                className="input"
                style={{ width: 56 }}
                type="number"
                min={0}
                value={s.retryDays ?? ""}
                onChange={(e) =>
                  setStatus(i, {
                    retryDays: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </label>
            <div className="spacer" />
            <button
              className="btn sm danger"
              onClick={() =>
                setConfirm({
                  title: "Изтриване на статус",
                  message: `Лийдовете със статус „${s.label}" ще запазят текста като непознат статус.`,
                  run: () =>
                    updateCampaign((c) => ({
                      ...c,
                      statuses: c.statuses.filter((x) => x.id !== s.id),
                      leads: c.leads.map((l) => (l.статус === s.id ? { ...l, статус: s.label } : l)),
                    })),
                })
              }
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <button
          className="btn"
          onClick={() =>
            patch({
              statuses: [...campaign.statuses, { id: uid("st"), label: "Нов статус", color: "gray" }],
            })
          }
        >
          + Статус
        </button>
      </div>
    </div>
  );
}

// ── Каденция ─────────────────────────────────────────────────────────────────

function CadenceTab({
  campaign,
  patch,
}: {
  campaign: Campaign;
  patch: (p: Partial<Campaign>) => void;
}) {
  const setStep = (index: number, p: Partial<CadenceStep>) =>
    patch({ cadence: campaign.cadence.map((s, i) => (i === index ? { ...s, ...p } : s)) });

  return (
    <div>
      <p className="section-title">
        Котвата е първото обаждане със статус „каденция". Стъпките „преди срока" се пропускат, ако
        кампанията няма краен срок.
      </p>
      <div className="col" style={{ gap: 8 }}>
        {campaign.cadence.map((step, i) => {
          const anchored = typeof step.beforeDeadlineDays === "number" ? "deadline" : "anchor";
          return (
            <div key={step.id} className="row card" style={{ padding: 8, gap: 8 }}>
              <div className="col" style={{ gap: 2 }}>
                <button className="btn icon sm" onClick={() => patch({ cadence: move(campaign.cadence, i, -1) })}>
                  ▲
                </button>
                <button className="btn icon sm" onClick={() => patch({ cadence: move(campaign.cadence, i, 1) })}>
                  ▼
                </button>
              </div>
              <select
                className="select"
                style={{ width: 130 }}
                value={anchored}
                onChange={(e) =>
                  e.target.value === "anchor"
                    ? setStep(i, { offsetDays: step.beforeDeadlineDays ?? 1, beforeDeadlineDays: undefined })
                    : setStep(i, { beforeDeadlineDays: step.offsetDays ?? 3, offsetDays: undefined })
                }
              >
                <option value="anchor">от котвата +</option>
                <option value="deadline">преди срока −</option>
              </select>
              <input
                className="input"
                style={{ width: 66 }}
                type="number"
                min={0}
                value={anchored === "anchor" ? (step.offsetDays ?? 0) : (step.beforeDeadlineDays ?? 0)}
                onChange={(e) => {
                  const n = Number(e.target.value) || 0;
                  if (anchored === "anchor") setStep(i, { offsetDays: n });
                  else setStep(i, { beforeDeadlineDays: n });
                }}
              />
              <span className="dim">дни</span>
              <input
                className="input grow"
                value={step.hint}
                onChange={(e) => setStep(i, { hint: e.target.value })}
              />
              <select
                className="select"
                style={{ width: 130 }}
                value={step.channel ?? ""}
                onChange={(e) =>
                  setStep(i, {
                    channel: e.target.value ? (e.target.value as CadenceChannel) : undefined,
                  })
                }
              >
                <option value="">— канал —</option>
                <option value="съобщение">съобщение</option>
                <option value="обаждане">обаждане</option>
              </select>
              <button
                className="btn sm danger"
                onClick={() => patch({ cadence: campaign.cadence.filter((x) => x.id !== step.id) })}
              >
                ✕
              </button>
            </div>
          );
        })}
        {campaign.cadence.length === 0 ? (
          <span className="dim">Няма стъпки — няма да има автоматични предложения.</span>
        ) : null}
      </div>
      <div style={{ marginTop: 10 }}>
        <button
          className="btn"
          onClick={() =>
            patch({
              cadence: [...campaign.cadence, { id: uid("cad"), offsetDays: 1, hint: "нова стъпка" }],
            })
          }
        >
          + Стъпка
        </button>
      </div>
    </div>
  );
}

// ── Полета на лийда ──────────────────────────────────────────────────────────

function FieldsTab({
  campaign,
  setConfirm,
}: {
  campaign: Campaign;
  setConfirm: (c: { title: string; message: string; run: () => void }) => void;
}) {
  const { updateCampaign } = useStore();

  const patchFields = (fields: LeadField[]) => updateCampaign((c) => ({ ...c, leadFields: fields }));

  const setField = (index: number, p: Partial<LeadField>) =>
    patchFields(campaign.leadFields.map((f, i) => (i === index ? { ...f, ...p } : f)));

  return (
    <div>
      <p className="section-title">
        Тези полета определят колоните в таблицата, формата за нов лийд и заглавията в CSV.
        „Токен" прави полето използваемо като <span className="mono">[токен]</span> в текста на
        скрипта. Вградени токени:{" "}
        <span className="mono">{BUILTIN_TOKENS.map((t) => `[${t}]`).join(" ")}</span>
      </p>
      <div className="col" style={{ gap: 8 }}>
        {campaign.leadFields.map((f, i) => (
          <div key={f.key} className="row card" style={{ padding: 8, gap: 8 }}>
            <div className="col" style={{ gap: 2 }}>
              <button className="btn icon sm" onClick={() => patchFields(move(campaign.leadFields, i, -1))}>
                ▲
              </button>
              <button className="btn icon sm" onClick={() => patchFields(move(campaign.leadFields, i, 1))}>
                ▼
              </button>
            </div>
            <input
              className="input"
              style={{ width: 190 }}
              value={f.label}
              onChange={(e) => setField(i, { label: e.target.value })}
            />
            <select
              className="select"
              style={{ width: 120 }}
              value={f.type}
              onChange={(e) => setField(i, { type: e.target.value as LeadFieldType })}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              className="input mono"
              style={{ width: 130 }}
              placeholder="токен"
              value={f.token ?? ""}
              onChange={(e) => setField(i, { token: e.target.value.trim() || undefined })}
            />
            <label className="row" style={{ gap: 4, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={f.showInTable}
                onChange={(e) => setField(i, { showInTable: e.target.checked })}
              />
              в таблицата
            </label>
            <label className="row" style={{ gap: 4, fontSize: 12 }}>
              <input
                type="radio"
                name="primary-field"
                checked={Boolean(f.primary)}
                onChange={() =>
                  patchFields(
                    campaign.leadFields.map((x, xi) => ({ ...x, primary: xi === i ? true : undefined })),
                  )
                }
              />
              име на реда
            </label>
            <div className="spacer" />
            <span className="dim mono" style={{ fontSize: 10 }}>
              {f.key}
            </span>
            <button
              className="btn sm danger"
              disabled={campaign.leadFields.length <= 1}
              onClick={() =>
                setConfirm({
                  title: "Изтриване на поле",
                  message: `Полето „${f.label}" се маха от таблицата, формите и от всички ${campaign.leads.length} лийда. Данните в него се губят.`,
                  run: () =>
                    updateCampaign((c) => ({
                      ...c,
                      leadFields: c.leadFields.filter((x) => x.key !== f.key),
                      leads: c.leads.map((l) => {
                        const fields = { ...l.fields };
                        delete fields[f.key];
                        return { ...l, fields };
                      }),
                    })),
                })
              }
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <button
          className="btn"
          onClick={() =>
            updateCampaign((c) => {
              const key = slugKey(
                "поле",
                c.leadFields.map((x) => x.key),
              );
              return {
                ...c,
                leadFields: [
                  ...c.leadFields,
                  { key, label: "Ново поле", type: "text", showInTable: true },
                ],
              };
            })
          }
        >
          + Поле
        </button>
      </div>
    </div>
  );
}

// ── Подготовка ───────────────────────────────────────────────────────────────

function PrepTab({
  campaign,
  setConfirm,
}: {
  campaign: Campaign;
  setConfirm: (c: { title: string; message: string; run: () => void }) => void;
}) {
  const { updateCampaign } = useStore();

  return (
    <div>
      <p className="section-title">
        Полетата, които попълваш преди обаждането. Стойностите им се снимат в лога на всяко
        обаждане.
      </p>
      <div className="col" style={{ gap: 8 }}>
        {campaign.prepFields.map((f, i) => (
          <div key={f.key} className="row card" style={{ padding: 8, gap: 8 }}>
            <div className="col" style={{ gap: 2 }}>
              <button
                className="btn icon sm"
                onClick={() => updateCampaign((c) => ({ ...c, prepFields: move(c.prepFields, i, -1) }))}
              >
                ▲
              </button>
              <button
                className="btn icon sm"
                onClick={() => updateCampaign((c) => ({ ...c, prepFields: move(c.prepFields, i, 1) }))}
              >
                ▼
              </button>
            </div>
            <input
              className="input grow"
              value={f.label}
              onChange={(e) =>
                updateCampaign((c) => ({
                  ...c,
                  prepFields: c.prepFields.map((x, xi) =>
                    xi === i ? { ...x, label: e.target.value } : x,
                  ),
                }))
              }
            />
            <span className="dim mono" style={{ fontSize: 10 }}>
              {f.key}
            </span>
            <button
              className="btn sm danger"
              onClick={() =>
                setConfirm({
                  title: "Изтриване на поле за подготовка",
                  message: `„${f.label}" изчезва от формата и от всички лийдове.`,
                  run: () =>
                    updateCampaign((c) => ({
                      ...c,
                      prepFields: c.prepFields.filter((x) => x.key !== f.key),
                      leads: c.leads.map((l) => {
                        const prep = { ...l.prep };
                        delete prep[f.key];
                        return { ...l, prep };
                      }),
                    })),
                })
              }
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <button
          className="btn"
          onClick={() =>
            updateCampaign((c) => {
              const key = slugKey(
                "подготовка",
                c.prepFields.map((x) => x.key),
              );
              return { ...c, prepFields: [...c.prepFields, { key, label: "Ново поле" }] };
            })
          }
        >
          + Поле
        </button>
      </div>
    </div>
  );
}
