"use client";
// เลือกเวลาที่เกิดเหตุ: ปุ่มลัด + ช่องเลือกวันเวลา
const pad = (n) => String(n).padStart(2, "0");
export function toLocalInput(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function WhenPicker({ id, value, onChange, presets }) {
  const now = new Date();
  const opts = presets ?? [["ตอนนี้", 0], ["1 ชม.ก่อน", 60], ["3 ชม.ก่อน", 180], ["เมื่อวาน", 1440]];
  return (
    <div className="when">
      <div className="chips">
        {opts.map(([label, min]) => {
          const v = toLocalInput(new Date(now.getTime() - min * 60000));
          return (
            <button type="button" key={label} className="chip" aria-pressed={value.slice(0, 13) === v.slice(0, 13) && (min > 0 || value === v)}
              onClick={() => onChange(toLocalInput(new Date(Date.now() - min * 60000)))}>{label}</button>
          );
        })}
      </div>
      <input id={id} type="datetime-local" value={value} max={toLocalInput(now)} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
